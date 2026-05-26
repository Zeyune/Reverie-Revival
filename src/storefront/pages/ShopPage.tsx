import React, { useState, useMemo } from 'react';
import { ProductCard } from '../components/ProductCard';
import { StorefrontProduct, StorefrontCategory } from '../data/storefront';
import { SlidersHorizontal } from 'lucide-react';

interface ShopPageProps {
  onNavigate: (page: string, productId?: string) => void;
  initialCategory?: string;
  products: StorefrontProduct[];
  categories: StorefrontCategory[];
  isLoading?: boolean;
}

export const ShopPage: React.FC<ShopPageProps> = ({
  onNavigate,
  initialCategory,
  products,
  categories,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/60">
        Loading products...
      </div>
    );
  }
  const [selectedCategory, setSelectedCategory] = useState(initialCategory || 'all');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [sortBy, setSortBy] = useState('featured');
  const [showFilters, setShowFilters] = useState(false);
  const selectBaseClass =
    'bg-[#121214] border border-white/20 px-4 py-2 text-white focus:outline-none focus:border-white/50 transition-colors';
  const selectClass = `select-arrow ${selectBaseClass}`;

  const allSizes = ['S', 'M', 'L', 'XL', 'One Size'];
  const allColors = [
    { name: 'Black', hex: '#0B0B0C' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Charcoal', hex: '#121214' },
    { name: 'Olive', hex: '#4A4A3A' },
  ];

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter((p) => p.category.toLowerCase() === selectedCategory);
    }

    // Size filter
    if (selectedSizes.length > 0) {
      filtered = filtered.filter((p) =>
        p.sizes.some((size) => selectedSizes.includes(size))
      );
    }

    // Color filter
    if (selectedColors.length > 0) {
      filtered = filtered.filter((p) =>
        p.colors.some((color) => selectedColors.includes(color.name))
      );
    }

    // Price filter
    filtered = filtered.filter(
      (p) => p.price >= priceRange[0] && p.price <= priceRange[1]
    );

    // Sort
    switch (sortBy) {
      case 'price-low':
        filtered.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        filtered.sort((a, b) => b.price - a.price);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        break;
    }

    return filtered;
  }, [selectedCategory, selectedSizes, selectedColors, priceRange, sortBy]);

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) =>
      prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]
    );
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) =>
      prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]
    );
  };

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1
            className="mb-4 tracking-[0.3em]"
            style={{
              fontFamily: "'Poppins', sans-serif",
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
            }}
          >
            SHOP ALL
          </h1>
          <p
            className="text-white/60"
            style={{ fontFamily: "'Allura', cursive", fontSize: '1.75rem' }}
          >
            Discover your next favorite piece
          </p>
        </div>

        {/* Category Pills */}
        <div className="mb-8 flex flex-wrap gap-3 justify-center">
          {categories.map((category) => (
            <button
              key={category.slug}
              onClick={() => setSelectedCategory(category.slug)}
              className={`px-6 py-2 tracking-[0.15em] transition-all duration-300 ${
                selectedCategory === category.slug
                  ? 'bg-white text-[#0B0B0C]'
                  : 'border border-white/30 hover:border-white/60'
              }`}
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* Filters and Sort Bar */}
        <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 border border-white/30 hover:border-white/60 transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="tracking-[0.15em]" style={{ fontFamily: "'Poppins', sans-serif" }}>
              FILTERS
            </span>
          </button>

          <div className="flex items-center gap-4">
            <span className="text-white/60">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={selectClass}
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name">Name: A-Z</option>
            </select>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="mb-8 p-6 bg-[#121214] border border-white/10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Size Filter */}
              <div>
                <h3
                  className="mb-4 tracking-[0.2em]"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  SIZE
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allSizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => toggleSize(size)}
                      className={`px-4 py-2 border transition-all duration-300 ${
                        selectedSizes.includes(size)
                          ? 'bg-white text-[#0B0B0C] border-white'
                          : 'border-white/30 hover:border-white/60'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Filter */}
              <div>
                <h3
                  className="mb-4 tracking-[0.2em]"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  COLOR
                </h3>
                <div className="flex flex-wrap gap-3">
                  {allColors.map((color) => (
                    <button
                      key={color.name}
                      onClick={() => toggleColor(color.name)}
                      className={`w-10 h-10 border-2 transition-all duration-300 ${
                        selectedColors.includes(color.name)
                          ? 'border-white scale-110'
                          : 'border-white/30'
                      }`}
                      style={{ backgroundColor: color.hex }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Price Filter */}
              <div>
                <h3
                  className="mb-4 tracking-[0.2em]"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  PRICE RANGE
                </h3>
                <div className="space-y-4">
                  <input
                    type="range"
                    min="0"
                    max="10000"
                    step="100"
                    value={priceRange[1]}
                    onChange={(e) => setPriceRange([0, parseInt(e.target.value)])}
                    className="w-full"
                  />
                  <p className="text-white/60">
                    ₱0 - ₱{priceRange[1].toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Clear Filters */}
            <button
              onClick={() => {
                setSelectedSizes([]);
                setSelectedColors([]);
                setPriceRange([0, 10000]);
              }}
              className="mt-6 px-4 py-2 border border-white/30 hover:bg-white hover:text-[#0B0B0C] transition-all duration-300"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Products Grid */}
        <div className="mb-8">
          <p className="text-white/60 mb-6">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
          </p>
          
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} onNavigate={onNavigate} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-white/60 mb-4">No products found matching your filters.</p>
              <button
                onClick={() => {
                  setSelectedCategory('all');
                  setSelectedSizes([]);
                  setSelectedColors([]);
                  setPriceRange([0, 10000]);
                }}
                className="px-6 py-3 border border-white/30 hover:bg-white hover:text-[#0B0B0C] transition-all duration-300"
              >
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
