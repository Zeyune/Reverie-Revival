import { prisma } from "@/lib/prisma";

export async function getSettings() {
  if (!prisma) {
    return null;
  }

  const existing = await prisma.settings.findFirst();
  if (existing) {
    return existing;
  }

  return prisma.settings.create({
    data: {
      storeName: "Reverie Revival",
      homepageFeaturedCollectionIds: [],
      homepageFeaturedProductIds: [],
    },
  });
}
