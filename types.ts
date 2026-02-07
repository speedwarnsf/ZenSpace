/**
 * Product suggestion from AI analysis
 */
export interface ProductSuggestion {
  /** Display name for the product */
  name: string;
  /** Amazon search query for finding this product */
  searchTerm: string;
  /** Explanation of why this product helps with organization */
  reason: string;
}

/**
 * Complete analysis result from the AI
 */
export interface AnalysisResult {
  /** Markdown-formatted analysis with organization recommendations */
  rawText: string;
  /** AI prompt for generating the visualization */
  visualizationPrompt: string;
  /** List of recommended products */
  products: ProductSuggestion[];
}

/**
 * A single message in the chat interface
 */
export interface ChatMessage {
  /** Unique identifier for the message */
  id: string;
  /** Who sent the message */
  role: 'user' | 'model';
  /** Message content (may contain markdown) */
  text: string;
  /** Unix timestamp of when the message was sent */
  timestamp: number;
  /** Whether this message represents an error */
  isError?: boolean;
}

/**
 * Application state machine states
 */
export enum AppState {
  /** Initial state - waiting for image upload */
  HOME = 'HOME',
  /** Image is being analyzed by AI */
  ANALYZING = 'ANALYZING',
  /** Analysis complete, showing results */
  RESULTS = 'RESULTS',
  /** An error occurred */
  ERROR = 'ERROR'
}

/**
 * Error information for display in the UI
 */
export interface AppError {
  /** User-friendly error message */
  message: string;
  /** Error code for debugging/handling */
  code: string;
  /** Whether the user can retry the action */
  isRetryable: boolean;
}

/**
 * Image upload state
 */
export interface UploadedImage {
  /** Full data URL (data:image/...;base64,...) */
  dataUrl: string;
  /** Just the base64 portion */
  base64: string;
  /** MIME type (e.g., 'image/jpeg') */
  mimeType: string;
  /** Original file name */
  fileName: string;
}
