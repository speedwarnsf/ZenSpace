import { useState, useCallback, useMemo, useRef, memo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { SoIcon } from './SoIcon';
import { ShareableCard } from './ShareableCard';
import { captureCardAsImage, shareCard } from '../services/shareService';
import ReactMarkdown from 'react-markdown';
import type { LookbookEntry, DesignRating } from '../types';

interface LookbookProps {
  entries: LookbookEntry[];
  onRate: (entryId: string, rating: DesignRating) => void;
  onSelectForIteration: (entryId: string) => void;
  onGenerateMore: () => void;
  isGenerating: boolean;
  uploadedImageUrl: string | null;
}

type FilterTab = 'all' | 'good' | 'hidden';

const RATING_ICONS: Record<DesignRating, string> = {
  'never': 'close-circle',
  'not-now': 'eye-off',
  'like': 'like',
  'good': 'love',
  'the-one': 'stars',
};

const RATINGS: { value: DesignRating; icon: string; label: string }[] = [
  { value: 'never', icon: 'close-circle', label: 'Never Again' },
  { value: 'not-now', icon: 'eye-off', label: 'Not Now' },
  { value: 'like', icon: 'like', label: 'I Like This' },
  { value: 'good', icon: 'love', label: 'This Is Good' },
  { value: 'the-one', icon: 'stars', label: 'THE ONE' },
];

const DRAG_THRESHOLD = 120;

const springTransition = { type: 'spring' as const, stiffness: 300, damping: 30 };

const LookbookCard = memo(function LookbookCard({
  entry,
  onRate,
  onSelectForIteration,
  onExpand,
  onShare,
  isSharing,
}: {
  entry: LookbookEntry;
  onRate: (id: string, rating: DesignRating) => void;
  onSelectForIteration: (id: string) => void;
  onExpand: (entry: LookbookEntry) => void;
  onShare: (entry: LookbookEntry) => void;
  isSharing: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const dragDistRef = useRef(0);
  const x = useMotionValue(0);
  const redOpacity = useTransform(x, [-DRAG_THRESHOLD, 0], [0.5, 0]);
  const goldOpacity = useTransform(x, [0, DRAG_THRESHOLD], [0, 0.5]);
  const rotate = useTransform(x, [-200, 200], [-8, 8]);

  const isNever = entry.rating === 'never';
  const isNotNow = entry.rating === 'not-now';
  const isGood = entry.rating === 'good';
  const isTheOne = entry.rating === 'the-one';
  const dimmed = isNever || isNotNow;

  const handleDragEnd = useCallback((_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = Math.abs(info.velocity.x) > 500 ? 60 : DRAG_THRESHOLD;
    if (info.offset.x < -swipeThreshold) {
      onRate(entry.id, 'never');
    } else if (info.offset.x > swipeThreshold) {
      onRate(entry.id, 'the-one');
    }
  }, [entry.id, onRate]);

  const borderClass = isTheOne
    ? 'border-2 border-yellow-400 shadow-[0_0_20px_rgba(234,179,8,0.3)]'
    : isGood
    ? 'border border-yellow-400/50 shadow-[0_0_10px_rgba(234,179,8,0.15)]'
    : 'border border-slate-100 dark:border-slate-700';

  return (
    <motion.div
      layout
      layoutId={entry.id}
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{
        opacity: dimmed ? 0.5 : 1,
        scale: isNever ? 0.95 : 1,
        y: 0,
      }}
      exit={{ opacity: 0, scale: 0.8, y: -20 }}
      transition={springTransition}
      style={{ x, rotate }}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDrag={(_: any, info: { offset: { x: number } }) => { dragDistRef.current = Math.abs(info.offset.x); }}
      onDragEnd={handleDragEnd}
      onClick={() => { if (dragDistRef.current < 5) onExpand(entry); dragDistRef.current = 0; }}
      className={`relative group bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden cursor-grab active:cursor-grabbing ${borderClass} select-none`}
    >
      {/* Drag overlays */}
      <motion.div
        className="absolute inset-0 bg-red-500 rounded-2xl z-10 pointer-events-none flex items-center justify-center"
        style={{ opacity: redOpacity }}
      >
        <SoIcon name="close-circle" size={48} style={{ filter: 'brightness(0) invert(1)' }} />
      </motion.div>
      <motion.div
        className="absolute inset-0 bg-yellow-400 rounded-2xl z-10 pointer-events-none flex items-center justify-center"
        style={{ opacity: goldOpacity }}
      >
        <SoIcon name="stars" size={48} style={{ filter: 'brightness(0) invert(1)' }} />
      </motion.div>

      {/* THE ONE star burst */}
      {isTheOne && (
        <motion.div
          className="absolute -top-2 -right-2 z-20"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <SoIcon name="stars" size={32} />
        </motion.div>
      )}

      {/* Share button (top-right, visible on hover) */}
      <button
        onClick={(e) => { e.stopPropagation(); onShare(entry); }}
        className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        title="Share"
      >
        {isSharing ? <Loader2 className="w-4 h-4 animate-spin" /> : <SoIcon name="share" size={16} style={{ filter: 'brightness(0) invert(1)' }} />}
      </button>

      {/* Image */}
      <div className="aspect-[4/3] bg-slate-100 dark:bg-slate-700 overflow-hidden">
        {entry.option.visualizationImage ? (
          <img
            src={`data:image/png;base64,${entry.option.visualizationImage}`}
            alt={entry.option.name}
            className="w-full h-full object-cover"
            loading="lazy"
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-700 dark:to-slate-800">
            <div className="text-center text-slate-400 dark:text-slate-500">
              <SoIcon name="eye" size={28} className="mx-auto mb-1 opacity-50" />
              <span className="text-xs">Preview pending</span>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-serif text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">
            {entry.option.name}
          </h3>
          {entry.rating && (
            <span className="flex-shrink-0" title={RATINGS.find(r => r.value === entry.rating)?.label}>
              <SoIcon name={RATING_ICONS[entry.rating] as any} size={20} />
            </span>
          )}
        </div>

        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
          {entry.option.mood}
        </p>

        {/* Palette */}
        <div className="flex gap-1.5">
          {entry.option.palette.map((color, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-600"
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Expand/collapse key changes */}
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
          className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
        >
          {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          {expanded ? 'Less' : 'Key changes'}
        </button>
        <AnimatePresence>
          {expanded && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="text-xs text-slate-500 dark:text-slate-400 space-y-1 overflow-hidden"
            >
              {entry.option.keyChanges.map((change, i) => (
                <li key={i}>• {change}</li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>

        {/* Rating buttons */}
        <div className="flex gap-1 pt-1">
          {RATINGS.map(r => (
            <button
              key={r.value}
              onClick={(e) => { e.stopPropagation(); onRate(entry.id, r.value); }}
              className={`flex-1 text-center py-1.5 rounded-lg text-lg transition-all ${
                entry.rating === r.value
                  ? 'bg-slate-100 dark:bg-slate-700 scale-110'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
              title={r.label}
            >
              <SoIcon name={r.icon as any} size={22} />
            </button>
          ))}
        </div>

        {/* Go Deeper button for good+ */}
        {(isGood || isTheOne) && (
          <motion.button
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={(e) => { e.stopPropagation(); onSelectForIteration(entry.id); }}
            className="w-full py-2 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-2"
          >
            <SoIcon name="eye" size={16} style={{ filter: 'brightness(0) invert(1)' }} />
            Go Deeper
          </motion.button>
        )}
      </div>
    </motion.div>
  );
});

function FullScreenCard({
  entry,
  onRate,
  onSelectForIteration,
  onClose,
  onShare,
  isSharing,
}: {
  entry: LookbookEntry;
  onRate: (id: string, rating: DesignRating) => void;
  onSelectForIteration: (id: string) => void;
  onClose: () => void;
  onShare: (entry: LookbookEntry) => void;
  isSharing: boolean;
}) {
  const isGood = entry.rating === 'good';
  const isTheOne = entry.rating === 'the-one';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full my-4 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
        >
          <SoIcon name="shrink-content" size={16} style={{ filter: 'brightness(0) invert(1)' }} />
        </button>

        {/* Image */}
        <div className="aspect-[16/10] bg-slate-100 dark:bg-slate-700 overflow-hidden">
          {entry.option.visualizationImage ? (
            <img
              src={`data:image/png;base64,${entry.option.visualizationImage}`}
              alt={entry.option.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500 text-sm">
              Preview not yet generated
            </div>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Name */}
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">
            {entry.option.name}
          </h2>

          {/* Mood */}
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            {entry.option.mood}
          </p>

          {/* Palette */}
          <div className="flex gap-2">
            {entry.option.palette.map((color, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div
                  className="w-8 h-8 rounded-full border-2 border-slate-200 dark:border-slate-600"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">{color}</span>
              </div>
            ))}
          </div>

          {/* Frameworks */}
          {entry.option.frameworks.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {entry.option.frameworks.map((fw, i) => (
                <span
                  key={i}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                >
                  {fw}
                </span>
              ))}
            </div>
          )}

          {/* Framework Rationale */}
          {entry.option.frameworkRationale && (
            <div className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 border border-slate-200 dark:border-slate-600">
              <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-3">Design Reasoning</h4>
              <div className="text-[13px] leading-[1.75] text-slate-600 dark:text-slate-300">
                <ReactMarkdown>{entry.option.frameworkRationale}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Key Changes */}
          <div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">Key Changes</h4>
            <ul className="space-y-3">
              {entry.option.keyChanges.map((change, i) => (
                <li key={i} className="text-sm text-slate-600 dark:text-slate-400 flex items-start gap-2">
                  <span className="text-emerald-500 mt-0.5">•</span>
                  {change}
                </li>
              ))}
            </ul>
          </div>

          {/* Full Plan */}
          {entry.option.fullPlan && (
            <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mt-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-6">Full Design Plan</h4>
              <div className="max-w-none">
                <ReactMarkdown
                  components={{
                    h1: ({ children }) => <h3 className="text-lg font-semibold tracking-normal text-slate-500 dark:text-slate-400 mt-8 mb-3">{children}</h3>,
                    h2: ({ children }) => <h3 className="text-lg font-semibold tracking-normal text-slate-500 dark:text-slate-400 mt-8 mb-3">{children}</h3>,
                    h3: ({ children }) => <h3 className="text-lg font-semibold tracking-normal text-slate-500 dark:text-slate-400 mt-8 mb-3">{children}</h3>,
                    h4: ({ children }) => <h4 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-5 mb-1">{children}</h4>,
                    hr: () => <div className="mt-6" />,
                    p: ({ children }) => <p className="text-[13px] leading-[1.75] text-slate-600 dark:text-slate-300 mb-3">{children}</p>,
                    strong: ({ children }) => <strong className="font-semibold text-slate-800 dark:text-slate-100">{children}</strong>,
                    ul: ({ children }) => <ul className="mt-1.5 mb-4 space-y-2.5 list-disc list-outside pl-5">{children}</ul>,
                    ol: ({ children }) => <ol className="mt-1.5 mb-4 space-y-2.5 list-decimal list-outside pl-5">{children}</ol>,
                    li: ({ children }) => <li className="text-[13px] leading-[1.75] text-slate-600 dark:text-slate-300 pl-1">{children}</li>,
                  }}
                >{entry.option.fullPlan.replace(/([^\n])(#{1,4}\s)/g, '$1\n\n$2').replace(/\\n/g, '\n')}</ReactMarkdown>
              </div>
            </div>
          )}

          {/* Rating + Share buttons */}
          <div className="flex gap-1.5 pt-2 items-center">
            {RATINGS.map(r => (
              <button
                key={r.value}
                onClick={() => onRate(entry.id, r.value)}
                className={`flex-1 text-center py-2 rounded-xl text-xl transition-all ${
                  entry.rating === r.value
                    ? 'bg-slate-100 dark:bg-slate-700 scale-110 ring-2 ring-emerald-400'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'
                }`}
                title={r.label}
              >
                <SoIcon name={r.icon as any} size={24} />
              </button>
            ))}
            <button
              onClick={() => onShare(entry)}
              disabled={isSharing}
              className="flex-1 text-center py-2 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-center"
              title="Share"
            >
              {isSharing ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : <SoIcon name="share" size={20} />}
            </button>
          </div>

          {/* Go Deeper */}
          {(isGood || isTheOne) && (
            <button
              onClick={() => { onSelectForIteration(entry.id); onClose(); }}
              className="w-full py-3 rounded-xl text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors flex items-center justify-center gap-2"
            >
              <SoIcon name="eye" size={16} style={{ filter: 'brightness(0) invert(1)' }} />
              Go Deeper →
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export function Lookbook({ entries, onRate, onSelectForIteration, onGenerateMore, isGenerating, uploadedImageUrl }: LookbookProps) {
  const [filter, setFilter] = useState<FilterTab>('all');
  const [expandedEntry, setExpandedEntry] = useState<LookbookEntry | null>(null);
  const [sharingEntryId, setSharingEntryId] = useState<string | null>(null);
  const shareCardRef = useRef<HTMLDivElement>(null);

  const handleShare = useCallback(async (entry: LookbookEntry) => {
    setSharingEntryId(entry.id);
    await new Promise(r => setTimeout(r, 200));
    if (shareCardRef.current) {
      try {
        const blob = await captureCardAsImage(shareCardRef.current);
        await shareCard(blob, entry.option.name);
      } catch (err) {
        console.error('Share failed:', err);
      }
    }
    setSharingEntryId(null);
  }, []);

  const counts = useMemo(() => ({
    all: entries.filter(e => !e.rating || e.rating === 'like' || e.rating === 'good' || e.rating === 'the-one').length,
    good: entries.filter(e => e.rating === 'good' || e.rating === 'the-one').length,
    hidden: entries.filter(e => e.rating === 'never' || e.rating === 'not-now').length,
  }), [entries]);

  const sortedEntries = useMemo(() => {
    let filtered: LookbookEntry[];
    if (filter === 'good') {
      filtered = entries.filter(e => e.rating === 'good' || e.rating === 'the-one');
    } else if (filter === 'hidden') {
      filtered = entries.filter(e => e.rating === 'never' || e.rating === 'not-now');
    } else {
      filtered = entries.filter(e => !e.rating || e.rating === 'like' || e.rating === 'good' || e.rating === 'the-one');
    }

    // Sort: the-one first, then good, then rest by generatedAt desc
    const ratingOrder: Record<string, number> = { 'the-one': 0, 'good': 1, 'like': 2, 'not-now': 3, 'never': 4 };
    return [...filtered].sort((a, b) => {
      const ra = a.rating ? ratingOrder[a.rating] ?? 2 : 2;
      const rb = b.rating ? ratingOrder[b.rating] ?? 2 : 2;
      if (ra !== rb) return ra - rb;
      return b.generatedAt - a.generatedAt;
    });
  }, [entries, filter]);

  const tabs: { key: FilterTab; label: string; count: number; icon?: string }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'good', label: 'Good+', count: counts.good, icon: 'love' as const },
    { key: 'hidden', label: 'Hidden', count: counts.hidden, icon: 'eye-off' as const },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="font-serif text-3xl font-bold text-slate-800 dark:text-slate-100">
          Your Lookbook
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Swipe right to love, left to dismiss — or tap to rate
        </p>
      </div>

      {/* Generate More */}
      <div className="flex justify-center">
        <button
          onClick={onGenerateMore}
          disabled={isGenerating}
          className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/50 text-white font-medium transition-colors flex items-center gap-2 shadow-lg shadow-emerald-600/20"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <SoIcon name="add-circle" size={20} style={{ filter: 'brightness(0) invert(1)' }} />
              Generate More Designs
            </>
          )}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 justify-center">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.key
                ? 'bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
            }`}
          >
            <span className="flex items-center gap-1">
              {tab.icon && <SoIcon name={tab.icon as any} size={14} />}
              {tab.label}
            </span>
            {tab.count > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full text-xs bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      <motion.div
        layout
        className="columns-2 lg:columns-3 gap-4 space-y-4"
      >
        <AnimatePresence mode="popLayout">
          {sortedEntries.map(entry => (
            <div key={entry.id} className="break-inside-avoid">
              <LookbookCard
                entry={entry}
                onRate={onRate}
                onSelectForIteration={onSelectForIteration}
                onExpand={setExpandedEntry}
                onShare={handleShare}
                isSharing={sharingEntryId === entry.id}
              />
            </div>
          ))}
        </AnimatePresence>
      </motion.div>

      {sortedEntries.length === 0 && (
        <div className="text-center py-16 text-slate-400 dark:text-slate-500">
          <p className="text-lg">No designs in this view</p>
          <p className="text-sm mt-1">Try switching tabs or generating more</p>
        </div>
      )}

      {/* Hidden shareable card renderer */}
      {sharingEntryId && (
        <div style={{ position: 'fixed', left: '-9999px', top: 0, width: 1080 }}>
          <div ref={shareCardRef}>
            <ShareableCard entry={entries.find(e => e.id === sharingEntryId)!} />
          </div>
        </div>
      )}

      {/* Full-screen card modal */}
      <AnimatePresence>
        {expandedEntry && (
          <FullScreenCard
            entry={entries.find(e => e.id === expandedEntry.id) || expandedEntry}
            onRate={(id, rating) => { onRate(id, rating); }}
            onSelectForIteration={onSelectForIteration}
            onClose={() => setExpandedEntry(null)}
            onShare={handleShare}
            isSharing={sharingEntryId === expandedEntry.id}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default Lookbook;
