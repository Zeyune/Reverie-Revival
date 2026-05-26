import { prisma } from "@/lib/prisma";
import { Table, THead, TBody, TR, TH, TD } from "@/app/admin/(app)/_components/ui/Table";
import { AuditDiffViewer } from "./AuditDiffViewer";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  if (!prisma) {
    return (
      <div className="text-white/70">
        Prisma is not configured. Set DATABASE_URL to continue.
      </div>
    );
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { actor: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl tracking-[0.2em]"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          AUDIT LOGS
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Recent admin activity across the platform.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#121214]">
        <Table>
          <THead>
            <TR>
              <TH>Time</TH>
              <TH>Actor</TH>
              <TH>Action</TH>
              <TH>Entity</TH>
              <TH>Diff</TH>
            </TR>
          </THead>
          <TBody>
            {logs.map((log) => (
              <TR key={log.id}>
                <TD>
                  {log.createdAt.toLocaleString("en-PH", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TD>
                <TD>{log.actor.email}</TD>
                <TD>{log.action}</TD>
                <TD>
                  {log.entityType}:{log.entityId}
                </TD>
                <TD>
                  <AuditDiffViewer diff={log.diff} />
                </TD>
              </TR>
            ))}
            {logs.length === 0 && (
              <TR>
                <TD colSpan={5} className="py-6 text-center text-white/40">
                  No audit logs yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
