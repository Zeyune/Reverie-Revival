import React, { createContext, useContext, useSyncExternalStore } from 'react';
import { StorefrontProduct, getVariantPrice } from '../data/storefront';
import { toast } from 'sonner';
import {
  getServerSnapshot,
  getSnapshot,
  subscribe,
  update,
  type CartItem,
  type Promo,
} from '../lib/store';

export type { CartItem, Promo };

interface StoreContextType {
  cart: CartItem[];
  wishlist: string[];
  appliedPromo: Promo | null;
  addToCart: (product: StorefrontProduct, size: string, color: string, quantity: number) => void;
  removeFromCart: (productId: string, size: string, color: string) => void;
  updateCartQuantity: (productId: string, size: string, color: string, quantity: number) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
  getCartTotal: () => number;
  getDiscountAmount: () => number;
  getCartCount: () => number;
  applyPromo: (code: string) => Promise<boolean>;
  removePromo: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const isSameVariant = (
  item: CartItem,
  productId: string,
  size: string,
  color: string
) => item.product.id === productId && item.size === size && item.color === color;

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // localStorage is the source of truth; see ../lib/store.ts for why this reads
  // through useSyncExternalStore rather than mirroring into state with effects.
  const { cart, wishlist, appliedPromo } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  );

  const applyPromo = async (code: string) => {
    try {
      const response = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await response.json();

      if (data.valid) {
        update((current) => ({ ...current, appliedPromo: data.promo }));
        toast.success(`Promo code ${data.promo.code} applied!`);
        return true;
      }

      toast.error(data.error || 'Invalid promo code');
      return false;
    } catch {
      toast.error('Failed to apply promo code');
      return false;
    }
  };

  const removePromo = () => {
    update((current) => ({ ...current, appliedPromo: null }));
    toast.info('Promo code removed');
  };

  const addToCart = (
    product: StorefrontProduct,
    size: string,
    color: string,
    quantity: number
  ) => {
    const unitPrice = getVariantPrice(product, size, color);

    update((current) => {
      const existing = current.cart.find((item) =>
        isSameVariant(item, product.id, size, color)
      );

      const nextCart = existing
        ? current.cart.map((item) =>
            isSameVariant(item, product.id, size, color)
              ? { ...item, quantity: item.quantity + quantity, unitPrice }
              : item
          )
        : [...current.cart, { product, size, color, quantity, unitPrice }];

      return { ...current, cart: nextCart };
    });

    toast.success(`Added ${product.name} to cart`);
  };

  const removeFromCart = (productId: string, size: string, color: string) => {
    update((current) => ({
      ...current,
      cart: current.cart.filter(
        (item) => !isSameVariant(item, productId, size, color)
      ),
    }));
  };

  const updateCartQuantity = (
    productId: string,
    size: string,
    color: string,
    quantity: number
  ) => {
    if (quantity <= 0) {
      removeFromCart(productId, size, color);
      return;
    }

    update((current) => ({
      ...current,
      cart: current.cart.map((item) =>
        isSameVariant(item, productId, size, color) ? { ...item, quantity } : item
      ),
    }));
  };

  const clearCart = () => {
    update((current) => ({ ...current, cart: [], appliedPromo: null }));
  };

  const toggleWishlist = (productId: string) => {
    update((current) => ({
      ...current,
      wishlist: current.wishlist.includes(productId)
        ? current.wishlist.filter((id) => id !== productId)
        : [...current.wishlist, productId],
    }));
  };

  const getCartTotal = () =>
    cart.reduce((total, item) => total + item.unitPrice * item.quantity, 0);

  const getDiscountAmount = () => {
    if (!appliedPromo) {
      return 0;
    }

    const subtotal = getCartTotal();
    const raw =
      appliedPromo.type === 'PERCENTAGE'
        ? Math.round(subtotal * (appliedPromo.value / 100))
        : appliedPromo.value;

    // Never discount below zero or past the subtotal — a FIXED code worth more
    // than the cart used to render a negative total. This is display-side only;
    // the server must clamp again when it starts applying discounts for real.
    return Math.max(0, Math.min(raw, subtotal));
  };

  const getCartCount = () =>
    cart.reduce((count, item) => count + item.quantity, 0);

  return (
    <StoreContext.Provider
      value={{
        cart,
        wishlist,
        appliedPromo,
        addToCart,
        removeFromCart,
        updateCartQuantity,
        clearCart,
        toggleWishlist,
        getCartTotal,
        getDiscountAmount,
        getCartCount,
        applyPromo,
        removePromo
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
