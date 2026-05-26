import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAuditLog } from "@/lib/audit";
import { Button } from "@/app/admin/(app)/_components/ui/Button";
import { Textarea } from "@/app/admin/(app)/_components/ui/Textarea";
import { Table, THead, TBody, TR, TH, TD } from "@/app/admin/(app)/_components/ui/Table";

export const dynamic = "force-dynamic";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);

async function updateCustomerNotes(formData: FormData) {
  "use server";
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  const admin = await requireAdmin();
  const customerId = String(formData.get("customerId") ?? "");
  const notes = String(formData.get("notes") ?? "");

  await prisma.customer.update({
    where: { id: customerId },
    data: { notes },
  });

  await recordAuditLog({
    actorAdminId: admin.id,
    action: "customer.notes.update",
    entityType: "customer",
    entityId: customerId,
    diff: { notes },
  });

  redirect(`/admin/customers/${customerId}?success=notes`);
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!prisma) {
    return (
      <div className="text-white/70">
        Prisma is not configured. Set DATABASE_URL to continue.
      </div>
    );
  }

  const resolvedParams = await params;
  if (!resolvedParams?.id) {
    return <div className="text-white/60">Customer not found.</div>;
  }

  const customer = await prisma.customer.findUnique({
    where: { id: resolvedParams.id },
    include: { orders: true },
  });

  if (!customer) {
    return <div className="text-white/60">Customer not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl tracking-[0.2em]"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          CUSTOMER
        </h1>
        <p className="mt-2 text-sm text-white/60">
          {customer.email ?? "No email on record"}
        </p>
      </div>

      <section className="rounded-xl border border-white/10 bg-[#121214] p-5">
        <p className="text-xs tracking-[0.2em] text-white/50">PROFILE</p>
        <div className="mt-3 space-y-1 text-sm">
          <p>Name: {customer.name ?? "N/A"}</p>
          <p>Email: {customer.email ?? "N/A"}</p>
          <p>Phone: {customer.phone ?? "N/A"}</p>
          <p>
            Orders: {customer.orders.length} - Total Spent:{" "}
            {formatCurrency(
              customer.orders.reduce((sum, order) => sum + order.total, 0)
            )}
          </p>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#121214] p-5">
        <p className="text-xs tracking-[0.2em] text-white/50">INTERNAL NOTES</p>
        <form action={updateCustomerNotes} className="mt-4 space-y-3">
          <input type="hidden" name="customerId" value={customer.id} />
          <Textarea name="notes" rows={4} defaultValue={customer.notes ?? ""} />
          <Button type="submit" variant="outline">
            Save Notes
          </Button>
        </form>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#121214]">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-sm tracking-[0.2em]">ORDER HISTORY</h2>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Order</TH>
              <TH>Total</TH>
              <TH>Status</TH>
              <TH>Date</TH>
            </TR>
          </THead>
          <TBody>
            {customer.orders.map((order) => (
              <TR key={order.id}>
                <TD>#{order.orderNumber}</TD>
                <TD>{formatCurrency(order.total)}</TD>
                <TD>{order.fulfillmentStatus}</TD>
                <TD>
                  {order.createdAt.toLocaleDateString("en-PH", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </TD>
              </TR>
            ))}
            {customer.orders.length === 0 && (
              <TR>
                <TD colSpan={4} className="py-6 text-center text-white/40">
                  No orders yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </section>
    </div>
  );
}
