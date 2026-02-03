export interface ProductSuggestion {
  name: string;
  searchTerm: string;
  reason: string;
}

export interface AnalysisResult {
  rawText: string;
  visualizationPrompt: string;
  products: ProductSuggestion[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  isError?: boolean;
}

export enum AppState {
  HOME = 'HOME',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS',
  ERROR = 'ERROR'
}