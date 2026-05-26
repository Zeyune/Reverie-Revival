import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { hash } from "bcryptjs";
import {
  products as seedProducts,
  categories as seedCategories,
} from "../src/storefront/data/products";

const datasourceUrl = process.env.DATABASE_URL;

if (!datasourceUrl) {
  throw new Error("DATABASE_URL must be set to run the seed.");
}

const pool = new Pool({ connectionString: datasourceUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

const skuify = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set.");
  }

  const passwordHash = await hash(adminPassword, 10);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      passwordHash,
      role: "ADMIN",
    },
  });

  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    await prisma.settings.create({
      data: {
        storeName: "Reverie Revival",
        contactEmail: "reverierevival.co@gmail.com",
        contactPhone: "09106960483",
        contactAddress: "Pampanga, Philippines",
        homepageFeaturedCollectionIds: [],
        homepageFeaturedProductIds: [],
      },
    });
  }

  const collectionMap = new Map<string, string>();
  const catalogCategories = seedCategories.filter((category) => category.slug !== "all");

  for (const [index, category] of catalogCategories.entries()) {
    const collection = await prisma.collection.upsert({
      where: { slug: category.slug },
      update: {
        name: category.name,
        description: category.name,
        sortOrder: index + 1,
      },
      create: {
        name: category.name,
        slug: category.slug,
        description: category.name,
        sortOrder: index + 1,
      },
    });

    collectionMap.set(category.slug, collection.id);
  }

  const existingProducts = await prisma.product.findMany({
    select: { slug: true },
  });
  const existingSlugs = new Set(existingProducts.map((product) => product.slug));

  for (const product of seedProducts) {
    if (existingSlugs.has(product.slug)) {
      continue;
    }

    const categorySlug = slugify(product.category);
    const collectionId = collectionMap.get(categorySlug);
    const tags = product.badge ? [product.badge] : [];
    const variants = product.sizes.flatMap((size) =>
      product.colors.map((color) => ({
        sku: `RR-${skuify(product.slug)}-${skuify(size)}-${skuify(color.name)}`,
        size,
        color: color.name,
        stockQty: 20,
        lowStockThreshold: 5,
        isActive: true,
      }))
    );

    await prisma.product.create({
      data: {
        title: product.name,
        slug: product.slug,
        description: product.description,
        category: product.category,
        details: product.details,
        materials: product.materials,
        fit: product.fit,
        care: product.care,
        status: "ACTIVE",
        basePrice: product.price,
        compareAtPrice: product.originalPrice ?? null,
        tags,
        images: {
          create: product.images.map((url, index) => ({
            url,
            alt: product.name,
            sortOrder: index,
          })),
        },
        variants: {
          create: variants,
        },
        collections: collectionId
          ? {
              create: [{ collectionId }],
            }
          : undefined,
      },
    });
  }

  const customerCount = await prisma.customer.count();
  if (customerCount === 0) {
    const customer = await prisma.customer.create({
      data: {
        name: "Miguel Santos",
        email: "miguel@example.com",
        phone: "09123456789",
      },
    });

    await prisma.order.create({
      data: {
        orderNumber: "RR-1001",
        customerId: customer.id,
        email: customer.email ?? "guest@example.com",
        subtotal: 1299,
        shippingFee: 0,
        total: 1299,
        paymentStatus: "PAID",
        fulfillmentStatus: "PROCESSING",
        shippingAddress: {
          name: "Miguel Santos",
          address: "Pampanga, Philippines",
        },
        items: {
          create: [
            {
              nameSnapshot: "Reverie Core Tee",
              skuSnapshot: "RR-TEE-BLK-S",
              priceSnapshot: 1299,
              qty: 1,
            },
          ],
        },
      },
    });
  }

  console.log("Seeded admin user, settings, and storefront catalog data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
