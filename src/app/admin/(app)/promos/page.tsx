import { prisma } from "@/lib/prisma";
import { Table, THead, TBody, TR, TH, TD } from "@/app/admin/(app)/_components/ui/Table";
import { Button } from "@/app/admin/(app)/_components/ui/Button";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function createPromoCode(formData: FormData) {
    "use server";

    if (!prisma) {
        throw new Error("Prisma client is not available.");
    }
    const db = prisma;

    const code = formData.get("code") as string;
    const description = formData.get("description") as string;
    const discountType = formData.get("discountType") as "PERCENTAGE" | "FIXED";
    const discountValue = Number(formData.get("discountValue"));

    if (!code || !description || !discountType || !discountValue) {
        return;
    }

    await db.promoCode.create({
        data: {
            code,
            description,
            discountType,
            discountValue,
        },
    });

    revalidatePath("/admin/promos");
}

async function deletePromoCode(id: string) {
    "use server";
    if (!prisma) {
        throw new Error("Prisma client is not available.");
    }
    const db = prisma;

    await db.promoCode.delete({ where: { id } });
    revalidatePath("/admin/promos");
}

export default async function PromoCodesPage() {
    if (!prisma) {
        return (
            <div className="text-white/70">
                Prisma is not configured. Set DATABASE_URL to continue.
            </div>
        );
    }
    const db = prisma;

    const promos = await db.promoCode.findMany({
        orderBy: { createdAt: "desc" },
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl tracking-[0.2em]" style={{ fontFamily: "'Poppins', sans-serif" }}>
                    PROMO CODES
                </h1>
                <p className="mt-2 text-sm text-white/60">Manage discount codes for the store.</p>
            </div>

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
                                        : `$${promo.discountValue}`}
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
