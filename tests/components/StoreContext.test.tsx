import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { StoreProvider, useStore } from "@/storefront/context/StoreContext";
import type { StorefrontProduct } from "@/storefront/data/storefront";

// Characterization tests: these pin down the behaviour that must survive the
// useSyncExternalStore refactor. They describe what the cart DOES, never how it
// stores it, so they stay honest across the rewrite.

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const CART_KEY = "reverie-cart";
const WISHLIST_KEY = "reverie-wishlist";
const PROMO_KEY = "reverie-promo";

const product = (over: Partial<StorefrontProduct> = {}): StorefrontProduct => ({
  id: "p1",
  name: "Test Hoodie",
  slug: "test-hoodie",
  category: "Hoodies",
  price: 1000,
  description: "",
  details: "",
  materials: "",
  fit: "",
  care: "",
  images: [],
  colors: [{ name: "Black", hex: "#0B0B0C" }],
  sizes: ["M"],
  inStock: true,
  ...over,
});

const mount = () =>
  renderHook(() => useStore(), {
    wrapper: ({ children }) => <StoreProvider>{children}</StoreProvider>,
  });

const storedCart = () => JSON.parse(localStorage.getItem(CART_KEY) ?? "[]");

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

afterEach(() => {
  localStorage.clear();
});

describe("StoreContext — cart", () => {
  it("starts empty", () => {
    const { result } = mount();

    expect(result.current.cart).toEqual([]);
    expect(result.current.getCartCount()).toBe(0);
    expect(result.current.getCartTotal()).toBe(0);
  });

  it("adds an item", async () => {
    const { result } = mount();

    act(() => result.current.addToCart(product(), "M", "Black", 2));

    await waitFor(() => expect(result.current.cart).toHaveLength(1));
    expect(result.current.getCartCount()).toBe(2);
    expect(result.current.getCartTotal()).toBe(2000);
  });

  it("merges quantity when the same variant is added twice", async () => {
    const { result } = mount();

    act(() => result.current.addToCart(product(), "M", "Black", 1));
    act(() => result.current.addToCart(product(), "M", "Black", 2));

    await waitFor(() => expect(result.current.cart).toHaveLength(1));
    expect(result.current.getCartCount()).toBe(3);
  });

  it("keeps different variants of the same product separate", async () => {
    const { result } = mount();

    act(() => result.current.addToCart(product({ sizes: ["M", "L"] }), "M", "Black", 1));
    act(() => result.current.addToCart(product({ sizes: ["M", "L"] }), "L", "Black", 1));

    await waitFor(() => expect(result.current.cart).toHaveLength(2));
  });

  it("removes an item", async () => {
    const { result } = mount();

    act(() => result.current.addToCart(product(), "M", "Black", 1));
    await waitFor(() => expect(result.current.cart).toHaveLength(1));

    act(() => result.current.removeFromCart("p1", "M", "Black"));
    await waitFor(() => expect(result.current.cart).toHaveLength(0));
  });

  it("updates quantity", async () => {
    const { result } = mount();

    act(() => result.current.addToCart(product(), "M", "Black", 1));
    act(() => result.current.updateCartQuantity("p1", "M", "Black", 5));

    await waitFor(() => expect(result.current.getCartCount()).toBe(5));
  });

  it("removes the item when quantity drops to zero", async () => {
    const { result } = mount();

    act(() => result.current.addToCart(product(), "M", "Black", 1));
    await waitFor(() => expect(result.current.cart).toHaveLength(1));

    act(() => result.current.updateCartQuantity("p1", "M", "Black", 0));
    await waitFor(() => expect(result.current.cart).toHaveLength(0));
  });

  it("clears the cart", async () => {
    const { result } = mount();

    act(() => result.current.addToCart(product(), "M", "Black", 1));
    await waitFor(() => expect(result.current.cart).toHaveLength(1));

    act(() => result.current.clearCart());
    await waitFor(() => expect(result.current.cart).toHaveLength(0));
  });

  it("prices from the matching variant, not the base price", async () => {
    const withVariants = product({
      variants: [{ size: "M", color: "Black", price: 1234 }],
    });
    const { result } = mount();

    act(() => result.current.addToCart(withVariants, "M", "Black", 1));

    await waitFor(() => expect(result.current.getCartTotal()).toBe(1234));
  });
});

