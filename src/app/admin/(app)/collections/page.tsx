import Link from "next/link";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAuditLog } from "@/lib/audit";
import { Button } from "@/app/admin/(app)/_components/ui/Button";
import { Input } from "@/app/admin/(app)/_components/ui/Input";
import { Table, THead, TBody, TR, TH, TD } from "@/app/admin/(app)/_components/ui/Table";

const createSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1),
});

async function createCollectionAction(formData: FormData) {
  "use server";
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  const admin = await requireAdmin();
  const parsed = createSchema.safeParse({
    name: String(formData.get("name") ?? "").trim(),
    slug: String(formData.get("slug") ?? "").trim(),
  });

  if (!parsed.success) {
    redirect("/admin/collections?error=invalid");
  }

  const created = await prisma.collection.create({
    data: {
      name: parsed.data.name,
      slug: parsed.data.slug,
      description: "",
      isFeatured: false,
      sortOrder: 0,
    },
  });

  await recordAuditLog({
    actorAdminId: admin.id,
    action: "collection.create",
    entityType: "collection",
    entityId: created.id,
    diff: parsed.data,
  });

  redirect(`/admin/collections/${created.id}`);
}

async function deleteCollectionAction(formData: FormData) {
  "use server";
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  const admin = await requireAdmin();
  const collectionId = String(formData.get("collectionId") ?? "");

  await prisma.collection.delete({ where: { id: collectionId } });

  await recordAuditLog({
    actorAdminId: admin.id,
    action: "collection.delete",
    entityType: "collection",
    entityId: collectionId,
    diff: {},
  });

  redirect("/admin/collections?success=deleted");
}

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  if (!prisma) {
    return (
      <div className="text-white/70">
        Prisma is not configured. Set DATABASE_URL to continue.
      </div>
    );
  }

  const collections = await prisma.collection.findMany({
    orderBy: { sortOrder: "asc" },
    include: { products: true },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl tracking-[0.2em]"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            COLLECTIONS
          </h1>
          <p className="mt-2 text-sm text-white/60">
            Organize products into curated categories.
          </p>
        </div>
      </div>

      <form
        action={createCollectionAction}
        className="grid gap-4 rounded-xl border border-white/10 bg-[#121214] p-5 lg:grid-cols-3"
      >
        <div>
          <label className="text-xs tracking-[0.2em] text-white/50">NAME</label>
          <Input name="name" required />
        </div>
        <div>
          <label className="text-xs tracking-[0.2em] text-white/50">SLUG</label>
          <Input name="slug" required />
        </div>
        <div className="flex items-end">
          <Button type="submit" variant="outline" className="w-full">
            Create Collection
          </Button>
        </div>
      </form>

      <div className="rounded-xl border border-white/10 bg-[#121214]">
        <Table>
          <THead>
            <TR>
              <TH>Name</TH>
              <TH>Slug</TH>
              <TH>Products</TH>
              <TH>Featured</TH>
              <TH>Sort</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {collections.map((collection) => (
              <TR key={collection.id}>
                <TD>{collection.name}</TD>
                <TD>{collection.slug}</TD>
                <TD>{collection.products.length}</TD>
                <TD>{collection.isFeatured ? "Yes" : "No"}</TD>
                <TD>{collection.sortOrder}</TD>
                <TD>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/admin/collections/${collection.id}`}>
                      <Button size="sm" variant="ghost">
                        Edit
                      </Button>
                    </Link>
                    <form action={deleteCollectionAction}>
                      <input
                        type="hidden"
                        name="collectionId"
                        value={collection.id}
                      />
                      <Button size="sm" variant="danger" type="submit">
                        Delete
                      </Button>
                    </form>
                  </div>
                </TD>
              </TR>
            ))}
            {collections.length === 0 && (
              <TR>
                <TD colSpan={6} className="py-6 text-center text-white/40">
                  No collections yet.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </div>
    </div>
  );
}
