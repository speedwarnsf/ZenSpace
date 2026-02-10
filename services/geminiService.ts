import { Type, Modality } from "@google/genai";
import { AnalysisResult, ProductSuggestion, DesignAnalysis, DesignOption, DesignFramework } from '../types';
import { createAnalysisPrompt, createChatContextPrompt, createDesignAnalysisPrompt } from './promptTemplates';
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
      let response: Response;
      try {
        response = await fetch(PROXY_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'generateContent',
            model: params.model,
            contents: params.contents,
            config: params.config,
          }),
        });
      } catch (fetchErr: any) {
        throw new GeminiApiError(`Network error: ${fetchErr.message}`, 'NETWORK_ERROR', true);
      }
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        let errMsg = `API error ${response.status}`;
        let errCode = 'API_ERROR';
        try {
          const errJson = JSON.parse(text);
          errMsg = errJson.error || errMsg;
          errCode = errJson.code || errCode;
        } catch { 
          if (text) errMsg += `: ${text.slice(0, 200)}`;
        }
        throw new GeminiApiError(errMsg, errCode, response.status >= 500);
      }
      return response.json();
    }
  },
  chats: {
    create(params: any) {
      // Return a chat-like object that uses the proxy
      return {
        async sendMessage(msg: any) {
          let response: Response;
          try {
            response = await fetch(PROXY_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'chat',
                model: params.model,
                chatContext: params.config?.systemInstruction,
                message: typeof msg === 'string' ? msg : msg.message,
              }),
            });
          } catch (fetchErr: any) {
            throw new GeminiApiError(`Network error: ${fetchErr.message}`, 'NETWORK_ERROR', true);
          }
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
const ANALYSIS_MODEL = 'gemini-2.5-flash';
const VISUALIZATION_MODEL = 'gemini-2.5-flash-image'; // Better at image editing/inpainting
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
      const reason = coerceString(obj.reason)?.slice(0, 300);

      if (!name || !reason) return null;
      // Derive searchTerm from name (no more hallucination risk)
      const searchTerm = name.toLowerCase().slice(0, 60);
      return { name, searchTerm, reason };
    })
    .filter((item): item is ProductSuggestion => item !== null);

  const deduped = new Map<string, ProductSuggestion>();
  cleaned.forEach((item) => {
    const key = item.name.toLowerCase();
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  });

  return Array.from(deduped.values()).slice(0, 5);
};

const normalizeAnalysisResponse = (data: unknown, rawText: string): AnalysisResult => {
  const obj = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
  let analysisMarkdown =
    coerceString(obj?.analysis_markdown) ||
    coerceString(obj?.analysisMarkdown) ||
    coerceString(obj?.analysis) ||
    (looksLikeAnalysis(rawText) ? rawText.trim() : null);
  
  // Strip any raw JSON that leaked into the markdown (hallucination guard)
  if (analysisMarkdown) {
    // Remove any JSON object blocks embedded in the markdown
    analysisMarkdown = analysisMarkdown
      .replace(/\{[\s\S]*?"(?:search_term|name|reason|products|visualization_prompt)"[\s\S]*?\}/g, '')
      .replace(/```json[\s\S]*?```/g, '')
      .replace(/\[\s*\{[\s\S]*?\}\s*\]/g, '') // Remove JSON arrays
      .trim();
    
    // If it still looks like JSON (starts with { or [), it's fully corrupted
    if (/^\s*[\[{]/.test(analysisMarkdown)) {
      analysisMarkdown = null;
    }
  }
  // Cap at reasonable length
  if (analysisMarkdown && analysisMarkdown.length > 5000) {
    analysisMarkdown = analysisMarkdown.substring(0, 5000).trim();
  }

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
              maxItems: 5,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "Short product name, 2-5 words" },
                  reason: { type: Type.STRING, description: "One sentence why this helps" }
                },
                required: ['name', 'reason']
              }
            }
          },
          required: ['analysis_markdown', 'visualization_prompt', 'products']
        }
      }
    }));

    // Extract text from either proxy response format or SDK format
    const responseText = (
      response.text?.trim() ||
      response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      ''
    );
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

    // Generic fallback — surface the actual error for debugging
    const errMsg = error instanceof Error ? error.message : String(error);
    throw new GeminiApiError(
      `Analysis error: ${errMsg.slice(0, 200)}`,
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
            text: `EDIT THIS EXACT PHOTO. Do NOT generate a new room. Keep the SAME walls, SAME floor, SAME furniture layout, SAME camera angle, SAME lighting.

Your job: Remove clutter and tidy up THIS specific room in the photo.

WHAT TO DO:
- Remove visible clutter (dishes, papers, clothes on surfaces)
- Straighten items that remain
- Make beds if visible
- Clear table surfaces
- Keep ALL furniture in the exact same position

SPECIFIC CHANGES REQUESTED:
${trimmedPrompt}

CRITICAL RULES:
- The output MUST be recognizable as the SAME room from the SAME angle
- Keep the same wall color, floor material, window placement
- Do NOT change the room layout or add new furniture
- Do NOT change the camera perspective
- Only remove clutter and organize what's already there` 
          }
        ]
      },
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE]
      }
    }));

    // Extract base64 image from response (may be in any part)
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part && part.inlineData && part.inlineData.data) {
        return part.inlineData.data;
      }
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
export const createChatSession = (initialContext: string): any => {
  return ai.chats.create({
    model: ANALYSIS_MODEL,
    config: {
      systemInstruction: createChatContextPrompt(initialContext)
    }
  });
};