describe("StoreContext — persistence", () => {
  it("writes the cart to localStorage", async () => {
    const { result } = mount();

    act(() => result.current.addToCart(product(), "M", "Black", 1));

    await waitFor(() => expect(storedCart()).toHaveLength(1));
  });

  it("restores a saved cart on mount", async () => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([
        { product: product(), size: "M", color: "Black", quantity: 2, unitPrice: 1000 },
      ])
    );

    const { result } = mount();

    await waitFor(() => expect(result.current.cart).toHaveLength(1));
    expect(result.current.getCartCount()).toBe(2);
    expect(result.current.getCartTotal()).toBe(2000);
  });

  it("backfills unitPrice for legacy items saved without one", async () => {
    localStorage.setItem(
      CART_KEY,
      JSON.stringify([
        {
          product: product({ variants: [{ size: "M", color: "Black", price: 777 }] }),
          size: "M",
          color: "Black",
          quantity: 1,
        },
      ])
    );

    const { result } = mount();

    await waitFor(() => expect(result.current.getCartTotal()).toBe(777));
  });

  it("does not clobber a saved cart with the empty initial state", async () => {
    const saved = [
      { product: product(), size: "M", color: "Black", quantity: 1, unitPrice: 1000 },
    ];
    localStorage.setItem(CART_KEY, JSON.stringify(saved));

    mount();

    // The regression this guards: writing state back before hydration finishes
    // wipes the customer's cart on every page load.
    await waitFor(() => expect(storedCart()).toHaveLength(1));
  });

  it("survives malformed JSON in storage", async () => {
    localStorage.setItem(CART_KEY, "{not json");
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = mount();

    await waitFor(() => expect(result.current.cart).toEqual([]));
  });

  it("restores a saved wishlist on mount", async () => {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(["p1", "p2"]));

    const { result } = mount();

    await waitFor(() => expect(result.current.wishlist).toEqual(["p1", "p2"]));
  });
});

describe("StoreContext — wishlist", () => {
  it("toggles a product on and off", async () => {
    const { result } = mount();

    act(() => result.current.toggleWishlist("p1"));
    await waitFor(() => expect(result.current.wishlist).toEqual(["p1"]));

    act(() => result.current.toggleWishlist("p1"));
    await waitFor(() => expect(result.current.wishlist).toEqual([]));
  });

  it("persists the wishlist", async () => {
    const { result } = mount();

    act(() => result.current.toggleWishlist("p1"));

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(WISHLIST_KEY) ?? "[]")).toEqual(["p1"])
    );
  });
});

