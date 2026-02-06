import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader } from 'lucide-react';
import { ChatMessage } from '../types';
import ReactMarkdown from 'react-markdown';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isTyping: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isTyping }) => {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-[600px] bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-emerald-50/50 flex items-center gap-2">
        <Bot className="w-5 h-5 text-emerald-600" />
        <h3 className="font-semibold text-slate-800">Chat with ZenSpace AI</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
            <div className="text-center text-slate-400 mt-10">
                <p>Ask me anything about organizing your room!</p>
                <p className="text-sm mt-2">"Where should I put the shoes?"</p>
                <p className="text-sm">"Suggest a color for the bins."</p>
            </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed
                ${msg.role === 'user' 
                  ? 'bg-emerald-600 text-white rounded-br-none' 
                  : 'bg-slate-100 text-slate-800 rounded-bl-none'
                }
              `}
            >
              <div className="flex items-center gap-2 mb-1 opacity-80 text-xs font-medium">
                 {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                 <span>{msg.role === 'user' ? 'You' : 'ZenSpace'}</span>
              </div>
              <ReactMarkdown className={`prose prose-sm max-w-none ${msg.role === 'user' ? 'prose-invert' : ''}`}>
                {msg.text}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start w-full">
             <div className="bg-slate-100 rounded-2xl rounded-bl-none p-4 flex items-center gap-2">
                <Loader className="w-4 h-4 animate-spin text-slate-400" />
                <span className="text-xs text-slate-500">Thinking...</span>
             </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-100 bg-white">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up question..."
            className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none transition-all text-slate-700"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="absolute right-2 top-2 p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
