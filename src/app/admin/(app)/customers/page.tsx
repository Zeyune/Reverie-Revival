import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Table, THead, TBody, TR, TH, TD } from "@/app/admin/(app)/_components/ui/Table";

export const dynamic = "force-dynamic";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    maximumFractionDigits: 0,
  }).format(value);

export default async function CustomersPage() {
  if (!prisma) {
    return (
      <div className="text-white/70">
        Prisma is not configured. Set DATABASE_URL to continue.
      </div>
    );
  }

  const customers = await prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
    include: { orders: true },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl tracking-[0.2em]"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          CUSTOMERS
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Track customer history and total spend.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#121214]">
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Email</TH>
              <TH>Orders</TH>
              <TH>Total Spent</TH>
              <TH>Joined</TH>
            </TR>
          </THead>
          <TBody>
            {customers.map((customer) => {
              const totalSpent = customer.orders.reduce(
                (sum, order) => sum + order.total,
                0
              );
              return (
                <TR key={customer.id}>
                  <TD>
                    <Link
                      href={`/admin/customers/${customer.id}`}
                      className="font-medium hover:underline"
                    >
                      {customer.name ?? "N/A"}
                    </Link>
                  </TD>
                  <TD>{customer.email ?? "N/A"}</TD>
                  <TD>{customer.orders.length}</TD>
                  <TD>{formatCurrency(totalSpent)}</TD>
                  <TD>
                    {customer.createdAt.toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </TD>
                </TR>
              );
            })}
            {customers.length === 0 && (
              <TR>
                <TD colSpan={5} className="py-6 text-center text-white/40">
                  No customers found.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
