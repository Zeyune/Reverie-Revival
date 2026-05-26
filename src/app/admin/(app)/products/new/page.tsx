import { prisma } from "@/lib/prisma";
import { saveProductAction } from "@/app/admin/(app)/products/actions";
import { ProductEditorForm } from "@/app/admin/(app)/products/_components/ProductEditorForm";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  if (!prisma) {
    return (
      <div className="text-white/70">
        Prisma is not configured. Set DATABASE_URL to continue.
      </div>
    );
  }

  const collections = await prisma.collection.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl tracking-[0.2em]"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          NEW PRODUCT
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Create a new product and define variants and inventory.
        </p>
      </div>

      <ProductEditorForm
        action={saveProductAction}
        collections={collections}
        initialData={{
          title: "",
          slug: "",
          description: "",
          details: "",
          materials: "",
          fit: "",
          care: "",
          status: "DRAFT",
          basePrice: 0,
          compareAtPrice: null,
          tags: [],
          seoTitle: "",
          seoDescription: "",
          images: [],
          variants: [
            {
              sku: "",
              size: "",
              color: "",
              priceOverride: null,
              stockQty: 0,
              lowStockThreshold: 0,
              isActive: true,
            },
          ],
          collectionIds: [],
        }}
      />
    </div>
  );
}