describe("StoreContext — promo", () => {
  const mockValidate = (body: unknown) =>
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ json: async () => body } as Response)
    );

  it("applies a valid percentage code", async () => {
    mockValidate({ valid: true, promo: { code: "SAVE20", type: "PERCENTAGE", value: 20 } });
    const { result } = mount();

    act(() => result.current.addToCart(product(), "M", "Black", 1));
    await act(async () => {
      await result.current.applyPromo("SAVE20");
    });

    await waitFor(() => expect(result.current.appliedPromo?.code).toBe("SAVE20"));
    expect(result.current.getDiscountAmount()).toBe(200); // 20% of 1000
  });

  it("applies a valid fixed code", async () => {
    mockValidate({ valid: true, promo: { code: "FLAT100", type: "FIXED", value: 100 } });
    const { result } = mount();

    act(() => result.current.addToCart(product(), "M", "Black", 1));
    await act(async () => {
      await result.current.applyPromo("FLAT100");
    });

    await waitFor(() => expect(result.current.getDiscountAmount()).toBe(100));
  });

  it("rejects an invalid code", async () => {
    mockValidate({ valid: false, error: "That code isn't valid." });
    const { result } = mount();

    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.applyPromo("NOPE");
    });

    expect(ok).toBe(false);
    expect(result.current.appliedPromo).toBeNull();
  });

  it("clears the promo when the cart is cleared", async () => {
    mockValidate({ valid: true, promo: { code: "SAVE20", type: "PERCENTAGE", value: 20 } });
    const { result } = mount();

    act(() => result.current.addToCart(product(), "M", "Black", 1));
    await act(async () => {
      await result.current.applyPromo("SAVE20");
    });
    await waitFor(() => expect(result.current.appliedPromo).not.toBeNull());

    act(() => result.current.clearCart());
    await waitFor(() => expect(result.current.appliedPromo).toBeNull());
  });

  it("reports no discount when no promo is applied", () => {
    const { result } = mount();

    expect(result.current.getDiscountAmount()).toBe(0);
  });

  // Was: a FIXED code worth more than the cart rendered a negative total
  // (a ₱5000 code on a ₱1000 cart showed ₱-3,850).
  it("never discounts more than the subtotal", async () => {
    mockValidate({ valid: true, promo: { code: "HUGE", type: "FIXED", value: 5000 } });
    const { result } = mount();

    act(() => result.current.addToCart(product(), "M", "Black", 1)); // ₱1000
    await act(async () => {
      await result.current.applyPromo("HUGE");
    });

    await waitFor(() => expect(result.current.getDiscountAmount()).toBe(1000));
    expect(result.current.getCartTotal() - result.current.getDiscountAmount())
      .toBeGreaterThanOrEqual(0);
  });

  // Was: appliedPromo lived in memory only, so a refresh silently dropped it.
  //
  // Assert against localStorage, not against a remounted provider. The store
  // caches its snapshot at module scope and unmounting a component doesn't
  // reload the module — so a remount reads the cache, not storage, and would
  // still "pass" with persistence entirely removed. Only the bytes prove it.
  it("persists the applied promo to storage", async () => {
    mockValidate({ valid: true, promo: { code: "SAVE20", type: "PERCENTAGE", value: 20 } });
    const { result } = mount();

    await act(async () => {
      await result.current.applyPromo("SAVE20");
    });

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem(PROMO_KEY) ?? "null")).toMatchObject({
        code: "SAVE20",
        type: "PERCENTAGE",
        value: 20,
      })
    );
  });

  it("restores a saved promo on mount", async () => {
    localStorage.setItem(
      PROMO_KEY,
      JSON.stringify({ code: "SAVE20", type: "PERCENTAGE", value: 20 })
    );

    const { result } = mount();

    act(() => result.current.addToCart(product(), "M", "Black", 1));

    await waitFor(() => expect(result.current.appliedPromo?.code).toBe("SAVE20"));
    expect(result.current.getDiscountAmount()).toBe(200);
  });

  it("removes the promo from storage when cleared", async () => {
    mockValidate({ valid: true, promo: { code: "SAVE20", type: "PERCENTAGE", value: 20 } });
    const { result } = mount();

    await act(async () => {
      await result.current.applyPromo("SAVE20");
    });
    await waitFor(() => expect(localStorage.getItem(PROMO_KEY)).not.toBeNull());

    act(() => result.current.removePromo());

    await waitFor(() => expect(localStorage.getItem(PROMO_KEY)).toBeNull());
  });
});

describe("StoreContext — cross-tab sync", () => {
  it("picks up a cart written by another tab", async () => {
    const { result } = mount();

    expect(result.current.cart).toHaveLength(0);

    // What the browser does when another tab writes localStorage: it updates
    // storage and fires 'storage' here. The event never fires in the tab that
    // did the writing, which is why this has to be simulated rather than driven
    // through addToCart.
    act(() => {
      localStorage.setItem(
        CART_KEY,
        JSON.stringify([
          { product: product(), size: "M", color: "Black", quantity: 3, unitPrice: 1000 },
        ])
      );
      window.dispatchEvent(new StorageEvent("storage", { key: CART_KEY }));
    });

    await waitFor(() => expect(result.current.cart).toHaveLength(1));
    expect(result.current.getCartCount()).toBe(3);
  });

  it("ignores storage events for unrelated keys", async () => {
    const { result } = mount();

    act(() => result.current.addToCart(product(), "M", "Black", 1));
    await waitFor(() => expect(result.current.cart).toHaveLength(1));

    act(() => {
      localStorage.setItem("something-else", "x");
      window.dispatchEvent(new StorageEvent("storage", { key: "something-else" }));
    });

    expect(result.current.cart).toHaveLength(1);
  });
});
