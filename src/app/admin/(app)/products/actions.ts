"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAuditLog } from "@/lib/audit";
import { redirect } from "next/navigation";

const imageSchema = z.object({
  id: z.string().optional(),
  url: z.string().url(),
  alt: z.string().nullable().optional(),
  sortOrder: z.number().int().nonnegative(),
});

const variantSchema = z.object({
  id: z.string().optional(),
  sku: z.string().min(1),
  size: z.string().min(1),
  color: z.string().min(1),
  priceOverride: z.number().nullable().optional(),
  stockQty: z.number().int().nonnegative(),
  lowStockThreshold: z.number().int().nonnegative(),
  isActive: z.boolean(),
});

const payloadSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  details: z.string(),
  materials: z.string(),
  fit: z.string(),
  care: z.string(),
  status: z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]),
  basePrice: z.number().int().nonnegative(),
  compareAtPrice: z.number().int().nonnegative().nullable().optional(),
  tags: z.array(z.string()),
  seoTitle: z.string().nullable().optional(),
  seoDescription: z.string().nullable().optional(),
  images: z.array(imageSchema),
  variants: z.array(variantSchema),
  collectionIds: z.array(z.string()),
  deletedImageIds: z.array(z.string()),
  deletedVariantIds: z.array(z.string()),
});

export async function saveProductAction(formData: FormData) {
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  const db = prisma;

  const admin = await requireAdmin();
  const intent = String(formData.get("intent") ?? "save");
  const rawPayload = formData.get("payload");

  if (!rawPayload || typeof rawPayload !== "string") {
    throw new Error("Missing payload.");
  }

  const parsed = payloadSchema.safeParse(JSON.parse(rawPayload));
  if (!parsed.success) {
    throw new Error("Invalid payload.");
  }

  const payload = parsed.data;
  const statusOverride =
    intent === "draft"
      ? "DRAFT"
      : intent === "publish"
      ? "ACTIVE"
      : intent === "archive"
      ? "ARCHIVED"
      : payload.status;

  const applyProductUpdate = async (productId: string) => {
    await db.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: {
          title: payload.title,
          slug: payload.slug,
          description: payload.description,
          details: payload.details,
          materials: payload.materials,
          fit: payload.fit,
          care: payload.care,
          status: statusOverride,
          basePrice: payload.basePrice,
          compareAtPrice: payload.compareAtPrice ?? null,
          tags: payload.tags,
          seoTitle: payload.seoTitle ?? null,
          seoDescription: payload.seoDescription ?? null,
        },
      });

      if (payload.deletedImageIds.length > 0) {
        await tx.productImage.deleteMany({
          where: { id: { in: payload.deletedImageIds }, productId },
        });
      }

      for (const image of payload.images) {
        if (image.id) {
          await tx.productImage.update({
            where: { id: image.id },
            data: {
              url: image.url,
              alt: image.alt ?? null,
              sortOrder: image.sortOrder,
            },
          });
        } else {
          await tx.productImage.create({
            data: {
              productId,
              url: image.url,
              alt: image.alt ?? null,
              sortOrder: image.sortOrder,
            },
          });
        }
      }

      if (payload.deletedVariantIds.length > 0) {
        await tx.variant.deleteMany({
          where: { id: { in: payload.deletedVariantIds }, productId },
        });
      }

      for (const variant of payload.variants) {
        if (variant.id) {
          await tx.variant.update({
            where: { id: variant.id },
            data: {
              sku: variant.sku,
              size: variant.size,
              color: variant.color,
              priceOverride: variant.priceOverride ?? null,
              stockQty: variant.stockQty,
              lowStockThreshold: variant.lowStockThreshold,
              isActive: variant.isActive,
            },
          });
        } else {
          await tx.variant.create({
            data: {
              productId,
              sku: variant.sku,
              size: variant.size,
              color: variant.color,
              priceOverride: variant.priceOverride ?? null,
              stockQty: variant.stockQty,
              lowStockThreshold: variant.lowStockThreshold,
              isActive: variant.isActive,
            },
          });
        }
      }

      await tx.productCollection.deleteMany({ where: { productId } });
      if (payload.collectionIds.length > 0) {
        await tx.productCollection.createMany({
          data: payload.collectionIds.map((collectionId) => ({
            productId,
            collectionId,
          })),
        });
      }
    });
  };

  if (payload.id) {
    const previous = await db.product.findUnique({
      where: { id: payload.id },
      include: {
        images: true,
        variants: true,
        collections: true,
      },
    });

    await applyProductUpdate(payload.id);

    await recordAuditLog({
      actorAdminId: admin.id,
      action: "product.update",
      entityType: "product",
      entityId: payload.id,
      diff: { before: previous, after: payload },
    });

    redirect(`/admin/products/${payload.id}?success=updated`);
  }

  const created = await db.product.create({
    data: {
      title: payload.title,
      slug: payload.slug,
      description: payload.description,
      details: payload.details,
      materials: payload.materials,
      fit: payload.fit,
      care: payload.care,
      status: statusOverride,
      basePrice: payload.basePrice,
      compareAtPrice: payload.compareAtPrice ?? null,
      tags: payload.tags,
      seoTitle: payload.seoTitle ?? null,
      seoDescription: payload.seoDescription ?? null,
      images: {
        create: payload.images.map((image) => ({
          url: image.url,
          alt: image.alt ?? null,
          sortOrder: image.sortOrder,
        })),
      },
      variants: {
        create: payload.variants.map((variant) => ({
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          priceOverride: variant.priceOverride ?? null,
          stockQty: variant.stockQty,
          lowStockThreshold: variant.lowStockThreshold,
          isActive: variant.isActive,
        })),
      },
      collections: {
        create: payload.collectionIds.map((collectionId) => ({
          collectionId,
        })),
      },
    },
  });

  await recordAuditLog({
    actorAdminId: admin.id,
    action: "product.create",
    entityType: "product",
    entityId: created.id,
    diff: payload,
  });

  redirect(`/admin/products/${created.id}?success=created`);
}
