import { StorefrontProduct, getVariantPrice } from '../data/storefront';

export interface CartItem {
  product: StorefrontProduct;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
}

export interface Promo {
  code: string;
  type: 'PERCENTAGE' | 'FIXED';
  value: number;
}

export interface StoreSnapshot {
  cart: CartItem[];
  wishlist: string[];
  appliedPromo: Promo | null;
}

const KEYS = {
  cart: 'reverie-cart',
  wishlist: 'reverie-wishlist',
  promo: 'reverie-promo',
} as const;

const PERSISTED_KEYS: string[] = Object.values(KEYS);

/**
 * localStorage is the source of truth for the cart; this module is the adapter
 * that lets React read it via useSyncExternalStore.
 *
 * The previous design kept the cart in React state and mirrored it to storage
 * with effects, which meant two sources of truth, an `isHydrated` flag to stop
 * them fighting on startup, and a setState-in-an-effect the linter (rightly)
 * complained about. Reading through useSyncExternalStore removes all three, and
 * React handles the SSR boundary itself: it renders getServerSnapshot during
 * hydration, then switches to getSnapshot afterwards. That avoids the hydration
 * mismatch a lazy useState initializer would cause — the cart badge in
 * Navigation renders from this state, so server and client HTML must agree.
 */

// Stable reference for SSR and for "storage is empty". Frozen because React
// compares snapshots by identity — a mutation here would be invisible to it.
const EMPTY_SNAPSHOT: StoreSnapshot = Object.freeze({
  cart: Object.freeze([]) as unknown as CartItem[],
  wishlist: Object.freeze([]) as unknown as string[],
  appliedPromo: null,
});

const listeners = new Set<() => void>();

// getSnapshot runs on every render and MUST return a referentially stable value
// when nothing changed, or useSyncExternalStore re-renders forever. We cache the
// parsed snapshot against the raw strings it came from: three getItem calls per
// render (cheap, synchronous) and a reparse only when the bytes actually differ.
// Keying off the raw strings also makes the cache self-invalidating — anything
// that writes storage behind our back is picked up on the next read.
let cachedRaw: Record<keyof typeof KEYS, string | null> = {
  cart: null,
  wishlist: null,
  promo: null,
};
let cachedSnapshot: StoreSnapshot = EMPTY_SNAPSHOT;

function parseJson<T>(raw: string | null, fallback: T, label: string): T {
  if (!raw) {
    return fallback;
  }
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    console.error(`Failed to parse saved ${label}.`, error);
    return fallback;
  }
}

function parseCart(raw: string | null): CartItem[] {
  const parsed = parseJson<unknown>(raw, [], 'cart');
  if (!Array.isArray(parsed)) {
    return [];
  }

  return (parsed as CartItem[]).map((item) => ({
    ...item,
    // Carts saved before unitPrice existed still need a price to total up.
    unitPrice:
      typeof item.unitPrice === 'number'
        ? item.unitPrice
        : getVariantPrice(item.product, item.size, item.color),
  }));
}

function parseWishlist(raw: string | null): string[] {
  const parsed = parseJson<unknown>(raw, [], 'wishlist');
  return Array.isArray(parsed) ? (parsed as string[]) : [];
}

export function getSnapshot(): StoreSnapshot {
  if (typeof window === 'undefined') {
    return EMPTY_SNAPSHOT;
  }

  const raw = {
    cart: window.localStorage.getItem(KEYS.cart),
    wishlist: window.localStorage.getItem(KEYS.wishlist),
    promo: window.localStorage.getItem(KEYS.promo),
  };

  if (
    raw.cart === cachedRaw.cart &&
    raw.wishlist === cachedRaw.wishlist &&
    raw.promo === cachedRaw.promo
  ) {
    return cachedSnapshot;
  }

  cachedRaw = raw;
  cachedSnapshot = {
    cart: parseCart(raw.cart),
    wishlist: parseWishlist(raw.wishlist),
    appliedPromo: parseJson<Promo | null>(raw.promo, null, 'promo'),
  };

  return cachedSnapshot;
}

export function getServerSnapshot(): StoreSnapshot {
  return EMPTY_SNAPSHOT;
}

function handleStorage(event: StorageEvent) {
  // key is null when storage is cleared wholesale.
  if (event.key !== null && !PERSISTED_KEYS.includes(event.key)) {
    return;
  }
  emit();
}

function emit() {
  listeners.forEach((listener) => listener());
}

export function subscribe(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  // 'storage' only fires in OTHER tabs, so this is the cross-tab channel: add to
  // your cart in one tab and every other tab updates. getSnapshot re-reads and
  // sees the new bytes, so the handler just has to poke React.
  window.addEventListener('storage', handleStorage);

  return () => {
    listeners.delete(onStoreChange);
    if (listeners.size === 0) {
      window.removeEventListener('storage', handleStorage);
    }
  };
}

function persist(next: StoreSnapshot) {
  window.localStorage.setItem(KEYS.cart, JSON.stringify(next.cart));
  window.localStorage.setItem(KEYS.wishlist, JSON.stringify(next.wishlist));
  if (next.appliedPromo) {
    window.localStorage.setItem(KEYS.promo, JSON.stringify(next.appliedPromo));
  } else {
    window.localStorage.removeItem(KEYS.promo);
  }
}

/**
 * The only write path. Takes the current snapshot, persists what you return, and
 * notifies React.
 */
export function update(
  mutate: (current: StoreSnapshot) => StoreSnapshot
): void {
  const next = mutate(getSnapshot());

  persist(next);

  // Re-point the cache at what we just wrote so the next getSnapshot returns
  // `next` by identity instead of reparsing it straight back out of storage.
  cachedRaw = {
    cart: window.localStorage.getItem(KEYS.cart),
    wishlist: window.localStorage.getItem(KEYS.wishlist),
    promo: window.localStorage.getItem(KEYS.promo),
  };
  cachedSnapshot = next;

  emit();
}
