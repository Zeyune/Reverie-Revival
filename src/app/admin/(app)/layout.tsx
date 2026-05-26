import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const navItems = [
  { label: "Dashboard", href: "/admin" },
  { label: "Products", href: "/admin/products" },
  { label: "Collections", href: "/admin/collections" },
  { label: "Inventory", href: "/admin/inventory" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Inbox", href: "/admin/messages" },
  { label: "Visitors", href: "/admin/visitors" },
  { label: "Customers", href: "/admin/customers" },
  { label: "Settings", href: "/admin/settings" },
  { label: "Audit Logs", href: "/admin/audit" },
  { label: "Promo Codes", href: "/admin/promos" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-[#0B0B0C] text-white">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 flex-col border-r border-white/10 bg-[#0B0B0C] lg:flex">
          <div className="px-6 py-6">
            <p className="text-xs tracking-[0.4em] text-white/60">
              REVERIE REVIVAL
            </p>
            <h1
              className="mt-2 text-lg tracking-[0.2em]"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              ADMIN
            </h1>
          </div>
          <nav className="flex-1 space-y-1 px-4 pb-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-4 py-2 text-sm tracking-[0.2em] text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                style={{ fontFamily: "'Poppins', sans-serif" }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="border-t border-white/10 px-6 py-4 text-xs text-white/50">
            Signed in as {admin.email}
          </div>
        </aside>

        <div className="flex-1">
          <header className="border-b border-white/10 bg-[#0B0B0C]/80 px-6 py-4 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs tracking-[0.4em] text-white/50">
                  REVERIE REVIVAL
                </p>
                <p className="text-sm tracking-[0.2em] text-white/80">
                  ADMIN PANEL
                </p>
              </div>
              <form action="/admin/logout" method="post">
                <button
                  type="submit"
                  className="rounded-md border border-white/20 px-4 py-2 text-xs tracking-[0.2em] text-white/70 transition-colors hover:border-white/60 hover:text-white"
                  style={{ fontFamily: "'Poppins', sans-serif" }}
                >
                  LOG OUT
                </button>
              </form>
            </div>
          </header>
          <main className="px-6 py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
