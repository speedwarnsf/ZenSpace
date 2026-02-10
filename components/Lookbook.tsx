import { useState, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import { Sparkles, Loader2, Eye, ChevronDown, ChevronUp } from 'lucide-react';
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

const RATINGS: { value: DesignRating; emoji: string; label: string }[] = [
  { value: 'never', emoji: '🚫', label: 'Never Again' },
  { value: 'not-now', emoji: '🤷', label: 'Not Now' },
  { value: 'like', emoji: '👍', label: 'I Like This' },
  { value: 'good', emoji: '🔥', label: 'This Is Good' },
  { value: 'the-one', emoji: '⭐', label: 'THE ONE' },
];

const DRAG_THRESHOLD = 120;

const springTransition = { type: 'spring' as const, stiffness: 300, damping: 30 };

const LookbookCard = memo(function LookbookCard({
  entry,
  onRate,
  onSelectForIteration,
}: {
  entry: LookbookEntry;
  onRate: (id: string, rating: DesignRating) => void;
  onSelectForIteration: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
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
      onDragEnd={handleDragEnd}
      className={`relative bg-white dark:bg-slate-800 rounded-2xl shadow-sm overflow-hidden cursor-grab active:cursor-grabbing ${borderClass} select-none`}
    >
      {/* Drag overlays */}
      <motion.div
        className="absolute inset-0 bg-red-500 rounded-2xl z-10 pointer-events-none flex items-center justify-center"
        style={{ opacity: redOpacity }}
      >
        <span className="text-white text-4xl">🚫</span>
      </motion.div>
      <motion.div
        className="absolute inset-0 bg-yellow-400 rounded-2xl z-10 pointer-events-none flex items-center justify-center"
        style={{ opacity: goldOpacity }}
      >
        <span className="text-white text-4xl">⭐</span>
      </motion.div>

      {/* THE ONE star burst */}
      {isTheOne && (
        <motion.div
          className="absolute -top-2 -right-2 z-20"
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          <span className="text-3xl">⭐</span>
        </motion.div>
      )}

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
          <div className="w-full h-full flex items-center justify-center text-slate-400 dark:text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin" />
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
            <span className="text-lg flex-shrink-0" title={RATINGS.find(r => r.value === entry.rating)?.label}>
              {RATINGS.find(r => r.value === entry.rating)?.emoji}
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
              {r.emoji}
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
            <Eye className="w-4 h-4" />
            Go Deeper
          </motion.button>
        )}
      </div>
    </motion.div>
  );
});

export function Lookbook({ entries, onRate, onSelectForIteration, onGenerateMore, isGenerating, uploadedImageUrl }: LookbookProps) {
  const [filter, setFilter] = useState<FilterTab>('all');

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

  const tabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: counts.all },
    { key: 'good', label: '🔥 Good+', count: counts.good },
    { key: 'hidden', label: '🚫 Hidden', count: counts.hidden },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="font-serif text-3xl font-bold text-slate-800 dark:text-slate-100">
          Your Design Lookbook
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Swipe right to love, left to dismiss — or tap the emojis to rate
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
              <Sparkles className="w-5 h-5" />
              Generate More Designs ✨
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
            {tab.label}
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
    </div>
  );
}

export default Lookbook;
