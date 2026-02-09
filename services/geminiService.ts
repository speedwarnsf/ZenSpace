import { Type, Modality } from "@google/genai";
import { AnalysisResult, ProductSuggestion } from '../types';
import { createAnalysisPrompt, createChatContextPrompt } from './promptTemplates';
import { createTimeoutHandler } from './edgeCaseHandlers';

// API calls go through our server-side proxy to keep the key safe
const PROXY_URL = '/api/gemini';

/**
 * Check if the API is configured and ready to use
 * With proxy, always returns true (server holds the key)
 */
export const isApiConfigured = (): boolean => {
  return true;
};

/**
 * Get a user-friendly error message for API configuration issues
 */
export const getApiConfigError = (): string => {
  return '';
};

// Proxy wrapper that mirrors the SDK interface
const ai = {
  models: {
    async generateContent(params: any) {
      const response = await fetch(PROXY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generateContent',
          model: params.model,
          contents: params.contents,
          config: params.config,
        }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Proxy request failed' }));
        throw new GeminiApiError(err.error || `API error ${response.status}`, err.code || 'API_ERROR', response.status >= 500);
      }
      return response.json();
    }
  },
  chats: {
    create(params: any) {
      // Return a chat-like object that uses the proxy
      return {
        async sendMessage(msg: any) {
          const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'chat',
              model: params.model,
              chatContext: params.config?.systemInstruction,
              message: typeof msg === 'string' ? msg : msg.message,
            }),
          });
          if (!response.ok) {
            const err = await response.json().catch(() => ({ error: 'Chat request failed' }));
            throw new GeminiApiError(err.error || 'Chat failed', err.code || 'CHAT_ERROR', true);
          }
          const data = await response.json();
          return { text: data.text };
        }
      };
    }
  }
};

// Model configuration - using latest stable models
const ANALYSIS_MODEL = 'gemini-2.0-flash';
const VISUALIZATION_MODEL = 'gemini-2.0-flash-exp-image-generation'; // Image generation model
const ANALYSIS_TIMEOUT_MS = 45000;
const VISUALIZATION_TIMEOUT_MS = 70000;

/**
 * Custom error class for API-related errors
 */
export class GeminiApiError extends Error {
  public readonly code: string;
  public readonly isRetryable: boolean;

  constructor(message: string, code: string = 'UNKNOWN', isRetryable: boolean = false) {
    super(message);
    this.name = 'GeminiApiError';
    this.code = code;
    this.isRetryable = isRetryable;
  }
}

/**
 * Interface for raw API response from analysis
 */
interface AnalysisApiResponse {
  analysis_markdown: string;
  visualization_prompt: string;
  products: Array<{
    name: string;
    search_term: string;
    reason: string;
  }>;
}

/**
 * Validates the analysis API response structure
 */
const validateAnalysisResponse = (data: unknown): data is AnalysisApiResponse => {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    typeof obj.analysis_markdown === 'string' &&
    obj.analysis_markdown.trim().length > 0 &&
    typeof obj.visualization_prompt === 'string' &&
    Array.isArray(obj.products)
  );
};

const REQUIRED_SECTIONS = [
  'Key Issues',
  'Quick Wins',
  'Storage Solutions',
  'Step-by-Step Plan',
  'Aesthetic Tip'
];

const coerceString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const extractJsonFromText = (text: string): string | null => {
  const trimmed = text.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenced && fenced[1]) {
    return fenced[1].trim();
  }

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return null;
};

const looksLikeHtml = (text: string): boolean => {
  return /<!doctype|<html|<body/i.test(text);
};

const looksLikeAnalysis = (text: string): boolean => {
  return /key issues|quick wins|storage|step-by-step|aesthetic tip/i.test(text);
};

const ensureMarkdownSections = (analysisMarkdown: string): string => {
  let result = analysisMarkdown.trim();

  REQUIRED_SECTIONS.forEach((section) => {
    const headingRegex = new RegExp(`(^|\\n)\\s*(#{1,6}\\s*${section}|\\*\\*${section}\\*\\*)`, 'i');
    if (!headingRegex.test(result)) {
      const fallback = section === 'Aesthetic Tip'
        ? '- Choose a calm, neutral palette and keep surfaces visually light.'
        : section === 'Step-by-Step Plan'
          ? '1. Clear the most visible surfaces first (10-15 min).\n2. Sort items into keep, relocate, and donate bins (20-30 min).\n3. Assign storage locations for frequently used items (15-20 min).\n4. Return items using the new zones and containers (20-30 min).\n5. Finish with a quick reset routine (5 min).'
          : '- Add one or two specific, room-appropriate improvements here.';

      result += `\n\n## ${section}\n${fallback}`;
    }
  });

  return result;
};

