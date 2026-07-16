import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAuditLog } from "@/lib/audit";
import { Table, THead, TBody, TR, TH, TD } from "@/app/admin/(app)/_components/ui/Table";
import { Button } from "@/app/admin/(app)/_components/ui/Button";
import { InlineAlert } from "@/app/admin/(app)/_components/ui/InlineAlert";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

// A FIXED discount is a peso amount, so it has no natural upper bound the way a
// percentage does. This ceiling only rejects absurd values; the authoritative
// guard is the clamp to the order subtotal when the discount is applied.
const MAX_FIXED_DISCOUNT = 100_000;

const createSchema = z
  .object({
    code: z
      .string()
      .min(1)
      .max(64)
      .transform((value) => value.trim().toUpperCase()),
    description: z.string().min(1).max(280),
    discountType: z.enum(["PERCENTAGE", "FIXED"]),
    discountValue: z.number().int().positive(),
  })
  .refine(
    (data) =>
      data.discountType === "PERCENTAGE"
        ? data.discountValue <= 100
        : data.discountValue <= MAX_FIXED_DISCOUNT,
    { path: ["discountValue"] }
  );

async function createPromoCode(formData: FormData) {
  "use server";

  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  const admin = await requireAdmin();
  const db = prisma;

  const parsed = createSchema.safeParse({
    code: String(formData.get("code") ?? ""),
    description: String(formData.get("description") ?? "").trim(),
    discountType: String(formData.get("discountType") ?? ""),
    discountValue: Number(formData.get("discountValue")),
  });

  if (!parsed.success) {
    redirect("/admin/promos?error=invalid");
  }

  const existing = await db.promoCode.findUnique({
    where: { code: parsed.data.code },
  });
  if (existing) {
    redirect("/admin/promos?error=duplicate");
  }

  const created = await db.promoCode.create({ data: parsed.data });

  await recordAuditLog({
    actorAdminId: admin.id,
    action: "promo.create",
    entityType: "promoCode",
    entityId: created.id,
    diff: parsed.data,
  });

  revalidatePath("/admin/promos");
}

async function deletePromoCode(id: string) {
  "use server";
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  const admin = await requireAdmin();
  const db = prisma;

  const promoId = z.string().min(1).safeParse(id);
  if (!promoId.success) {
    redirect("/admin/promos?error=invalid");
  }

  const deleted = await db.promoCode.delete({ where: { id: promoId.data } });

  await recordAuditLog({
    actorAdminId: admin.id,
    action: "promo.delete",
    entityType: "promoCode",
    entityId: promoId.data,
    diff: { code: deleted.code },
  });

  revalidatePath("/admin/promos");
}

const ERROR_MESSAGES: Record<string, string> = {
    invalid:
        "Could not create that code. Check the value: percentages must be 1-100, fixed amounts must be a whole number of pesos.",
    duplicate: "A promo code with that name already exists.",
};

export default async function PromoCodesPage({
    searchParams,
}: {
    searchParams: Promise<{ error?: string }>;
}) {
    if (!prisma) {
        return (
            <div className="text-white/70">
                Prisma is not configured. Set DATABASE_URL to continue.
            </div>
        );
    }
    const db = prisma;

    const { error } = await searchParams;
    const errorMessage = error ? ERROR_MESSAGES[error] ?? ERROR_MESSAGES.invalid : null;

    const promos = await db.promoCode.findMany({
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl tracking-[0.2em]" style={{ fontFamily: "var(--font-poppins), sans-serif" }}>
                    PROMO CODES
                </h1>
                <p className="mt-2 text-sm text-white/60">Manage discount codes for the store.</p>
            </div>

            {errorMessage && <InlineAlert tone="danger">{errorMessage}</InlineAlert>}

            <div className="rounded-xl border border-white/10 bg-[#121214] p-6">
                <h2 className="mb-4 text-sm tracking-[0.2em]">CREATE NEW CODE</h2>
                <form action={createPromoCode} className="flex flex-wrap items-end gap-4">
                    <div className="flex-1 min-w-[200px]">
                        <label className="mb-1 block text-xs text-white/50">CODE</label>
                        <input
                            name="code"
                            type="text"
                            placeholder="e.g. SAVE20"
                            className="w-full rounded bg-white/5 px-3 py-2 text-sm text-white border border-white/10 focus:border-white/40 focus:outline-none"
                            required
                        />
                    </div>
                    <div className="flex-[2] min-w-[300px]">
                        <label className="mb-1 block text-xs text-white/50">DESCRIPTION</label>
                        <input
                            name="description"
                            type="text"
                            placeholder="e.g. 20% off winter sale"
                            className="w-full rounded bg-white/5 px-3 py-2 text-sm text-white border border-white/10 focus:border-white/40 focus:outline-none"
                            required
                        />
                    </div>
                    <div className="flex-1 min-w-[150px]">
                        <label className="mb-1 block text-xs text-white/50">TYPE</label>
                        <select
                            name="discountType"
                            className="w-full rounded bg-white/5 px-3 py-2 text-sm text-white border border-white/10 focus:border-white/40 focus:outline-none"
                        >
                            <option value="PERCENTAGE">Percentage (%)</option>
                            <option value="FIXED">Fixed Amount</option>
                        </select>
                    </div>
                    <div className="flex-1 min-w-[100px]">
                        <label className="mb-1 block text-xs text-white/50">VALUE</label>
                        <input
                            name="discountValue"
                            type="number"
                            min="0"
                            placeholder="20"
                            className="w-full rounded bg-white/5 px-3 py-2 text-sm text-white border border-white/10 focus:border-white/40 focus:outline-none"
                            required
                        />
                    </div>
                    <Button type="submit">CREATE</Button>
                </form>
            </div>

            <div className="rounded-xl border border-white/10 bg-[#121214]">
                <Table>
                    <THead>
                        <TR>
                            <TH>Code</TH>
                            <TH>Description</TH>
                            <TH>Discount</TH>
                            <TH>Status</TH>
                            <TH className="text-right">Actions</TH>
                        </TR>
                    </THead>
                    <TBody>
                        {promos.map((promo) => (
                            <TR key={promo.id}>
                                <TD className="font-mono text-white/90">{promo.code}</TD>
                                <TD>{promo.description}</TD>
                                <TD>
                                    {promo.discountType === "PERCENTAGE"
                                        ? `${promo.discountValue}%`
                                        : `₱${promo.discountValue}`}
                                </TD>
                                <TD>
                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${promo.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                                        {promo.isActive ? "Active" : "Inactive"}
                                    </span>
                                </TD>
                                <TD className="text-right">
                                    <form action={deletePromoCode.bind(null, promo.id)}>
                                        <Button variant="danger" size="sm" type="submit">
                                            DELETE
                                        </Button>
                                    </form>
                                </TD>
                            </TR>
                        ))}
                        {promos.length === 0 && (
                            <TR>
                                <TD colSpan={5} className="py-8 text-center text-white/40">
                                    No promo codes found.
                                </TD>
                            </TR>
                        )}
                    </TBody>
                </Table>
            </div>
        </div>
    );
}