// --- Design Theory Analysis (V2) ---

const VALID_FRAMEWORKS: DesignFramework[] = [
  'Aesthetic Order', 'Human-Centric', 'Universal Design', 'Biophilic', 'Phenomenological'
];

const normalizeDesignOption = (raw: any, index: number): DesignOption => {
  const name = (typeof raw?.name === 'string' && raw.name.trim()) || `Design ${index + 1}`;
  const mood = (typeof raw?.mood === 'string' && raw.mood.trim()) || 'A unique design direction for your space.';

  const frameworks: DesignFramework[] = Array.isArray(raw?.frameworks)
    ? raw.frameworks.filter((f: any) => VALID_FRAMEWORKS.includes(f)).slice(0, 3)
    : ['Aesthetic Order', 'Biophilic'];

  const palette: string[] = Array.isArray(raw?.palette)
    ? raw.palette.filter((c: any) => typeof c === 'string' && /^#[0-9A-Fa-f]{6}$/.test(c)).slice(0, 5)
    : ['#E8DCC8', '#6B8E7B', '#4A4A4A', '#C49A6C', '#2D2D2D'];
  while (palette.length < 5) palette.push('#888888');

  const keyChanges: string[] = Array.isArray(raw?.key_changes)
    ? raw.key_changes.filter((s: any) => typeof s === 'string').slice(0, 5)
    : ['Refresh the layout', 'Update lighting', 'Add accent pieces'];

  const rawPlan = (typeof raw?.full_plan === 'string' && raw.full_plan.trim()) || `## ${name}\n- ${keyChanges.join('\n- ')}`;
  // Sanitize markdown: fix escaped newlines, ensure headings get proper line breaks,
  // and convert plain-text section headers into proper markdown headings
  const fullPlan = rawPlan
    .replace(/\\n/g, '\n')
    // Ensure existing # headings get newlines before them
    .replace(/([^\n])(#{1,4}\s)/g, '$1\n\n$2')
    // Convert bold-only lines like "**The Vision.**" or "**Walls & Drapes**" to ### headings
    .replace(/^(\*\*[^*\n]{2,50}\*\*\.?)$/gm, (_m: string, p1: string) => `### ${p1.replace(/\*\*/g, '').replace(/\.$/, '')}`)
    // Convert short standalone lines (2-6 words, ending with period or colon) that look like section headers
    .replace(/\n\n([A-Z][A-Za-z &,'-]{2,50}[.:])(?=\n)/g, '\n\n### $1')
    // Convert inline section headers: "Previous text. The Vision. Next text" → split with heading
    .replace(/\.\s+([A-Z][A-Za-z &'-]{2,40})\.\s+(?=[A-Z])/g, '.\n\n### $1\n\n');
  const visualizationPrompt = (typeof raw?.visualization_prompt === 'string' && raw.visualization_prompt.trim()) || `Redesign this room in a ${name} style: ${keyChanges.join('. ')}.`;
  const frameworkRationale = (typeof raw?.framework_rationale === 'string' && raw.framework_rationale.trim()) || undefined;

  return { name, mood, frameworks, frameworkRationale, palette, keyChanges, fullPlan, visualizationPrompt };
};

/**
 * Analyze a room through 5 design-theory frameworks and generate 3 distinct design directions
 */
export const generateDesignOptions = async (
  base64Image: string,
  mimeType: string,
  previousDesigns: string[] = []
): Promise<DesignAnalysis> => {
  if (!base64Image || !mimeType?.startsWith('image/')) {
    throw new GeminiApiError('Invalid image data', 'INVALID_INPUT', false);
  }

  try {
    const { withTimeout } = createTimeoutHandler(60000); // 60s for richer prompt
    const promptText = createDesignAnalysisPrompt({ roomType: 'room', previousDesigns });

    const response = await withTimeout(ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType, data: base64Image } },
          { text: promptText }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            room_reading: { type: Type.STRING },
            options: {
              type: Type.ARRAY,
              minItems: 3,
              maxItems: 3,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  mood: { type: Type.STRING },
                  frameworks: { type: Type.ARRAY, items: { type: Type.STRING } },
                  framework_rationale: { type: Type.STRING },
                  palette: { type: Type.ARRAY, items: { type: Type.STRING } },
                  key_changes: { type: Type.ARRAY, items: { type: Type.STRING } },
                  full_plan: { type: Type.STRING },
                  visualization_prompt: { type: Type.STRING }
                },
                required: ['name', 'mood', 'frameworks', 'framework_rationale', 'palette', 'key_changes', 'full_plan', 'visualization_prompt']
              }
            }
          },
          required: ['room_reading', 'options']
        }
      }
    }));

    const responseText = (
      response.text?.trim() ||
      response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
      ''
    );

    if (!responseText) {
      throw new GeminiApiError('Empty response from AI', 'EMPTY_RESPONSE', true);
    }

    const jsonText = extractJsonFromText(responseText);
    if (!jsonText) {
      throw new GeminiApiError('Could not parse design analysis', 'PARSE_ERROR', true);
    }

    const parsed = JSON.parse(jsonText);
    const roomReading = (typeof parsed.room_reading === 'string' && parsed.room_reading.trim())
      || 'Room analysis through design theory frameworks.';

    const rawOptions = Array.isArray(parsed.options) ? parsed.options : [];
    // Ensure exactly 3 options
    while (rawOptions.length < 3) rawOptions.push({});
    const options = rawOptions.slice(0, 3).map(normalizeDesignOption) as [DesignOption, DesignOption, DesignOption];

    return { roomReading, options };
  } catch (error) {
    if (error instanceof GeminiApiError) throw error;
    const msg = error instanceof Error ? error.message : String(error);
    throw new GeminiApiError(`Design analysis failed: ${msg.slice(0, 200)}`, 'UNKNOWN', true);
  }
};

