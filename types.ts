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
 * Product categories for shopping lists
 */
export type ProductCategory = 'furniture' | 'lighting' | 'textiles' | 'decor' | 'plants' | 'storage';

/**
 * Enhanced product for shopping lists with affiliate tracking
 */
export interface ShoppingProduct {
  id: string;
  name: string;
  description: string;
  category: ProductCategory;
  priceEstimate: { low: number; high: number };
  affiliateUrl: string;
  searchTerm: string;
  quantity: number;
  designTheoryJustification: string;
  designDirection: string;
  purchased: boolean;
}

/**
 * A complete shopping list for a design direction
 */
export interface ShoppingListData {
  designName: string;
  designDescription: string;
  items: ShoppingProduct[];
  sessionId: string;
  createdAt: number;
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
 * A design theory framework referenced in analysis
 */
export type DesignFramework =
  | 'Aesthetic Order'
  | 'Human-Centric'
  | 'Universal Design'
  | 'Biophilic'
  | 'Phenomenological';

/**
 * One of three design directions generated after room analysis
 */
export interface DesignOption {
  /** Short, evocative name (e.g. "Biophilic Warmth") */
  name: string;
  /** 1-2 sentence mood / vibe description */
  mood: string;
  /** Which theory frameworks primarily inform this direction */
  frameworks: DesignFramework[];
  /** How each framework specifically shaped decisions in this design */
  frameworkRationale?: string;
  /** 5 hex colour strings representing the palette */
  palette: string[];
  /** Bullet-point key changes (3-5 items) */
  keyChanges: string[];
  /** Full design plan markdown (shown on expand) */
  fullPlan: string;
  /** Visualization prompt to generate an AI image for this option */
  visualizationPrompt: string;
  /** Base64 image data once generated */
  visualizationImage?: string;
}

/**
 * Extended analysis that includes design theory + 3 options
 */
export interface DesignAnalysis {
  /** High-level room reading through the 5 frameworks */
  roomReading: string;
  /** The three distinct design directions */
  options: [DesignOption, DesignOption, DesignOption];
}

/**
 * Application state machine states
 */
export type DesignRating = 'never' | 'not-now' | 'like' | 'good' | 'the-one';

export interface LookbookEntry {
  id: string;
  option: DesignOption;
  rating: DesignRating | null;
  generatedAt: number;
  batchIndex: number;
}

export type FlowMode = 'clean' | 'redesign';

export enum AppState {
  /** Initial state - waiting for image upload */
  HOME = 'HOME',
  /** Image is being analyzed by AI */
  ANALYZING = 'ANALYZING',
  /** User chooses between Clean and Redesign flows */
  MODE_SELECT = 'MODE_SELECT',
  /** Show 3 design options after analysis */
  DESIGN_OPTIONS = 'DESIGN_OPTIONS',
  /** Lookbook view with drag-to-rate cards */
  LOOKBOOK = 'LOOKBOOK',
  /** Analysis complete, showing results */
  RESULTS = 'RESULTS',
  /** An error occurred */
  ERROR = 'ERROR'
}

/**
 * Error information for display in the UI
 */
export interface AppError {
  /** Short heading for the error */
  title?: string;
  /** User-friendly error message */
  message: string;
  /** Actionable suggestion for the user */
  suggestion?: string;
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
