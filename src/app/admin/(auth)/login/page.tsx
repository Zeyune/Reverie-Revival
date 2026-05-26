import { headers } from "next/headers";
import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createAdminSession } from "@/lib/admin-auth";
import { compare } from "bcryptjs";
import {
  clearAdminLoginRateLimit,
  getAdminLoginRateLimitStatus,
  recordAdminLoginFailure,
} from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const getRequestIpAddress = (headerStore: Headers, host: string) => {
  if (host.endsWith(".onion")) {
    return null;
  }

  const candidate = [
    headerStore.get("x-forwarded-for"),
    headerStore.get("x-real-ip"),
    headerStore.get("cf-connecting-ip"),
  ]
    .find(Boolean)
    ?.split(",")[0]
    ?.trim();

  return candidate || null;
};

async function loginAction(formData: FormData) {
  "use server";

  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }

  const payload = {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  };
  const requestHeaders = await headers();
  const host = requestHeaders.get("host")?.trim().toLowerCase() ?? "unknown";
  const ipAddress = getRequestIpAddress(requestHeaders, host);

  const parsed = loginSchema.safeParse(payload);
  if (!parsed.success) {
    redirect("/admin/login?error=invalid");
  }

  const rateLimit = await getAdminLoginRateLimitStatus({
    email: parsed.data.email,
    host,
    ipAddress,
  });
  if (!rateLimit.allowed) {
    const retryAfterMinutes = Math.max(
      1,
      Math.ceil(rateLimit.retryAfterMs / (60 * 1000))
    );
    redirect(`/admin/login?error=rate_limited&retry=${retryAfterMinutes}`);
  }

  const admin = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email },
  });

  if (!admin) {
    await recordAdminLoginFailure({
      email: parsed.data.email,
      host,
      ipAddress,
    });
    redirect("/admin/login?error=invalid");
  }

  const isValid = await compare(parsed.data.password, admin.passwordHash);
  if (!isValid) {
    await recordAdminLoginFailure({
      email: parsed.data.email,
      host,
      ipAddress,
    });
    redirect("/admin/login?error=invalid");
  }

  await clearAdminLoginRateLimit({
    email: parsed.data.email,
    host,
    ipAddress,
  });

  await createAdminSession(admin.id);
  redirect("/admin");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams?:
    | { error?: string; retry?: string }
    | Promise<{ error?: string; retry?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const errorMessage =
    resolvedSearchParams.error === "invalid"
      ? "Invalid email or password."
      : resolvedSearchParams.error === "rate_limited"
      ? `Too many login attempts. Try again in ${
          resolvedSearchParams.retry ?? "a few"
        } minute(s).`
      : null;

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0B0C]/80 p-8 shadow-[0_0_40px_rgba(0,0,0,0.6)]">
        <div className="mb-8 text-center">
          <p className="text-xs tracking-[0.4em] text-white/60">
            REVERIE REVIVAL
          </p>
          <h1
            className="mt-4 text-2xl tracking-[0.2em]"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            ADMIN LOGIN
          </h1>
        </div>

        {errorMessage && (
          <div className="mb-6 rounded-lg border border-[#E10613]/60 bg-[#E10613]/10 px-4 py-3 text-sm text-[#E10613]">
            {errorMessage}
          </div>
        )}

        <form action={loginAction} className="space-y-5">
          <div>
            <label
              className="block text-xs tracking-[0.25em] text-white/70"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              EMAIL
            </label>
            <input
              name="email"
              type="email"
              required
              className="mt-2 w-full border border-white/20 bg-[#121214] px-4 py-3 text-white focus:border-white/60 focus:outline-none"
            />
          </div>
          <div>
            <label
              className="block text-xs tracking-[0.25em] text-white/70"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              PASSWORD
            </label>
            <input
              name="password"
              type="password"
              required
              className="mt-2 w-full border border-white/20 bg-[#121214] px-4 py-3 text-white focus:border-white/60 focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-white py-3 text-sm tracking-[0.3em] text-[#0B0B0C] transition-colors hover:bg-[#E10613] hover:text-white"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            SIGN IN
          </button>
        </form>
      </div>
    </div>
  );
}
