import { useState, useCallback, useEffect, lazy, Suspense } from 'react';
import { UploadZone } from './components/UploadZone';
import { ThemeToggle } from './components/ThemeToggle';
import { ErrorBoundary } from './components/ErrorBoundary';
import { NetworkStatus, useNetworkStatus } from './components/NetworkStatus';
import { AnalysisLoading } from './components/EnhancedLoadingSkeleton';
import { AccessibilityProvider, AccessibilityToolbar, SkipNavigation, useAccessibility } from './components/AccessibilityFeatures';

// Lazy-loaded components (code splitting)
const AnalysisDisplay = lazy(() => import('./components/AnalysisDisplay').then(m => ({ default: m.AnalysisDisplay })));
const ChatInterface = lazy(() => import('./components/ChatInterface').then(m => ({ default: m.ChatInterface })));
const SessionManager = lazy(() => import('./components/SessionManager').then(m => ({ default: m.SessionManager })));
const ShareButton = lazy(() => import('./components/ShareButton').then(m => ({ default: m.ShareButton })));
import { 
  analyzeImage, 
  createChatSession, 
  generateRoomVisualization,
  isApiConfigured,
  GeminiApiError
} from './services/geminiService';
import { compressImage } from './services/imageCompression';
import { rateLimiter } from './services/rateLimiter';
import { saveSession, SavedSession } from './services/sessionStorage';
import { validateImageFile, preprocessImage } from './services/edgeCaseHandlers';
import { analytics } from './services/analytics';
import { getErrorMessage } from './services/errorMessages';
import { validateChatMessage } from './services/validation';
import { AnalysisResult, AppState, ChatMessage, AppError, UploadedImage } from './types';
import { Chat } from '@google/genai';
import { LayoutGrid, ArrowLeft, AlertCircle, RefreshCw, WifiOff, Clock } from 'lucide-react';

/**
 * Main application component wrapper with enhanced providers
 */
