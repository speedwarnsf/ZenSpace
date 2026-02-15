/**
 * UpgradePrompt — Clean, non-aggressive modal shown when free user taps a gated feature
 */

import { X, Sparkles } from 'lucide-react';

interface UpgradePromptProps {
  message: string;
  onUpgrade: () => void;
  onDismiss: () => void;
  onSignIn?: () => void;
}

export function UpgradePrompt({ message, onUpgrade, onDismiss, onSignIn }: UpgradePromptProps) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-sm mx-4 bg-stone-900 border border-stone-700 p-8 shadow-2xl text-center">
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-200 transition-colors"
          aria-label="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 bg-emerald-500/10 flex items-center justify-center mx-auto mb-5">
          <Sparkles className="w-6 h-6 text-emerald-400" />
        </div>

        <p className="text-stone-300 text-sm mb-4">{message}</p>
        <div className="text-left space-y-2 mb-6 border-t border-stone-700 pt-4">
          <p className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-2">Pro includes</p>
          <p className="text-sm text-stone-300">50 designs / month</p>
          <p className="text-sm text-stone-300">100 iterations / month</p>
          <p className="text-sm text-stone-300">Design Studio access</p>
          <p className="text-sm text-stone-300">10 saved rooms</p>
          <p className="text-sm text-stone-300">PDF export and high-res downloads</p>
        </div>

        <button
          onClick={onUpgrade}
          className="w-full px-6 py-3 bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors mb-3"
        >
          Upgrade to Pro
        </button>
        {onSignIn && (
          <button
            onClick={onSignIn}
            className="w-full text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors py-2 mb-1"
          >
            Already have an account? Sign in
          </button>
        )}
        <button
          onClick={onDismiss}
          className="w-full text-stone-500 hover:text-stone-300 text-sm transition-colors py-2"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
