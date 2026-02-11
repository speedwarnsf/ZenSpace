import { useState, useRef } from 'react';
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
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function DesignStudio({ entry, onBack }: DesignStudioProps) {
  const [customPrompt, setCustomPrompt] = useState('');
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0.3]);
  const titleY = useTransform(scrollYProgress, [0, 1], [0, -60]);

  const { option } = entry;
  const imgSrc = option.visualizationImage
    ? `data:image/png;base64,${option.visualizationImage}`
    : null;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 sm:px-8 py-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/60 transition-colors"
          aria-label="Back to lookbook"
        >
          <SoIcon name="arrow-left" size={18} style={{ filter: 'brightness(0) invert(1)' }} />
        </button>
        <button
          className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-black/60 transition-colors"
          aria-label="Share design"
        >
          <SoIcon name="share" size={18} style={{ filter: 'brightness(0) invert(1)' }} />
        </button>
      </nav>

      {/* Hero Section */}
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
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/30 to-transparent" />

        {/* Title */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 px-6 sm:px-12 pb-20 sm:pb-24"
          style={{ y: titleY }}
        >
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl sm:text-7xl lg:text-8xl font-bold uppercase tracking-[-0.04em] leading-[0.9] max-w-4xl"
          >
            {option.name}
          </motion.h1>
          {/* Frameworks as subtle tags */}
          {option.frameworks.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-wrap gap-2 mt-5"
            >
              {option.frameworks.map((fw, i) => (
                <span key={i} className="text-[11px] uppercase tracking-[0.15em] text-neutral-400 border border-neutral-700 px-3 py-1 rounded-full">
                  {fw}
                </span>
              ))}
            </motion.div>
          )}
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
        >
          <div className="w-5 h-8 rounded-full border border-neutral-500 flex items-start justify-center p-1">
            <motion.div
              className="w-1 h-2 rounded-full bg-neutral-400"
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            />
          </div>
        </motion.div>
      </div>

      {/* Design Brief */}
      <div className="max-w-5xl mx-auto px-6 sm:px-12 py-20 sm:py-32 space-y-24">
        {/* Mood / Thesis */}
        <RevealSection>
          <p className="text-2xl sm:text-3xl lg:text-4xl font-light leading-relaxed text-neutral-200 max-w-3xl" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
            {option.mood}
          </p>
        </RevealSection>

        {/* Color Palette */}
        <RevealSection>
          <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-6">Palette</h2>
          <div className="flex gap-2 sm:gap-3">
            {option.palette.map((color, i) => (
              <div key={i} className="flex-1 group">
                <div
                  className="aspect-[2/1] sm:aspect-[3/1] rounded-lg sm:rounded-xl transition-transform group-hover:scale-105"
                  style={{ backgroundColor: color }}
                />
                <span className="block text-center text-[10px] sm:text-xs text-neutral-500 font-mono mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {color}
                </span>
              </div>
            ))}
          </div>
        </RevealSection>

        {/* Key Changes */}
        <RevealSection>
          <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-8">Key Moves</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
            {option.keyChanges.map((change, i) => (
              <div key={i} className="flex items-start gap-4">
                <span className="text-3xl font-bold text-neutral-700 leading-none tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-base text-neutral-300 leading-relaxed pt-1">{change}</p>
              </div>
            ))}
          </div>
        </RevealSection>

        {/* Full Design Plan */}
        {option.fullPlan && (
          <RevealSection>
            <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-10">The Full Plan</h2>
            <div className="max-w-3xl">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h3 className="text-xl font-bold text-neutral-200 mt-12 mb-4 uppercase tracking-wide">{children}</h3>,
                  h2: ({ children }) => <h3 className="text-xl font-bold text-neutral-200 mt-12 mb-4 uppercase tracking-wide">{children}</h3>,
                  h3: ({ children }) => <h3 className="text-lg font-bold text-neutral-300 mt-10 mb-3">{children}</h3>,
                  h4: ({ children }) => <h4 className="text-sm font-bold text-neutral-400 uppercase tracking-wider mt-8 mb-2">{children}</h4>,
                  p: ({ children }) => <p className="text-[15px] leading-[1.85] text-neutral-400 mb-4">{children}</p>,
                  strong: ({ children }) => <strong className="font-semibold text-neutral-200">{children}</strong>,
                  ul: ({ children }) => <ul className="mt-2 mb-5 space-y-2 list-none">{children}</ul>,
                  ol: ({ children }) => <ol className="mt-2 mb-5 space-y-2 list-decimal list-outside pl-5">{children}</ol>,
                  li: ({ children }) => <li className="text-[15px] leading-[1.8] text-neutral-400 pl-0 flex items-start gap-2"><span className="text-neutral-600 mt-[2px]">—</span><span>{children}</span></li>,
                  hr: () => <div className="my-10 border-t border-neutral-800" />,
                }}
              >{option.fullPlan.replace(/([^\n])(#{1,4}\s)/g, '$1\n\n$2').replace(/\\n/g, '\n')}</ReactMarkdown>
            </div>
          </RevealSection>
        )}

        {/* Framework Rationale */}
        {option.frameworkRationale && (
          <RevealSection>
            <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-8">Design Reasoning</h2>
            <div className="max-w-3xl border-l-2 border-neutral-800 pl-6 sm:pl-10">
              <div className="text-[15px] leading-[1.85] text-neutral-400">
                <ReactMarkdown>{option.frameworkRationale}</ReactMarkdown>
              </div>
            </div>
          </RevealSection>
        )}

        {/* Iteration Controls */}
        <RevealSection>
          <div className="border-t border-neutral-800 pt-16">
            <h2 className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">Iterate</h2>
            <p className="text-neutral-500 text-sm mb-8">Explore variations of this design</p>

            <div className="flex flex-wrap gap-3 mb-6">
              {ITERATION_PROMPTS.map(({ label, icon }) => (
                <button
                  key={label}
                  className="px-5 py-2.5 rounded-full border border-neutral-700 text-sm text-neutral-300 hover:bg-neutral-800 hover:border-neutral-500 hover:text-neutral-100 transition-all flex items-center gap-2"
                >
                  <SoIcon name={icon as any} size={16} style={{ filter: 'brightness(0) invert(0.7)' }} />
                  {label}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <input
                type="text"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Describe your own variation…"
                className="flex-1 bg-neutral-900 border border-neutral-700 rounded-full px-5 py-2.5 text-sm text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-neutral-500 transition-colors"
              />
              <button
                className="px-6 py-2.5 rounded-full bg-neutral-100 text-neutral-900 text-sm font-medium hover:bg-white transition-colors"
              >
                Generate
              </button>
            </div>
          </div>
        </RevealSection>
      </div>

      {/* Bottom spacer */}
      <div className="h-20" />
    </div>
  );
}

export default DesignStudio;
