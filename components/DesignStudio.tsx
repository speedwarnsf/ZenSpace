import { useState, useRef, useMemo } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { SoIcon } from './SoIcon';
import type { LookbookEntry } from '../types';

interface DesignStudioProps {
  entry: LookbookEntry;
  onBack: () => void;
}

const ITERATION_PROMPTS = [
  { label: 'Warmer palette', icon: 'sun' },
  { label: 'More minimal', icon: 'minus-circle' },
  { label: 'Bolder materials', icon: 'layer' },
  { label: 'Show me at night', icon: 'moon' },
  { label: 'More dramatic', icon: 'flash' },
  { label: 'More subtle', icon: 'water' },
];

function RevealSection({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Extract the primary accent color from the palette for editorial highlights */
function useAccentColor(palette: string[]): string {
  return useMemo(() => {
    if (!palette.length) return '#a3a3a3';
    // Pick a mid-range color that isn't too dark or too light
    const mid = palette[Math.floor(palette.length / 2)];
    return mid || palette[0];
  }, [palette]);
}

export function DesignStudio({ entry, onBack }: DesignStudioProps) {
  const [customPrompt, setCustomPrompt] = useState('');
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.1]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -80]);

  const { option } = entry;
  const imgSrc = option.visualizationImage
    ? `data:image/png;base64,${option.visualizationImage}`
    : null;
  const accent = useAccentColor(option.palette);

  // Get the first letter for potential drop-cap treatment
  const designName = option.name || 'Untitled';
  const firstLetter = designName.charAt(0).toUpperCase();
  const restOfName = designName.slice(1);

  // Framework as category label
  const categoryLabel = option.frameworks?.[0] || '';

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-neutral-700">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 sm:px-8 py-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-black/70 transition-colors"
          aria-label="Back to lookbook"
        >
          <SoIcon name="arrow-left" size={18} style={{ filter: 'brightness(0) invert(1)' }} />
        </button>
        <button
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-black/70 transition-colors"
          aria-label="Share design"
        >
          <SoIcon name="share" size={18} style={{ filter: 'brightness(0) invert(1)' }} />
        </button>
      </nav>

      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <div ref={heroRef} className="relative h-screen overflow-hidden">
        {imgSrc ? (
          <motion.img
            src={imgSrc}
            alt={option.name}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ scale: heroScale, opacity: heroOpacity }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950" />
        )}
        {/* Heavy bottom gradient for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/40 to-transparent" />

        {/* Title lockup — editorial style */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 px-6 sm:px-12 lg:px-20 pb-16 sm:pb-20"
          style={{ y: titleY }}
        >
          {/* Category label — small, colored like "PHOTOGRAPHY" in Unearth */}
          {categoryLabel && (
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="block text-[11px] sm:text-xs uppercase tracking-[0.25em] mb-4"
              style={{ color: accent }}
            >
              {categoryLabel}
            </motion.span>
          )}

          {/* Design name — big serif, mixed case like "Unearth" */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="leading-[0.88] max-w-5xl mb-6"
            style={{ fontFamily: 'Georgia, "Times New Roman", "Playfair Display", serif' }}
          >
            {/* Drop cap first letter */}
            <span className="text-7xl sm:text-[120px] lg:text-[160px] font-bold tracking-[-0.03em]">
              {firstLetter}
            </span>
            <span className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-[-0.02em]">
              {restOfName}
            </span>
          </motion.h1>

          {/* Mood as italic lede — like the subtitle in Unearth */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="text-lg sm:text-xl lg:text-2xl text-neutral-300 max-w-2xl leading-relaxed italic"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            {option.mood}
          </motion.p>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-5 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2 }}
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className="w-[1px] h-8 bg-gradient-to-b from-neutral-500 to-transparent"
          />
        </motion.div>
      </div>

      {/* ═══════════════ EDITORIAL BRIEF ═══════════════ */}
      {/* Thin rule separator like Unearth */}
      <div className="max-w-5xl mx-auto px-6 sm:px-12 lg:px-20">
        <div className="border-t border-neutral-800 mt-0" />
      </div>

      <div className="max-w-5xl mx-auto px-6 sm:px-12 lg:px-20 py-16 sm:py-24 space-y-20 sm:space-y-28">

        {/* ── Palette ── */}
        <RevealSection>
          <h2 className="text-[10px] uppercase tracking-[0.25em] text-neutral-600 mb-8">Palette</h2>
          <div className="flex gap-3 sm:gap-4">
            {option.palette.map((color, i) => (
              <div key={i} className="flex-1 group cursor-crosshair">
                <div
                  className="aspect-[3/2] sm:aspect-[4/1] rounded-md transition-all duration-300 group-hover:scale-[1.03] group-hover:shadow-lg"
                  style={{ backgroundColor: color }}
                />
                <span className="block text-center text-[10px] text-neutral-600 font-mono mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 uppercase">
                  {color}
                </span>
              </div>
            ))}
          </div>
        </RevealSection>

        {/* ── Key Moves — numbered, editorial ── */}
        <RevealSection>
          <h2 className="text-[10px] uppercase tracking-[0.25em] text-neutral-600 mb-10">Key Moves</h2>
          <div className="space-y-8">
            {option.keyChanges.map((change, i) => (
              <div key={i} className="flex items-baseline gap-5 sm:gap-8">
                <span
                  className="text-4xl sm:text-5xl font-bold leading-none tabular-nums shrink-0"
                  style={{ color: accent, opacity: 0.4, fontFamily: 'Georgia, serif' }}
                >
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-base sm:text-lg text-neutral-300 leading-relaxed">{change}</p>
              </div>
            ))}
          </div>
        </RevealSection>

        {/* ── The Full Plan — magazine body text ── */}
        {option.fullPlan && (
          <RevealSection>
            <h2 className="text-[10px] uppercase tracking-[0.25em] text-neutral-600 mb-12">The Plan</h2>

            {/* Two-column on desktop like Unearth body text */}
            <div className="lg:columns-2 lg:gap-12 max-w-4xl">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h3 className="text-lg font-semibold text-neutral-200 mt-10 mb-4 uppercase tracking-[0.1em] break-after-avoid" style={{ fontFamily: 'system-ui, sans-serif' }}>
                      {children}
                    </h3>
                  ),
                  h2: ({ children }) => (
                    <h3 className="text-lg font-semibold text-neutral-200 mt-10 mb-4 uppercase tracking-[0.1em] break-after-avoid" style={{ fontFamily: 'system-ui, sans-serif' }}>
                      {children}
                    </h3>
                  ),
                  h3: ({ children }) => (
                    <h4 className="text-base font-semibold text-neutral-300 mt-8 mb-3 break-after-avoid">
                      {children}
                    </h4>
                  ),
                  h4: ({ children }) => (
                    <h5 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mt-6 mb-2 break-after-avoid">
                      {children}
                    </h5>
                  ),
                  p: ({ children }) => (
                    <p className="text-[15px] leading-[1.9] text-neutral-400 mb-5" style={{ fontFamily: 'Georgia, serif' }}>
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => <strong className="font-semibold text-neutral-200">{children}</strong>,
                  em: ({ children }) => <em className="text-neutral-300" style={{ fontFamily: 'Georgia, serif' }}>{children}</em>,
                  ul: ({ children }) => <ul className="mt-2 mb-6 space-y-3 list-none">{children}</ul>,
                  ol: ({ children }) => <ol className="mt-2 mb-6 space-y-3 list-decimal list-outside pl-5">{children}</ol>,
                  li: ({ children }) => (
                    <li className="text-[15px] leading-[1.85] text-neutral-400 pl-0 flex items-start gap-3">
                      <span className="text-neutral-700 mt-[2px] shrink-0">—</span>
                      <span style={{ fontFamily: 'Georgia, serif' }}>{children}</span>
                    </li>
                  ),
                  hr: () => <div className="my-10 border-t border-neutral-800/50" />,
                }}
              >{option.fullPlan.replace(/([^\n])(#{1,4}\s)/g, '$1\n\n$2').replace(/\\n/g, '\n')}</ReactMarkdown>
            </div>
          </RevealSection>
        )}

        {/* ── Visualization detail (inset image like magazine) ── */}
        {imgSrc && (
          <RevealSection>
            <div className="relative rounded-lg overflow-hidden">
              <img
                src={imgSrc}
                alt={`${option.name} visualization detail`}
                className="w-full h-auto"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-neutral-950/80 to-transparent p-6">
                <span className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">
                  Visualization — {option.name}
                </span>
              </div>
            </div>
          </RevealSection>
        )}

        {/* ── Iteration Controls ── */}
        <RevealSection>
          <div className="border-t border-neutral-800/50 pt-14">
            <h2 className="text-[10px] uppercase tracking-[0.25em] text-neutral-600 mb-2">Iterate</h2>
            <p className="text-sm text-neutral-500 mb-10 italic" style={{ fontFamily: 'Georgia, serif' }}>
              Explore variations on this direction
            </p>

            <div className="flex flex-wrap gap-3 mb-8">
              {ITERATION_PROMPTS.map(({ label, icon }) => (
                <button
                  key={label}
                  className="px-5 py-2.5 rounded-full border border-neutral-800 text-[13px] text-neutral-400 hover:bg-neutral-900 hover:border-neutral-600 hover:text-neutral-200 transition-all duration-300 flex items-center gap-2.5"
                >
                  <SoIcon name={icon as any} size={14} style={{ filter: 'brightness(0) invert(0.5)' }} />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Or describe your own variation…"
                className="flex-1 bg-transparent border-b border-neutral-800 px-1 py-3 text-sm text-neutral-200 placeholder-neutral-700 focus:outline-none focus:border-neutral-500 transition-colors"
                style={{ fontFamily: 'Georgia, serif' }}
              />
              <button
                className="px-6 py-2.5 text-sm font-medium transition-all duration-300 border-b border-neutral-100 text-neutral-100 hover:text-white hover:border-white"
              >
                Generate
              </button>
            </div>
          </div>
        </RevealSection>
      </div>

      {/* Bottom spacer */}
      <div className="h-24" />
    </div>
  );
}

export default DesignStudio;
