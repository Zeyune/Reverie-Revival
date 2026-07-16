import React from 'react';

/*
 * Loading placeholders for anything waiting on /api/storefront/products.
 *
 * Three jobs:
 *
 * 1. Tell the customer products are coming. Without this the homepage renders
 *    "NEW ARRIVALS" over an empty black gap and reads as broken.
 *
 * 2. Reserve the exact space the real content will occupy. CLS here is 0 and has
 *    to stay there — a placeholder that isn't the same height as what replaces it
 *    doesn't prevent a layout shift, it *causes* one. The measurements below
 *    mirror ProductCard:
 *      image  aspect-[3/4]
 *      title  text-lg @ line-height 1.5  = 27px   (+ mb-2)
 *      desc   locked to h-12 by line-clamp-2      (+ mb-3)
 *      footer price line + 16px swatches = 24px
 *    If ProductCard's layout changes, change these with it.
 *
 * 3. Cost as close to nothing as possible. This is not a style preference — it
 *    is measured. The first version used `animate-pulse` on ~8 elements per card
 *    (96 on the homepage) and cost 5 desktop / 4 mobile Lighthouse points:
 *
 *      Speed Index (mobile)  1.8s -> 4.1s      <- the animation
 *      TBT (desktop)          70ms -> 170ms    <- the DOM weight
 *      long tasks (desktop)      1 -> 3
 *      new insights: "Optimize DOM size", "Forced reflow"
 *
 *    SI scores how quickly the page *stops changing*. A pulse never stops, so
 *    the page never looks settled and SI collapses. **Do not add an animation
 *    back here** — not `animate-pulse`, not a shimmer sweep. The shape alone
 *    reads as loading, and the sr-only text covers screen readers.
 *
 *    Keep the element count low too: every node here is hydrated during the
 *    same burst that already produces the page's long tasks.
 */

// Static, deliberately. See note 3 above before changing this.
const fill = 'bg-white/[0.05]';
const fillStrong = 'bg-white/[0.07]';

export const ProductCardSkeleton: React.FC = () => (
  <div
    className="bg-[#121214] border border-white/5 overflow-hidden"
    aria-hidden="true"
  >
    {/* Image — same aspect box as the real card, so no reflow on swap */}
    <div className={`aspect-[3/4] ${fill}`} />

    <div className="p-4">
      {/* h3: text-lg @ 1.5 = 27px */}
      <div className="mb-2 h-[27px]">
        <div className={`h-4 w-3/4 rounded-sm ${fillStrong}`} />
      </div>

      {/* description: the real one is line-clamp-2 h-12 */}
      <div className="mb-3 h-12">
        <div className={`mt-1 h-8 w-full rounded-sm ${fill}`} />
      </div>

      {/* price + swatches row */}
      <div className="flex items-center justify-between h-6">
        <div className={`h-4 w-20 rounded-sm ${fillStrong}`} />
        <div className={`h-4 w-14 rounded-sm ${fill}`} />
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
        <div className={`aspect-[3/4] border border-white/10 ${fill}`} />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`aspect-square border border-white/10 ${fill}`} />
          ))}
        </div>
      </div>

      <div className="space-y-6 pt-4">
        <div className={`h-10 w-3/4 rounded-sm ${fillStrong}`} />
        <div className={`h-6 w-32 rounded-sm ${fill}`} />
        <div className={`h-16 w-full rounded-sm ${fill}`} />
        <div className={`h-12 w-48 rounded-sm ${fill}`} />
        <div className={`h-14 w-full ${fillStrong}`} />
      </div>
    </div>
    <span className="sr-only">Loading product…</span>
  </div>
);
