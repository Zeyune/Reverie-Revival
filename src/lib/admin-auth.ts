import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const SESSION_COOKIE = "rr_admin_session";
const SESSION_DAYS = 7;

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export async function createAdminSession(adminId: string) {
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }

  const token = randomBytes(32).toString("hex");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.adminSession.create({
    data: {
      adminId,
      tokenHash,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return;
  }

  const tokenHash = hashToken(token);
  if (prisma) {
    await prisma.adminSession.deleteMany({
      where: { tokenHash },
    });
  }

  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getAdminFromSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token || !prisma) {
    return null;
  }

  const tokenHash = hashToken(token);
  const session = await prisma.adminSession.findUnique({
    where: { tokenHash },
    include: { admin: true },
  });

  if (!session) {
    await clearAdminSession();
    return null;
  }

  if (session.expiresAt < new Date()) {
    await prisma.adminSession.delete({ where: { id: session.id } });
    await clearAdminSession();
    return null;
  }

  return session.admin;
}

export async function requireAdmin() {
  const admin = await getAdminFromSession();
  if (!admin) {
    redirect("/admin/login");
  }
  return admin;
}