const createFallbackVisualizationPrompt = (analysisMarkdown: string): string => {
  return `TASK: Transform this messy room into a clean, organized version.
1. FLOORS: Remove visible clutter and reveal clean flooring.
2. SURFACES: Clear tables, desks, and counters of loose items.
3. FURNITURE: Straighten and align major furniture. Make beds if present.
4. ITEMS: Group similar items into tidy, labeled storage areas.
5. ATMOSPHERE: Bright, even lighting with a calm, minimal aesthetic.

Use the following analysis as guidance:
${analysisMarkdown}

Constraint: Keep original room geometry and large furniture positions exactly the same.`;
};

const normalizeProducts = (value: unknown): ProductSuggestion[] => {
  if (!Array.isArray(value)) return [];

  const cleaned = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const obj = item as Record<string, unknown>;
      const name = coerceString(obj.name)?.slice(0, 100);
      const searchTerm = coerceString(obj.search_term ?? obj.searchTerm)?.slice(0, 80);
      const reason = coerceString(obj.reason)?.slice(0, 300);

      if (!name || !searchTerm || !reason) return null;
      return { name, searchTerm, reason };
    })
    .filter((item): item is ProductSuggestion => item !== null);

  const deduped = new Map<string, ProductSuggestion>();
  cleaned.forEach((item) => {
    const key = `${item.name.toLowerCase()}|${item.searchTerm.toLowerCase()}`;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  });

  return Array.from(deduped.values()).slice(0, 5);
};

const normalizeAnalysisResponse = (data: unknown, rawText: string): AnalysisResult => {
  const obj = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  const analysisMarkdown =
    coerceString(obj?.analysis_markdown) ||
    coerceString(obj?.analysisMarkdown) ||
    coerceString(obj?.analysis) ||
    (looksLikeAnalysis(rawText) ? rawText.trim() : null);

  if (!analysisMarkdown) {
    throw new GeminiApiError(
      'Invalid response structure from AI. Please try again.',
      'INVALID_RESPONSE',
      true
    );
  }

  const visualizationPrompt =
    coerceString(obj?.visualization_prompt) ||
    coerceString(obj?.visualizationPrompt) ||
    coerceString(obj?.visualization) ||
    createFallbackVisualizationPrompt(analysisMarkdown);

  const products = normalizeProducts(obj?.products ?? obj?.productSuggestions ?? obj?.product_suggestions);

  return {
    rawText: ensureMarkdownSections(analysisMarkdown),
    visualizationPrompt,
    products
  };
};

/**
 * Analyze a room image and return organization recommendations
 * @param base64Image - Base64 encoded image data (without data URL prefix)
 * @param mimeType - MIME type of the image (e.g., 'image/jpeg')
 * @returns Analysis results including markdown analysis, visualization prompt, and product suggestions
 * @throws GeminiApiError if the API call fails
 */
export const analyzeImage = async (base64Image: string, mimeType: string): Promise<AnalysisResult> => {
  // Pre-flight checks
  if (!isApiConfigured()) {
    throw new GeminiApiError(
      'API key not configured. Please add GEMINI_API_KEY to environment variables.',
      'API_KEY_MISSING',
      false
    );
  }

  if (!base64Image || base64Image.length === 0) {
    throw new GeminiApiError('No image data provided', 'INVALID_INPUT', false);
  }

  if (!mimeType || !mimeType.startsWith('image/')) {
    throw new GeminiApiError('Unsupported image type provided.', 'INVALID_FORMAT', false);
  }

  try {
    const { withTimeout } = createTimeoutHandler(ANALYSIS_TIMEOUT_MS);
    const promptText = createAnalysisPrompt({ roomType: 'room' });
    const response = await withTimeout(ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          },
          {
            text: promptText
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            analysis_markdown: { type: Type.STRING },
            visualization_prompt: { type: Type.STRING },
            products: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Short product name, max 5 words" },
                  search_term: { type: Type.STRING, description: "3-7 word generic search query, no brands, max 50 characters" },
                  reason: { type: Type.STRING, description: "One sentence explaining why this helps" }
                }
              }
            }
          },
          required: ['analysis_markdown', 'visualization_prompt', 'products']
        }
      }
    }));

    const responseText = response.text?.trim() ?? '';
    if (!responseText) {
      throw new GeminiApiError(
        'The AI returned an empty response. Please try again with a different image.',
        'EMPTY_RESPONSE',
        true
      );
    }

    if (looksLikeHtml(responseText)) {
      throw new GeminiApiError(
        'Failed to parse AI response. The service may be temporarily unavailable.',
        'PARSE_ERROR',
        true
      );
    }

    let parsed: unknown = null;
    const jsonText = extractJsonFromText(responseText);
    if (jsonText) {
      try {
        parsed = JSON.parse(jsonText);
      } catch (parseError) {
        parsed = null;
      }
    }

    if (parsed && validateAnalysisResponse(parsed)) {
      return normalizeAnalysisResponse(parsed, responseText);
    }

    // Fallback: attempt to normalize partial or non-JSON responses
    return normalizeAnalysisResponse(parsed, responseText);
  } catch (error) {
    // Re-throw our custom errors as-is
    if (error instanceof GeminiApiError) {
      throw error;
    }

    // Handle specific error types
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      
      if (message.includes('api key') || message.includes('unauthorized') || message.includes('401')) {
        throw new GeminiApiError(
          'Invalid API key. Please check your GEMINI_API_KEY configuration.',
          'INVALID_API_KEY',
          false
        );
      }
      
      if (message.includes('quota') || message.includes('rate limit') || message.includes('429')) {
        throw new GeminiApiError(
          'API rate limit exceeded. Please wait a moment and try again.',
          'RATE_LIMIT',
          true
        );
      }
      
      if (message.includes('network') || message.includes('timeout') || message.includes('fetch')) {
        throw new GeminiApiError(
          'Network error. Please check your connection and try again.',
          'NETWORK_ERROR',
          true
        );
      }
    }

    // Generic fallback
    console.error("Analysis failed:", error);
    throw new GeminiApiError(
      'An unexpected error occurred while analyzing the image. Please try again.',
      'UNKNOWN',
      true
    );
  }
};

