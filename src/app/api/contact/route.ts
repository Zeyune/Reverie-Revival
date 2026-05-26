import { NextResponse } from "next/server";
import { z } from "zod";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/prisma";
import {
  buildNetworkRateLimitRules,
  getRequestRateLimitContext,
  recordRateLimitHit,
} from "@/lib/rate-limit";

export const runtime = "nodejs";

const payloadSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  message: z.string().min(1),
});

const CONTACT_INBOX_EMAIL =
  process.env.CONTACT_INBOX_EMAIL ?? "tankenneth207@gmail.com";
const CONTACT_FROM_EMAIL =
  process.env.CONTACT_FROM_EMAIL ?? "Reverie Revival <no-reply@example.com>";
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT ?? 465);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;

async function sendContactEmail(message: {
  name: string;
  email: string;
  phone?: string | null;
  body: string;
}) {
  const contentLines = [
    `Name: ${message.name}`,
    `Email: ${message.email}`,
    message.phone ? `Phone: ${message.phone}` : "Phone: (not provided)",
    "",
    message.body,
  ];

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return { sent: false, reason: "missing_smtp_config" };
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: CONTACT_FROM_EMAIL,
      to: CONTACT_INBOX_EMAIL,
      subject: `New message from ${message.name}`,
      text: contentLines.join("\n"),
    });

    return { sent: true };
  } catch (error) {
    console.error("Failed to send contact email.", error);
    return { sent: false, reason: "send_failed", error };
  }
}

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
    parsed.success && parsed.data.email
      ? parsed.data.email.trim().toLowerCase()
      : null;
  const rateLimitRules = buildNetworkRateLimitRules(
    rateLimitContext,
    email
      ? [`email:${email}`, `host-email:${rateLimitContext.host}:${email}`]
      : []
  ).map((rule) => {
    if (rule.key.startsWith("host-email:")) {
      return { ...rule, limit: 4 };
    }
    if (rule.key.startsWith("email:")) {
      return { ...rule, limit: 4 };
    }
    if (rule.key.startsWith("ip:")) {
      return { ...rule, limit: 10 };
    }
    return { ...rule, limit: 250 };
  });
  const rateLimit = await recordRateLimitHit(
    {
      action: "api-contact",
      windowMs: 10 * 60 * 1000,
      blockMs: 30 * 60 * 1000,
    },
    rateLimitRules
  );
  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        error: "Too many contact submissions. Try again later.",
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

  const created = await prisma.contactMessage.create({
    data: {
      name: parsed.data.name.trim(),
      email: parsed.data.email.trim(),
      phone: parsed.data.phone?.trim() || null,
      message: parsed.data.message.trim(),
    },
  });

  const emailResult = await sendContactEmail({
    name: created.name,
    email: created.email,
    phone: created.phone,
    body: created.message,
  });

  return NextResponse.json({
    ok: true,
    emailSent: emailResult.sent,
    debugError: emailResult.sent ? undefined : emailResult.reason,
  });
}
