import { useRef } from 'react';
import type { ProductRecommendation } from '../types';

const CATEGORY_LABELS: Record<string, string> = {
  furniture: '🪑 Furniture',
  lighting: '💡 Lighting',
  textiles: '🧵 Textiles',
  decor: '✦ Decor',
  rugs: '◼ Rugs',
  hardware: '⚙ Hardware',
};

function ProductCard({ product }: { product: ProductRecommendation }) {
  return (
    <div className="flex-shrink-0 w-56 sm:w-64 bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-2.5 snap-start hover:border-neutral-600 transition-colors">
      {/* Category */}
      <span className="text-[10px] uppercase tracking-[0.2em] text-neutral-500">
        {CATEGORY_LABELS[product.category] || product.category}
      </span>

      {/* Product name */}
      <h4 className="text-sm font-semibold text-neutral-100 leading-snug">
        {product.name}
      </h4>

      {/* Brand */}
      <span className="text-xs text-neutral-500">{product.brand}</span>

      {/* Description */}
      <p className="text-xs text-neutral-400 leading-relaxed flex-1" style={{ fontFamily: 'Georgia, serif' }}>
        {product.description}
      </p>

      {/* Price + Shop */}
      <div className="flex items-center justify-between pt-1 border-t border-neutral-800">
        <span className="text-xs font-medium text-neutral-300">{product.priceRange}</span>
        <button
          disabled
          className="text-[10px] uppercase tracking-widest text-neutral-600 cursor-not-allowed"
          title="Shopping links coming soon"
        >
          Shop →
        </button>
      </div>
    </div>
  );
}

interface ProductShelfProps {
  products: ProductRecommendation[];
  title?: string;
  /** Use light theme (for Lookbook modal) vs dark (for DesignStudio) */
  light?: boolean;
}

export function ProductShelf({ products, title = 'The Edit', light = false }: ProductShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  if (!products || products.length === 0) return null;

  if (light) {
    return (
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
          {title}
        </h4>
        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
          style={{ scrollbarWidth: 'none' }}
        >
          {products.map((product, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-52 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl p-3.5 flex flex-col gap-2 snap-start"
            >
              <span className="text-[10px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">
                {CATEGORY_LABELS[product.category] || product.category}
              </span>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100 leading-snug">
                {product.name}
              </h4>
              <span className="text-xs text-slate-400 dark:text-slate-500">{product.brand}</span>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex-1">
                {product.description}
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-slate-200 dark:border-slate-600">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">{product.priceRange}</span>
                <span className="text-[10px] uppercase tracking-widest text-slate-400 cursor-not-allowed">Shop →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-[10px] uppercase tracking-[0.25em] text-neutral-600">{title}</h2>
      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-hide"
        style={{ scrollbarWidth: 'none' }}
      >
        {products.map((product, i) => (
          <ProductCard key={i} product={product} />
        ))}
      </div>
    </div>
  );
}

export default ProductShelf;
