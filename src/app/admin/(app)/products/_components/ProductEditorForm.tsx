"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/app/admin/(app)/_components/ui/Button";
import { Input } from "@/app/admin/(app)/_components/ui/Input";
import { Select } from "@/app/admin/(app)/_components/ui/Select";
import { Textarea } from "@/app/admin/(app)/_components/ui/Textarea";
import { Tabs } from "@/app/admin/(app)/_components/ui/Tabs";

type ImageInput = {
  id?: string;
  url: string;
  alt?: string | null;
  sortOrder: number;
};

type VariantInput = {
  id?: string;
  sku: string;
  size: string;
  color: string;
  priceOverride?: number | null;
  stockQty: number;
  lowStockThreshold: number;
  isActive: boolean;
};

type ProductEditorData = {
  id?: string;
  title: string;
  slug: string;
  description: string;
  details: string;
  materials: string;
  fit: string;
  care: string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  basePrice: number;
  compareAtPrice?: number | null;
  tags: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  images: ImageInput[];
  variants: VariantInput[];
  collectionIds: string[];
};

type CollectionOption = {
  id: string;
  name: string;
};

type ProductEditorFormProps = {
  initialData: ProductEditorData;
  collections: CollectionOption[];
  action: (formData: FormData) => void;
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");

export function ProductEditorForm({
  initialData,
  collections,
  action,
}: ProductEditorFormProps) {
  const [title, setTitle] = useState(initialData.title);
  const [slug, setSlug] = useState(initialData.slug);
  const [slugEdited, setSlugEdited] = useState(false);
  const [status, setStatus] = useState<ProductEditorData["status"]>(
    initialData.status
  );
  const [description, setDescription] = useState(initialData.description);
  const [details, setDetails] = useState(initialData.details);
  const [materials, setMaterials] = useState(initialData.materials);
  const [fit, setFit] = useState(initialData.fit);
  const [care, setCare] = useState(initialData.care);
  const [basePrice, setBasePrice] = useState(String(initialData.basePrice ?? 0));
  const [compareAtPrice, setCompareAtPrice] = useState(
    initialData.compareAtPrice ? String(initialData.compareAtPrice) : ""
  );
  const [tagsInput, setTagsInput] = useState(initialData.tags.join(", "));
  const [seoTitle, setSeoTitle] = useState(initialData.seoTitle ?? "");
  const [seoDescription, setSeoDescription] = useState(
    initialData.seoDescription ?? ""
  );
  const [images, setImages] = useState<ImageInput[]>(initialData.images);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [variants, setVariants] = useState<VariantInput[]>(initialData.variants);
  const [collectionIds, setCollectionIds] = useState<string[]>(
    initialData.collectionIds
  );
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([]);
  const [deletedVariantIds, setDeletedVariantIds] = useState<string[]>([]);

  const payload = useMemo(() => {
    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    return {
      id: initialData.id,
      title,
      slug,
      description,
      details,
      materials,
      fit,
      care,
      status,
      basePrice: Number(basePrice || 0),
      compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
      tags,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      images: images.map((image, index) => ({
        ...image,
        sortOrder: index,
      })),
      variants,
      collectionIds,
      deletedImageIds,
      deletedVariantIds,
    };
  }, [
    basePrice,
    collectionIds,
    compareAtPrice,
    deletedImageIds,
    deletedVariantIds,
    description,
    details,
    materials,
    fit,
    care,
    images,
    initialData.id,
    seoDescription,
    seoTitle,
    slug,
    status,
    tagsInput,
    title,
    variants,
  ]);

  const handleTitleChange = (value: string) => {
    setTitle(value);
    if (!slugEdited) {
      setSlug(slugify(value));
    }
  };

  const handleCollectionToggle = (collectionId: string) => {
    setCollectionIds((prev) =>
      prev.includes(collectionId)
        ? prev.filter((id) => id !== collectionId)
        : [...prev, collectionId]
    );
  };

  const handleAddImage = () => {
    setImages((prev) => [
      ...prev,
      { url: "", alt: "", sortOrder: prev.length },
    ]);
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (uploadingIndex !== null) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/avif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Accepted: JPG, PNG, WebP, AVIF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large. Maximum size is 5 MB.");
      return;
    }

    setUploadingIndex(index);

    try {
      const fd = new FormData();
      fd.append("file", file);

      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error ?? "Upload failed");
      }

      const data = await response.json();

      setImages((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], url: data.url };
        return next;
      });

      toast.success("Image uploaded.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Upload failed.";
      toast.error(message);
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => {
      const removed = prev[index];
      if (removed?.id) {
        setDeletedImageIds((ids) => [...ids, removed.id as string]);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const moveImage = (index: number, direction: -1 | 1) => {
    setImages((prev) => {
      const next = [...prev];
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= next.length) {
        return prev;
      }
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const handleAddVariant = () => {
    setVariants((prev) => [
      ...prev,
      {
        sku: "",
        size: "",
        color: "",
        priceOverride: null,
        stockQty: 0,
        lowStockThreshold: 0,
        isActive: true,
      },
    ]);
  };

  const handleRemoveVariant = (index: number) => {
    setVariants((prev) => {
      const removed = prev[index];
      if (removed?.id) {
        setDeletedVariantIds((ids) => [...ids, removed.id as string]);
      }
      return prev.filter((_, idx) => idx !== index);
    });
  };

  const handleClearVariants = () => {
    const deletedIds = variants
      .filter((variant) => variant.id)
      .map((variant) => variant.id as string);
    if (deletedIds.length > 0) {
      setDeletedVariantIds((ids) => [...ids, ...deletedIds]);
    }
    setVariants([]);
  };

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="payload" value={JSON.stringify(payload)} />

      <Tabs
        items={[
          {
            id: "basics",
            label: "Basics",
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="text-xs tracking-[0.2em] text-white/50">
                    TITLE
                  </label>
                  <Input
                    value={title}
                    onChange={(event) => handleTitleChange(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs tracking-[0.2em] text-white/50">
                    SLUG
                  </label>
                  <Input
                    value={slug}
                    onChange={(event) => {
                      setSlugEdited(true);
                      setSlug(event.target.value);
                    }}
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="text-xs tracking-[0.2em] text-white/50">
                    DESCRIPTION
                  </label>
                  <Textarea
                    rows={5}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs tracking-[0.2em] text-white/50">
                    STATUS
                  </label>
                  <Select
                    value={status}
                    onChange={(event) =>
                      setStatus(event.target.value as ProductEditorData["status"])
                    }
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ARCHIVED">Archived</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs tracking-[0.2em] text-white/50">
                    TAGS (comma separated)
                  </label>
                  <Input
                    value={tagsInput}
                    onChange={(event) => setTagsInput(event.target.value)}
                  />
                </div>
              </div>
            ),
          },
          {
            id: "pricing",
            label: "Pricing",
            content: (
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <label className="text-xs tracking-[0.2em] text-white/50">
                    BASE PRICE
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={basePrice}
                    onChange={(event) => setBasePrice(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs tracking-[0.2em] text-white/50">
                    COMPARE AT PRICE
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={compareAtPrice}
                    onChange={(event) => setCompareAtPrice(event.target.value)}
                  />
                </div>
              </div>
            ),
          },
          {
            id: "details",
            label: "Details",
            content: (
              <div className="grid gap-4">
                <div>
                  <label className="text-xs tracking-[0.2em] text-white/50">
                    PRODUCT DETAILS
                  </label>
                  <Textarea
                    rows={4}
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs tracking-[0.2em] text-white/50">
                    MATERIALS
                  </label>
                  <Textarea
                    rows={4}
                    value={materials}
                    onChange={(event) => setMaterials(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs tracking-[0.2em] text-white/50">
                    CARE INSTRUCTIONS
                  </label>
                  <Textarea
                    rows={4}
                    value={care}
                    onChange={(event) => setCare(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs tracking-[0.2em] text-white/50">
                    FIT & SIZING
                  </label>
                  <Textarea
                    rows={4}
                    value={fit}
                    onChange={(event) => setFit(event.target.value)}
                  />
                </div>
              </div>
            ),
          },
          {
            id: "media",
            label: "Media",
            content: (
              <div className="space-y-4">
                <Button type="button" variant="outline" onClick={handleAddImage}>
                  Add Image
                </Button>
                <div className="space-y-4">
                  {images.map((image, index) => (
                    <div
                      key={`${image.id ?? "new"}-${index}`}
                      className="space-y-3 rounded-lg border border-white/10 bg-[#0B0B0C]/60 p-4"
                    >
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-xs tracking-[0.2em] text-white/50">
                            IMAGE URL
                          </label>
                          <Input
                            value={image.url}
                            onChange={(event) => {
                              const next = [...images];
                              next[index] = {
                                ...next[index],
                                url: event.target.value,
                              };
                              setImages(next);
                            }}
                          />
                        </div>
                        <label
                          className={`inline-flex cursor-pointer items-center justify-center rounded-md border px-3 py-2 text-xs font-medium tracking-[0.2em] transition-colors ${
                            uploadingIndex !== null
                              ? "cursor-not-allowed border-white/10 text-white/40"
                              : "border-white/20 text-white/70 hover:border-white/60 hover:text-white"
                          }`}
                        >
                          {uploadingIndex === index ? "Uploading..." : "Upload"}
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/avif"
                            className="hidden"
                            disabled={uploadingIndex !== null}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleFileUpload(index, file);
                              }
                              e.target.value = "";
                            }}
                          />
                        </label>
                      </div>

                      {image.url && (
                        <div className="relative h-24 w-24 overflow-hidden rounded-md border border-white/10">
                          <img
                            src={image.url}
                            alt={image.alt ?? "Product image preview"}
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}

                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-xs tracking-[0.2em] text-white/50">
                            ALT TEXT
                          </label>
                          <Input
                            value={image.alt ?? ""}
                            onChange={(event) => {
                              const next = [...images];
                              next[index] = {
                                ...next[index],
                                alt: event.target.value,
                              };
                              setImages(next);
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => moveImage(index, -1)}
                        >
                          Up
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => moveImage(index, 1)}
                        >
                          Down
                        </Button>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => handleRemoveImage(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                  {images.length === 0 && (
                    <p className="text-sm text-white/50">
                      Add product imagery by URL or upload.
                    </p>
                  )}
                </div>
              </div>
            ),
          },
          {
            id: "collections",
            label: "Collections",
            content: (
              <div className="grid gap-3 lg:grid-cols-2">
                {collections.map((collection) => (
                  <label
                    key={collection.id}
                    className="flex items-center gap-3 rounded-lg border border-white/10 bg-[#0B0B0C]/60 px-4 py-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={collectionIds.includes(collection.id)}
                      onChange={() => handleCollectionToggle(collection.id)}
                      className="h-4 w-4 rounded border border-white/20 bg-transparent"
                    />
                    <span>{collection.name}</span>
                  </label>
                ))}
                {collections.length === 0 && (
                  <p className="text-sm text-white/50">
                    Create collections to organize products.
                  </p>
                )}
              </div>
            ),
          },
          {
            id: "variants",
            label: "Variants",
            content: (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <Button type="button" variant="outline" onClick={handleAddVariant}>
                    Add Variant
                  </Button>
                  <Button type="button" variant="danger" onClick={handleClearVariants}>
                    Clear Variants
                  </Button>
                </div>
                <div className="space-y-4">
                  {variants.map((variant, index) => (
                    <div
                      key={`${variant.id ?? "new"}-${index}`}
                      className="grid gap-3 rounded-lg border border-white/10 bg-[#0B0B0C]/60 p-4 lg:grid-cols-6"
                    >
                      <div className="lg:col-span-2">
                        <label className="text-xs tracking-[0.2em] text-white/50">
                          SKU
                        </label>
                        <Input
                          value={variant.sku}
                          onChange={(event) => {
                            const next = [...variants];
                            next[index] = {
                              ...next[index],
                              sku: event.target.value,
                            };
                            setVariants(next);
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs tracking-[0.2em] text-white/50">
                          SIZE
                        </label>
                        <Input
                          value={variant.size}
                          onChange={(event) => {
                            const next = [...variants];
                            next[index] = {
                              ...next[index],
                              size: event.target.value,
                            };
                            setVariants(next);
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs tracking-[0.2em] text-white/50">
                          COLOR
                        </label>
                        <Input
                          value={variant.color}
                          onChange={(event) => {
                            const next = [...variants];
                            next[index] = {
                              ...next[index],
                              color: event.target.value,
                            };
                            setVariants(next);
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs tracking-[0.2em] text-white/50">
                          PRICE OVERRIDE
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={variant.priceOverride ?? ""}
                          onChange={(event) => {
                            const next = [...variants];
                            next[index] = {
                              ...next[index],
                              priceOverride: event.target.value
                                ? Number(event.target.value)
                                : null,
                            };
                            setVariants(next);
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs tracking-[0.2em] text-white/50">
                          STOCK
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={variant.stockQty}
                          onChange={(event) => {
                            const next = [...variants];
                            next[index] = {
                              ...next[index],
                              stockQty: Number(event.target.value || 0),
                            };
                            setVariants(next);
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-xs tracking-[0.2em] text-white/50">
                          LOW STOCK
                        </label>
                        <Input
                          type="number"
                          min="0"
                          value={variant.lowStockThreshold}
                          onChange={(event) => {
                            const next = [...variants];
                            next[index] = {
                              ...next[index],
                              lowStockThreshold: Number(event.target.value || 0),
                            };
                            setVariants(next);
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-2 lg:col-span-2">
                        <label className="flex items-center gap-2 text-xs text-white/60">
                          <input
                            type="checkbox"
                            checked={variant.isActive}
                            onChange={(event) => {
                              const next = [...variants];
                              next[index] = {
                                ...next[index],
                                isActive: event.target.checked,
                              };
                              setVariants(next);
                            }}
                            className="h-4 w-4 rounded border border-white/20 bg-transparent"
                          />
                          Active
                        </label>
                        <Button
                          type="button"
                          variant="danger"
                          onClick={() => handleRemoveVariant(index)}
                        >
                          Remove Variant
                        </Button>
                      </div>
                    </div>
                  ))}
                  {variants.length === 0 && (
                    <p className="text-sm text-white/50">
                      Add at least one variant for sizing and inventory.
                    </p>
                  )}
                </div>
              </div>
            ),
          },
          {
            id: "seo",
            label: "SEO",
            content: (
              <div className="grid gap-4">
                <div>
                  <label className="text-xs tracking-[0.2em] text-white/50">
                    META TITLE
                  </label>
                  <Input
                    value={seoTitle}
                    onChange={(event) => setSeoTitle(event.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs tracking-[0.2em] text-white/50">
                    META DESCRIPTION
                  </label>
                  <Textarea
                    rows={4}
                    value={seoDescription}
                    onChange={(event) => setSeoDescription(event.target.value)}
                  />
                </div>
              </div>
            ),
          },
        ]}
      />

      <div className="flex flex-wrap gap-3">
        <Button name="intent" value="save" type="submit">
          Save Changes
        </Button>
        <Button name="intent" value="draft" type="submit" variant="outline">
          Save Draft
        </Button>
        <Button name="intent" value="publish" type="submit" variant="outline">
          Publish
        </Button>
        <Button name="intent" value="archive" type="submit" variant="danger">
          Archive
        </Button>
      </div>
    </form>
  );
}
