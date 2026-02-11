/**
 * UserMenu — Avatar/menu in header for logged-in users, Pro badge
 */

import { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { LogOut, Crown, User as UserIcon } from 'lucide-react';

interface UserMenuProps {
  onOpenPricing: () => void;
  onOpenAuth?: () => void;
}

export function UserMenu({ onOpenPricing, onOpenAuth }: UserMenuProps) {
  const { user, userTier, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) {
    return (
      <button
        onClick={() => {
          if (onOpenAuth) onOpenAuth();
          else onOpenPricing();
        }}
        className="fixed bottom-5 right-5 z-40 w-10 h-10 rounded-full bg-slate-800/80 dark:bg-slate-700/80 backdrop-blur-sm border border-slate-600/50 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 dark:hover:bg-slate-600 transition-all shadow-lg"
        aria-label="Sign in"
      >
        <UserIcon className="w-4 h-4" />
      </button>
    );
  }

  const initials = (user.user_metadata?.full_name || user.email || '?')
    .split(' ')
    .map((s: string) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        {userTier.tier === 'pro' && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
            <Crown className="w-3 h-3" />
            Pro
          </span>
        )}
        {avatarUrl ? (
          <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full border border-slate-600" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-medium text-slate-300">
            {initials}
          </div>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-1 z-50">
          <div className="px-4 py-2 border-b border-slate-700">
            <p className="text-sm text-white font-medium truncate">{user.user_metadata?.full_name || 'User'}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
          {userTier.tier === 'free' && (
            <button
              onClick={() => { setOpen(false); onOpenPricing(); }}
              className="w-full px-4 py-2 text-left text-sm text-emerald-400 hover:bg-slate-700 flex items-center gap-2 transition-colors"
            >
              <Crown className="w-4 h-4" />
              Upgrade to Pro
            </button>
          )}
          <button
            onClick={async () => { setOpen(false); await signOut(); }}
            className="w-full px-4 py-2 text-left text-sm text-slate-300 hover:bg-slate-700 flex items-center gap-2 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
