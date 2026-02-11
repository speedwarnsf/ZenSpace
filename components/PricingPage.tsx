/**
 * PricingPage — Two-card pricing with Stripe Checkout integration
 */

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { createCheckoutSession } from '../services/subscription';
import { X, Check, Sparkles } from 'lucide-react';

interface PricingPageProps {
  onClose: () => void;
  onNeedAuth: () => void;
}

const FEATURES = [
  'Unlimited design generations',
  'Iteration mode & Design Studio',
  'Save up to 10 rooms',
  'PDF export & high-res downloads',
  'Product recommendations',
  'Whole-house coordination',
];

export function PricingPage({ onClose, onNeedAuth }: PricingPageProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState<'monthly' | 'annual' | null>(null);

  const handleCheckout = async (plan: 'monthly' | 'annual') => {
    if (!user) {
      onNeedAuth();
      return;
    }
    setLoading(plan);
    try {
      const url = await createCheckoutSession(plan);
      window.location.href = url;
    } catch (e) {
      console.error('Checkout error:', e);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8">
      <div className="relative w-full max-w-2xl mx-4">
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          aria-label="Close pricing"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">ZenSpace Pro</span>
          </div>
          <h2 className="text-3xl font-serif font-bold text-white mb-2">
            Transform every room
          </h2>
          <p className="text-slate-400">
            Unlimited designs, iterations, and professional tools
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          {/* Monthly */}
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-1">Monthly</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-white">$10</span>
              <span className="text-slate-400">/mo</span>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout('monthly')}
              disabled={!!loading}
              className="w-full py-3 rounded-xl bg-slate-700 text-white font-medium hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              {loading === 'monthly' ? 'Loading...' : 'Get Monthly'}
            </button>
          </div>

          {/* Annual */}
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 flex flex-col relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-600 text-white text-xs font-medium">
              Save 33%
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Annual</h3>
            <div className="mb-4">
              <span className="text-3xl font-bold text-white">$80</span>
              <span className="text-slate-400">/yr</span>
              <span className="text-slate-500 text-sm ml-2 line-through">$120</span>
            </div>
            <ul className="space-y-2 mb-6 flex-1">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout('annual')}
              disabled={!!loading}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors disabled:opacity-50"
            >
              {loading === 'annual' ? 'Loading...' : 'Get Annual'}
            </button>
          </div>
        </div>

        {/* Start Free */}
        <div className="text-center mb-4">
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm transition-colors"
          >
            Start free — 3 designs included
          </button>
        </div>

        {/* Rate limits — tiny, low contrast, bottom */}
        <p className="text-center" style={{ fontSize: '10px', color: 'rgba(148,163,184,0.35)', lineHeight: '1.4' }}>
          Pro includes 50 generations/mo, 100 iterations/mo, 10 saved rooms. Free tier: 3 lifetime generations, 1 room.
        </p>
      </div>
    </div>
  );
}
