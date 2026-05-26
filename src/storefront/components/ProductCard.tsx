import React from 'react';
import { Heart, ShoppingCart } from 'lucide-react';
import { StorefrontProduct } from '../data/storefront';
import { useStore } from '../context/StoreContext';

interface ProductCardProps {
  product: StorefrontProduct;
  onNavigate: (page: string, productId?: string) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product, onNavigate }) => {
  const { wishlist, toggleWishlist, addToCart } = useStore();
  const isWishlisted = wishlist.includes(product.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    addToCart(product, product.sizes[0], product.colors[0].name, 1);
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleWishlist(product.id);
  };

  const variantPrices =
    product.variants?.map((variant) => variant.price) ?? [];
  const hasVariantPrices = variantPrices.length > 0;
  const minVariantPrice = hasVariantPrices
    ? Math.min(...variantPrices)
    : product.price;
  const maxVariantPrice = hasVariantPrices
    ? Math.max(...variantPrices)
    : product.price;
  const showRange = minVariantPrice !== maxVariantPrice;

  const formatPrice = (price: number) => {
    return `₱${price.toLocaleString()}`;
  };

  return (
    <div
      onClick={() => onNavigate('product', product.id)}
      className="group relative cursor-pointer bg-[#121214] border border-white/5 overflow-hidden transition-all duration-300 hover:border-white/20"
    >
      {/* Badge */}
      {product.badge && (
        <div
          className={`absolute top-4 left-4 z-10 px-3 py-1 tracking-[0.2em] ${
            product.badge === 'sale' ? 'bg-[#E10613]' : 'bg-white text-[#0B0B0C]'
          }`}
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          {product.badge === 'sale' ? 'SALE' : 'NEW'}
        </div>
      )}

      {/* Wishlist Button */}
      <button
        onClick={handleWishlist}
        className="absolute top-4 right-4 z-10 p-2 bg-[#0B0B0C]/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        aria-label="Add to wishlist"
      >
        <Heart
          className={`w-5 h-5 transition-colors ${
            isWishlisted ? 'fill-[#E10613] stroke-[#E10613]' : 'stroke-white'
          }`}
        />
      </button>

      {/* Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#0B0B0C]">
        <img
          src={product.images[0]}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        
        {/* Quick Add Overlay */}
        <div className="absolute inset-0 bg-[#0B0B0C]/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
          <button
            onClick={handleQuickAdd}
            className="px-6 py-3 bg-white text-[#0B0B0C] tracking-[0.2em] hover:bg-[#E10613] hover:text-white transition-all duration-300 flex items-center gap-2"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            <ShoppingCart className="w-4 h-4" />
            QUICK ADD
          </button>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-4">
        <h3
          className="mb-2 tracking-[0.1em] truncate"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          {product.name}
        </h3>
        
        <p className="text-white/60 mb-3 line-clamp-2 h-12">
          {product.description}
        </p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className="tracking-[0.05em]">
              {showRange
                ? `${formatPrice(minVariantPrice)} - ${formatPrice(maxVariantPrice)}`
                : formatPrice(minVariantPrice)}
            </span>
            {product.originalPrice && !showRange && (
              <span className="text-white/40 line-through">
                {formatPrice(product.originalPrice)}
              </span>
            )}
          </div>
          
          {/* Color Options */}
          <div className="flex gap-1">
            {product.colors.slice(0, 3).map((color) => (
              <div
                key={color.name}
                className="w-4 h-4 border border-white/20"
                style={{ backgroundColor: color.hex }}
                title={color.name}
              />
            ))}
            {product.colors.length > 3 && (
              <div className="w-4 h-4 border border-white/20 flex items-center justify-center bg-[#0B0B0C]">
                <span className="text-[8px]">+{product.colors.length - 3}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
