import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: Request) {
    if (!prisma) {
        return NextResponse.json(
            { error: "Prisma client is not available." },
            { status: 500 }
        );
    }

    const body = await request.json().catch(() => null);
    const { code } = body || {};

    if (!code || typeof code !== "string") {
        return NextResponse.json({ valid: false, error: "Invalid code." });
    }

    const promo = await prisma.promoCode.findUnique({
        where: { code },
    });

    if (!promo) {
        return NextResponse.json({ valid: false, error: "Code not found." });
    }

    if (!promo.isActive) {
        return NextResponse.json({ valid: false, error: "Code is no longer active." });
    }

    return NextResponse.json({
        valid: true,
        promo: {
            code: promo.code,
            type: promo.discountType,
            value: promo.discountValue
        }
    });
}
