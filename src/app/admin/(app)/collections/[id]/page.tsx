import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAuditLog } from "@/lib/audit";
import { Button } from "@/app/admin/(app)/_components/ui/Button";
import { Input } from "@/app/admin/(app)/_components/ui/Input";
import { Textarea } from "@/app/admin/(app)/_components/ui/Textarea";

export const dynamic = "force-dynamic";

async function updateCollectionAction(formData: FormData) {
  "use server";
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  const admin = await requireAdmin();
  const collectionId = String(formData.get("collectionId") ?? "");
  const productIds = formData.getAll("productIds").map((id) => String(id));

  const updateData = {
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
    description: String(formData.get("description") ?? ""),
    isFeatured: Boolean(formData.get("isFeatured")),
    sortOrder: Number(formData.get("sortOrder") ?? 0),
  };

  await prisma.$transaction(async (tx) => {
    await tx.collection.update({
      where: { id: collectionId },
      data: updateData,
    });

    await tx.productCollection.deleteMany({ where: { collectionId } });
    if (productIds.length > 0) {
      await tx.productCollection.createMany({
        data: productIds.map((productId) => ({ collectionId, productId })),
      });
    }
  });

  await recordAuditLog({
    actorAdminId: admin.id,
    action: "collection.update",
    entityType: "collection",
    entityId: collectionId,
    diff: { ...updateData, productIds },
  });

  redirect(`/admin/collections/${collectionId}?success=updated`);
}

export default async function CollectionDetailPage({
  params,
}: {
  params: { id?: string } | Promise<{ id?: string }>;
}) {
  if (!prisma) {
    return (
      <div className="text-white/70">
        Prisma is not configured. Set DATABASE_URL to continue.
      </div>
    );
  }

  const resolvedParams = await params;
  const collectionId = resolvedParams?.id;
  if (!collectionId) {
    redirect("/admin/collections?error=missing");
  }

  const [collection, products] = await Promise.all([
    prisma.collection.findUnique({
      where: { id: collectionId },
      include: { products: true },
    }),
    prisma.product.findMany({
      where: { deletedAt: null },
      orderBy: { title: "asc" },
      select: { id: true, title: true, status: true },
    }),
  ]);

  if (!collection) {
    return <div className="text-white/60">Collection not found.</div>;
  }

  const assigned = new Set(collection.products.map((item) => item.productId));

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl tracking-[0.2em]"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          EDIT COLLECTION
        </h1>
        <p className="mt-2 text-sm text-white/60">{collection.name}</p>
      </div>

      <form action={updateCollectionAction} className="space-y-6">
        <input type="hidden" name="collectionId" value={collection.id} />

        <div className="grid gap-4 rounded-xl border border-white/10 bg-[#121214] p-6 lg:grid-cols-2">
          <div>
            <label className="text-xs tracking-[0.2em] text-white/50">NAME</label>
            <Input name="name" defaultValue={collection.name} />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] text-white/50">SLUG</label>
            <Input name="slug" defaultValue={collection.slug} />
          </div>
          <div className="lg:col-span-2">
            <label className="text-xs tracking-[0.2em] text-white/50">
              DESCRIPTION
            </label>
            <Textarea
              name="description"
              rows={4}
              defaultValue={collection.description ?? ""}
            />
          </div>
          <div>
            <label className="text-xs tracking-[0.2em] text-white/50">
              SORT ORDER
            </label>
            <Input
              name="sortOrder"
              type="number"
              min="0"
              defaultValue={collection.sortOrder}
            />
          </div>
          <label className="flex items-center gap-3 text-xs tracking-[0.2em] text-white/60">
            <input
              type="checkbox"
              name="isFeatured"
              defaultChecked={collection.isFeatured}
              className="h-4 w-4 rounded border border-white/20 bg-transparent"
            />
            FEATURED
          </label>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#121214] p-6">
          <p className="text-xs tracking-[0.2em] text-white/50">ASSIGN PRODUCTS</p>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {products.map((product) => (
              <label
                key={product.id}
                className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0B0B0C]/60 px-4 py-3 text-sm"
              >
                <input
                  type="checkbox"
                  name="productIds"
                  value={product.id}
                  defaultChecked={assigned.has(product.id)}
                  className="h-4 w-4 rounded border border-white/20 bg-transparent"
                />
                <span>
                  {product.title}{" "}
                  <span className="text-xs text-white/40">({product.status})</span>
                </span>
              </label>
            ))}
            {products.length === 0 && (
              <p className="text-sm text-white/50">
                Add products to your catalog first.
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit">Save Collection</Button>
        </div>
      </form>
    </div>
  );
}