/**
 * Generate a visualization image for a specific design option
 */
export const generateDesignVisualization = async (
  visualizationPrompt: string,
  originalImageBase64: string,
  mimeType: string
): Promise<string> => {
  if (!visualizationPrompt?.trim() || !originalImageBase64 || !mimeType) {
    throw new GeminiApiError('Missing visualization data', 'INVALID_INPUT', false);
  }

  try {
    const { withTimeout } = createTimeoutHandler(VISUALIZATION_TIMEOUT_MS);
    const response = await withTimeout(ai.models.generateContent({
      model: VISUALIZATION_MODEL,
      contents: {
        parts: [
          { inlineData: { mimeType, data: originalImageBase64 } },
          {
            text: `REDESIGN THIS EXACT PHOTO. Keep the SAME room geometry, camera angle, and architectural bones (walls, windows, doors, floor plan).

TRANSFORM it with this design vision:
${visualizationPrompt.trim()}

STYLE DIRECTION:
- Make it look like a professional interior design portfolio shot
- Rich textures, interesting lighting, layered details
- This should look like something from Architectural Digest or Dwell magazine
- Add atmospheric lighting (warm pools of light, shadows, depth)
- Include tactile materials (velvet, wood grain, woven textiles, metal patina)
- RUGS AND FLOOR TEXTILES must look premium and specific — hand-knotted, vintage, artisan-quality. Show visible texture, weave pattern, and material richness. No generic flat carpets.

RULES:
- SAME room, SAME angle — must be recognizable as the same space
- Keep structural elements identical
- Be BOLD with the transformation — this should feel dramatic, not subtle
- Make the user excited about the possibility`
          }
        ]
      },
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE]
      }
    }));

    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part?.inlineData?.data) return part.inlineData.data;
    }

    throw new GeminiApiError('No visualization generated', 'NO_IMAGE_GENERATED', true);
  } catch (error) {
    if (error instanceof GeminiApiError) throw error;
    throw new GeminiApiError('Visualization failed', 'VISUALIZATION_FAILED', true);
  }
};
