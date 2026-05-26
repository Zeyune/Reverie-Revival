import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAuditLog } from "@/lib/audit";
import { saveProductAction } from "@/app/admin/(app)/products/actions";
import { ProductEditorForm } from "@/app/admin/(app)/products/_components/ProductEditorForm";
import { Button } from "@/app/admin/(app)/_components/ui/Button";

export const dynamic = "force-dynamic";

async function deleteProductAction(formData: FormData) {
  "use server";
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  const admin = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");

  await prisma.product.update({
    where: { id: productId },
    data: { deletedAt: new Date() },
  });

  await recordAuditLog({
    actorAdminId: admin.id,
    action: "product.delete",
    entityType: "product",
    entityId: productId,
    diff: { deletedAt: new Date().toISOString() },
  });

  redirect("/admin/products?success=deleted");
}

export default async function ProductDetailPage({
  params,
}: {
  params?: { id?: string } | Promise<{ id?: string }>;
}) {
  if (!prisma) {
    return (
      <div className="text-white/70">
        Prisma is not configured. Set DATABASE_URL to continue.
      </div>
    );
  }

  const resolvedParams = (await params) ?? {};

  if (!resolvedParams.id) {
    redirect('/admin/products');
  }

  const product = await prisma.product.findUnique({
    where: { id: resolvedParams.id },
    include: {
      images: true,
      variants: true,
      collections: true,
    },
  });

  if (!product) {
    return <div className="text-white/60">Product not found.</div>;
  }

  const collections = await prisma.collection.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="text-2xl tracking-[0.2em]"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            EDIT PRODUCT
          </h1>
          <p className="mt-2 text-sm text-white/60">{product.title}</p>
        </div>
        <form action={deleteProductAction}>
          <input type="hidden" name="productId" value={product.id} />
          <Button variant="danger" type="submit">
            Delete Product
          </Button>
        </form>
      </div>

      <ProductEditorForm
        action={saveProductAction}
        collections={collections}
        initialData={{
          id: product.id,
          title: product.title,
          slug: product.slug,
          description: product.description,
          details: product.details,
          materials: product.materials,
          fit: product.fit,
          care: product.care,
          status: product.status,
          basePrice: product.basePrice,
          compareAtPrice: product.compareAtPrice,
          tags: product.tags,
          seoTitle: product.seoTitle,
          seoDescription: product.seoDescription,
          images: product.images.map((image) => ({
            id: image.id,
            url: image.url,
            alt: image.alt,
            sortOrder: image.sortOrder,
          })),
          variants: product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            size: variant.size,
            color: variant.color,
            priceOverride: variant.priceOverride,
            stockQty: variant.stockQty,
            lowStockThreshold: variant.lowStockThreshold,
            isActive: variant.isActive,
          })),
          collectionIds: product.collections.map(
            (item) => item.collectionId
          ),
        }}
      />
    </div>
  );
}

