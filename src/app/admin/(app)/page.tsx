import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAuditLog } from "@/lib/audit";
import { Badge } from "@/app/admin/(app)/_components/ui/Badge";
import { Button } from "@/app/admin/(app)/_components/ui/Button";
import { Input } from "@/app/admin/(app)/_components/ui/Input";
import { Select } from "@/app/admin/(app)/_components/ui/Select";
import { Table, THead, TBody, TR, TH, TD } from "@/app/admin/(app)/_components/ui/Table";
import type { Prisma } from "@/generated/prisma/client";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);

async function bulkAction(formData: FormData) {
  "use server";

  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }

  const admin = await requireAdmin();
  const action = String(formData.get("bulkAction") ?? "");
  const ids = formData.getAll("selectedIds").map((id) => String(id));

  if (ids.length === 0) {
    redirect("/admin/products?success=none");
  }

  if (action === "delete") {
    await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { deletedAt: new Date() },
    });
  } else if (action === "archive") {
    await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { status: "ARCHIVED" },
    });
  } else if (action === "draft" || action === "active") {
    await prisma.product.updateMany({
      where: { id: { in: ids } },
      data: { status: action === "draft" ? "DRAFT" : "ACTIVE" },
    });
  }

  await prisma.auditLog.createMany({
    data: ids.map((id) => ({
      actorAdminId: admin.id,
      action: `product.bulk.${action}`,
      entityType: "product",
      entityId: id,
      diff: { action },
    })),
  });

  redirect("/admin/products?success=bulk");
}

async function archiveAction(formData: FormData) {
  "use server";
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  const admin = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");
  await prisma.product.update({
    where: { id: productId },
    data: { status: "ARCHIVED" },
  });
  await recordAuditLog({
    actorAdminId: admin.id,
    action: "product.archive",
    entityType: "product",
    entityId: productId,
    diff: { status: "ARCHIVED" },
  });
  redirect("/admin/products?success=archived");
}

