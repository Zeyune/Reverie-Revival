import React, { useState } from 'react';
import { StorefrontProduct, getVariantPrice } from '../data/storefront';
import { useStore } from '../context/StoreContext';
import { useToast } from '../context/ToastContext';
import { Heart, ChevronDown, ShoppingCart, Truck, RotateCcw, Shield } from 'lucide-react';
import { ProductCard } from '../components/ProductCard';

interface ProductDetailPageProps {
  productId: string;
  onNavigate: (page: string, productId?: string) => void;
  products: StorefrontProduct[];
  isLoading?: boolean;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  productId,
  onNavigate,
  products,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/60">
        Loading product...
      </div>
    );
  }
  const product = products.find((p) => p.id === productId);
  const { wishlist, toggleWishlist, addToCart } = useStore();
  const { addToast } = useToast();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [expandedSection, setExpandedSection] = useState<string | null>('details');

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 mb-4">Product not found</p>
          <button
            onClick={() => onNavigate('shop')}
            className="px-6 py-3 border border-white/30 hover:bg-white hover:text-[#0B0B0C] transition-all duration-300"
          >
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  const isWishlisted = wishlist.includes(product.id);
  const recommendations = products.filter((p) => p.category === product.category && p.id !== product.id).slice(0, 4);
  const variantPrices =
    product.variants?.map((variant) => variant.price) ?? [];
  const hasVariantPrices = variantPrices.length > 0;
  const minVariantPrice = hasVariantPrices
    ? Math.min(...variantPrices)
    : product.price;
  const maxVariantPrice = hasVariantPrices
    ? Math.max(...variantPrices)
    : product.price;
  const selectedPrice =
    selectedSize && selectedColor
      ? getVariantPrice(product, selectedSize, selectedColor)
      : null;
  const displayPrice =
    selectedPrice ?? (minVariantPrice === maxVariantPrice ? minVariantPrice : null);
  const showCompareAt =
    displayPrice !== null &&
    product.originalPrice !== undefined &&
    product.originalPrice !== null &&
    product.originalPrice > displayPrice;

  const handleAddToCart = () => {
    if (!selectedSize || !selectedColor) {
      addToast('Please select size and color', { variant: 'error' });
      return;
    }
    addToCart(product, selectedSize, selectedColor, quantity);
  };

  const formatPrice = (price: number) => `₱${price.toLocaleString()}`;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const handleClearVariants = () => {
    setSelectedSize('');
    setSelectedColor('');
    setQuantity(1);
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-8 flex items-center gap-2 text-white/60">
          <button onClick={() => onNavigate('home')} className="hover:text-white transition-colors">
            Home
          </button>
          <span>/</span>
          <button onClick={() => onNavigate('shop')} className="hover:text-white transition-colors">
            Shop
          </button>
          <span>/</span>
          <button
            onClick={() => onNavigate('shop', product.category.toLowerCase())}
            className="hover:text-white transition-colors"
          >
            {product.category}
          </button>
          <span>/</span>
          <span className="text-white">{product.name}</span>
        </div>

        {/* Product Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-[3/4] bg-[#121214] border border-white/10 overflow-hidden">
              <img
                src={product.images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            {product.images.length > 1 && (
              <div className="grid grid-cols-4 gap-4">
                {product.images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`aspect-[3/4] bg-[#121214] border overflow-hidden ${
                      selectedImage === index ? 'border-white' : 'border-white/10'
                    }`}
                  >
                    <img src={image} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Badge */}
            {product.badge && (
              <div
                className={`inline-block px-4 py-1 tracking-[0.2em] ${
                  product.badge === 'sale' ? 'bg-[#E10613]' : 'bg-white text-[#0B0B0C]'
                }`}
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                {product.badge === 'sale' ? 'SALE' : 'NEW'}
              </div>
            )}

            {/* Name and Price */}
            <div>
              <h1
                className="mb-4 tracking-[0.15em]"
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
                }}
              >
                {product.name}
              </h1>
              <div className="flex items-baseline gap-3 mb-4">
                <span className="tracking-[0.05em]" style={{ fontSize: '1.75rem' }}>
                  {displayPrice !== null
                    ? formatPrice(displayPrice)
                    : `${formatPrice(minVariantPrice)} - ${formatPrice(maxVariantPrice)}`}
                </span>
                {showCompareAt && (
                  <span className="text-white/40 line-through">
                    {formatPrice(product.originalPrice as number)}
                  </span>
                )}
              </div>
              <p className="text-white/80 leading-relaxed">{product.description}</p>
            </div>

            {/* Color Selection */}
            <div>
              <label
                className="block mb-3 tracking-[0.15em]"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                COLOR: {selectedColor}
              </label>
              <div className="flex flex-wrap gap-3">
                {product.colors.map((color) => (
                  <button
                    key={color.name}
                    onClick={() => setSelectedColor(color.name)}
                    className={`w-12 h-12 border-2 transition-all duration-300 ${
                      selectedColor === color.name ? 'border-white scale-110' : 'border-white/30'
                    }`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Size Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label
                  className="tracking-[0.15em]"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  SIZE: {selectedSize}
                </label>
                <button className="text-white/60 hover:text-white transition-colors underline">
                  Size Guide
                </button>
              </div>
              <div className="flex flex-wrap gap-3">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`px-6 py-3 border tracking-[0.1em] transition-all duration-300 ${
                      selectedSize === size
                        ? 'bg-white text-[#0B0B0C] border-white'
                        : 'border-white/30 hover:border-white/60'
                    }`}
                    style={{ fontFamily: "'Poppins', sans-serif" }}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleClearVariants}
                  className="text-xs tracking-[0.25em] text-white/60 underline hover:text-white transition-colors"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  CLEAR VARIANTS
                </button>
              </div>
            </div>

            {/* Quantity */}
            <div>
              <label
                className="block mb-3 tracking-[0.15em]"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                QUANTITY
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-12 h-12 border border-white/30 hover:border-white/60 transition-colors"
                >
                  -
                </button>
                <span className="w-12 text-center">{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-12 h-12 border border-white/30 hover:border-white/60 transition-colors"
                >
                  +
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleAddToCart}
                className="w-full py-4 bg-white text-[#0B0B0C] tracking-[0.2em] hover:bg-[#E10613] hover:text-white transition-all duration-300 flex items-center justify-center gap-2"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                <ShoppingCart className="w-5 h-5" />
                ADD TO CART
              </button>
              <button
                onClick={() => toggleWishlist(product.id)}
                className={`w-full py-4 border tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-2 ${
                  isWishlisted
                    ? 'border-[#E10613] text-[#E10613]'
                    : 'border-white/30 hover:border-white/60'
                }`}
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                <Heart className={isWishlisted ? 'fill-[#E10613]' : ''} />
                {isWishlisted ? 'IN WISHLIST' : 'ADD TO WISHLIST'}
              </button>
            </div>

            {/* Features */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/10">
              <div className="text-center">
                <Truck className="w-6 h-6 mx-auto mb-2 text-white/60" />
                <p className="text-sm text-white/60">Free Shipping</p>
              </div>
              <div className="text-center">
                <RotateCcw className="w-6 h-6 mx-auto mb-2 text-white/60" />
                <p className="text-sm text-white/60">Easy Returns</p>
              </div>
              <div className="text-center">
                <Shield className="w-6 h-6 mx-auto mb-2 text-white/60" />
                <p className="text-sm text-white/60">Secure Payment</p>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Accordion */}
        <div className="mb-20 max-w-4xl mx-auto">
          {[
            { id: 'details', title: 'PRODUCT DETAILS', content: product.details },
            { id: 'materials', title: 'MATERIALS & CARE', content: `${product.materials}\n\nCare Instructions:\n${product.care}` },
            { id: 'fit', title: 'FIT & SIZING', content: product.fit },
            { id: 'shipping', title: 'SHIPPING & RETURNS', content: 'Free standard shipping on orders over ₱2,000. Easy returns within 30 days. Items must be unworn with tags attached.' },
          ].map((section) => (
            <div key={section.id} className="border-b border-white/10">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full py-6 flex items-center justify-between text-left hover:bg-white/5 transition-colors px-6"
              >
                <span
                  className="tracking-[0.2em]"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {section.title}
                </span>
                <ChevronDown
                  className={`w-5 h-5 transition-transform ${
                    expandedSection === section.id ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedSection === section.id && (
                <div className="px-6 pb-6 text-white/80 leading-relaxed whitespace-pre-line">
                  {section.content}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Complete the Look */}
        {recommendations.length > 0 && (
          <div>
            <h2
              className="mb-8 text-center tracking-[0.3em]"
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: 'clamp(1.5rem, 3vw, 2.5rem)',
              }}
            >
              COMPLETE THE LOOK
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.map((product) => (
                <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
