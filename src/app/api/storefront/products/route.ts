import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const colorHexMap: Record<string, string> = {
  black: "#0B0B0C",
  white: "#FFFFFF",
  charcoal: "#121214",
  olive: "#4A4A3A",
  red: "#E10613",
  blue: "#1E40AF",
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const resolveColorHex = (color: string) =>
  colorHexMap[color.trim().toLowerCase()] ?? "#121214";

export async function GET() {
  if (!prisma) {
    return NextResponse.json({ products: [], categories: [] });
  }

  const products = await prisma.product.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    include: {
      images: true,
      variants: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const mappedProducts = products.map((product) => {
    const images = [...product.images]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((image) => image.url);

    const activeVariants = product.variants.filter((variant) => variant.isActive);
    const sizeSet = new Set(activeVariants.map((variant) => variant.size));
    const colorsMap = new Map<string, string>();
    activeVariants.forEach((variant) => {
      colorsMap.set(variant.color, resolveColorHex(variant.color));
    });
    const variants = activeVariants.map((variant) => ({
      size: variant.size,
      color: variant.color,
      price: variant.priceOverride ?? product.basePrice,
    }));

    const isSale =
      product.compareAtPrice !== null &&
      product.compareAtPrice !== undefined &&
      product.compareAtPrice > product.basePrice;
    const badge = product.tags.includes("sale")
      ? "sale"
      : product.tags.includes("new")
      ? "new"
      : isSale
      ? "sale"
      : undefined;

    return {
      id: product.id,
      name: product.title,
      slug: product.slug,
      category: product.category,
      price: product.basePrice,
      originalPrice: product.compareAtPrice ?? undefined,
      description: product.description,
      details: product.details,
      materials: product.materials,
      fit: product.fit,
      care: product.care,
      images,
      sizes: Array.from(sizeSet),
      colors: Array.from(colorsMap.entries()).map(([name, hex]) => ({
        name,
        hex,
      })),
      badge,
      inStock: activeVariants.some((variant) => variant.stockQty > 0),
      variants,
    };
  });

  const categoryMap = new Map<string, string>();
  products.forEach((product) => {
    if (product.category) {
      categoryMap.set(product.category, slugify(product.category));
    }
  });

  const categories = Array.from(categoryMap.entries())
    .map(([name, slug]) => ({ name, slug }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return NextResponse.json({ products: mappedProducts, categories });
}
