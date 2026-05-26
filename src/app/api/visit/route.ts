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
  page: z.string().min(1),
  pageData: z.string().nullable().optional(),
  path: z.string().nullable().optional(),
  sessionId: z.string().nullable().optional(),
  referrer: z.string().nullable().optional(),
});

const readHeader = (request: Request, headerNames: string[]) => {
  for (const headerName of headerNames) {
    const value = request.headers.get(headerName);
    if (value) {
      return value;
    }
  }

  return null;
};

export async function POST(request: Request) {
  if (!prisma) {
    return NextResponse.json(
      { error: "Prisma client is not available." },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid payload." }, { status: 400 });
  }

  const rateLimitContext = getRequestRateLimitContext(request);
  const rateLimitRules = buildNetworkRateLimitRules(
    rateLimitContext,
    parsed.data.sessionId ? [`session:${parsed.data.sessionId}`] : []
  ).map((rule) => {
    if (rule.key.startsWith("session:")) {
      return { ...rule, limit: 180 };
    }
    if (rule.key.startsWith("ip:")) {
      return { ...rule, limit: 300 };
    }
    return { ...rule, limit: 3000 };
  });
  const rateLimit = await recordRateLimitHit(
    {
      action: "api-visit",
      windowMs: 5 * 60 * 1000,
      blockMs: 15 * 60 * 1000,
    },
    rateLimitRules
  );
  if (!rateLimit.allowed) {
    return NextResponse.json({ ok: true, skipped: "rate_limited" });
  }

  const host = request.headers.get("host");
  const isOnionVisit = rateLimitContext.isOnion;
  const ipAddress = rateLimitContext.ipAddress;

  const country = isOnionVisit
    ? null
    : readHeader(request, ["x-vercel-ip-country", "cf-ipcountry"]);
  const region = isOnionVisit
    ? null
    : readHeader(request, ["x-vercel-ip-country-region", "x-region"]);
  const city = isOnionVisit
    ? null
    : readHeader(request, ["x-vercel-ip-city", "x-city"]);

  await prisma.visitorLog.create({
    data: {
      sessionId: parsed.data.sessionId ?? null,
      page: parsed.data.page,
      pageData: parsed.data.pageData ?? null,
      path: parsed.data.path ?? null,
      host,
      network: isOnionVisit
        ? "tor-hidden-service"
        : ipAddress
        ? "forwarded-ip"
        : "unknown",
      ipAddress,
      country,
      region,
      city,
      referrer: parsed.data.referrer ?? null,
      userAgent: request.headers.get("user-agent"),
    },
  });

  return NextResponse.json({
    ok: true,
    note: isOnionVisit
      ? "Tor hidden services do not expose the visitor's IP or real-world location."
      : undefined,
  });
}