async function deleteAction(formData: FormData) {
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

async function duplicateAction(formData: FormData) {
  "use server";
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  const admin = await requireAdmin();
  const productId = String(formData.get("productId") ?? "");

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: true,
      variants: true,
      collections: true,
    },
  });

  if (!product) {
    redirect("/admin/products?error=missing");
  }

  const slugSuffix = Math.random().toString(36).slice(2, 6);
  const newProduct = await prisma.product.create({
    data: {
      title: `${product.title} (Copy)`,
      slug: `${product.slug}-copy-${slugSuffix}`,
      description: product.description,
      status: "DRAFT",
      basePrice: product.basePrice,
      compareAtPrice: product.compareAtPrice,
      tags: product.tags,
      seoTitle: product.seoTitle,
      seoDescription: product.seoDescription,
      images: {
        create: product.images.map((image) => ({
          url: image.url,
          alt: image.alt,
          sortOrder: image.sortOrder,
        })),
      },
      variants: {
        create: product.variants.map((variant) => ({
          sku: `${variant.sku}-COPY-${slugSuffix}`,
          size: variant.size,
          color: variant.color,
          priceOverride: variant.priceOverride,
          stockQty: variant.stockQty,
          lowStockThreshold: variant.lowStockThreshold,
          isActive: variant.isActive,
        })),
      },
      collections: {
        create: product.collections.map((collection) => ({
          collectionId: collection.collectionId,
        })),
      },
    },
  });

  await recordAuditLog({
    actorAdminId: admin.id,
    action: "product.duplicate",
    entityType: "product",
    entityId: newProduct.id,
    diff: { sourceProductId: productId },
  });

  redirect(`/admin/products/${newProduct.id}`);
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?:
    | {
        q?: string;
        status?: string;
        collection?: string;
        tag?: string;
      }
    | Promise<{
        q?: string;
        status?: string;
        collection?: string;
        tag?: string;
      }>;
}) {
  if (!prisma) {
    return (
      <div className="text-white/70">
        Prisma is not configured. Set DATABASE_URL to continue.
      </div>
    );
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const query = resolvedSearchParams.q?.trim() ?? "";
  const status = resolvedSearchParams.status ?? "all";
  const collection = resolvedSearchParams.collection ?? "all";
  const tag = resolvedSearchParams.tag ?? "all";

  const where: Prisma.ProductWhereInput = {
    deletedAt: null,
  };

  if (status !== "all") {
    where.status = status as Prisma.ProductWhereInput["status"];
  }

  if (collection !== "all") {
    where.collections = { some: { collectionId: collection } };
  }

  if (tag !== "all") {
    where.tags = { has: tag };
  }

  if (query) {
    where.OR = [
      { title: { contains: query, mode: "insensitive" } },
      { variants: { some: { sku: { contains: query, mode: "insensitive" } } } },
    ];
  }

  const [products, collections] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { variants: true, collections: { include: { collection: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.collection.findMany({ orderBy: { name: "asc" } }),
  ]);

  const availableTags = Array.from(
    new Set(products.flatMap((product) => product.tags))
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl tracking-[0.2em]"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            PRODUCTS
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Manage catalog, variants, and product status.
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button>Create Product</Button>
        </Link>
      </div>

      <form
        method="get"
        className="grid gap-4 rounded-xl border border-white/10 bg-[#121214] p-5 lg:grid-cols-4"
      >
        <div className="lg:col-span-2">
          <label className="text-xs tracking-[0.2em] text-white/50">SEARCH</label>
          <Input name="q" defaultValue={query} placeholder="Title or SKU" />
        </div>
        <div>
          <label className="text-xs tracking-[0.2em] text-white/50">STATUS</label>
          <Select name="status" defaultValue={status}>
            <option value="all">All</option>
            <option value="DRAFT">Draft</option>
            <option value="ACTIVE">Active</option>
            <option value="ARCHIVED">Archived</option>
          </Select>
        </div>
        <div>
          <label className="text-xs tracking-[0.2em] text-white/50">
            COLLECTION
          </label>
          <Select name="collection" defaultValue={collection}>
            <option value="all">All</option>
            {collections.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <label className="text-xs tracking-[0.2em] text-white/50">TAG</label>
          <Select name="tag" defaultValue={tag}>
            <option value="all">All</option>
            {availableTags.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" variant="outline" className="w-full">
            APPLY FILTERS
          </Button>
        </div>
      </form>

      <div className="space-y-4">
        <form
          id="bulk-action-form"
          action={bulkAction}
          className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-[#121214] p-4"
        >
          <Select name="bulkAction" defaultValue="draft">
            <option value="draft">Set Draft</option>
            <option value="active">Set Active</option>
            <option value="archive">Archive</option>
            <option value="delete">Delete</option>
          </Select>
          <Button type="submit" variant="outline">
            Apply to Selected
          </Button>
        </form>

        <div className="rounded-xl border border-white/10 bg-[#121214]">
          <Table>
            <THead>
              <TR>
                <TH className="w-10">
                  <span className="sr-only">Select</span>
                </TH>
                <TH>Product</TH>
                <TH>Status</TH>
                <TH>Price</TH>
                <TH>Inventory</TH>
                <TH>Updated</TH>
                <TH>Actions</TH>
              </TR>
            </THead>
            <TBody>
              {products.map((product) => {
                const prices = product.variants.length
                  ? product.variants.map(
                      (variant) => variant.priceOverride ?? product.basePrice
                    )
                  : [product.basePrice];
                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const totalStock = product.variants.reduce(
                  (sum, variant) => sum + variant.stockQty,
                  0
                );

                return (
                  <TR key={product.id}>
                    <TD>
                      <input
                        type="checkbox"
                        name="selectedIds"
                        value={product.id}
                        form="bulk-action-form"
                        className="h-4 w-4 rounded border border-white/20 bg-transparent"
                      />
                    </TD>
                    <TD>
                      <div>
                        <p className="font-medium">{product.title}</p>
                        <p className="text-xs text-white/50">{product.slug}</p>
                      </div>
                    </TD>
                    <TD>
                      <Badge
                        tone={
                          product.status === "ACTIVE"
                            ? "success"
                            : product.status === "ARCHIVED"
                            ? "danger"
                            : "warning"
                        }
                      >
                        {product.status}
                      </Badge>
                    </TD>
                    <TD>
                      {minPrice === maxPrice
                        ? formatCurrency(minPrice)
                        : `${formatCurrency(minPrice)} - ${formatCurrency(maxPrice)}`}
                    </TD>
                    <TD>
                      {totalStock} units / {product.variants.length} variants
                    </TD>
                    <TD>
                      {product.updatedAt.toLocaleDateString("en-PH", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TD>
                    <TD>
                      <div className="flex flex-wrap gap-2">
                        <Link href={`/admin/products/${product.id}`}>
                          <Button size="sm" variant="ghost">
                            Edit
                          </Button>
                        </Link>
                        <form action={duplicateAction}>
                          <input type="hidden" name="productId" value={product.id} />
                          <Button size="sm" variant="ghost" type="submit">
                            Duplicate
                          </Button>
                        </form>
                        <form action={archiveAction}>
                          <input type="hidden" name="productId" value={product.id} />
                          <Button size="sm" variant="ghost" type="submit">
                            Archive
                          </Button>
                        </form>
                        <form action={deleteAction}>
                          <input type="hidden" name="productId" value={product.id} />
                          <Button size="sm" variant="danger" type="submit">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </TD>
                  </TR>
                );
              })}
              {products.length === 0 && (
                <TR>
                  <TD colSpan={7} className="py-6 text-center text-white/40">
                    No products found.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
