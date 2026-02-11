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
const DesignOptionsView = lazy(() => import('./components/DesignOptionsView').then(m => ({ default: m.DesignOptionsView })));
const DesignDetailView = lazy(() => import('./components/DesignOptionsView').then(m => ({ default: m.DesignDetailView })));
const MyRoomsGallery = lazy(() => import('./components/MyRoomsGallery').then(m => ({ default: m.MyRoomsGallery })));
const Lookbook = lazy(() => import('./components/Lookbook'));
import { 
  analyzeImage, 
  createChatSession, 
  generateRoomVisualization,
  generateDesignOptions,
  generateDesignVisualization,
  isApiConfigured,
  GeminiApiError
} from './services/geminiService';
import { compressImage } from './services/imageCompression';
import { rateLimiter } from './services/rateLimiter';
import { saveSession, SavedSession } from './services/sessionStorage';
import { saveRoom, SavedRoom, getRoomCount } from './services/roomStorage';
import { saveLookbook, loadLookbook, clearLookbook, saveRoomImage, loadRoomImage, saveVisualizationImage, loadAllVisualizationImages } from './services/lookbookStorage';
import { validateImageFile, preprocessImage } from './services/edgeCaseHandlers';
import { analytics } from './services/analytics';
import { getErrorMessage } from './services/errorMessages';
import { validateChatMessage } from './services/validation';
import { AnalysisResult, AppState, ChatMessage, AppError, UploadedImage, DesignAnalysis, DesignOption, ShoppingListData, FlowMode, LookbookEntry, DesignRating } from './types';
import { generateShoppingList, shoppingListFromProducts } from './services/shoppingListGenerator';
import { Chat } from '@google/genai';
import { ModeSelect } from './components/ModeSelect';
import { LayoutGrid, ArrowLeft, AlertCircle, RefreshCw, WifiOff, Clock, Home } from 'lucide-react';

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
  
  // Design options state (V2 flow)
  const [designAnalysis, setDesignAnalysis] = useState<DesignAnalysis | null>(null);
  const [selectedDesignIndex, setSelectedDesignIndex] = useState<number | null>(null);
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false);
  const [isVisualizingDesign, setIsVisualizingDesign] = useState(false);
  const [shoppingList, setShoppingList] = useState<ShoppingListData | null>(null);
  const [lookbookEntries, setLookbookEntries] = useState<LookbookEntry[]>([]);

  // Error state
  const [error, setError] = useState<AppError | null>(null);
  
  // Session state
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(undefined);
  const [currentRoomId, setCurrentRoomId] = useState<string | undefined>(undefined);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [rateLimitMessage, setRateLimitMessage] = useState<string | null>(null);

  // Enhanced state for production features
  const [analysisStage, setAnalysisStage] = useState<'uploading' | 'processing' | 'analyzing' | 'generating' | 'visualizing'>('uploading');
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

  // Restore lookbook from localStorage on mount
  const [hasSavedLookbook, setHasSavedLookbook] = useState(false);
  useEffect(() => {
    const saved = loadLookbook();
    if (saved && saved.length > 0) {
      setHasSavedLookbook(true);
    }
  }, []);

  // Persist lookbook entries to localStorage (metadata only)
  useEffect(() => {
    if (lookbookEntries.length > 0) {
      saveLookbook(lookbookEntries);
      setHasSavedLookbook(true);
    }
  }, [lookbookEntries]);

  // Persist visualization images to IndexedDB
  useEffect(() => {
    lookbookEntries.forEach(entry => {
      if (entry.option.visualizationImage) {
        saveVisualizationImage(entry.id, entry.option.visualizationImage);
      }
    });
  }, [lookbookEntries]);

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

          // Go to mode selection — no AI call yet
          setAnalysisProgress(100);
          setAppState(AppState.MODE_SELECT);
          announce('Photo ready! Choose how to transform your space.', 'polite');
          playSound('success');
          
        } catch (readError) {
          console.error('Image processing error:', readError);
          setError(buildAppError('UNKNOWN', 'An unexpected error occurred. Please try again.', true));
          setAppState(AppState.ERROR);
          announce('Failed to process image', 'assertive');
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
    setDesignAnalysis(null);
    setSelectedDesignIndex(null);
    setShoppingList(null);
    setCurrentRoomId(undefined);
    setLookbookEntries([]);
    clearLookbook();
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
   * Save current state as a room project
   */
  const handleSaveRoom = useCallback(async () => {
    if (!uploadedImage || !designAnalysis || selectedDesignIndex === null) return;
    try {
      const room = await saveRoom(
        uploadedImage,
        designAnalysis,
        selectedDesignIndex,
        shoppingList || undefined,
        currentRoomId
      );
      setCurrentRoomId(room.id);
    } catch (err) {
      console.error('Failed to save room:', err);
    }
  }, [uploadedImage, designAnalysis, selectedDesignIndex, shoppingList, currentRoomId]);

  /**
   * Load a room from the gallery
   */
  const handleLoadRoom = useCallback((room: SavedRoom, designIndex: number) => {
    const design = room.designs[designIndex];
    if (!design) return;
    
    // Restore design analysis
    const restoredOptions = room.designs.map(d => ({
      name: d.name,
      mood: d.mood,
      frameworks: [] as any,
      palette: d.palette,
      keyChanges: d.keyChanges,
      fullPlan: '',
      visualizationPrompt: '',
      visualizationImage: d.visualizationImage,
    })) as [DesignOption, DesignOption, DesignOption];
    
    setDesignAnalysis({ roomReading: room.roomReading, options: restoredOptions });
    setSelectedDesignIndex(designIndex);
    setCurrentRoomId(room.id);
    
    // Set analysis for results view
    setAnalysis({
      rawText: `## ${design.name}\n\n*${design.mood}*`,
      visualizationPrompt: '',
      products: []
    });
    setVisualizationImage(design.visualizationImage || null);
    setShoppingList(design.shoppingList || null);
    
    // Restore image
    setUploadedImage({
      dataUrl: room.imageDataUrl,
      base64: room.imageDataUrl.split(',')[1] || '',
      mimeType: 'image/jpeg',
      fileName: 'room.jpg'
    });
    
    const chat = createChatSession(`Design: ${design.name}\n\n${design.mood}`);
    setChatSession(chat);
    setMessages([]);
    setAppState(AppState.RESULTS);
  }, []);

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
          // Generate basic shopping list from products
          if (result.products?.length) {
            const sid = currentSessionId || `session-${Date.now()}`;
            setShoppingList(shoppingListFromProducts(result.products, sid));
          }
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

  /**
   * Handle selecting one of the 3 design options
   */
  const handleSelectDesign = useCallback((index: number) => {
    setSelectedDesignIndex(index);
    if (designAnalysis && designAnalysis.options[index]) {
      const opt = designAnalysis.options[index]!;
      // Create a chat session scoped to this design
      const chat = createChatSession(
        `Design: ${opt.name}\n\n${opt.fullPlan}\n\nRoom Reading:\n${designAnalysis.roomReading}`
      );
      setChatSession(chat);
      // Build a legacy AnalysisResult for the results view
      setAnalysis({
        rawText: `## ${opt.name}\n\n*${opt.mood}*\n\n${opt.fullPlan}`,
        visualizationPrompt: opt.visualizationPrompt,
        products: []
      });
      setVisualizationImage(opt.visualizationImage || null);
      setAppState(AppState.RESULTS);
      // Generate shopping list for this design in the background
      const sid = currentSessionId || `session-${Date.now()}`;
      generateShoppingList(
        opt.name,
        opt.mood,
        opt.fullPlan,
        designAnalysis.roomReading,
        sid
      ).then(setShoppingList).catch(err => console.error('Shopping list error:', err));
    }
  }, [designAnalysis, currentSessionId]);

  /**
   * Go back from detail to 3-options view
   */
  const handleBackToOptions = useCallback(() => {
    setSelectedDesignIndex(null);
    setAppState(AppState.DESIGN_OPTIONS);
  }, []);

  /**
   * Handle rating a lookbook entry
   */
  const handleRate = useCallback((entryId: string, rating: DesignRating) => {
    setLookbookEntries(prev => prev.map(e =>
      e.id === entryId ? { ...e, rating } : e
    ));
  }, []);

  /**
   * Generate more designs for the lookbook
   */
  const handleGenerateMore = useCallback(async () => {
    if (!uploadedImage) return;
    setIsGeneratingVisuals(true);
    try {
      const previousNames = lookbookEntries.map(e => `${e.option.name}: ${e.option.mood}`);
      const newBatch = await generateDesignOptions(uploadedImage.base64, uploadedImage.mimeType, previousNames);
      const batchIndex = Math.max(0, ...lookbookEntries.map(e => e.batchIndex)) + 1;
      const newEntries: LookbookEntry[] = newBatch.options.map((opt, idx) => ({
        id: `design-${Date.now()}-${idx}`,
        option: opt,
        rating: null,
        generatedAt: Date.now(),
        batchIndex,
      }));
      setLookbookEntries(prev => [...newEntries, ...prev]);
      newEntries.forEach((entry) => {
        generateDesignVisualization(
          entry.option.visualizationPrompt,
          uploadedImage.base64,
          uploadedImage.mimeType
        ).then(img => {
          setLookbookEntries(prev => prev.map(e =>
            e.id === entry.id ? { ...e, option: { ...e.option, visualizationImage: img } } : e
          ));
        }).catch(err => console.warn(`Viz failed for ${entry.id}`, err));
      });
    } catch (err) {
      console.error('Generate more failed:', err);
    } finally {
      setIsGeneratingVisuals(false);
    }
  }, [uploadedImage, lookbookEntries]);

  /**
   * Go deeper on a lookbook entry — transition to results
   */
  const handleSelectForIteration = useCallback((entryId: string) => {
    const entry = lookbookEntries.find(e => e.id === entryId);
    if (!entry) return;
    // Find the index in the design analysis if available, or create one
    if (designAnalysis) {
      const idx = designAnalysis.options.findIndex(o => o.name === entry.option.name);
      if (idx >= 0) {
        handleSelectDesign(idx);
        return;
      }
    }
    // Fallback: create ad-hoc analysis result
    const opt = entry.option;
    const chat = createChatSession(`Design: ${opt.name}\n\n${opt.fullPlan}`);
    setChatSession(chat);
    setAnalysis({
      rawText: `## ${opt.name}\n\n*${opt.mood}*\n\n${opt.fullPlan}`,
      visualizationPrompt: opt.visualizationPrompt,
      products: []
    });
    setVisualizationImage(opt.visualizationImage || null);
    setMessages([]);
    setAppState(AppState.RESULTS);
  }, [lookbookEntries, designAnalysis, handleSelectDesign]);

  /**
   * Handle mode selection (Clean vs Redesign)
   */
  const handleModeSelect = useCallback(async (mode: FlowMode) => {
    if (!uploadedImage) return;

    setAppState(AppState.ANALYZING);
    setIsAnalyzing(true);
    setError(null);

    try {
      if (mode === 'clean') {
        setAnalysisStage('analyzing');
        setAnalysisProgress(50);
        analytics.trackAnalysisStart();
        announce('Analyzing your space for decluttering...', 'polite');

        const result = await analyzeImage(uploadedImage.base64, uploadedImage.mimeType);
        setAnalysis(result);
        const chat = createChatSession(result.rawText);
        setChatSession(chat);
        setAppState(AppState.RESULTS);
        analytics.trackAnalysisComplete(1);
        announce('Analysis complete! Here is your decluttering plan.', 'polite');
        playSound('success');

        if (result.products?.length) {
          const sid = currentSessionId || `session-${Date.now()}`;
          setShoppingList(shoppingListFromProducts(result.products, sid));
        }
      } else {
        // Redesign flow
        setAnalysisStage('analyzing');
        setAnalysisProgress(5);
        analytics.trackAnalysisStart();
        announce('Analyzing room through design theory frameworks', 'polite');

        // Smooth progress: tick up gradually, slow down as it approaches 85%
        let prog = 5;
        const progressInterval = setInterval(() => {
          prog += Math.max(0.5, (85 - prog) * 0.04);
          if (prog > 85) prog = 85;
          setAnalysisProgress(Math.round(prog));
        }, 300);

        const designResult = await generateDesignOptions(uploadedImage.base64, uploadedImage.mimeType);
        clearInterval(progressInterval);
        setAnalysisProgress(60);
        setDesignAnalysis(designResult);
        setSelectedDesignIndex(null);

        // Generate all visualizations BEFORE showing the lookbook
        setAnalysisStage('visualizing');
        let vizDone = 0;
        const totalViz = designResult.options.length;

        const entriesWithImages: LookbookEntry[] = designResult.options.map((opt, idx) => ({
          id: `design-${Date.now()}-${idx}`,
          option: opt,
          rating: null,
          generatedAt: Date.now(),
          batchIndex: 0,
        }));

        // Generate visualizations in parallel, update progress as each completes
        await Promise.allSettled(
          entriesWithImages.map(async (entry, idx) => {
            try {
              const img = await generateDesignVisualization(
                entry.option.visualizationPrompt,
                uploadedImage.base64,
                uploadedImage.mimeType
              );
              entriesWithImages[idx] = { ...entry, option: { ...entry.option, visualizationImage: img } };
              // Also update designResult
              (designResult.options[idx] as any).visualizationImage = img;
            } catch (e) {
              console.warn(`Visualization for option ${idx} failed`, e);
            } finally {
              vizDone++;
              setAnalysisProgress(60 + Math.round((vizDone / totalViz) * 35));
            }
          })
        );

        setAnalysisProgress(100);
        setDesignAnalysis({ ...designResult });
        setLookbookEntries(entriesWithImages);
        if (uploadedImage) saveRoomImage(uploadedImage.dataUrl);
        setAppState(AppState.LOOKBOOK);
        analytics.trackAnalysisComplete(3);
        announce('Your lookbook is ready.', 'polite');
        playSound('success');
      }
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
  }, [uploadedImage, announce, playSound, buildAppError, currentSessionId]);

  /**
   * Generate visualization for a specific design option on the detail page
   */
  const handleVisualizeDesign = useCallback(async () => {
    if (selectedDesignIndex === null || !designAnalysis || !uploadedImage) return;
    const opt = designAnalysis.options[selectedDesignIndex];
    if (!opt) return;
    setIsVisualizingDesign(true);
    try {
      const img = await generateDesignVisualization(
        opt.visualizationPrompt,
        uploadedImage.base64,
        uploadedImage.mimeType
      );
      setDesignAnalysis(prev => {
        if (!prev) return prev;
        const updated = { ...prev, options: [...prev.options] as [DesignOption, DesignOption, DesignOption] };
        updated.options[selectedDesignIndex] = Object.assign({}, updated.options[selectedDesignIndex], { visualizationImage: img }) as DesignOption;
        return updated;
      });
      setVisualizationImage(img);
    } catch (e) {
      console.error('Design visualization failed', e);
    } finally {
      setIsVisualizingDesign(false);
    }
  }, [selectedDesignIndex, designAnalysis, uploadedImage]);

  /**
   * Resume a saved lookbook from localStorage
   */
  const handleResumeLookbook = useCallback(async () => {
    const saved = loadLookbook();
    if (saved && saved.length > 0) {
      // Hydrate entries with visualization images from IndexedDB
      const imageMap = await loadAllVisualizationImages(saved.map(e => e.id));
      const hydrated = saved.map(entry => ({
        ...entry,
        option: {
          ...entry.option,
          visualizationImage: imageMap.get(entry.id) || entry.option.visualizationImage || undefined,
        },
      }));
      setLookbookEntries(hydrated);
      // Try to restore the room image from IndexedDB
      const roomImg = await loadRoomImage();
      if (roomImg) {
        const parsed = parseDataUrl(roomImg);
        if (parsed) {
          setUploadedImage({
            dataUrl: roomImg,
            base64: parsed.base64,
            mimeType: parsed.mimeType,
            fileName: 'room.jpg',
          });
        }
      }
      setAppState(AppState.LOOKBOOK);
    }
  }, [parseDataUrl]);

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
            {(appState === AppState.MODE_SELECT || appState === AppState.DESIGN_OPTIONS || appState === AppState.LOOKBOOK) && (
              <button 
                onClick={resetApp}
                className="text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800 rounded-lg px-2 sm:px-3 py-2 whitespace-nowrap"
                aria-label="Start over with a new image"
              >
                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Start Over</span>
              </button>
            )}
            {/* My Rooms gallery button */}
            {(appState === AppState.HOME || appState === AppState.RESULTS || appState === AppState.MODE_SELECT || appState === AppState.DESIGN_OPTIONS || appState === AppState.LOOKBOOK) && (
              <button
                onClick={() => setIsGalleryOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                title="My Rooms"
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">My Rooms</span>
              </button>
            )}
            {/* Save Room button */}
            {appState === AppState.RESULTS && designAnalysis && selectedDesignIndex !== null && uploadedImage && (
              <button
                onClick={handleSaveRoom}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 ${
                  currentRoomId
                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                }`}
                title={currentRoomId ? 'Update Room' : 'Save Room'}
              >
                <Home className="w-4 h-4" />
                <span className="hidden sm:inline">{currentRoomId ? 'Update' : 'Save Room'}</span>
              </button>
            )}
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
              Upload a photo of any room. Choose to declutter and organize — or get bold redesign concepts from world-class design thinkers.
            </p>
            <UploadZone onImageSelected={handleImageSelected} isAnalyzing={isAnalyzing} />
            
            {hasSavedLookbook && (
              <button
                onClick={handleResumeLookbook}
                className="mt-6 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-sm font-medium flex items-center gap-2"
              >
                <LayoutGrid className="w-4 h-4 text-emerald-500" />
                You have saved designs. Resume your lookbook?
              </button>
            )}
            <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center opacity-80">
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">Snap</div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Take a photo of your room</p>
              </div>
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">Choose</div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Clean it up or redesign it</p>
              </div>
              <div>
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-2">Transform</div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Get your personalized plan</p>
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

        {/* Mode Selection State */}
        {appState === AppState.MODE_SELECT && (
          <ModeSelect
            onSelectMode={handleModeSelect}
            uploadedImage={uploadedImage?.dataUrl ?? null}
          />
        )}

        {/* Design Options State (V2 — 3 cards) */}
        {appState === AppState.DESIGN_OPTIONS && designAnalysis && (
          <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><AnalysisLoading stage="generating" progress={95} className="max-w-md" /></div>}>
            <DesignOptionsView
              roomReading={designAnalysis.roomReading}
              options={designAnalysis.options}
              onSelectDesign={handleSelectDesign}
              isGeneratingVisuals={isGeneratingVisuals}
            />
          </Suspense>
        )}

        {/* Lookbook State */}
        {appState === AppState.LOOKBOOK && (
          <Suspense fallback={<div className="flex items-center justify-center min-h-[40vh]"><AnalysisLoading stage="generating" progress={95} className="max-w-md" /></div>}>
            <Lookbook
              entries={lookbookEntries}
              onRate={handleRate}
              onSelectForIteration={handleSelectForIteration}
              onGenerateMore={handleGenerateMore}
              isGenerating={isGeneratingVisuals}
              uploadedImageUrl={uploadedImage?.dataUrl || null}
            />
          </Suspense>
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
                {/* Back to designs button when in design flow */}
                {designAnalysis && (
                  <button
                    onClick={handleBackToOptions}
                    className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors text-sm font-medium"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back to 3 Designs
                  </button>
                )}
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
                  shoppingList={shoppingList}
                  sessionId={currentSessionId}
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

      {/* My Rooms Gallery Modal */}
      <Suspense fallback={null}>
        <MyRoomsGallery
          isOpen={isGalleryOpen}
          onClose={() => setIsGalleryOpen(false)}
          onLoadRoom={handleLoadRoom}
        />
      </Suspense>
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
