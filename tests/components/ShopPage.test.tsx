import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ShopPage } from "@/storefront/pages/ShopPage";
import { StoreProvider } from "@/storefront/context/StoreContext";
import { ToastProvider } from "@/storefront/context/ToastContext";
import type {
  StorefrontCategory,
  StorefrontProduct,
} from "@/storefront/data/storefront";

const product = (over: Partial<StorefrontProduct> = {}): StorefrontProduct => ({
  id: "p1",
  name: "Test Hoodie",
  slug: "test-hoodie",
  category: "Hoodies",
  price: 1500,
  description: "",
  details: "",
  materials: "",
  fit: "",
  care: "",
  images: ["https://example.test/a.jpg"],
  colors: [{ name: "Black", hex: "#0B0B0C" }],
  sizes: ["M"],
  inStock: true,
  ...over,
});

const categories: StorefrontCategory[] = [{ name: "Hoodies", slug: "hoodies" }];

const renderShop = (props: Partial<React.ComponentProps<typeof ShopPage>>) =>
  render(
    <ToastProvider>
      <StoreProvider>
        <ShopPage
          onNavigate={vi.fn()}
          products={[]}
          categories={categories}
          {...props}
        />
      </StoreProvider>
    </ToastProvider>
  );

describe("ShopPage", () => {
  it("shows a loading state while the catalog is in flight", () => {
    renderShop({ isLoading: true });

    expect(screen.getByText(/loading products/i)).toBeInTheDocument();
  });

  it("renders the catalog once loaded", () => {
    renderShop({ products: [product()], isLoading: false });

    expect(screen.getByText("Test Hoodie")).toBeInTheDocument();
  });

  // Guards the `products` useMemo dep.
  //
  // The hooks now run on the loading render too, so the memo's first result is
  // computed against an empty catalog. Without `products` in the dep array that
  // empty result is cached forever and the grid never fills in — a permanently
  // blank shop. Drop `products` from the deps in ShopPage and this test fails.
  it("fills the grid when the catalog arrives after mount", () => {
    const { rerender } = renderShop({ products: [], isLoading: true });

    expect(screen.getByText(/loading products/i)).toBeInTheDocument();

    rerender(
      <ToastProvider>
        <StoreProvider>
          <ShopPage
            onNavigate={vi.fn()}
            products={[product()]}
            categories={categories}
            isLoading={false}
          />
        </StoreProvider>
      </ToastProvider>
    );

    expect(screen.getByText("Test Hoodie")).toBeInTheDocument();
  });

  // Invariant guard, NOT a regression test — be honest about which.
  //
  // Removing the `[...products]` copy does not make this fail today: the
  // unconditional price filter already hands sort() a fresh array. The copy and
  // this test exist so that stays true if someone later makes that filter
  // conditional, which would silently turn sort() into a mutation of App's
  // state. Cheap, but don't mistake it for proof of a fixed bug.
  it("does not reorder the caller's products array when sorting", async () => {
    const user = userEvent.setup();
    const products = [
      product({ id: "a", name: "Zeta", price: 3000 }),
      product({ id: "b", name: "Alpha", price: 1000 }),
    ];
    const original = [...products];

    renderShop({ products, isLoading: false });

    await user.selectOptions(screen.getByRole("combobox", { name: "" }), "price-low");

    // The rendered grid is sorted...
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    // ...but the caller's array is untouched.
    expect(products).toEqual(original);
    expect(products[0].name).toBe("Zeta");
  });
});
