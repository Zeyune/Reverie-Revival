import React from 'react';
import { Hero } from '../components/Hero';
import { ProductCard } from '../components/ProductCard';
import { StorefrontProduct, StorefrontCategory, testimonials } from '../data/storefront';
import { Star, Mail } from 'lucide-react';

interface HomePageProps {
  onNavigate: (page: string, productId?: string) => void;
  products: StorefrontProduct[];
  categories: StorefrontCategory[];
}

export const HomePage: React.FC<HomePageProps> = ({
  onNavigate,
  products,
  categories,
}) => {
  // Deliberately NOT gated on isLoading.
  //
  // This used to return "Loading products..." on a blank screen until the
  // catalog fetch resolved, which meant the Hero — the largest element on the
  // page, and the one that has nothing to do with products — only rendered
  // after the JS bundle downloaded, React hydrated, and Supabase answered. The
  // hero image sat behind a database round-trip: ~4s of LCP "load delay".
  //
  // Rendering unconditionally puts the Hero in the server HTML, so the preload
  // scanner finds its <img> in the first bytes and starts fetching immediately.
  //
  // The three product-dependent sections below are all beneath a 90vh hero, so
  // they fill in off-screen and cost no layout shift. `products` starts as [],
  // so these are safe before the fetch lands.
  const newArrivals = products.filter((p) => p.badge === 'new').slice(0, 4);
  const bestSellers = products.slice(0, 8);

  return (
    <div className="min-h-screen">
      <Hero onNavigate={onNavigate} />

      {/* Featured Categories */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2
            className="text-center mb-4 tracking-[0.3em]"
            style={{ 
              fontFamily: "var(--font-poppins), sans-serif",
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
            }}
          >
            SHOP BY CATEGORY
          </h2>
          <p
            className="text-center mb-12 text-white/60"
            style={{ fontFamily: "var(--font-allura), cursive", fontSize: '1.75rem' }}
          >
            Find your style
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {categories.slice(1).map((category) => (
              <button
                key={category.slug}
                onClick={() => onNavigate('shop', category.slug)}
                className="group relative aspect-square bg-[#121214] border border-white/10 overflow-hidden hover:border-white/30 transition-all duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-t from-[#0B0B0C] to-transparent z-10" />
                <div className="absolute inset-0 flex items-center justify-center z-20">
                  <span
                    className="tracking-[0.2em] group-hover:tracking-[0.3em] transition-all duration-300"
                    style={{ fontFamily: "var(--font-poppins), sans-serif" }}
                  >
                    {category.name.toUpperCase()}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* New Arrivals */}
      <section className="py-20 px-4 bg-[#121214]/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2
                className="mb-2 tracking-[0.3em]"
                style={{ 
                  fontFamily: "var(--font-poppins), sans-serif",
                  fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                }}
              >
                NEW ARRIVALS
              </h2>
              <p
                className="text-white/60"
                style={{ fontFamily: "var(--font-allura), cursive", fontSize: '1.5rem' }}
              >
                Fresh drops
              </p>
            </div>
            <button
              onClick={() => onNavigate('new-drop')}
              className="px-6 py-3 border border-white/30 tracking-[0.2em] hover:bg-white hover:text-[#0B0B0C] transition-all duration-300"
              style={{ fontFamily: "var(--font-poppins), sans-serif" }}
            >
              VIEW ALL
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </section>

      {/* Best Sellers */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2
            className="text-center mb-4 tracking-[0.3em]"
            style={{ 
              fontFamily: "var(--font-poppins), sans-serif",
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
            }}
          >
            BEST SELLERS
          </h2>
          <p
            className="text-center mb-12 text-white/60"
            style={{ fontFamily: "var(--font-allura), cursive", fontSize: '1.75rem' }}
          >
            Customer favorites
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {bestSellers.map((product) => (
              <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
            ))}
          </div>
        </div>
      </section>

      {/* Brand Story */}
      <section className="py-20 px-4 bg-[#121214]/30">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="mb-6 tracking-[0.3em]"
            style={{ 
              fontFamily: "var(--font-poppins), sans-serif",
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
            }}
          >
            THE REVERIE REVIVAL STORY
          </h2>
          <p
            className="mb-8 text-white/60"
            style={{ fontFamily: "var(--font-allura), cursive", fontSize: '2rem' }}
          >
            Where dreams meet reality
          </p>
          <div className="space-y-6 text-white/80 leading-relaxed max-w-2xl mx-auto">
            <p>
              Born from the intersection of dreams and reality, Reverie Revival embodies the spirit of modern streetwear. We create pieces that blur the lines between aspiration and action, between vision and execution.
            </p>
            <p>
              Each garment is carefully crafted to empower you to awaken your dream and rewrite your reality. Our commitment to premium quality, minimalist design, and bold attitude defines everything we do.
            </p>
            <p className="tracking-[0.2em]" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
              EST. 2024 — PAMPANGA, PHILIPPINES
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2
            className="text-center mb-4 tracking-[0.3em]"
            style={{ 
              fontFamily: "var(--font-poppins), sans-serif",
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
            }}
          >
            WHAT THEY SAY
          </h2>
          <p
            className="text-center mb-12 text-white/60"
            style={{ fontFamily: "var(--font-allura), cursive", fontSize: '1.75rem' }}
          >
            Real feedback, real people
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {testimonials.map((testimonial) => (
              <div
                key={testimonial.id}
                className="bg-[#121214] border border-white/10 p-6 hover:border-white/20 transition-colors duration-300"
              >
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-[#E10613] stroke-[#E10613]" />
                  ))}
                </div>
                <p className="text-white/80 mb-4 leading-relaxed">{testimonial.text}</p>
                <p
                  className="tracking-[0.1em]"
                  style={{ fontFamily: "var(--font-poppins), sans-serif" }}
                >
                  — {testimonial.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Email Signup */}
      <section className="py-20 px-4 bg-[#121214]/30">
        <div className="max-w-2xl mx-auto text-center">
          <h2
            className="mb-4 tracking-[0.3em]"
            style={{ 
              fontFamily: "var(--font-poppins), sans-serif",
              fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
            }}
          >
            JOIN THE REVIVAL
          </h2>
          <p
            className="mb-8 text-white/60"
            style={{ fontFamily: "var(--font-allura), cursive", fontSize: '1.75rem' }}
          >
            Be the first to know
          </p>
          <p className="mb-8 text-white/80">
            Subscribe to get exclusive access to new drops, special offers, and insider updates.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto mb-6">
            <input
              type="email"
              placeholder="Your email address"
              className="flex-1 bg-[#0B0B0C] border border-white/20 px-4 py-4 text-white placeholder-white/40 focus:outline-none focus:border-white/50 transition-colors"
            />
            <button
              className="px-8 py-4 bg-white text-[#0B0B0C] tracking-[0.2em] hover:bg-[#E10613] hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
              style={{ fontFamily: "var(--font-poppins), sans-serif" }}
            >
              <Mail className="w-4 h-4" />
              SUBSCRIBE
            </button>
          </div>
          
          <div className="inline-block px-4 py-2 bg-[#E10613] tracking-[0.15em]">
            <span style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
              GET 10% OFF YOUR FIRST ORDER
            </span>
          </div>
        </div>
      </section>
    </div>
  );
};
