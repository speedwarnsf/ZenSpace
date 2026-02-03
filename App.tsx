import React, { useState } from 'react';
import { UploadZone } from './components/UploadZone';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { ChatInterface } from './components/ChatInterface';
import { analyzeImage, createChatSession, generateRoomVisualization } from './services/geminiService';
import { AnalysisResult, AppState, ChatMessage } from './types';
import { Chat } from '@google/genai';
import { LayoutGrid, ArrowLeft } from 'lucide-react';

export default function App() {
  const [appState, setAppState] = useState<AppState>(AppState.HOME);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [visualizationImage, setVisualizationImage] = useState<string | null>(null);
  const [isVisualizing, setIsVisualizing] = useState(false);
  
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isChatTyping, setIsChatTyping] = useState(false);

  const handleImageSelected = async (file: File) => {
    try {
      setIsAnalyzing(true);
      setAppState(AppState.ANALYZING);

      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1]; // Remove data URL prefix
        
        setUploadedImage(base64String);

        try {
          // 1. Analyze Image
          const result = await analyzeImage(base64Data, file.type);
          setAnalysis(result);

          // 2. Initialize Chat Session with context
          const chat = createChatSession(result.rawText);
          setChatSession(chat);
          
          setAppState(AppState.RESULTS);
        } catch (error) {
          console.error(error);
          setAppState(AppState.ERROR);
        } finally {
          setIsAnalyzing(false);
        }
      };
    } catch (error) {
      console.error(error);
      setIsAnalyzing(false);
      setAppState(AppState.ERROR);
    }
  };

  const handleVisualize = async () => {
    if (!analysis?.visualizationPrompt || isVisualizing || !uploadedImage) return;
    
    try {
      setIsVisualizing(true);
      
      // Parse the stored Data URL to get mimeType and base64 data
      const matches = uploadedImage.match(/^data:(.+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
          throw new Error("Invalid image data found in state.");
      }
      const mimeType = matches[1];
      const base64Data = matches[2];

      const base64Image = await generateRoomVisualization(analysis.visualizationPrompt, base64Data, mimeType);
      setVisualizationImage(base64Image);
    } catch (error) {
      console.error("Visualization failed", error);
      // Could add toast here
    } finally {
      setIsVisualizing(false);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!chatSession) return;

    // Add user message
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
        text: responseText || "I'm sorry, I couldn't generate a response.",
        timestamp: Date.now(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      console.error("Chat error", error);
      // Handle error nicely in chat
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
  };

  const resetApp = () => {
    setAppState(AppState.HOME);
    setAnalysis(null);
    setUploadedImage(null);
    setVisualizationImage(null);
    setMessages([]);
    setChatSession(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
            <LayoutGrid className="w-6 h-6 text-emerald-600" />
            <span className="font-serif text-xl font-bold text-slate-800 tracking-tight">ZenSpace</span>
          </div>
          {appState === AppState.RESULTS && (
             <button 
              onClick={resetApp}
              className="text-sm text-slate-600 hover:text-emerald-600 flex items-center gap-1 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Start Over
             </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Home State */}
        {appState === AppState.HOME && (
          <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 text-center mb-6 font-serif">
              From Chaos to Calm.
            </h1>
            <p className="text-lg text-slate-600 text-center max-w-xl mb-12 leading-relaxed">
              Upload a photo of any messy room. Our AI will analyze it, give you a step-by-step decluttering plan, and answer your organization questions.
            </p>
            <UploadZone onImageSelected={handleImageSelected} isAnalyzing={false} />
            
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
          <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <UploadZone onImageSelected={() => {}} isAnalyzing={true} />
            <p className="mt-6 text-slate-500 animate-pulse"> analyzing visual details...</p>
          </div>
        )}

        {/* Error State */}
        {appState === AppState.ERROR && (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-red-600 mb-4">Oops! Something went wrong.</h2>
            <p className="text-slate-600 mb-8">We couldn't process your image. Please try again.</p>
            <button 
              onClick={resetApp}
              className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
            >
              Try Again
            </button>
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
                  src={uploadedImage || ''} 
                  alt="Uploaded room" 
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
    </div>
  );
}