/**
 * Generate an AI visualization of an organized room
 * @param prompt - Detailed prompt describing the organization changes
 * @param originalImageBase64 - Base64 encoded original image
 * @param mimeType - MIME type of the image
 * @returns Base64 encoded generated image
 * @throws GeminiApiError if generation fails
 */
export const generateRoomVisualization = async (
  prompt: string,
  originalImageBase64: string,
  mimeType: string
): Promise<string> => {
  if (!isApiConfigured()) {
    throw new GeminiApiError(
      'API key not configured',
      'API_KEY_MISSING',
      false
    );
  }

  const trimmedPrompt = prompt?.trim();
  if (!trimmedPrompt) {
    throw new GeminiApiError(
      'Missing visualization instructions. Please re-run the analysis.',
      'INVALID_INPUT',
      false
    );
  }

  if (!originalImageBase64 || !mimeType) {
    throw new GeminiApiError(
      'Original image data is missing.',
      'INVALID_INPUT',
      false
    );
  }

  try {
    const { withTimeout } = createTimeoutHandler(VISUALIZATION_TIMEOUT_MS);
    const response = await withTimeout(ai.models.generateContent({
      model: VISUALIZATION_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: originalImageBase64
            }
          },
          { 
            text: `You are an advanced AI image editor specialized in Decluttering and Interior Design.
          
            INPUT: A photo of a messy room.
            OUTPUT: A photorealistic "After" photo of the same room, perfectly organized.
            
            MANDATORY OPERATIONS:
            1. REMOVE ALL CLUTTER:
               - Detect clothes, trash, papers, bags, and loose items on the floor.
               - ERASE them completely.
               - INPAINT the clean floor texture underneath.
            
            2. TIDY FURNITURE:
               - If there is a bed, MAKE IT. Render smooth sheets and fluffed pillows.
               - If there are shelves, ALIGN the books and items.
               - If there are tables, CLEAR them of clutter.
               
            3. APPLY SPECIFIC INSTRUCTIONS FROM THE ORGANIZER:
            ${trimmedPrompt}
            
            4. PRESERVE REALITY:
               - Do NOT change the wall color.
               - Do NOT change the window view.
               - Do NOT move large furniture (wardrobes, sofas, bed frames).
               
            Render the final image with high-end interior design photography lighting. Make it look realistic.` 
          }
        ]
      },
      config: {
        responseModalities: [Modality.IMAGE]
      }
    }));

    // Extract base64 image from response
    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData && part.inlineData.data) {
      return part.inlineData.data;
    }
    
    throw new GeminiApiError(
      'The AI could not generate a visualization for this room. Try a different image or prompt.',
      'NO_IMAGE_GENERATED',
      true
    );
  } catch (error) {
    if (error instanceof GeminiApiError) {
      throw error;
    }

    console.error("Visualization generation failed:", error);
    throw new GeminiApiError(
      'Failed to generate room visualization. Please try again.',
      'VISUALIZATION_FAILED',
      true
    );
  }
};

/**
 * Create a chat session for follow-up questions about the room
 * @param initialContext - The analysis markdown to use as context
 * @returns A Chat instance for sending messages
 */
export const createChatSession = (initialContext: string): Chat => {
  return ai.chats.create({
    model: ANALYSIS_MODEL,
    config: {
      systemInstruction: createChatContextPrompt(initialContext)
    }
  });
};
