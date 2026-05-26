import { prisma } from "@/lib/prisma";
import { Table, THead, TBody, TR, TH, TD } from "@/app/admin/(app)/_components/ui/Table";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  if (!prisma) {
    return (
      <div className="text-white/70">
        Prisma is not configured. Set DATABASE_URL to continue.
      </div>
    );
  }

  const messages = await prisma.contactMessage.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl tracking-[0.2em]"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          INBOX
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Messages submitted from the Visit Us page.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#121214]">
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Phone</TH>
              <TH>Message</TH>
              <TH>Date</TH>
            </TR>
          </THead>
          <TBody>
            {messages.map((message) => (
              <TR key={message.id}>
                <TD>{message.name}</TD>
                <TD>{message.email}</TD>
                <TD>{message.phone ?? "—"}</TD>
                <TD className="max-w-md whitespace-pre-wrap text-sm text-white/70">
                  {message.message}
                </TD>
                <TD className="text-xs text-white/50">
                  {message.createdAt.toLocaleString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </TD>
              </TR>
            ))}
            {messages.length === 0 && (
              <TR>
                <TD colSpan={5} className="py-6 text-center text-white/40">
                  No messages yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
