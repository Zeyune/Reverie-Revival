import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin-auth";
import { recordAuditLog } from "@/lib/audit";
import { getSettings } from "@/lib/settings";
import { Button } from "@/app/admin/(app)/_components/ui/Button";
import { Input } from "@/app/admin/(app)/_components/ui/Input";
import { Textarea } from "@/app/admin/(app)/_components/ui/Textarea";

export const dynamic = "force-dynamic";

async function updateSettingsAction(formData: FormData) {
  "use server";
  if (!prisma) {
    throw new Error("Prisma client is not available.");
  }
  const admin = await requireAdmin();
  const settingsId = String(formData.get("settingsId") ?? "");

  const featuredCollectionIds = formData
    .getAll("featuredCollectionIds")
    .map((id) => String(id));
  const featuredProductIds = formData
    .getAll("featuredProductIds")
    .map((id) => String(id));

  const socialLinks = {
    instagram: String(formData.get("instagram") ?? ""),
    facebook: String(formData.get("facebook") ?? ""),
    twitter: String(formData.get("twitter") ?? ""),
    tiktok: String(formData.get("tiktok") ?? ""),
  };

  const updateData = {
    storeName: String(formData.get("storeName") ?? ""),
    contactEmail: String(formData.get("contactEmail") ?? ""),
    contactPhone: String(formData.get("contactPhone") ?? ""),
    contactAddress: String(formData.get("contactAddress") ?? ""),
    announcementBarText: String(formData.get("announcementBarText") ?? ""),
    shippingPolicy: String(formData.get("shippingPolicy") ?? ""),
    returnsPolicy: String(formData.get("returnsPolicy") ?? ""),
    privacyPolicy: String(formData.get("privacyPolicy") ?? ""),
    termsPolicy: String(formData.get("termsPolicy") ?? ""),
    socialLinks,
    homepageFeaturedCollectionIds: featuredCollectionIds,
    homepageFeaturedProductIds: featuredProductIds,
  };

  await prisma.settings.update({
    where: { id: settingsId },
    data: updateData,
  });

  await recordAuditLog({
    actorAdminId: admin.id,
    action: "settings.update",
    entityType: "settings",
    entityId: settingsId,
    diff: updateData,
  });

  redirect("/admin/settings?success=updated");
}

export default async function SettingsPage() {
  const settings = await getSettings();
  if (!settings) {
    return (
      <div className="text-white/70">
        Prisma is not configured. Set DATABASE_URL to continue.
      </div>
    );
  }

  const [collections, products] = await Promise.all([
    prisma?.collection.findMany({ orderBy: { name: "asc" } }),
    prisma?.product.findMany({
      where: { deletedAt: null },
      orderBy: { title: "asc" },
    }),
  ]);

  const social = (settings.socialLinks ?? {}) as Record<string, string>;

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-2xl tracking-[0.2em]"
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          SETTINGS
        </h1>
        <p className="mt-2 text-sm text-white/60">
          Control store profile, homepage, and policies.
        </p>
      </div>

      <form action={updateSettingsAction} className="space-y-6">
        <input type="hidden" name="settingsId" value={settings.id} />

        <section className="rounded-xl border border-white/10 bg-[#121214] p-6">
          <h2 className="text-sm tracking-[0.2em]">STORE PROFILE</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div>
              <label className="text-xs tracking-[0.2em] text-white/50">
                STORE NAME
              </label>
              <Input name="storeName" defaultValue={settings.storeName} />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] text-white/50">
                CONTACT EMAIL
              </label>
              <Input name="contactEmail" defaultValue={settings.contactEmail ?? ""} />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] text-white/50">
                CONTACT PHONE
              </label>
              <Input name="contactPhone" defaultValue={settings.contactPhone ?? ""} />
            </div>
            <div>
              <label className="text-xs tracking-[0.2em] text-white/50">
                CONTACT ADDRESS
              </label>
              <Input
                name="contactAddress"
                defaultValue={settings.contactAddress ?? ""}
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#121214] p-6">
          <h2 className="text-sm tracking-[0.2em]">SOCIAL LINKS</h2>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Input name="instagram" placeholder="Instagram URL" defaultValue={social.instagram ?? ""} />
            <Input name="facebook" placeholder="Facebook URL" defaultValue={social.facebook ?? ""} />
            <Input name="twitter" placeholder="Twitter/X URL" defaultValue={social.twitter ?? ""} />
            <Input name="tiktok" placeholder="TikTok URL" defaultValue={social.tiktok ?? ""} />
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#121214] p-6">
          <h2 className="text-sm tracking-[0.2em]">HOMEPAGE</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs tracking-[0.2em] text-white/50">
                ANNOUNCEMENT BAR
              </label>
              <Input
                name="announcementBarText"
                defaultValue={settings.announcementBarText ?? ""}
              />
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              <div>
                <p className="text-xs tracking-[0.2em] text-white/50">
                  FEATURED COLLECTIONS
                </p>
                <div className="mt-3 space-y-2">
                  {collections?.map((collection) => (
                    <label
                      key={collection.id}
                      className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0B0B0C]/60 px-4 py-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="featuredCollectionIds"
                        value={collection.id}
                        defaultChecked={settings.homepageFeaturedCollectionIds.includes(
                          collection.id
                        )}
                        className="h-4 w-4 rounded border border-white/20 bg-transparent"
                      />
                      {collection.name}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs tracking-[0.2em] text-white/50">
                  FEATURED PRODUCTS
                </p>
                <div className="mt-3 space-y-2">
                  {products?.map((product) => (
                    <label
                      key={product.id}
                      className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0B0B0C]/60 px-4 py-3 text-sm"
                    >
                      <input
                        type="checkbox"
                        name="featuredProductIds"
                        value={product.id}
                        defaultChecked={settings.homepageFeaturedProductIds.includes(
                          product.id
                        )}
                        className="h-4 w-4 rounded border border-white/20 bg-transparent"
                      />
                      {product.title}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-[#121214] p-6">
          <h2 className="text-sm tracking-[0.2em]">POLICIES</h2>
          <div className="mt-4 grid gap-4">
            <Textarea
              name="shippingPolicy"
              rows={4}
              placeholder="Shipping policy"
              defaultValue={settings.shippingPolicy ?? ""}
            />
            <Textarea
              name="returnsPolicy"
              rows={4}
              placeholder="Returns policy"
              defaultValue={settings.returnsPolicy ?? ""}
            />
            <Textarea
              name="privacyPolicy"
              rows={4}
              placeholder="Privacy policy"
              defaultValue={settings.privacyPolicy ?? ""}
            />
            <Textarea
              name="termsPolicy"
              rows={4}
              placeholder="Terms of service"
              defaultValue={settings.termsPolicy ?? ""}
            />
          </div>
        </section>

        <div className="flex justify-end">
          <Button type="submit">Save Settings</Button>
        </div>
      </form>
    </div>
  );
}
