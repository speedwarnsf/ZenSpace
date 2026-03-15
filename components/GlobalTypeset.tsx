'use client';

import { useEffect } from 'react';
import { typesetAll, typesetHeading, smoothRag, fixRealOrphans, optimizeBreaks, shapeRag } from '../lib/typeset';

/**
 * GlobalTypeset — applies typographic rules to all text on the page.
 * 
 * Phase 1: typesetAll + typesetHeading (orphan prevention, short-word binding)
 * Phase 2: smoothRag on eligible paragraphs (Knuth-Plass optimal line breaking)
 * 
 * smoothRag runs ONCE after all typeset passes complete. It is NOT re-triggered
 * by MutationObserver to prevent infinite DOM mutation loops.
 */
export default function GlobalTypeset() {
  useEffect(() => {
    let mutationPaused = false;
    const ragCleanups: Array<() => void> = [];

    /**
     * Auto-detect and neutralize competing CSS text-wrap on elements
     * we process. Also auto-detect centered text and mark it data-no-smooth
     * so rag smoothing (designed for left-aligned body text) doesn't run.
     *
     * This is the zero-config principle: drop in GlobalTypeset and it
     * handles conflicts automatically. No attributes, no caveats.
     */
    const prepareElements = () => {
      const targets = document.querySelectorAll<HTMLElement>(
        'p:not([data-no-typeset]), li:not([data-no-typeset]), blockquote:not([data-no-typeset]), figcaption:not([data-no-typeset]), h1:not([data-no-typeset]), h2:not([data-no-typeset]), h3:not([data-no-typeset]), h4:not([data-no-typeset])'
      );
      targets.forEach((el) => {
        const computed = window.getComputedStyle(el);

        // 1. Override competing text-wrap — typeset.us owns line breaking
        const textWrap = computed.getPropertyValue('text-wrap');
        if (textWrap === 'balance' || textWrap === 'pretty' || textWrap === 'stable') {
          el.style.textWrap = 'auto';
        }

        // 2. Auto-detect centered text — skip rag smoothing (it's for left-aligned body)
        if (!el.hasAttribute('data-no-smooth')) {
          const align = computed.textAlign;
          if (align === 'center' || align === '-webkit-center') {
            el.setAttribute('data-no-smooth', '');
          }
        }

        // 3. Auto-detect narrow containers — rag smoothing creates visible
        // word-spacing gaps at mobile widths. Only smooth at wide measures
        // where the adjustments are subtle enough to be invisible.
        if (!el.hasAttribute('data-no-smooth')) {
          const width = el.clientWidth;
          if (width > 0 && width < 500) {
            el.setAttribute('data-no-smooth', '');
          }
        }
      });
    };

    const runBody = () => typesetAll('p:not([data-no-typeset]), li:not([data-no-typeset]), blockquote:not([data-no-typeset]), figcaption:not([data-no-typeset])');

    const runHeadings = () => {
      const headings = document.querySelectorAll<HTMLElement>('h1:not([data-no-typeset]), h2:not([data-no-typeset]), h3:not([data-no-typeset]), h4:not([data-no-typeset])');
      headings.forEach((el) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
        const textNodes: Text[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) {
          textNodes.push(node as Text);
        }
        for (const textNode of textNodes) {
          const original = textNode.textContent;
          if (!original || original.trim().length < 5) continue;
          const leadingSpace = original.match(/^\s*/)?.[0] || '';
          const trailingSpace = original.match(/\s*$/)?.[0] || '';
          textNode.textContent = leadingSpace + typesetHeading(original.trim()) + trailingSpace;
        }
      });
    };

    const runSmooth = () => {
      // Clean up previous
      ragCleanups.forEach(fn => { try { fn(); } catch {} });
      ragCleanups.length = 0;

      // Pause mutation observer — optimizeBreaks modifies innerHTML
      mutationPaused = true;

      const paragraphs = document.querySelectorAll<HTMLElement>(
        'p:not([data-no-typeset]):not([data-no-smooth])'
      );
      paragraphs.forEach((p) => {
        try {
          const text = p.textContent || '';
          if (text.length < 80) return;
          if (p.closest('[data-no-smooth], pre, code, .demo, [role="tabpanel"]')) return;
          // Pass 1: optimizeBreaks — Knuth-Plass DP with break quality rules,
          // stairstep demerits, and cubic badness. Sets nbsp bindings.
          // Pass 2: shapeRag — runs automatically after optimizeBreaks via callback.
          const cleanup = optimizeBreaks(p, { onApplied: () => shapeRag(p) });
          ragCleanups.push(cleanup);
        } catch {
          // silently skip
        }
      });

      // Resume observer after DOM settles
      requestAnimationFrame(() => { mutationPaused = false; });
    };

    const runTypeset = () => {
      prepareElements();  // neutralize conflicts BEFORE processing
      runBody();
      runHeadings();
    };

    /**
     * Phase 2b: Post-render orphan fix.
     * After the browser has laid out text, detect actual rendered orphans
     * (single-word last lines) and fix them. This works at ALL widths
     * including mobile, because it measures real rendered lines instead
     * of guessing from character counts.
     */
    const runPostRender = () => {
      mutationPaused = true;
      const paragraphs = document.querySelectorAll<HTMLElement>(
        'p:not([data-no-typeset]):not([data-no-smooth])'
      );
      paragraphs.forEach((p) => {
        try {
          const text = p.textContent || '';
          if (text.length < 40) return;
          if (p.closest('[data-no-typeset], pre, code, .demo, [role="tabpanel"]')) return;
          fixRealOrphans(p);
        } catch {
          // silently skip
        }
      });
      requestAnimationFrame(() => { mutationPaused = false; });
    };

    // Delay Phase 1 to avoid hydration mismatch — React must finish
    // reconciling the DOM before we mutate text nodes.
    const timers = [
      setTimeout(runTypeset, 100),
      setTimeout(runTypeset, 600),
      setTimeout(() => {
        runTypeset();
        // Phase 2b: Post-render orphan fix (after layout settles)
        requestAnimationFrame(runPostRender);
        // Phase 3: smoothRag after orphan fix
        setTimeout(() => requestAnimationFrame(runSmooth), 200);
      }, 1600),
    ];

    // Observer for dynamically added content — only runs typeset, not smoothRag
    // Starts paused until after initial hydration window
    mutationPaused = true;
    const observer = new MutationObserver(() => {
      if (mutationPaused) return;
      requestAnimationFrame(runTypeset);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    // Enable observer after hydration settles
    setTimeout(() => { mutationPaused = false; }, 200);

    return () => {
      timers.forEach(clearTimeout);
      observer.disconnect();
      ragCleanups.forEach(fn => { try { fn(); } catch {} });
    };
  }, []);

  return null;
}
