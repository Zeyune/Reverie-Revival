import React from 'react';

/*
 * Loading placeholders for anything waiting on /api/storefront/products.
 *
 * Two jobs, and the second one is the subtle one:
 *
 * 1. Tell the customer the products are coming. Without this the homepage
 *    renders "NEW ARRIVALS" over an empty black gap and reads as broken.
 *
 * 2. Reserve the exact space the real content will occupy. CLS on this site is
 *    0 and has to stay there — a placeholder that isn't the same height as what
 *    replaces it doesn't prevent a layout shift, it *causes* one. So the
 *    measurements below deliberately mirror ProductCard:
 *      image  aspect-[3/4]
 *      title  text-lg @ line-height 1.5  = 27px   (+ mb-2)
 *      desc   locked to h-12 by line-clamp-2      (+ mb-3)
 *      footer price line + 16px swatches = 24px
 *    If ProductCard's layout changes, change these with it.
 */

const shimmer = 'animate-pulse bg-white/[0.06]';

export const ProductCardSkeleton: React.FC = () => (
  <div
    className="relative bg-[#121214] border border-white/5 overflow-hidden"
    aria-hidden="true"
  >
    {/* Image — same aspect box as the real card, so no reflow on swap */}
    <div className={`aspect-[3/4] ${shimmer}`} />

    {/* Product info */}
    <div className="p-4">
      {/* h3 */}
      <div className="mb-2 h-[27px] flex items-center">
        <div className={`h-4 w-3/4 rounded-sm ${shimmer}`} />
      </div>

      {/* description — the real one is line-clamp-2 h-12 */}
      <div className="mb-3 h-12 space-y-2 pt-1">
        <div className={`h-3 w-full rounded-sm ${shimmer}`} />
        <div className={`h-3 w-4/5 rounded-sm ${shimmer}`} />
      </div>

      {/* price + colour swatches */}
      <div className="flex items-center justify-between h-6">
        <div className={`h-4 w-20 rounded-sm ${shimmer}`} />
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`w-4 h-4 border border-white/20 ${shimmer}`} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

/**
 * A grid of card skeletons. `count` should match how many cards the section
 * actually renders once loaded (4 for New Arrivals, 8 for Best Sellers), or the
 * section still changes height when the real thing arrives.
 */
export const ProductGridSkeleton: React.FC<{
  count?: number;
  className?: string;
}> = ({ count = 8, className = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6' }) => (
  <div className={className} role="status" aria-label="Loading products">
    {Array.from({ length: count }, (_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
    <span className="sr-only">Loading products…</span>
  </div>
);

/** Detail-page placeholder: image on the left, copy on the right. */
export const ProductDetailSkeleton: React.FC = () => (
  <div className="min-h-screen py-12 px-4" role="status" aria-label="Loading product">
    <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
      <div className="space-y-4">
        <div className={`aspect-[3/4] border border-white/10 ${shimmer}`} />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`aspect-square border border-white/10 ${shimmer}`} />
          ))}
        </div>
      </div>

      <div className="space-y-6 pt-4">
        <div className={`h-10 w-3/4 rounded-sm ${shimmer}`} />
        <div className={`h-6 w-32 rounded-sm ${shimmer}`} />
        <div className="space-y-2">
          <div className={`h-3 w-full rounded-sm ${shimmer}`} />
          <div className={`h-3 w-full rounded-sm ${shimmer}`} />
          <div className={`h-3 w-2/3 rounded-sm ${shimmer}`} />
        </div>
        <div className="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-12 w-16 border border-white/20 ${shimmer}`} />
          ))}
        </div>
        <div className={`h-14 w-full ${shimmer}`} />
      </div>
    </div>
    <span className="sr-only">Loading product…</span>
  </div>
);
