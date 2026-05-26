import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type AuditPayload = {
  actorAdminId: string;
  action: string;
  entityType: string;
  entityId: string;
  diff: unknown;
};

export async function recordAuditLog(payload: AuditPayload) {
  if (!prisma) {
    return;
  }

  await prisma.auditLog.create({
    data: {
      actorAdminId: payload.actorAdminId,
      action: payload.action,
      entityType: payload.entityType,
      entityId: payload.entityId,
      diff: payload.diff as Prisma.InputJsonValue,
    },
  });
}
