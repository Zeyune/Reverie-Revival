import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAuditLog } from "@/lib/audit";
import { Badge } from "@/app/admin/(app)/_components/ui/Badge";
import { Button } from "@/app/admin/(app)/_components/ui/Button";
import { Input } from "@/app/admin/(app)/_components/ui/Input";
import { Select } from "@/app/admin/(app)/_components/ui/Select";
import { Textarea } from "@/app/admin/(app)/_components/ui/Textarea";
import { Table, THead, TBody, TR, TH, TD } from "@/app/admin/(app)/_components/ui/Table";

export const dynamic = "force-dynamic";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);

async function updatePaymentStatusAction(formData: FormData) {
  "use server";
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const paymentStatus = String(formData.get("paymentStatus") ?? "UNPAID");

  await prisma.order.update({
    where: { id: orderId },
    data: { paymentStatus: paymentStatus as "UNPAID" | "PAID" | "REFUNDED" },
  });

  await recordAuditLog({
    actorAdminId: admin.id,
    action: "order.payment.update",
    entityType: "order",
    entityId: orderId,
    diff: { paymentStatus },
  });

  redirect(`/admin/orders/${orderId}?success=payment`);
}

async function updateFulfillmentAction(formData: FormData) {
  "use server";
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const fulfillmentStatus = String(
    formData.get("fulfillmentStatus") ?? "UNFULFILLED"
  );
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();
  const courier = String(formData.get("courier") ?? "").trim();

  await prisma.order.update({
    where: { id: orderId },
    data: {
      fulfillmentStatus: fulfillmentStatus as
        | "UNFULFILLED"
        | "PROCESSING"
        | "SHIPPED"
        | "DELIVERED"
        | "CANCELLED",
      trackingNumber: trackingNumber || null,
      courier: courier || null,
    },
  });

  await recordAuditLog({
    actorAdminId: admin.id,
    action: "order.fulfillment.update",
    entityType: "order",
    entityId: orderId,
    diff: { fulfillmentStatus, trackingNumber, courier },
  });

  redirect(`/admin/orders/${orderId}?success=fulfillment`);
}

async function updateNotesAction(formData: FormData) {
  "use server";
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");
  const notes = String(formData.get("notes") ?? "");

  await prisma.order.update({
    where: { id: orderId },
    data: { notes },
  });

  await recordAuditLog({
    actorAdminId: admin.id,
    action: "order.notes.update",
    entityType: "order",
    entityId: orderId,
    diff: { notes },
  });

  redirect(`/admin/orders/${orderId}?success=notes`);
}

async function cancelOrderAction(formData: FormData) {
  "use server";
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  const admin = await requireAdmin();
  const orderId = String(formData.get("orderId") ?? "");

  await prisma.order.update({
    where: { id: orderId },
    data: { fulfillmentStatus: "CANCELLED" },
  });

  await recordAuditLog({
    actorAdminId: admin.id,
    action: "order.cancel",
    entityType: "order",
    entityId: orderId,
    diff: { fulfillmentStatus: "CANCELLED" },
  });

  redirect(`/admin/orders/${orderId}?success=cancelled`);
}

