import { useState, useCallback, useEffect } from 'react';
import { UploadZone } from './components/UploadZone';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { ChatInterface } from './components/ChatInterface';
import { SessionManager } from './components/SessionManager';
import { ShareButton } from './components/ShareButton';
import { 
  analyzeImage, 
  createChatSession, 
  generateRoomVisualization,
  isApiConfigured,
  GeminiApiError
} from './services/geminiService';
import { compressImage, formatBytes } from './services/imageCompression';
import { rateLimiter } from './services/rateLimiter';
import { saveSession, SavedSession } from './services/sessionStorage';
import { AnalysisResult, AppState, ChatMessage, AppError, UploadedImage } from './types';
import { Chat } from '@google/genai';
import { LayoutGrid, ArrowLeft, AlertCircle, RefreshCw, WifiOff, Clock } from 'lucide-react';

/**
 * Main application component for ZenSpace room organizer
 */
export default function App() {
  // Application state
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [visualizationImage, setVisualizationImage] = useState<string | null>(null);
  const [isVisualizing, setIsVisualizing] = useState(false);
  const [visualizationError, setVisualizationError] = useState<string | null>(null);
  
  // Chat state
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatTyping, setIsChatTyping] = useState(false);
  
  // Error state
  const [error, setError] = useState<AppError | null>(null);
  
  // Session state
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  // Check API configuration on mount
  useEffect(() => {
    if (!isApiConfigured()) {
      console.warn('ZenSpace: Gemini API key not configured');
    }
  }, []);

  /**
   * Parse a data URL into its components
   */
  const parseDataUrl = useCallback((dataUrl: string): { base64: string; mimeType: string } | null => {
    const matches = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return null;
    }
    const mimeType = matches[1];
    const base64 = matches[2];
    if (!mimeType || !base64) {
      return null;
    }
    return { mimeType, base64 };
  }, []);

  /**
   * Handle image selection from the upload zone
   */
  const handleImageSelected = useCallback(async (file: File) => {
    // Check rate limit before processing
    if (!rateLimiter.tryConsume()) {
      const waitTime = rateLimiter.formatWaitTime();
      setRateLimitMessage(`Too many requests. Please wait ${waitTime}.`);
      setTimeout(() => setRateLimitMessage(null), 5000);
      return;
    }
    
    try {
      setIsAnalyzing(true);
      setAppState(AppState.ANALYZING);
      setError(null);
      setCurrentSessionId(undefined); // Reset session ID for new analysis

      // Compress image before analysis
      let processedFile = file;
      try {
        const compression = await compressImage(file, {
          maxWidth: 1920,
          maxHeight: 1080,
          quality: 0.85,
          targetSize: 2 * 1024 * 1024, // 2MB target
        });
        processedFile = compression.file;
        console.log(`Image compressed: ${formatBytes(compression.originalSize)} → ${formatBytes(compression.compressedSize)} (${Math.round(compression.ratio * 100)}%)`);
      } catch (compressError) {
        console.warn('Image compression failed, using original:', compressError);
        // Continue with original file if compression fails
      }

      // Convert file to base64
      const reader = new FileReader();
      
      reader.onerror = () => {
        setError({
          message: 'Failed to read the image file. Please try a different image.',
          code: 'FILE_READ_ERROR',
          isRetryable: true
        });
        setAppState(AppState.ERROR);
        setIsAnalyzing(false);
      };
      
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        const parsed = parseDataUrl(dataUrl);
        
        if (!parsed) {
          setError({
            message: 'Invalid image format. Please upload a JPG, PNG, or WebP image.',
            code: 'INVALID_FORMAT',
            isRetryable: true
          });
          setAppState(AppState.ERROR);
          setIsAnalyzing(false);
          return;
        }

        setUploadedImage({
          dataUrl,
          base64: parsed.base64,
          mimeType: parsed.mimeType,
          fileName: file.name
        });

        try {
          // Analyze the image
          const result = await analyzeImage(parsed.base64, parsed.mimeType);
          setAnalysis(result);

          // Initialize chat session with analysis context
          const chat = createChatSession(result.rawText);
          setChatSession(chat);
          
          setAppState(AppState.RESULTS);
        } catch (apiError) {
          console.error('Analysis error:', apiError);
          
          if (apiError instanceof GeminiApiError) {
            setError({
              message: apiError.message,
              code: apiError.code,
              isRetryable: apiError.isRetryable
            });
          } else {
            setError({
              message: 'An unexpected error occurred. Please try again.',
              code: 'UNKNOWN',
              isRetryable: true
            });
          }
          setAppState(AppState.ERROR);
        } finally {
          setIsAnalyzing(false);
        }
      };
      
      reader.readAsDataURL(processedFile);
    } catch (err) {
      console.error('File handling error:', err);
      setError({
        message: 'Failed to process the image. Please try again.',
        code: 'PROCESSING_ERROR',
        isRetryable: true
      });
      setIsAnalyzing(false);
      setAppState(AppState.ERROR);
    }
  }, [parseDataUrl]);

  /**
   * Generate AI visualization of the organized room
   */
  const handleVisualize = useCallback(async () => {
    if (!analysis?.visualizationPrompt || isVisualizing || !uploadedImage) return;
    
    // Check rate limit
    if (!rateLimiter.tryConsume()) {
      const waitTime = rateLimiter.formatWaitTime();
      setVisualizationError(`Rate limit exceeded. Please wait ${waitTime}.`);
      return;
    }
    
    try {
      setIsVisualizing(true);
      setVisualizationError(null);
      
      const base64Image = await generateRoomVisualization(
        analysis.visualizationPrompt,
        uploadedImage.base64,
        uploadedImage.mimeType
      );
      setVisualizationImage(base64Image);
    } catch (err) {
      console.error("Visualization failed:", err);
      if (err instanceof GeminiApiError) {
        setVisualizationError(err.message);
      } else {
        setVisualizationError('Failed to generate visualization. Please try again.');
      }
    } finally {
      setIsVisualizing(false);
    }
  }, [analysis, isVisualizing, uploadedImage]);

  /**
   * Send a message in the chat
   */
  const handleSendMessage = useCallback(async (text: string) => {
    if (!chatSession) return;
    
    // Check rate limit for chat messages
    if (!rateLimiter.tryConsume()) {
      const waitTime = rateLimiter.formatWaitTime();
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: `Rate limit exceeded. Please wait ${waitTime} before sending another message.`,
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
      return;
    }

    // Add user message immediately
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsChatTyping(true);

    try {
      const result = await chatSession.sendMessage({ message: text });
      const responseText = result.text;

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText || "I'm sorry, I couldn't generate a response. Please try again.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (err) {
      console.error("Chat error:", err);
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I encountered an issue connecting to the service. Please try again.",
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsChatTyping(false);
    }
  }, [chatSession]);

  /**
   * Reset the app to initial state
   */
  const resetApp = useCallback(() => {
    setAppState(AppState.HOME);
    setAnalysis(null);
    setUploadedImage(null);
    setVisualizationImage(null);
    setVisualizationError(null);
    setMessages([]);
    setChatSession(null);
    setError(null);
  }, []);

  /**
   * Save current session
   */
  const handleSaveSession = useCallback(async () => {
    if (!analysis || !uploadedImage) return;
    
    try {
      const session = await saveSession(
        uploadedImage,
        analysis,
        messages,
        visualizationImage || undefined,
        currentSessionId
      );
      setCurrentSessionId(session.id);
    } catch (err) {
      console.error('Failed to save session:', err);
      throw err;
    }
  }, [analysis, messages, uploadedImage, visualizationImage, currentSessionId]);

  /**
   * Load a saved session
   */
  const handleLoadSession = useCallback((session: SavedSession) => {
    setAnalysis(session.analysis);
    setMessages(session.messages);
    setVisualizationImage(session.visualizationImage || null);
    setCurrentSessionId(session.id);
    setAppState(AppState.RESULTS);
    
    // Recreate chat session with analysis context
    const chat = createChatSession(session.analysis.rawText);
    setChatSession(chat);
    
    // Clear uploaded image (it's not stored due to size)
    setUploadedImage(null);
  }, []);

  /**
   * Retry after an error
   */
  const handleRetry = useCallback(() => {
    if (error?.isRetryable && uploadedImage) {
      // Re-analyze the already uploaded image
      setAppState(AppState.ANALYZING);
      setIsAnalyzing(true);
      setError(null);
      
      analyzeImage(uploadedImage.base64, uploadedImage.mimeType)
        .then(result => {
          setAnalysis(result);
          const chat = createChatSession(result.rawText);
          setChatSession(chat);
          setAppState(AppState.RESULTS);
        })
        .catch(apiError => {
          if (apiError instanceof GeminiApiError) {
            setError({
              message: apiError.message,
              code: apiError.code,
              isRetryable: apiError.isRetryable
            });
          } else {
            setError({
              message: 'An unexpected error occurred. Please try again.',
              code: 'UNKNOWN',
              isRetryable: true
            });
          }
          setAppState(AppState.ERROR);
        })
        .finally(() => {
          setIsAnalyzing(false);
        });
    } else {
      resetApp();
    }
  }, [error, uploadedImage, resetApp]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header 
        className="bg-white border-b border-slate-200 sticky top-0 z-50"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={resetApp}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-lg p-1"
            aria-label="ZenSpace - Return to home"
          >
            <LayoutGrid className="w-6 h-6 text-emerald-600" aria-hidden="true" />
            <span className="font-serif text-xl font-bold text-slate-800 tracking-tight">ZenSpace</span>
          </button>
          
          <div className="flex items-center gap-3">
            {/* Session Manager - available on home and results */}
            {(appState === AppState.HOME || appState === AppState.RESULTS) && (
              <SessionManager
                currentSessionId={currentSessionId}
                onLoadSession={handleLoadSession}
                onSaveSession={handleSaveSession}
                hasUnsavedChanges={appState === AppState.RESULTS && !!analysis}
              />
            )}
            
            {appState === AppState.RESULTS && analysis && (
              <>
                <ShareButton 
                  analysis={analysis.rawText} 
                  roomType="room"
                />
                <button 
                  onClick={resetApp}
                  className="text-sm text-slate-600 hover:text-emerald-600 flex items-center gap-1 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 rounded-lg px-3 py-2"
                  aria-label="Start over with a new image"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  Start Over
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Rate Limit Toast */}
      {rateLimitMessage && (
        <div 
          className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top-4 duration-300"
          role="alert"
        >
          <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <Clock className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{rateLimitMessage}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main 
        className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8"
        role="main"
      >
        
        {/* Home State */}
        {appState === AppState.HOME && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 text-center mb-6 font-serif">
              From Chaos to Calm.
            </h1>
            <p className="text-lg text-slate-600 text-center max-w-xl mb-12 leading-relaxed">
              Upload a photo of any messy room. Our AI will analyze it, give you a step-by-step decluttering plan, and answer your organization questions.
            </p>
            <UploadZone onImageSelected={handleImageSelected} isAnalyzing={isAnalyzing} />
            
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center opacity-80">
              <div>
                <div className="font-bold text-slate-800 mb-2">Snap</div>
                <p className="text-sm text-slate-500">Take a photo of your clutter</p>
              </div>
              <div>
                <div className="font-bold text-slate-800 mb-2">Analyze</div>
                <p className="text-sm text-slate-500">Get a personalized plan</p>
              </div>
              <div>
                <div className="font-bold text-slate-800 mb-2">Organize</div>
                <p className="text-sm text-slate-500">Chat for specific tips</p>
              </div>
            </div>
          </div>
        )}

        {/* Analyzing State */}
        {appState === AppState.ANALYZING && (
          <div 
            className="flex flex-col items-center justify-center min-h-[60vh]"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <UploadZone onImageSelected={handleImageSelected} isAnalyzing={isAnalyzing} />
            <p className="mt-6 text-slate-500 animate-pulse">Analyzing visual details...</p>
            <p className="mt-2 text-sm text-slate-400">This may take a few moments</p>
          </div>
        )}

        {/* Error State */}
        {appState === AppState.ERROR && error && (
          <div 
            className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center"
            role="alert"
            aria-live="assertive"
          >
            <div className="bg-red-50 rounded-full p-4 mb-6">
              {error.code === 'NETWORK_ERROR' ? (
                <WifiOff className="w-12 h-12 text-red-500" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-12 h-12 text-red-500" aria-hidden="true" />
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 mb-4">
              {error.code === 'API_KEY_MISSING' ? 'Setup Required' : 'Something Went Wrong'}
            </h2>
            
            <p className="text-slate-600 mb-8 leading-relaxed">
              {error.message}
            </p>
            
            {error.code === 'API_KEY_MISSING' ? (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800 mb-6">
                <p className="font-medium mb-2">For Developers:</p>
                <p>Add <code className="bg-amber-100 px-1 rounded">GEMINI_API_KEY</code> to your environment variables.</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                {error.isRetryable && (
                  <button 
                    onClick={handleRetry}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                    aria-label="Try analyzing the image again"
                  >
                    <RefreshCw className="w-4 h-4" aria-hidden="true" />
                    Try Again
                  </button>
                )}
                <button 
                  onClick={resetApp}
                  className="bg-slate-100 text-slate-700 px-6 py-3 rounded-lg hover:bg-slate-200 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
                  aria-label="Go back to home and start fresh"
                >
                  Start Fresh
                </button>
              </div>
            )}
            
            {/* Error code for debugging */}
            <p className="mt-8 text-xs text-slate-400">
              Error code: {error.code}
            </p>
          </div>
        )}

        {/* Results State */}
        {appState === AppState.RESULTS && analysis && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
            {/* Left Column: Image & Analysis */}
            <div className="lg:col-span-7 space-y-8">
              {/* Image Preview Card */}
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden p-2">
                <img 
                  src={uploadedImage?.dataUrl || ''} 
                  alt="Your uploaded room photo" 
                  className="w-full h-64 md:h-80 object-cover rounded-xl"
                />
              </div>
              
              {/* Analysis Results & Visualization */}
              <AnalysisDisplay 
                analysis={analysis.rawText} 
                products={analysis.products}
                visualizationImage={visualizationImage}
                onVisualize={handleVisualize}
                isVisualizing={isVisualizing}
                visualizationError={visualizationError}
                onRetryVisualization={handleVisualize}
              />
            </div>

            {/* Right Column: Chat */}
            <div className="lg:col-span-5">
              <div className="lg:sticky lg:top-24">
                <ChatInterface 
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isTyping={isChatTyping}
                />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer - only on home */}
      {appState === AppState.HOME && (
        <footer className="py-8 text-center text-sm text-slate-400">
          <p>Powered by Google Gemini AI</p>
        </footer>
      )}
    </div>
  );
}