function AppContent() {
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

  // Enhanced state for production features
  const [analysisStage, setAnalysisStage] = useState<'uploading' | 'processing' | 'analyzing' | 'generating'>('uploading');
  const [analysisProgress, setAnalysisProgress] = useState(0);

  // Network and accessibility hooks
  const networkStatus = useNetworkStatus();
  const { announce, playSound } = useAccessibility();

  const buildAppError = useCallback((
    code: string,
    message?: string,
    isRetryable?: boolean,
    suggestion?: string
  ): AppError => {
    const mapped = getErrorMessage(code);
    return {
      code,
      message: message ?? mapped.description,
      title: mapped.title,
      suggestion: suggestion ?? mapped.suggestion,
      isRetryable: isRetryable ?? mapped.isRetryable
    };
  }, []);

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
    const matches = dataUrl.match(/^data:([^;]+)(?:;charset=[^;]+)?;base64,(.+)$/);
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
   * Handle image selection from the upload zone with enhanced validation
   */
  const handleImageSelected = useCallback(async (file: File) => {
    // Analytics tracking
    analytics.trackImageUpload(file);

    if (isAnalyzing) {
      const message = 'Analysis already in progress. Please wait for it to finish.';
      setRateLimitMessage(message);
      setTimeout(() => setRateLimitMessage(null), 4000);
      announce(message, 'polite');
      return;
    }
    
    // Check network connection
    if (!networkStatus.isOnline) {
      setError(buildAppError('NETWORK_OFFLINE'));
      setAppState(AppState.ERROR);
      announce('Upload failed: No internet connection', 'assertive');
      playSound('error');
      return;
    }

    // Check rate limit before processing
    if (!rateLimiter.tryConsume()) {
      const waitTime = rateLimiter.formatWaitTime();
      setRateLimitMessage(`Too many requests. Please wait ${waitTime}.`);
      setTimeout(() => setRateLimitMessage(null), 5000);
      playSound('error');
      return;
    }

    try {
      // Stage 1: Validate file
      setAnalysisStage('uploading');
      setAnalysisProgress(10);
      setIsAnalyzing(true);
      setAppState(AppState.ANALYZING);
      setError(null);
      setCurrentSessionId(undefined);
      announce('Starting image analysis', 'polite');

      const validation = await validateImageFile(file);
      
      if (!validation.canProceed) {
        setError(buildAppError(
          'VALIDATION_FAILED',
          validation.error || 'Invalid image file',
          true,
          validation.suggestion
        ));
        setAppState(AppState.ERROR);
        analytics.track('image_rejected', { reason: validation.error });
        announce(`Upload failed: ${validation.error}`, 'assertive');
        playSound('error');
        setIsAnalyzing(false);
        return;
      }

      if (validation.warning) {
        announce(validation.warning, 'polite');
      }

      // Stage 2: Preprocess image (compression if needed)
      setAnalysisStage('processing');
      setAnalysisProgress(25);
      
      const preprocessResult = await preprocessImage(file);
      const processedFile = preprocessResult.file;
      
      if (preprocessResult.wasModified) {
        analytics.trackImageCompression(
          file.size,
          processedFile.size,
          0, 0 // Dimensions will be calculated later
        );
        announce(`Image optimized: ${preprocessResult.modifications[0]}`, 'polite');
      }

      // Stage 3: Convert file to base64
      setAnalysisProgress(40);
      const reader = new FileReader();
      
      reader.onerror = () => {
        setError(buildAppError(
          'FILE_READ_ERROR',
          'Failed to read the image file. Please try a different image.',
          true
        ));
        setAppState(AppState.ERROR);
        setIsAnalyzing(false);
        announce('Failed to read image file', 'assertive');
        playSound('error');
        analytics.track('analysis_failed', { stage: 'file_read', error: 'FILE_READ_ERROR' });
      };
      
      reader.onloadend = async () => {
        try {
          const dataUrl = reader.result as string;
          const parsed = parseDataUrl(dataUrl);
          
          if (!parsed) {
            throw new Error('Invalid image format after processing');
          }

          setUploadedImage({
            dataUrl,
            base64: parsed.base64,
            mimeType: parsed.mimeType,
            fileName: processedFile.name
          });

          // Stage 4: AI Analysis
          setAnalysisStage('analyzing');
          setAnalysisProgress(60);
          analytics.trackAnalysisStart();
          announce('Analyzing room layout and clutter', 'polite');

          // Use enhanced prompt template
          const result = await analyzeImage(parsed.base64, parsed.mimeType);
          
          setAnalysisProgress(80);
          
          // Stage 5: Setup chat session
          setAnalysisStage('generating');
          setAnalysisProgress(90);
          
          const chat = createChatSession(result.rawText);
          setChatSession(chat);
          
          // Complete
          setAnalysisProgress(100);
          setAnalysis(result);
          setAppState(AppState.RESULTS);
          
          analytics.trackAnalysisComplete(result.products?.length || 0);
          announce(`Analysis complete! Found ${result.products?.length || 0} organization recommendations.`, 'polite');
          playSound('success');
          
        } catch (apiError) {
          console.error('Analysis error:', apiError);
          
          analytics.track('analysis_failed', {
            stage: 'analyzing',
            error: apiError instanceof GeminiApiError ? apiError.code : 'UNKNOWN',
            isRetryable: apiError instanceof GeminiApiError ? apiError.isRetryable : false
          });
          
          if (apiError instanceof GeminiApiError) {
            setError(buildAppError(apiError.code, apiError.message, apiError.isRetryable));
          } else {
            setError(buildAppError('UNKNOWN', 'An unexpected error occurred. Please try again.', true));
          }
          setAppState(AppState.ERROR);
          announce(`Analysis failed: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`, 'assertive');
          playSound('error');
        } finally {
          setIsAnalyzing(false);
          setAnalysisProgress(0);
        }
      };
      
      reader.readAsDataURL(processedFile);
    } catch (err) {
      console.error('File handling error:', err);
      setError(buildAppError('PROCESSING_ERROR', 'Failed to process the image. Please try again.', true));
      setIsAnalyzing(false);
      setAppState(AppState.ERROR);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- analysisStage is intentionally excluded (stale closure)
  }, [announce, buildAppError, isAnalyzing, networkStatus.isOnline, parseDataUrl, playSound]);

  /**
   * Generate AI visualization of the organized room
   */
  const handleVisualize = useCallback(async () => {
    if (isVisualizing) return;

    if (!analysis?.visualizationPrompt) {
      setVisualizationError('Visualization instructions are missing. Please re-run the analysis.');
      return;
    }

    if (!uploadedImage) {
      setVisualizationError('Original image is not available. Please upload a new photo.');
      return;
    }

    if (!networkStatus.isOnline) {
      setVisualizationError(getErrorMessage('NETWORK_OFFLINE').description);
      announce('Visualization failed: no internet connection', 'assertive');
      return;
    }
    
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
        setVisualizationError(getErrorMessage(err.code).description ?? err.message);
      } else {
        setVisualizationError('Failed to generate visualization. Please try again.');
      }
    } finally {
      setIsVisualizing(false);
    }
  }, [analysis, announce, isVisualizing, networkStatus.isOnline, uploadedImage]);

  /**
   * Send a message in the chat
   */
  const handleSendMessage = useCallback(async (text: string) => {
    if (!chatSession) return;

    if (!networkStatus.isOnline) {
      const offlineMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: getErrorMessage('NETWORK_OFFLINE').description,
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => [...prev, offlineMsg]);
      return;
    }

    const validation = validateChatMessage(text);
    if (!validation.valid) {
      const invalidMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: validation.error || 'Please enter a valid message.',
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => [...prev, invalidMsg]);
      return;
    }
    
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
  }, [chatSession, networkStatus.isOnline]);

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
            setError(buildAppError(apiError.code, apiError.message, apiError.isRetryable));
          } else {
            setError(buildAppError('UNKNOWN', 'An unexpected error occurred. Please try again.', true));
          }
          setAppState(AppState.ERROR);
        })
        .finally(() => {
          setIsAnalyzing(false);
        });
    } else {
      resetApp();
    }
  }, [buildAppError, error, uploadedImage, resetApp]);

  const errorInfo = error ? getErrorMessage(error.code) : null;
  const errorTitle = error?.title ?? errorInfo?.title ?? 'Something Went Wrong';
  const errorMessage = error?.message ?? errorInfo?.description ?? '';
  const errorSuggestion = error?.suggestion ?? errorInfo?.suggestion;
  const isNetworkError = ['NETWORK_ERROR', 'NETWORK_OFFLINE', 'NETWORK_TIMEOUT'].includes(error?.code ?? '');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col font-sans transition-colors duration-300">
      {/* Header */}
      <header 
        className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50 transition-colors duration-300"
        role="banner"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <button 
            onClick={resetApp}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 rounded-lg p-1 flex-shrink-0"
            aria-label="ZenSpace - Return to home"
          >
            <LayoutGrid className="w-6 h-6 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            <span className="font-serif text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">ZenSpace</span>
          </button>
          
          <div className="flex items-center gap-1 sm:gap-3 overflow-x-auto flex-shrink min-w-0">
            {/* Network Status - hide on mobile when in results */}
            <span className="hidden sm:inline-flex">
              <NetworkStatus showIndicator={true} />
            </span>
            
            {/* Theme Toggle - hide on mobile in results view */}
            <span className={appState === AppState.RESULTS ? 'hidden sm:inline-flex' : ''}>
              <ThemeToggle />
            </span>
            
            {/* Session Manager - available on home and results */}
            {(appState === AppState.HOME || appState === AppState.RESULTS) && (
              <Suspense fallback={null}>
                <SessionManager
                  currentSessionId={currentSessionId}
                  onLoadSession={handleLoadSession}
                  onSaveSession={handleSaveSession}
                  hasUnsavedChanges={appState === AppState.RESULTS && !!analysis}
                />
              </Suspense>
            )}
            
            {appState === AppState.RESULTS && analysis && (
              <>
                <Suspense fallback={null}>
                  <ShareButton 
                    analysis={analysis.rawText} 
                    roomType="room"
                  />
                </Suspense>
                <button 
                  onClick={resetApp}
                  className="text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 rounded-lg px-2 sm:px-3 py-2 whitespace-nowrap"
                  aria-label="Start over with a new image"
                >
                  <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Start Over</span>
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
          <div className="bg-amber-50 dark:bg-amber-900/50 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-200 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3">
            <Clock className="w-5 h-5 flex-shrink-0" />
            <span className="text-sm font-medium">{rateLimitMessage}</span>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main 
        id="main-content"
        className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8"
        role="main"
      >
        
        {/* Home State */}
        {appState === AppState.HOME && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-slate-100 text-center mb-6 font-serif">
              From Chaos to Calm.
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400 text-center max-w-xl mb-12 leading-relaxed">
              Upload a photo of any messy room. Our AI will analyze it, give you a step-by-step decluttering plan, and answer your organization questions.
            </p>
            <UploadZone onImageSelected={handleImageSelected} isAnalyzing={isAnalyzing} />
            
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center opacity-80">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">Snap</div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Take a photo of your clutter</p>
              </div>
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">Analyze</div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Get a personalized plan</p>
              </div>
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">Organize</div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Chat for specific tips</p>
              </div>
            </div>
          </div>
        )}

        {/* Analyzing State - Enhanced with stage indicators */}
        {appState === AppState.ANALYZING && (
          <div 
            className="flex flex-col items-center justify-center min-h-[60vh]"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <AnalysisLoading 
              stage={analysisStage}
              progress={analysisProgress}
              className="max-w-md"
            />
          </div>
        )}

        {/* Error State */}
        {appState === AppState.ERROR && error && (
          <div 
            className="flex flex-col items-center justify-center min-h-[60vh] max-w-md mx-auto text-center"
            role="alert"
            aria-live="assertive"
          >
            <div className="bg-red-50 dark:bg-red-900/30 rounded-full p-4 mb-6">
              {isNetworkError ? (
                <WifiOff className="w-12 h-12 text-red-500 dark:text-red-400" aria-hidden="true" />
              ) : (
                <AlertCircle className="w-12 h-12 text-red-500 dark:text-red-400" aria-hidden="true" />
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
              {errorTitle}
            </h2>
            
            <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">
              {errorMessage}
            </p>

            {errorSuggestion && (
              <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
                {errorSuggestion}
              </p>
            )}
            
            {error.code === 'API_KEY_MISSING' ? (
              <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg p-4 text-sm text-amber-800 dark:text-amber-200 mb-6">
                <p className="font-medium mb-2">For Developers:</p>
                <p>Add <code className="bg-amber-100 dark:bg-amber-800/50 px-1 rounded">GEMINI_API_KEY</code> to your environment variables.</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4">
                {error.isRetryable && (
                  <button 
                    onClick={handleRetry}
                    className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                    aria-label="Try analyzing the image again"
                  >
                    <RefreshCw className="w-4 h-4" aria-hidden="true" />
                    Try Again
                  </button>
                )}
                <button 
                  onClick={resetApp}
                  className="bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
                  aria-label="Go back to home and start fresh"
                >
                  Start Fresh
                </button>
              </div>
            )}
            
            {/* Error code for debugging */}
            <p className="mt-8 text-xs text-slate-400 dark:text-slate-500">
              Error code: {error.code}
            </p>
          </div>
        )}

        {/* Results State */}
        {appState === AppState.RESULTS && analysis && (
          <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><AnalysisLoading stage="generating" progress={95} className="max-w-md" /></div>}>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
              {/* Left Column: Image & Analysis */}
              <div className="lg:col-span-7 space-y-8">
                {/* Image Preview Card */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden p-2 transition-colors duration-300">
                  {uploadedImage?.dataUrl ? (
                    <img 
                      src={uploadedImage.dataUrl} 
                      alt="Your uploaded room photo" 
                      className="w-full h-64 md:h-80 object-cover rounded-xl"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="w-full h-64 md:h-80 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300 text-sm">
                      Original image not available. Upload a new photo to view it here.
                    </div>
                  )}
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
                  originalImage={uploadedImage?.dataUrl}
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
          </Suspense>
        )}
      </main>

      {/* Footer - only on home */}
      {appState === AppState.HOME && (
        <footer className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          <p>Powered by Google Gemini AI</p>
        </footer>
      )}
    </div>
  );
}

/**
 * Main App component with all production enhancements
 */
export default function App() {
  return (
    <ErrorBoundary>
      <AccessibilityProvider>
        <SkipNavigation />
        <AppContent />
        <AccessibilityToolbar />
      </AccessibilityProvider>
    </ErrorBoundary>
  );
}
