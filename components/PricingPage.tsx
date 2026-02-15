/**
 * PricingPage — Premium two-card pricing with compelling Pro value proposition
 */

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { createCheckoutSession } from '../services/subscription';
import { X, Check, Sparkles, Zap, Layers, Download, Home, Palette, ArrowRight } from 'lucide-react';

interface PricingPageProps {
  onClose: () => void;
  onNeedAuth: () => void;
}

const PRO_FEATURES = [
  { icon: Zap, text: '50 design generations per month', highlight: true },
  { icon: Layers, text: '100 design iterations per month', highlight: true },
  { icon: Palette, text: 'Design Studio — refine any concept', highlight: false },
  { icon: Home, text: 'Save up to 10 rooms', highlight: false },
  { icon: Download, text: 'PDF export and high-res downloads', highlight: false },
  { icon: Sparkles, text: 'Product recommendations with shopping lists', highlight: false },
];

const FREE_LIMITS = [
  '3 lifetime design generations',
  '1 saved room',
  'No Design Studio access',
  'No PDF export',
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-6 px-4">
      <div className="relative w-full max-w-3xl">
        <button
          onClick={onClose}
          className="absolute -top-2 -right-2 z-10 w-8 h-8 bg-stone-800 border border-stone-600 flex items-center justify-center text-stone-400 hover:text-white transition-colors"
          aria-label="Close pricing"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">ZenSpace Pro</span>
          </div>
          <h2 style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl sm:text-4xl font-bold text-white mb-3">
            Transform every room in your home
          </h2>
          <p className="text-stone-400 max-w-lg mx-auto">
            Unlimited design exploration, professional-grade tools, and the full power of AI-driven interior design
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {/* Monthly */}
          <div className="bg-stone-900 border border-stone-700 p-6 sm:p-8 flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-1">Monthly</h3>
            <p className="text-stone-500 text-sm mb-4">Perfect for a single project</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$10</span>
              <span className="text-stone-400">/mo</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f.text} className="flex items-start gap-2.5 text-sm text-stone-300">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className={f.highlight ? 'font-medium text-white' : ''}>{f.text}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout('monthly')}
              disabled={!!loading}
              className="w-full py-3 bg-stone-700 text-white font-medium hover:bg-stone-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading === 'monthly' ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>Get Monthly <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>

          {/* Annual — recommended */}
          <div className="bg-stone-900 border-2 border-emerald-500/40 p-6 sm:p-8 flex flex-col relative shadow-[0_0_30px_rgba(16,185,129,0.1)]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider">
              Best Value — Save 33%
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">Annual</h3>
            <p className="text-stone-500 text-sm mb-4">For design enthusiasts</p>
            <div className="mb-6">
              <span className="text-4xl font-bold text-white">$80</span>
              <span className="text-stone-400">/yr</span>
              <span className="text-stone-500 text-sm ml-2 line-through">$120</span>
              <span className="text-emerald-400 text-sm ml-2">$6.67/mo</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {PRO_FEATURES.map((f) => (
                <li key={f.text} className="flex items-start gap-2.5 text-sm text-stone-300">
                  <Check className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                  <span className={f.highlight ? 'font-medium text-white' : ''}>{f.text}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout('annual')}
              disabled={!!loading}
              className="w-full py-3 bg-emerald-600 text-white font-semibold hover:bg-emerald-500 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
            >
              {loading === 'annual' ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <>Get Annual <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        </div>

        {/* Free tier comparison */}
        <div className="bg-stone-900/50 border border-stone-800 p-5 mb-6">
          <h4 className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-3">Free tier includes</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {FREE_LIMITS.map(limit => (
              <span key={limit} className="text-xs text-stone-500">{limit}</span>
            ))}
          </div>
        </div>

        {/* Start Free */}
        <div className="text-center mb-4">
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 text-sm transition-colors"
          >
            Continue with free tier -- 3 designs included
          </button>
        </div>

        {/* Fine print */}
        <p className="text-center" style={{ fontSize: '10px', color: 'rgba(148,163,184,0.35)', lineHeight: '1.4' }}>
          Cancel anytime. Pro includes 50 generations/mo, 100 iterations/mo, 10 saved rooms. Free tier: 3 lifetime generations, 1 room.
        </p>
      </div>
    </div>
  );
}
