import { GoogleGenAI, Chat, Type, Modality } from "@google/genai";
import { AnalysisResult, ProductSuggestion } from '../types';

// Environment variable validation with helpful error messages
const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';

/**
 * Check if the API is configured and ready to use
 */
export const isApiConfigured = (): boolean => {
  return apiKey.length > 0;
};

/**
 * Get a user-friendly error message for API configuration issues
 */
export const getApiConfigError = (): string => {
  if (!apiKey) {
    return 'The Gemini API key is not configured. Please add GEMINI_API_KEY to your environment variables.';
  }
  return '';
};

// Initialize the Gemini AI client
const ai = new GoogleGenAI({ apiKey });

// Model configuration - using latest stable models
const ANALYSIS_MODEL = 'gemini-2.0-flash';
const VISUALIZATION_MODEL = 'gemini-2.0-flash-exp'; // Flash exp supports image generation

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
    typeof obj.visualization_prompt === 'string' &&
    Array.isArray(obj.products)
  );
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

  try {
    const response = await ai.models.generateContent({
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
            text: `You are an expert professional organizer and interior designer. 
            Analyze this uploaded photo of a room.
            
            Return a JSON object with three fields:
            1. 'analysis_markdown': A structured Markdown string. It MUST have these sections:
               - **Key Issues**: Briefly identify the main sources of clutter.
               - **Quick Wins**: 3 immediate actions (under 15 mins).
               - **Storage Solutions**: Specific suggestions for storage containers/furniture.
               - **Step-by-Step Plan**: A numbered list to organize the space.
               - **Aesthetic Tip**: One design tip for a "Zen" look.
            
            2. 'visualization_prompt': A set of STRICT, IMPERATIVE COMMANDS for an AI image generator to "fix" the room.
            It MUST implement the solutions you proposed in 'analysis_markdown'.
            
            Format as a direct command list:
            "TASK: Transform this messy room into a clean one.
            1. FLOORS: [Command to remove specific floor clutter and reveal flooring. E.g. 'Remove pile of clothes, show hardwood'].
            2. SURFACES: [Command to clear specific tables/counters. E.g. 'Clear nightstand of cups and papers'].
            3. BEDDING/FURNITURE: [Command to make the bed or straighten cushions. E.g. 'Make the bed with white duvet, tight tuck'].
            4. ITEMS: [Command to organize specific messy items like books, toys. E.g. 'Place books vertically on shelves'].
            5. ATMOSPHERE: [Lighting and mood instructions].
            
            Constraint: Keep original room geometry and large furniture positions exactly the same."
            
            3. 'products': An array of 3-5 specific products that would help organize this room. For each product provide:
               - 'name': Short display name (e.g., "Woven Basket").
               - 'search_term': A specific search query to find this on Amazon (e.g., "large woven storage basket for blankets").
               - 'reason': Why this helps.`
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
                  name: { type: Type.STRING },
                  search_term: { type: Type.STRING },
                  reason: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    if (!response.text) {
      throw new GeminiApiError(
        'The AI returned an empty response. Please try again with a different image.',
        'EMPTY_RESPONSE',
        true
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(response.text);
    } catch (parseError) {
      throw new GeminiApiError(
        'Failed to parse AI response. The service may be temporarily unavailable.',
        'PARSE_ERROR',
        true
      );
    }

    if (!validateAnalysisResponse(parsed)) {
      throw new GeminiApiError(
        'Invalid response structure from AI. Please try again.',
        'INVALID_RESPONSE',
        true
      );
    }

    // Transform snake_case API response to camelCase for TypeScript
    const products: ProductSuggestion[] = parsed.products.map((p) => ({
      name: p.name,
      searchTerm: p.search_term,
      reason: p.reason
    }));

    return {
      rawText: parsed.analysis_markdown,
      visualizationPrompt: parsed.visualization_prompt,
      products
    };
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

  try {
    const response = await ai.models.generateContent({
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
            ${prompt}
            
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
    });

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
      systemInstruction: `You are a helpful, encouraging professional organizer assistant named "ZenSpace AI". 
      The user has just uploaded a photo of their room and you have already provided an initial analysis.
      
      Here is the context of your initial analysis of their room:
      "${initialContext}"
      
      Answer the user's follow-up questions based on this analysis. 
      Keep your answers concise (under 3 paragraphs) unless asked for details.
      Be friendly and supportive. If they ask about specific products, suggest general types (e.g., "clear acrylic bins") rather than specific brands unless necessary.`
    }
  });
};
