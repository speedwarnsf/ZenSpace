import { useState, useRef, useMemo, useCallback } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Download, Share2, Loader2 } from 'lucide-react';
import { SoIcon } from './SoIcon';
import { ProductShelf } from './ProductShelf';
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

function useAccentColor(palette: string[]): string {
  return useMemo(() => {
    if (!palette.length) return '#a3a3a3';
    const mid = palette[Math.floor(palette.length / 2)] ?? palette[0];
    return mid ?? '#a3a3a3';
  }, [palette]);
}

/** Generate a PDF of the full design studio editorial layout */
async function generatePDF(entry: LookbookEntry) {
  const { option } = entry;
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const el = document.getElementById('design-studio-content');
  if (!el) return;

  // Capture full scrollable content
  const canvas = await html2canvas(el, {
    backgroundColor: '#0a0a0a',
    scale: 2,
    useCORS: true,
    logging: false,
    scrollY: -window.scrollY,
    windowHeight: el.scrollHeight,
    height: el.scrollHeight,
  });

  const imgData = canvas.toDataURL('image/jpeg', 0.92);
  const pdfWidth = 210; // A4 mm
  const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

  const pdf = new jsPDF({
    orientation: pdfHeight > pdfWidth ? 'portrait' : 'landscape',
    unit: 'mm',
    format: [pdfWidth, Math.min(pdfHeight, 297 * 3)], // cap at ~3 pages
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${option.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-zenspace.pdf`);
}

/** Save the visualization image as a downloadable PNG */
function saveVisualization(entry: LookbookEntry) {
  const { option } = entry;
  if (!option.visualizationImage) return;
  
  try {
    const link = document.createElement('a');
    link.download = `${option.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-visualization.png`;
    link.href = `data:image/png;base64,${option.visualizationImage}`;
    link.click();
  } catch (err) {
    console.error('Save failed:', err);
  }
}

export function DesignStudio({ entry, onBack }: DesignStudioProps) {
  const [customPrompt, setCustomPrompt] = useState('');
  const [sharing, setSharing] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  // heroCardRef removed — share now uses base64 directly

  // Scroll-linked parallax: image zooms + fades, title stays visible longer
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.15]);
  // Image fades out quickly
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  // Image moves up slower than scroll (parallax)
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);
  // (title is now below photo, not overlaid)

  const { option } = entry;
  const imgSrc = option.visualizationImage
    ? `data:image/png;base64,${option.visualizationImage}`
    : null;
  const accent = useAccentColor(option.palette);

  const designName = option.name || 'Untitled';
  const firstLetter = designName.charAt(0).toUpperCase();
  const restOfName = designName.slice(1);
  const categoryLabel = option.frameworks?.[0] || '';

  const handleShare = useCallback(async () => {
    if (!option.visualizationImage) return;
    setSharing(true);
    try {
      // Convert base64 to blob
      const byteString = atob(option.visualizationImage);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const blob = new Blob([ab], { type: 'image/png' });
      
      if (navigator.share) {
        const file = new File([blob], `${option.name}.png`, { type: 'image/png' });
        await navigator.share({
          title: option.name,
          text: option.mood,
          files: [file],
        });
      } else {
        // Desktop fallback — download
        const link = document.createElement('a');
        link.download = `${option.name.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`;
        link.href = URL.createObjectURL(blob);
        link.click();
        URL.revokeObjectURL(link.href);
      }
    } catch (err) {
      console.error('Share failed:', err);
    } finally {
      setSharing(false);
    }
  }, [option.name, option.mood, option.visualizationImage]);

  const [savingPdf, setSavingPdf] = useState(false);

  const handleSave = useCallback(() => {
    saveVisualization(entry);
  }, [entry]);

  const handlePDF = useCallback(async () => {
    setSavingPdf(true);
    try {
      await generatePDF(entry);
    } catch (err) {
      console.error('PDF generation failed:', err);
    } finally {
      setSavingPdf(false);
    }
  }, [entry]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 selection:bg-neutral-700" id="design-studio-content">
      {/* Fixed Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 sm:px-8 py-4">
        <button
          onClick={onBack}
          className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-black/70 transition-colors"
          aria-label="Back to lookbook"
        >
          <ArrowLeft size={18} className="text-white" />
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            className="h-10 px-4 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center gap-2 hover:bg-black/70 transition-colors text-xs uppercase tracking-widest text-neutral-300"
            aria-label="Download PDF"
          >
            <Download size={16} className="text-neutral-300" />
            <span className="hidden sm:inline">Image</span>
          </button>
          <button
            onClick={handlePDF}
            disabled={savingPdf}
            className="h-10 px-4 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center gap-2 hover:bg-black/70 transition-colors text-xs uppercase tracking-widest text-neutral-300"
            aria-label="Export PDF"
          >
            {savingPdf ? <Loader2 size={16} className="animate-spin text-neutral-300" /> : <Download size={16} className="text-neutral-300" />}
            <span className="hidden sm:inline">PDF</span>
          </button>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-black/70 transition-colors"
            aria-label="Share design"
          >
            <SoIcon name="share" size={18} style={{ filter: 'brightness(0) invert(1)' }} />
          </button>
        </div>
      </nav>

      {/* ═══════════════ HERO SECTION ═══════════════ */}
      <div ref={heroRef} className="relative h-screen overflow-hidden">
        {/* Parallax image */}
        {imgSrc ? (
          <motion.div
            className="absolute inset-0"
            style={{ y: imageY }}
            
          >
            <motion.img
              src={imgSrc}
              alt={option.name}
              className="w-full h-[120%] object-cover"
              style={{ scale: heroScale, opacity: heroOpacity }}
            />
          </motion.div>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-neutral-800 to-neutral-950"  />
        )}

        {/* Subtle bottom gradient only — let the photo breathe */}
        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-neutral-950 to-transparent" />

        {/* Scroll indicator — minimal, bottom center */}
        <motion.div
          className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          <motion.div
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
            className="w-[1px] h-8 bg-gradient-to-b from-white/50 to-transparent"
          />
        </motion.div>
      </div>

      {/* ═══════════════ TITLE SECTION — Below the photo ═══════════════ */}
      <div className="bg-neutral-950 px-6 sm:px-12 lg:px-20 pt-12 sm:pt-16 pb-8 sm:pb-12">
        {/* Category label */}
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

        {/* Design name — big serif with drop cap */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="leading-[0.88] max-w-5xl mb-6"
          style={{ fontFamily: 'Georgia, "Times New Roman", "Playfair Display", serif' }}
        >
          <span className="text-7xl sm:text-[120px] lg:text-[160px] font-bold tracking-[-0.03em]">
            {firstLetter}
          </span>
          <span className="text-5xl sm:text-7xl lg:text-8xl font-bold tracking-[-0.02em]">
            {restOfName}
          </span>
        </motion.h1>

        {/* Mood as italic lede */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.8 }}
          className="text-lg sm:text-xl lg:text-2xl text-neutral-300 max-w-2xl leading-relaxed italic"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          {option.mood}
        </motion.p>
      </div>

      {/* ═══════════════ EDITORIAL BRIEF ═══════════════ */}
      <div className="max-w-5xl mx-auto px-6 sm:px-12 lg:px-20">
        <div className="border-t border-neutral-800" />
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

        {/* ── Key Moves ── */}
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

        {/* ── The Full Plan ── */}
        {option.fullPlan && (
          <RevealSection>
            <h2 className="text-[10px] uppercase tracking-[0.25em] text-neutral-600 mb-12">The Plan</h2>
            <div className="lg:columns-2 lg:gap-12 max-w-4xl">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h3 className="text-lg font-semibold text-neutral-200 mt-10 mb-4 tracking-normal break-after-avoid">
                      {children}
                    </h3>
                  ),
                  h2: ({ children }) => (
                    <h3 className="text-lg font-semibold text-neutral-200 mt-10 mb-4 tracking-normal break-after-avoid">
                      {children}
                    </h3>
                  ),
                  h3: ({ children }) => (
                    <h4 className="text-base font-semibold text-neutral-300 mt-8 mb-3 break-after-avoid">
                      {children}
                    </h4>
                  ),
                  h4: ({ children }) => (
                    <h5 className="text-sm font-medium text-neutral-400 tracking-wide mt-6 mb-2 break-after-avoid">
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
                  ul: ({ children }) => <ul className="mt-3 mb-8 space-y-6 list-none">{children}</ul>,
                  ol: ({ children }) => <ol className="mt-3 mb-8 space-y-6 list-decimal list-outside pl-5">{children}</ol>,
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

        {/* ── Product Recommendations ── */}
        {option.products && option.products.length > 0 && (
          <RevealSection>
            <ProductShelf products={option.products} title="The Edit" />
          </RevealSection>
        )}

        {/* ── Visualization detail ── */}
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

        {/* ── Save / Share bar ── */}
        <RevealSection>
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-8 pb-4">
            <button
              onClick={handleShare}
              disabled={sharing}
              className="w-full sm:w-auto px-8 py-3 rounded-full border border-neutral-700 text-sm text-neutral-300 hover:bg-neutral-900 hover:border-neutral-500 transition-all flex items-center justify-center gap-2"
            >
              <SoIcon name="share" size={16} style={{ filter: 'brightness(0) invert(0.7)' }} />
              {sharing ? 'Sharing…' : 'Share This Design'}
            </button>
            <button
              onClick={handleSave}
              className="w-full sm:w-auto px-8 py-3 rounded-full border border-neutral-700 text-sm text-neutral-300 hover:bg-neutral-900 hover:border-neutral-500 transition-all flex items-center justify-center gap-2"
            >
              <Download size={16} className="text-neutral-400" />
              Save Image
            </button>
            <button
              onClick={handlePDF}
              disabled={savingPdf}
              className="w-full sm:w-auto px-8 py-3 rounded-full border border-neutral-700 text-sm text-neutral-300 hover:bg-neutral-900 hover:border-neutral-500 transition-all flex items-center justify-center gap-2"
            >
              {savingPdf ? <Loader2 size={16} className="animate-spin text-neutral-400" /> : <Download size={16} className="text-neutral-400" />}
              {savingPdf ? 'Generating PDF…' : 'Export PDF'}
            </button>
          </div>
        </RevealSection>
      </div>

      {/* Bottom spacer */}
      <div className="h-24" />
    </div>
  );
}

export default DesignStudio;
