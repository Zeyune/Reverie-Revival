import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  buildNetworkRateLimitRules,
  getRequestRateLimitContext,
  recordRateLimitHit,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

const payloadSchema = z.object({
  code: z.string().min(1).max(64),
});

// One response for every failure mode. Distinguishing "not found" from "inactive"
// turns this endpoint into an oracle: it's unauthenticated, so anyone could walk
// the code namespace and read back which guesses named a real code.
const INVALID_RESPONSE = { valid: false, error: "That code isn't valid." };

export async function POST(request: Request) {
  if (!prisma) {
    return NextResponse.json(
      { error: "Prisma client is not available." },
      { status: 500 }
    );
  }

  const rateLimitContext = getRequestRateLimitContext(request);
  const rateLimitRules = buildNetworkRateLimitRules(rateLimitContext).map(
    (rule) => {
      if (rule.key.startsWith("ip:")) {
        return { ...rule, limit: 20 };
      }
      return { ...rule, limit: 600 };
    }
  );

  const rateLimit = await recordRateLimitHit(
    {
      action: "api-promo-validate",
      windowMs: 10 * 60 * 1000,
      blockMs: 15 * 60 * 1000,
    },
    rateLimitRules
  );

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.ceil(rateLimit.retryAfterMs / 1000)),
        },
      }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(INVALID_RESPONSE);
  }

  // Codes are stored uppercase (see the admin create action), so match that here
  // — otherwise `save20` silently fails to find `SAVE20`.
  const promo = await prisma.promoCode.findUnique({
    where: { code: parsed.data.code.trim().toUpperCase() },
  });

  if (!promo || !promo.isActive) {
    return NextResponse.json(INVALID_RESPONSE);
  }

  return NextResponse.json({
    valid: true,
    promo: {
      code: promo.code,
      type: promo.discountType,
      value: promo.discountValue,
    },
  });
}
