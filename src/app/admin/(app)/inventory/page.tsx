import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAuditLog } from "@/lib/audit";
import { Button } from "@/app/admin/(app)/_components/ui/Button";
import { Input } from "@/app/admin/(app)/_components/ui/Input";
import { Table, THead, TBody, TR, TH, TD } from "@/app/admin/(app)/_components/ui/Table";

export const dynamic = "force-dynamic";

async function adjustStockAction(formData: FormData) {
  "use server";
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }

  const admin = await requireAdmin();
  const variantId = String(formData.get("variantId") ?? "");
  const delta = Number(formData.get("delta") ?? 0);
  const reason = String(formData.get("reason") ?? "");

  const variant = await prisma.variant.findUnique({ where: { id: variantId } });
  if (!variant) {
    redirect("/admin/inventory?error=missing");
  }

  const nextStock = Math.max(0, variant.stockQty + delta);

  await prisma.$transaction(async (tx) => {
    await tx.variant.update({
      where: { id: variantId },
      data: { stockQty: nextStock },
    });

    await tx.stockMovement.create({
      data: {
        variantId,
        delta,
        reason: reason || null,
        actorAdminId: admin.id,
      },
    });
  });

  await recordAuditLog({
    actorAdminId: admin.id,
    action: "inventory.adjust",
    entityType: "variant",
    entityId: variantId,
    diff: { delta, reason, stockQty: nextStock },
  });

  redirect("/admin/inventory?success=adjusted");
}

export default async function InventoryPage() {
  if (!prisma) {
    return (
      <div className="text-white/70">
        Prisma is not configured. Set DATABASE_URL to continue.
      </div>
    );
  }

  const variants = await prisma.variant.findMany({
    include: { product: true },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl tracking-[0.2em]"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          INVENTORY
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Adjust stock and track critical inventory changes.
        </p>
      </div>

      <div className="rounded-xl border border-white/10 bg-[#121214]">
        <Table>
          <THead>
            <TR>
              <TH>SKU</TH>
              <TH>Product</TH>
              <TH>Size</TH>
              <TH>Color</TH>
              <TH>On Hand</TH>
              <TH>Low Stock</TH>
              <TH>Adjust</TH>
            </TR>
          </THead>
          <TBody>
            {variants.map((variant) => (
              <TR key={variant.id}>
                <TD>{variant.sku}</TD>
                <TD>{variant.product.title}</TD>
                <TD>{variant.size}</TD>
                <TD>{variant.color}</TD>
                <TD>{variant.stockQty}</TD>
                <TD>{variant.lowStockThreshold}</TD>
                <TD>
                  <form
                    action={adjustStockAction}
                    className="flex flex-wrap items-center gap-2"
                  >
                    <input type="hidden" name="variantId" value={variant.id} />
                    <Input
                      name="delta"
                      type="number"
                      className="w-24"
                      placeholder="+/-"
                    />
                    <Input
                      name="reason"
                      placeholder="Reason"
                      className="w-48"
                    />
                    <Button size="sm" variant="outline" type="submit">
                      Apply
                    </Button>
                  </form>
                </TD>
              </TR>
            ))}
            {variants.length === 0 && (
              <TR>
                <TD colSpan={7} className="py-6 text-center text-white/40">
                  No variants yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
