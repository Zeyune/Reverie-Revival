export type StorefrontVariant = {
  size: string;
  color: string;
  price: number;
};

export type StorefrontProduct = {
  id: string;
  name: string;
  slug: string;
  category: string;
  price: number;
  originalPrice?: number;
  description: string;
  details: string;
  materials: string;
  fit: string;
  care: string;
  images: string[];
  colors: { name: string; hex: string }[];
  sizes: string[];
  badge?: "new" | "sale";
  inStock: boolean;
  variants?: StorefrontVariant[];
};

export type StorefrontCategory = {
  name: string;
  slug: string;
};

export const getVariantPrice = (
  product: StorefrontProduct,
  size: string,
  color: string
) => {
  const variant = product.variants?.find(
    (item) => item.size === size && item.color === color
  );
  return variant?.price ?? product.price;
};

export const testimonials = [
  {
    id: 1,
    name: "Miguel Santos",
    rating: 5,
    text:
      "Quality is unmatched. The Reverie Core Tee fits perfectly and the fabric is thick. Worth every peso.",
  },
  {
    id: 2,
    name: "Sofia Reyes",
    rating: 5,
    text:
      "Love the oversized hoodie! The fit is exactly what I wanted. Definitely buying more.",
  },
  {
    id: 3,
    name: "Carlos Mendoza",
    rating: 5,
    text:
      "Fast shipping to Pampanga. The cargo pants are fire. Super comfortable and stylish.",
  },
  {
    id: 4,
    name: "Isabella Cruz",
    rating: 5,
    text:
      "Reverie Revival is my go-to for streetwear. Clean designs, premium quality, no cap.",
  },
  {
    id: 5,
    name: "Andre Pascual",
    rating: 5,
    text:
      "The utility jacket is sick. Water-resistant and has so many pockets. Perfect for the city.",
  },
  {
    id: 6,
    name: "Luna Torres",
    rating: 5,
    text:
      "Best streetwear brand in the Philippines right now. The attention to detail is impressive.",
  },
];
