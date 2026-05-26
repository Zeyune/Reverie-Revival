import React, { useState } from 'react';
import { Search, ShoppingCart, Heart, Menu, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';

interface NavigationProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onNavigate }) => {
  const { getCartCount } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const navItems = [
    { label: 'HOME', page: 'home' },
    { label: 'SHOP', page: 'shop' },
    { label: 'NEW DROP', page: 'new-drop' },
    { label: 'ABOUT', page: 'about' },
    { label: 'VISIT US', page: 'contact' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-[#0B0B0C]/95 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <button
            onClick={() => onNavigate('home')}
            className="flex items-center space-x-2 group"
          >
            <div className="relative">
              <span
                className="uppercase tracking-[0.3em] transition-all"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                REVERIE REVIVAL
              </span>
              <div className="absolute -bottom-1 left-0 w-0 h-[1px] bg-white transition-all duration-300 group-hover:w-full" />
            </div>
          </button>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-8">
            {navItems.map((item) => (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className="relative group"
              >
                <span
                  className={`tracking-[0.2em] transition-colors ${
                    currentPage === item.page ? 'text-white' : 'text-white/70'
                  } hover:text-white`}
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  {item.label}
                </span>
                <div
                  className={`absolute -bottom-1 left-0 h-[1px] bg-white transition-all duration-300 ${
                    currentPage === item.page ? 'w-full' : 'w-0 group-hover:w-full'
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Icons */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              className="p-2 hover:bg-white/5 rounded-sm transition-colors"
              aria-label="Search"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => onNavigate('wishlist')}
              className="p-2 hover:bg-white/5 rounded-sm transition-colors"
              aria-label="Wishlist"
            >
              <Heart className="w-5 h-5" />
            </button>
            <button
              onClick={() => onNavigate('cart')}
              className="relative p-2 hover:bg-white/5 rounded-sm transition-colors"
              aria-label="Cart"
            >
              <ShoppingCart className="w-5 h-5" />
              {getCartCount() > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#E10613] text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
                  {getCartCount()}
                </span>
              )}
            </button>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="lg:hidden p-2 hover:bg-white/5 rounded-sm transition-colors"
              aria-label="Menu"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {isSearchOpen && (
          <div className="py-4 border-t border-white/10">
            <input
              type="text"
              placeholder="Search products..."
              className="w-full bg-[#121214] border border-white/10 px-4 py-3 text-white placeholder-white/40 focus:outline-none focus:border-white/30 transition-colors"
              autoFocus
            />
          </div>
        )}
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden border-t border-white/10 bg-[#0B0B0C]">
          <div className="px-4 py-4 space-y-3">
            {navItems.map((item) => (
              <button
                key={item.page}
                onClick={() => {
                  onNavigate(item.page);
                  setIsMenuOpen(false);
                }}
                className={`block w-full text-left py-3 px-4 tracking-[0.2em] transition-colors ${
                  currentPage === item.page
                    ? 'bg-white/5 text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
};
