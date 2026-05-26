import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import {
  buildNetworkRateLimitRules,
  getRequestRateLimitContext,
  recordRateLimitHit,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

const itemSchema = z.object({
  productId: z.string().min(1),
  size: z.string().min(1),
  color: z.string().min(1),
  quantity: z.number().int().positive(),
});

const payloadSchema = z.object({
  customer: z.object({
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional().nullable(),
  }),
  shipping: z.object({
    houseNumber: z.string().min(1),
    streetName: z.string().min(1),
    building: z.string().min(1),
    region: z.string().min(1),
    province: z.string().min(1),
    city: z.string().min(1),
    barangay: z.string().min(1),
    postalCode: z.string().min(1),
  }),
  payment: z
    .object({
      method: z.string().min(1),
      cardName: z.string().min(1),
      cardNumber: z.string().min(4),
    })
    .optional(),
  items: z.array(itemSchema).min(1),
});

const SHIPPING_THRESHOLD = 2000;
const SHIPPING_FEE = 150;

const normalizeKey = (productId: string, size: string, color: string) =>
  `${productId}::${size.trim().toLowerCase()}::${color.trim().toLowerCase()}`;

const createOrderNumber = () =>
  `RR-${Date.now().toString(36).toUpperCase()}-${randomUUID()
    .slice(0, 6)
    .toUpperCase()}`;

export async function POST(request: Request) {
  if (!prisma) {
    return NextResponse.json(
      { error: "Prisma client is not available." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  const rateLimitContext = getRequestRateLimitContext(request);
  const email =
    parsed.success && parsed.data.customer.email
      ? parsed.data.customer.email.trim().toLowerCase()
      : null;
  const rateLimitRules = buildNetworkRateLimitRules(
    rateLimitContext,
    email
      ? [`email:${email}`, `host-email:${rateLimitContext.host}:${email}`]
      : []
  ).map((rule) => {
    if (rule.key.startsWith("host-email:")) {
      return { ...rule, limit: 6 };
    }
    if (rule.key.startsWith("email:")) {
      return { ...rule, limit: 6 };
    }
    if (rule.key.startsWith("ip:")) {
      return { ...rule, limit: 12 };
    }
    return { ...rule, limit: 400 };
  });
  const rateLimit = await recordRateLimitHit(
    {
      action: "api-checkout",
      windowMs: 10 * 60 * 1000,
      blockMs: 30 * 60 * 1000,
    },
    rateLimitRules
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Too many checkout attempts. Try again later.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      }
    );
  }

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const customer = {
    firstName: parsed.data.customer.firstName.trim(),
    lastName: parsed.data.customer.lastName.trim(),
    email: parsed.data.customer.email.trim().toLowerCase(),
    phone: parsed.data.customer.phone?.trim() || null,
  };

  const shipping = {
    houseNumber: parsed.data.shipping.houseNumber.trim(),
    streetName: parsed.data.shipping.streetName.trim(),
    building: parsed.data.shipping.building.trim(),
    region: parsed.data.shipping.region.trim(),
    province: parsed.data.shipping.province.trim(),
    city: parsed.data.shipping.city.trim(),
    barangay: parsed.data.shipping.barangay.trim(),
    postalCode: parsed.data.shipping.postalCode.trim(),
  };

  const normalizedItems = parsed.data.items.map((item) => ({
    productId: item.productId.trim(),
    size: item.size.trim(),
    color: item.color.trim(),
    quantity: item.quantity,
  }));

  const productIds = Array.from(
    new Set(normalizedItems.map((item) => item.productId))
  );

  const variants = await prisma.variant.findMany({
    where: {
      productId: { in: productIds },
      isActive: true,
      product: { status: "ACTIVE", deletedAt: null },
    },
    include: { product: true },
  });

  const variantMap = new Map(
    variants.map((variant) => [
      normalizeKey(variant.productId, variant.size, variant.color),
      variant,
    ])
  );

  const missingItems: string[] = [];
  const stockIssues: string[] = [];

  const computedItems = normalizedItems.map((item) => {
    const key = normalizeKey(item.productId, item.size, item.color);
    const variant = variantMap.get(key);

    if (!variant) {
      missingItems.push(`${item.productId}:${item.size}:${item.color}`);
      return null;
    }

    if (variant.stockQty < item.quantity) {
      stockIssues.push(variant.sku);
    }

    const priceSnapshot = variant.priceOverride ?? variant.product.basePrice;

    return {
      productId: variant.productId,
      variantId: variant.id,
      nameSnapshot: variant.product.title,
      skuSnapshot: variant.sku,
      priceSnapshot,
      qty: item.quantity,
      variant,
    };
  });

  if (missingItems.length > 0) {
    return NextResponse.json(
      { error: "Some items are no longer available.", missingItems },
      { status: 400 }
    );
  }

  if (stockIssues.length > 0) {
    return NextResponse.json(
      { error: "Some items are out of stock.", stockIssues },
      { status: 409 }
    );
  }

  const preparedItems = computedItems.filter(
    (item): item is NonNullable<typeof item> => item !== null
  );

  const subtotal = preparedItems.reduce(
    (total, item) => total + item.priceSnapshot * item.qty,
    0
  );
  const shippingFee = subtotal >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
  const total = subtotal + shippingFee;

  const addressLine = `${shipping.houseNumber} ${shipping.streetName}${
    shipping.building ? `, ${shipping.building}` : ""
  }`;

  const shippingAddress = {
    name: `${customer.firstName} ${customer.lastName}`.trim(),
    addressLine,
    houseNumber: shipping.houseNumber,
    streetName: shipping.streetName,
    building: shipping.building,
    barangay: shipping.barangay,
    city: shipping.city,
    province: shipping.province,
    region: shipping.region,
    postalCode: shipping.postalCode,
  };

  const cardDigits = parsed.data.payment?.cardNumber.replace(/\D/g, "") ?? "";
  const paymentDetails = parsed.data.payment
    ? {
        method: parsed.data.payment.method.trim(),
        cardholderName: parsed.data.payment.cardName.trim(),
        last4: cardDigits ? cardDigits.slice(-4) : null,
      }
    : null;

  try {
    const orderNumber = createOrderNumber();

    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderNumber,
          email: customer.email,
          phone: customer.phone,
          subtotal,
          shippingFee,
          total,
          shippingAddress,
          paymentDetails: paymentDetails ?? undefined,
          customer: {
            connectOrCreate: {
              where: { email: customer.email },
              create: {
                email: customer.email,
                name: `${customer.firstName} ${customer.lastName}`.trim(),
                phone: customer.phone,
              },
            },
          },
          items: {
            create: preparedItems.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              nameSnapshot: item.nameSnapshot,
              skuSnapshot: item.skuSnapshot,
              priceSnapshot: item.priceSnapshot,
              qty: item.qty,
            })),
          },
        },
      });

      await Promise.all(
        preparedItems.map((item) =>
          tx.variant.update({
            where: { id: item.variantId },
            data: { stockQty: { decrement: item.qty } },
          })
        )
      );

      await Promise.all(
        preparedItems.map((item) =>
          tx.stockMovement.create({
            data: {
              variantId: item.variantId,
              delta: -item.qty,
              reason: `Order ${orderNumber}`,
            },
          })
        )
      );

      return created;
    });

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      orderNumber: order.orderNumber,
    });
  } catch (error) {
    console.error("Failed to create order.", error);
    return NextResponse.json(
      { error: "Unable to create order at this time." },
      { status: 500 }
    );
  }
}
