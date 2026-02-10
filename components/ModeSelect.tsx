import { Sparkles, Palette } from 'lucide-react';
import type { FlowMode } from '../types';

interface ModeSelectProps {
  onSelectMode: (mode: FlowMode) => void;
  uploadedImage: string | null;
}

export function ModeSelect({ onSelectMode, uploadedImage }: ModeSelectProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Thumbnail */}
      {uploadedImage && (
        <div className="mb-8">
          <img
            src={uploadedImage}
            alt="Your uploaded room"
            className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-2xl shadow-md border-2 border-slate-200 dark:border-slate-700"
          />
        </div>
      )}

      <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-slate-100 text-center mb-3 font-serif">
        What would you like to do?
      </h2>
      <p className="text-slate-500 dark:text-slate-400 text-center mb-10 max-w-md">
        Choose a path for your space
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 w-full max-w-2xl">
        {/* Clean My Space */}
        <button
          onClick={() => onSelectMode('clean')}
          className="group relative bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-emerald-400 dark:hover:border-emerald-500 p-8 text-left transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          <div className="bg-emerald-100 dark:bg-emerald-900/40 rounded-xl w-14 h-14 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
            <Sparkles className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-serif mb-2">
            Clean My Space
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Get a step-by-step decluttering plan and organization tips
          </p>
        </button>

        {/* Redesign My Space */}
        <button
          onClick={() => onSelectMode('redesign')}
          className="group relative bg-white dark:bg-slate-800 rounded-2xl border-2 border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-500 p-8 text-left transition-all duration-300 hover:shadow-lg hover:shadow-violet-500/10 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
        >
          <div className="bg-violet-100 dark:bg-violet-900/40 rounded-xl w-14 h-14 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300">
            <Palette className="w-7 h-7 text-violet-600 dark:text-violet-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 font-serif mb-2">
            Redesign My Space
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            Get 3 bold design directions from world-class design thinkers
          </p>
        </button>
      </div>
    </div>
  );
}