export default async function OrderDetailPage({
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
    return <div className="text-white/60">Order not found.</div>;
  }

  const order = await prisma.order.findUnique({
    where: { id: resolvedParams.id },
    include: {
      items: {
        include: {
          product: true,
          variant: true,
        },
      },
      customer: true,
    },
  });

  if (!order) {
    return <div className="text-white/60">Order not found.</div>;
  }

  const paymentDetails =
    order.paymentDetails &&
    typeof order.paymentDetails === "object" &&
    !Array.isArray(order.paymentDetails)
      ? (order.paymentDetails as Record<string, unknown>)
      : null;

  const paymentMethod =
    typeof paymentDetails?.method === "string" && paymentDetails.method
      ? paymentDetails.method
      : "N/A";
  const paymentCardholder =
    typeof paymentDetails?.cardholderName === "string" &&
    paymentDetails.cardholderName
      ? paymentDetails.cardholderName
      : "N/A";
  const paymentLast4 =
    typeof paymentDetails?.last4 === "string" && paymentDetails.last4
      ? paymentDetails.last4
      : "N/A";

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-2xl tracking-[0.2em]"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          ORDER #{order.orderNumber}
        </h1>
        <p className="mt-2 text-sm text-white/60">
          {order.email} - {order.createdAt.toLocaleDateString("en-PH")}
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#121214] p-5">
          <p className="text-xs tracking-[0.2em] text-white/50">PAYMENT STATUS</p>
          <div className="mt-3">
            <Badge tone={order.paymentStatus === "PAID" ? "success" : "warning"}>
              {order.paymentStatus}
            </Badge>
          </div>
          <div className="mt-4 space-y-1 text-xs text-white/60">
            <p>Method: {paymentMethod}</p>
            <p>Cardholder: {paymentCardholder}</p>
            <p>Card: {paymentLast4 === "N/A" ? "N/A" : `**** ${paymentLast4}`}</p>
          </div>
          <form action={updatePaymentStatusAction} className="mt-4 space-y-3">
            <input type="hidden" name="orderId" value={order.id} />
            <Select name="paymentStatus" defaultValue={order.paymentStatus}>
              <option value="UNPAID">Unpaid</option>
              <option value="PAID">Paid</option>
              <option value="REFUNDED">Refunded</option>
            </Select>
            <Button type="submit" variant="outline">
              Update Payment
            </Button>
          </form>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#121214] p-5 lg:col-span-2">
          <p className="text-xs tracking-[0.2em] text-white/50">
            FULFILLMENT STATUS
          </p>
          <div className="mt-3">
            <Badge
              tone={
                order.fulfillmentStatus === "DELIVERED"
                  ? "success"
                  : order.fulfillmentStatus === "CANCELLED"
                  ? "danger"
                  : "warning"
              }
            >
              {order.fulfillmentStatus}
            </Badge>
          </div>
          <form action={updateFulfillmentAction} className="mt-4 grid gap-3 lg:grid-cols-3">
            <input type="hidden" name="orderId" value={order.id} />
            <div className="lg:col-span-3">
              <Select
                name="fulfillmentStatus"
                defaultValue={order.fulfillmentStatus}
              >
                <option value="UNFULFILLED">Unfulfilled</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </Select>
            </div>
            <Input
              name="courier"
              placeholder="Courier"
              defaultValue={order.courier ?? ""}
            />
            <Input
              name="trackingNumber"
              placeholder="Tracking #"
              defaultValue={order.trackingNumber ?? ""}
            />
            <Button type="submit" variant="outline" className="lg:col-span-1">
              Update Fulfillment
            </Button>
          </form>
          <form action={cancelOrderAction} className="mt-4">
            <input type="hidden" name="orderId" value={order.id} />
            <Button type="submit" variant="danger">
              Cancel Order
            </Button>
          </form>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-[#121214] p-5">
          <p className="text-xs tracking-[0.2em] text-white/50">CUSTOMER</p>
          <p className="mt-3 text-sm">{order.email}</p>
          {order.phone && <p className="text-xs text-white/60">{order.phone}</p>}
          {order.customer && (
            <p className="mt-2 text-xs text-white/50">
              Customer ID: {order.customer.id}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-white/10 bg-[#121214] p-5 lg:col-span-2">
          <p className="text-xs tracking-[0.2em] text-white/50">
            SHIPPING ADDRESS
          </p>
          <pre className="mt-3 whitespace-pre-wrap text-sm text-white/70">
            {JSON.stringify(order.shippingAddress, null, 2)}
          </pre>
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#121214]">
        <div className="border-b border-white/10 px-5 py-4">
          <h2 className="text-sm tracking-[0.2em]">ITEMS</h2>
        </div>
        <Table>
          <THead>
            <TR>
              <TH>Product</TH>
              <TH>Variant</TH>
              <TH>Qty</TH>
              <TH>Price</TH>
              <TH>Total</TH>
            </TR>
          </THead>
          <TBody>
            {order.items.map((item) => (
              <TR key={item.id}>
                <TD>{item.nameSnapshot}</TD>
                <TD>{item.skuSnapshot ?? item.variant?.sku ?? "N/A"}</TD>
                <TD>{item.qty}</TD>
                <TD>{formatCurrency(item.priceSnapshot)}</TD>
                <TD>{formatCurrency(item.priceSnapshot * item.qty)}</TD>
              </TR>
            ))}
            {order.items.length === 0 && (
              <TR>
                <TD colSpan={5} className="py-6 text-center text-white/40">
                  No items on this order.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
        <div className="border-t border-white/10 px-5 py-4 text-right text-sm text-white/60">
          Subtotal: {formatCurrency(order.subtotal)} | Shipping:{" "}
          {formatCurrency(order.shippingFee)} | Total: {formatCurrency(order.total)}
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-[#121214] p-5">
        <p className="text-xs tracking-[0.2em] text-white/50">INTERNAL NOTES</p>
        <form action={updateNotesAction} className="mt-4 space-y-3">
          <input type="hidden" name="orderId" value={order.id} />
          <Textarea name="notes" rows={4} defaultValue={order.notes ?? ""} />
          <Button type="submit" variant="outline">
            Save Notes
          </Button>
        </form>
      </section>
    </div>
  );
}
