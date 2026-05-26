import React from 'react';
import { useStore } from '../context/StoreContext';
import { StorefrontProduct } from '../data/storefront';
import { ProductCard } from '../components/ProductCard';
import { Heart } from 'lucide-react';

interface WishlistPageProps {
  onNavigate: (page: string, productId?: string) => void;
  products: StorefrontProduct[];
  isLoading?: boolean;
}

export const WishlistPage: React.FC<WishlistPageProps> = ({
  onNavigate,
  products,
  isLoading,
}) => {
  const { wishlist } = useStore();
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/60">
        Loading wishlist...
      </div>
    );
  }
  const wishlistProducts = products.filter((p) => wishlist.includes(p.id));

  if (wishlistProducts.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center py-20 px-4">
        <div className="text-center">
          <Heart className="w-20 h-20 mx-auto mb-6 text-white/20" />
          <h2
            className="mb-4 tracking-[0.2em]"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 'clamp(1.5rem, 3vw, 2rem)',
            }}
          >
            YOUR WISHLIST IS EMPTY
          </h2>
          <p className="text-white/60 mb-8">Save your favorite items for later.</p>
          <button
            onClick={() => onNavigate('shop')}
            className="px-8 py-4 bg-white text-[#0B0B0C] tracking-[0.2em] hover:bg-[#E10613] hover:text-white transition-all duration-300"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            SHOP NOW
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <h1
          className="mb-4 text-center tracking-[0.3em]"
          style={{
            fontFamily: "'Poppins', sans-serif",
            fontSize: 'clamp(2rem, 4vw, 3rem)',
          }}
        >
          YOUR WISHLIST
        </h1>
        <p className="text-center text-white/60 mb-12">
          {wishlistProducts.length} {wishlistProducts.length === 1 ? 'item' : 'items'} saved
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {wishlistProducts.map((product) => (
            <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
          ))}
        </div>
      </div>
    </div>
  );
};
