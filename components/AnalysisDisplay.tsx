import React from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  Sparkles, 
  Eye, 
  ShoppingBag, 
  ExternalLink, 
  Loader2, 
  Image as ImageIcon,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { ProductSuggestion } from '../types';

interface AnalysisDisplayProps {
  /** Markdown-formatted analysis text */
  analysis: string;
  /** List of recommended products */
  products: ProductSuggestion[];
  /** Callback to trigger visualization generation */
  onVisualize: () => Promise<void>;
  /** Base64 encoded visualization image, if generated */
  visualizationImage: string | null;
  /** Whether visualization is currently being generated */
  isVisualizing: boolean;
  /** Error message if visualization failed */
  visualizationError?: string | null;
  /** Callback to retry visualization after an error */
  onRetryVisualization?: () => void;
}

/**
 * Component to display the AI analysis results, visualization, and product recommendations
 */
export const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({ 
  analysis, 
  products,
  onVisualize,
  visualizationImage,
  isVisualizing,
  visualizationError,
  onRetryVisualization
}) => {
  /**
   * Generate an Amazon affiliate search link
   */
  const generateAmazonLink = (term: string): string => {
    return `https://www.amazon.com/s?k=${encodeURIComponent(term)}&tag=zenspace-20`;
  };

  return (
    <div className="space-y-8">
      {/* Main Analysis Card */}
      <section 
        className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8"
        aria-labelledby="analysis-heading"
      >
        <div className="flex items-center gap-2 mb-6 border-b border-slate-100 pb-4">
          <Sparkles className="w-6 h-6 text-emerald-500" aria-hidden="true" />
          <h2 id="analysis-heading" className="text-2xl font-bold text-slate-800 m-0">
            Your Organization Plan
          </h2>
        </div>
        
        <div className="prose prose-emerald max-w-none prose-headings:font-serif prose-headings:text-emerald-900 prose-p:text-slate-600 prose-li:text-slate-600">
          <ReactMarkdown
            components={{
              h1: ({ children }) => (
                <h3 className="text-xl font-bold mt-6 mb-3 text-emerald-800 flex items-center gap-2">
                  {children}
                </h3>
              ),
              h2: ({ children }) => (
                <h3 className="text-xl font-bold mt-8 mb-4 text-emerald-800 flex items-center gap-2 border-b border-emerald-100 pb-2">
                  {children}
                </h3>
              ),
              ul: ({ children }) => (
                <ul className="list-disc pl-5 space-y-2 my-4">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal pl-5 space-y-3 my-4">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-slate-700 leading-relaxed">{children}</li>
              ),
              strong: ({ children }) => (
                <span className="font-semibold text-emerald-700">{children}</span>
              ),
              p: ({ children }) => (
                <p className="mb-4 text-slate-600 leading-relaxed">{children}</p>
              ),
            }}
          >
            {analysis}
          </ReactMarkdown>
        </div>
      </section>

      {/* Visualization Section */}
      <section 
        className="bg-zinc-900 rounded-2xl shadow-lg overflow-hidden text-white"
        aria-labelledby="visualization-heading"
      >
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-purple-400" aria-hidden="true" />
            <div>
              <h3 id="visualization-heading" className="text-lg font-bold text-white">
                Visualize Your Potential
              </h3>
              <p className="text-xs text-zinc-400">AI-generated preview of your organized space</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Visualization Image */}
          {visualizationImage && !visualizationError ? (
            <div className="relative rounded-xl overflow-hidden border border-zinc-700 group">
              <img 
                src={`data:image/png;base64,${visualizationImage}`} 
                alt="AI-generated visualization of your organized room" 
                className="w-full h-auto object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
                <span className="text-xs font-mono text-purple-300 uppercase tracking-widest">
                  AI Generated Preview
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-zinc-800/50 rounded-xl p-8 text-center border border-zinc-700 border-dashed">
              {/* Loading State */}
              {isVisualizing ? (
                <div 
                  className="flex flex-col items-center py-8"
                  role="status"
                  aria-live="polite"
                  aria-busy="true"
                >
                  <Loader2 
                    className="w-10 h-10 text-purple-500 animate-spin mb-4" 
                    aria-hidden="true" 
                  />
                  <p className="text-zinc-300 font-medium">Dreaming up your new room...</p>
                  <p className="text-zinc-500 text-sm mt-2">
                    Applying organization rules & lighting adjustments
                  </p>
                </div>
              ) : visualizationError ? (
                /* Error State */
                <div className="flex flex-col items-center py-4" role="alert">
                  <div className="bg-red-500/20 rounded-full p-3 mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-400" aria-hidden="true" />
                  </div>
                  <p className="text-zinc-300 font-medium mb-2">Visualization Failed</p>
                  <p className="text-zinc-500 text-sm mb-6 max-w-md">
                    {visualizationError}
                  </p>
                  {onRetryVisualization && (
                    <button 
                      onClick={onRetryVisualization}
                      className="px-4 py-2 rounded-lg bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-medium transition-colors flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                      aria-label="Try generating visualization again"
                    >
                      <RefreshCw className="w-4 h-4" aria-hidden="true" />
                      Try Again
                    </button>
                  )}
                </div>
              ) : (
                /* Initial/Prompt State */
                <div className="flex flex-col items-center py-4">
                  <ImageIcon 
                    className="w-12 h-12 text-zinc-600 mb-4" 
                    aria-hidden="true" 
                  />
                  <p className="text-zinc-300 mb-6 max-w-md mx-auto">
                    Want to see what this room could look like after following the plan? 
                    Tap the button below to generate a realistic preview.
                  </p>
                  <button 
                    onClick={onVisualize}
                    className="group relative px-6 py-3 rounded-full bg-purple-600 hover:bg-purple-500 text-white font-semibold transition-all shadow-[0_0_20px_-5px_rgba(147,51,234,0.5)] hover:shadow-[0_0_25px_-5px_rgba(147,51,234,0.7)] flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-offset-2 focus:ring-offset-zinc-900"
                    aria-label="Generate AI visualization of organized room"
                  >
                    <Sparkles 
                      className="w-4 h-4 group-hover:animate-pulse" 
                      aria-hidden="true" 
                    />
                    Generate Visualization
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Product Recommendations */}
      {products.length > 0 && (
        <section 
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8"
          aria-labelledby="products-heading"
        >
          <div className="flex items-center gap-2 mb-6">
            <ShoppingBag className="w-6 h-6 text-orange-500" aria-hidden="true" />
            <h2 id="products-heading" className="text-2xl font-bold text-slate-800 m-0">
              Shop the Look
            </h2>
          </div>
          
          <ul 
            className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none p-0 m-0"
            aria-label="Recommended organization products"
          >
            {products.map((product, idx) => (
              <li key={idx}>
                <a 
                  href={generateAmazonLink(product.searchTerm)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col justify-between p-5 rounded-xl border border-slate-200 hover:border-orange-200 hover:shadow-md transition-all group bg-slate-50/50 hover:bg-white h-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                  aria-label={`${product.name} - ${product.reason}. Opens Amazon search in new tab.`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-slate-800 group-hover:text-orange-600 transition-colors">
                        {product.name}
                      </h4>
                      <ExternalLink 
                        className="w-4 h-4 text-slate-400 group-hover:text-orange-500 flex-shrink-0 ml-2" 
                        aria-hidden="true"
                      />
                    </div>
                    <p className="text-sm text-slate-600 mb-4">{product.reason}</p>
                  </div>
                  <div className="mt-auto pt-3 border-t border-slate-200/60 flex items-center text-xs font-bold text-orange-600 uppercase tracking-wider">
                    Find on Amazon →
                  </div>
                </a>
              </li>
            ))}
          </ul>
          
          <p className="mt-4 text-center text-xs text-slate-400 italic">
            *As an Amazon Associate we earn from qualifying purchases.
          </p>
        </section>
      )}
    </div>
  );
};
