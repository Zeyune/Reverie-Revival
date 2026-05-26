import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/app/admin/(app)/_components/ui/Badge";
import { Select } from "@/app/admin/(app)/_components/ui/Select";
import { Table, THead, TBody, TR, TH, TD } from "@/app/admin/(app)/_components/ui/Table";

export const dynamic = "force-dynamic";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);

export default async function OrdersPage({
  searchParams,
}: {
  searchParams?:
    | {
        payment?: string;
        fulfillment?: string;
      }
    | Promise<{
        payment?: string;
        fulfillment?: string;
      }>;
}) {
  if (!prisma) {
    return (
      <div className="text-white/70">
        Prisma is not configured. Set DATABASE_URL to continue.
      </div>
    );
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const payment = resolvedSearchParams.payment ?? "all";
  const fulfillment = resolvedSearchParams.fulfillment ?? "all";

  const where: NonNullable<
    Parameters<typeof prisma.order.findMany>[0]
  >["where"] = {};

  if (payment !== "all") {
    where.paymentStatus = payment as "UNPAID" | "PAID" | "REFUNDED";
  }

  if (fulfillment !== "all") {
    where.fulfillmentStatus = fulfillment as
      | "UNFULFILLED"
      | "PROCESSING"
      | "SHIPPED"
      | "DELIVERED"
      | "CANCELLED";
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl tracking-[0.2em]"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          ORDERS
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Track payments and fulfillment status.
        </p>
      </div>

      <form
        method="get"
        className="grid gap-4 rounded-xl border border-white/10 bg-[#121214] p-5 lg:grid-cols-2"
      >
        <div>
          <label className="text-xs tracking-[0.2em] text-white/50">
            PAYMENT STATUS
          </label>
          <Select name="payment" defaultValue={payment}>
            <option value="all">All</option>
            <option value="UNPAID">Unpaid</option>
            <option value="PAID">Paid</option>
            <option value="REFUNDED">Refunded</option>
          </Select>
        </div>
        <div>
          <label className="text-xs tracking-[0.2em] text-white/50">
            FULFILLMENT STATUS
          </label>
          <Select name="fulfillment" defaultValue={fulfillment}>
            <option value="all">All</option>
            <option value="UNFULFILLED">Unfulfilled</option>
            <option value="PROCESSING">Processing</option>
            <option value="SHIPPED">Shipped</option>
            <option value="DELIVERED">Delivered</option>
            <option value="CANCELLED">Cancelled</option>
          </Select>
        </div>
        <div>
          <button
            type="submit"
            className="w-full rounded-md border border-white/20 px-4 py-2 text-xs tracking-[0.2em] text-white/70 transition-colors hover:border-white/60 hover:text-white"
          >
            APPLY FILTERS
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-white/10 bg-[#121214]">
        <Table>
          <THead>
            <TR>
              <TH>Order #</TH>
              <TH>Email</TH>
              <TH>Total</TH>
              <TH>Payment</TH>
              <TH>Fulfillment</TH>
              <TH>Date</TH>
            </TR>
          </THead>
          <TBody>
            {orders.map((order) => (
              <TR key={order.id} className="cursor-pointer">
                <TD className="font-medium">
                  <Link href={`/admin/orders/${order.id}`} className="block w-full hover:underline">
                    #{order.orderNumber}
                  </Link>
                </TD>
                <TD>
                  <Link href={`/admin/orders/${order.id}`} className="block w-full">
                    {order.email}
                  </Link>
                </TD>
                <TD>
                  <Link href={`/admin/orders/${order.id}`} className="block w-full">
                    {formatCurrency(order.total)}
                  </Link>
                </TD>
                <TD>
                  <Link href={`/admin/orders/${order.id}`} className="block w-full">
                    <Badge tone={order.paymentStatus === "PAID" ? "success" : "warning"}>
                      {order.paymentStatus}
                    </Badge>
                  </Link>
                </TD>
                <TD>
                  <Link href={`/admin/orders/${order.id}`} className="block w-full">
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
                  </Link>
                </TD>
                <TD>
                  <Link href={`/admin/orders/${order.id}`} className="block w-full">
                    {order.createdAt.toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </Link>
                </TD>
              </TR>
            ))}
            {orders.length === 0 && (
              <TR>
                <TD colSpan={6} className="py-6 text-center text-white/40">
                  No orders found.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
