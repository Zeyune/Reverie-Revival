import React, { useState, useEffect, useMemo } from 'react';
import { StoreProvider } from './context/StoreContext';
import { ToastProvider } from './context/ToastContext';
import { Navigation } from './components/Navigation';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { ShopPage } from './pages/ShopPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { WishlistPage } from './pages/WishlistPage';
import { VisitTracker } from './components/VisitTracker';
import { StorefrontProduct, StorefrontCategory } from './data/storefront';

type Page = 
  | 'home' 
  | 'shop' 
  | 'product' 
  | 'cart' 
  | 'checkout' 
  | 'about' 
  | 'contact' 
  | 'wishlist'
  | 'new-drop';

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>('home');
  const [pageData, setPageData] = useState<string | undefined>(undefined);
  const [products, setProducts] = useState<StorefrontProduct[]>([]);
  const [categories, setCategories] = useState<StorefrontCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  useEffect(() => {
    const loadStorefront = async () => {
      try {
        const response = await fetch('/api/storefront/products');
        if (!response.ok) {
          throw new Error('Failed to load storefront data.');
        }
        const data = await response.json();
        setProducts(data.products ?? []);
        setCategories(data.categories ?? []);
      } catch (error) {
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    loadStorefront();
  }, []);

  const categoriesWithAll = useMemo(
    () => [{ name: 'All', slug: 'all' }, ...categories],
    [categories]
  );

  const handleNavigate = (page: string, data?: string) => {
    setCurrentPage(page as Page);
    setPageData(data);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <HomePage
            onNavigate={handleNavigate}
            products={products}
            categories={categoriesWithAll}
            isLoading={isLoading}
          />
        );
      
      case 'shop':
        return (
          <ShopPage
            onNavigate={handleNavigate}
            initialCategory={pageData}
            products={products}
            categories={categoriesWithAll}
            isLoading={isLoading}
          />
        );
      
      case 'new-drop':
        return (
          <ShopPage
            onNavigate={handleNavigate}
            initialCategory="all"
            products={products}
            categories={categoriesWithAll}
            isLoading={isLoading}
          />
        );
      
      case 'product':
        return pageData ? (
          <ProductDetailPage
            productId={pageData}
            onNavigate={handleNavigate}
            products={products}
            isLoading={isLoading}
          />
        ) : (
          <HomePage
            onNavigate={handleNavigate}
            products={products}
            categories={categoriesWithAll}
            isLoading={isLoading}
          />
        );
      
      case 'cart':
        return <CartPage onNavigate={handleNavigate} />;
      
      case 'checkout':
        return <CheckoutPage onNavigate={handleNavigate} />;
      
      case 'about':
        return <AboutPage />;
      
      case 'contact':
        return <ContactPage />;
      
      case 'wishlist':
        return (
          <WishlistPage
            onNavigate={handleNavigate}
            products={products}
            isLoading={isLoading}
          />
        );
      
      default:
        return (
          <HomePage
            onNavigate={handleNavigate}
            products={products}
            categories={categoriesWithAll}
            isLoading={isLoading}
          />
        );
    }
  };

  return (
    <StoreProvider>
      <ToastProvider>
        <div className="min-h-screen flex flex-col">
          <VisitTracker page={currentPage} pageData={pageData} />
          <Navigation currentPage={currentPage} onNavigate={handleNavigate} />
          <main className="flex-1">
            {renderPage()}
          </main>
          <Footer onNavigate={handleNavigate} />
        </div>
      </ToastProvider>
    </StoreProvider>
  );
}
