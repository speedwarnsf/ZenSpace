import { useState, useCallback } from 'react';
import { Share2, Copy, Check, Twitter, MessageCircle } from 'lucide-react';

interface ShareButtonProps {
  analysis: string;
  roomType?: string;
  onShare?: () => void;
}

interface ShareOption {
  id: string;
  label: string;
  icon: typeof Share2;
  action: () => Promise<void>;
}

/**
 * Share button component with multiple sharing options
 * Uses Web Share API on supported platforms, falls back to clipboard/social links
 */
export function ShareButton({ analysis, roomType = 'room', onShare }: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Generate a shareable summary from the analysis
  const generateSummary = useCallback((): string => {
    // Extract first meaningful paragraph or create a default summary
    const lines = analysis.split('\n').filter(line => line.trim().length > 0);
    
    // Find the first substantial line (not a header)
    const summaryLine = lines.find(line => 
      !line.startsWith('#') && 
      !line.startsWith('**') && 
      line.length > 50
    ) || `I just organized my ${roomType} with ZenSpace! 🏠`;
    
    // Truncate if too long
    const truncated = summaryLine.length > 200 
      ? summaryLine.substring(0, 197) + '...'
      : summaryLine;
    
    return truncated;
  }, [analysis, roomType]);

  // Generate full shareable text
  const generateShareText = useCallback((): string => {
    const summary = generateSummary();
    return `${summary}\n\nGet your personalized organization plan: https://dustyork.com/zenspace`;
  }, [generateSummary]);

  // Check if Web Share API is available
  const canUseWebShare = typeof navigator !== 'undefined' && 
    'share' in navigator && 
    typeof navigator.share === 'function';

  // Native share (mobile)
  const handleNativeShare = useCallback(async () => {
    if (!canUseWebShare) return;
    
    setIsSharing(true);
    try {
      await navigator.share({
        title: 'My ZenSpace Room Analysis',
        text: generateShareText(),
        url: 'https://dustyork.com/zenspace'
      });
      onShare?.();
    } catch (err) {
      // User cancelled or share failed
      if ((err as Error).name !== 'AbortError') {
        console.error('Share failed:', err);
      }
    } finally {
      setIsSharing(false);
      setIsOpen(false);
    }
  }, [canUseWebShare, generateShareText, onShare]);

  // Copy to clipboard
  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(generateShareText());
      setCopied(true);
      onShare?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
    setIsOpen(false);
  }, [generateShareText, onShare]);

  // Share to Twitter/X
  const handleTwitterShare = useCallback(() => {
    const text = encodeURIComponent(generateSummary() + ' #ZenSpace #Organization');
    const url = encodeURIComponent('https://dustyork.com/zenspace');
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank', 'width=600,height=400');
    onShare?.();
    setIsOpen(false);
  }, [generateSummary, onShare]);

  // Share via SMS/iMessage
  const handleSMSShare = useCallback(() => {
    const body = encodeURIComponent(generateShareText());
    window.open(`sms:?&body=${body}`, '_self');
    onShare?.();
    setIsOpen(false);
  }, [generateShareText, onShare]);

  // Define share options
  const shareOptions: ShareOption[] = [
    {
      id: 'copy',
      label: copied ? 'Copied!' : 'Copy Link',
      icon: copied ? Check : Copy,
      action: handleCopyLink
    },
    {
      id: 'twitter',
      label: 'Share on X',
      icon: Twitter,
      action: async () => handleTwitterShare()
    },
    {
      id: 'sms',
      label: 'Text Message',
      icon: MessageCircle,
      action: async () => handleSMSShare()
    }
  ];

  // On mobile with Web Share API, use native share directly
  if (canUseWebShare) {
    return (
      <button
        onClick={handleNativeShare}
        disabled={isSharing}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:opacity-50"
        aria-label="Share analysis results"
      >
        <Share2 className="w-4 h-4" aria-hidden="true" />
        <span>Share</span>
      </button>
    );
  }

  // Desktop: show dropdown menu
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
        aria-label="Share analysis results"
        aria-expanded={isOpen}
        aria-haspopup="menu"
      >
        <Share2 className="w-4 h-4" aria-hidden="true" />
        <span>Share</span>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          
          {/* Menu */}
          <div 
            className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
            role="menu"
            aria-orientation="vertical"
          >
            {shareOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => option.action()}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                role="menuitem"
              >
                <option.icon className="w-4 h-4 text-slate-500" aria-hidden="true" />
                <span>{option.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
