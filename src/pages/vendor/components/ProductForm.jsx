// src/pages/vendor/components/ProductForm.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../../api/axios";
import { Editor } from "@tinymce/tinymce-react";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

function slugify(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function pickFirst(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
}

function normalizeInitial(initial = {}) {
  return {
    name: pickFirst(initial.name, initial.title, initial.product_name),
    slug: pickFirst(initial.slug, initial.handle),
    category_id:
      initial.category_id !== undefined && initial.category_id !== null
        ? String(initial.category_id)
        : "",
    category_label: pickFirst(initial.category_label, initial.category_name),
    short_description_html: pickFirst(
      initial.short_description_html,
      initial.short_html,
      initial.short_description
    ),
    description_html: pickFirst(
      initial.description_html,
      initial.long_description_html,
      initial.long_html,
      initial.description_html
    ),
    description: pickFirst(initial.description, initial.long_description),
    product_image: null,
    existing_product_image_url: pickFirst(
      initial.existing_product_image_url,
      initial.product_image_url,
      initial.image_url,
      initial.image
    ),
    gallery_images: [],
    existing_gallery_urls: Array.isArray(initial.existing_gallery_urls)
      ? initial.existing_gallery_urls
      : Array.isArray(initial.gallery)
      ? initial.gallery
      : [],
    existing_image_ids: Array.isArray(initial.existing_image_ids) ? initial.existing_image_ids : [],
    existing_primary_image_id: initial.existing_primary_image_id ?? null,
    price:
      initial.price !== undefined && initial.price !== null && initial.price !== ""
        ? String(initial.price)
        : "",
    special_price:
      initial.special_price !== undefined && initial.special_price !== null && initial.special_price !== ""
        ? String(initial.special_price)
        : "",
    status: pickFirst(initial.status, "Published"),
    condition: pickFirst(initial.condition, "New"),
    warranty_status: pickFirst(initial.warranty_status, "Select"),
    warranty_period: pickFirst(initial.warranty_period, "No warranty"),
    manage_inventory: pickFirst(initial.manage_inventory, "No"),
    in_stock: pickFirst(initial.in_stock, "In Stock"),
    brand: pickFirst(initial.brand, initial.brand_name, "Select One"),
    tax_class: pickFirst(initial.tax_class, "Select One"),
    stockist: pickFirst(initial.stockist, initial.sku, initial.seller_sku),
    collections: pickFirst(initial.collections),
    meta_title: pickFirst(initial.meta_title),
    meta_keywords: pickFirst(initial.meta_keywords),
    meta_description: pickFirst(initial.meta_description),
  };
}

function Icon({ name, className = "h-4 w-4" }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  switch (name) {
    case "search":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M18 6L6 18" />
          <path d="M6 6l12 12" />
        </svg>
      );
    case "img":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="M8 13l2-2 4 4 3-3 2 2" />
          <path d="M8.5 10.5h.01" />
        </svg>
      );
    default:
      return null;
  }
}

function Section({ title, children }) {
  return (
    <div className="rounded-md border bg-white">
      <div className="border-b px-3 py-2 text-sm font-bold text-gray-900">{title}</div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1 text-xs font-semibold text-gray-700">{label}</div>
      {children}
    </div>
  );
}

function TinyEditor({ value, onChange, height = 240 }) {
  return (
    <div className="rounded-md border">
      <Editor
        apiKey={import.meta.env.VITE_TINYMCE_API_KEY}
        value={value || ""}
        onEditorChange={(content) => onChange(content)}
        init={{
          height,
          menubar: "file edit view insert format tools table",
          plugins:
            "advlist autolink lists link image charmap preview anchor searchreplace visualblocks code fullscreen insertdatetime media table help wordcount",
          toolbar:
            "undo redo | blocks | bold italic underline forecolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table | removeformat | code fullscreen",
          branding: false,
          statusbar: true,
          content_style:
            "body { font-family: Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; font-size: 14px; }",
        }}
      />
    </div>
  );
}

/**
 * ProductForm: shared UI for Create + Edit
 *
 * Props:
 * - mode: "create" | "edit"
 * - initial: initial form data (object)
 * - onSubmit: async (payload) => void
 * - onCancel: () => void
 */
export default function ProductForm({ mode = "create", initial, onSubmit, onCancel }) {
  const brands = ["Select One", "Samsung", "Apple", "HP", "Lenovo", "Sony", "Dell", "Tecno", "Infinix"];
  const taxClasses = ["Select One", "Standard VAT", "Zero rated", "Exempt"];
  const warrantyStatuses = ["Select", "No warranty", "Seller warranty", "Manufacturer warranty"];
  const warrantyPeriods = ["No warranty", "7 days", "14 days", "30 days", "3 months", "6 months", "12 months"];
  const conditions = ["New", "Used - Like New", "Used - Good", "Refurbished"];
  const statuses = ["Draft", "Published", "Archived"];
  const inStockOptions = ["In Stock", "Out of Stock"];

  const productImageRef = useRef(null);
  const galleryRef = useRef(null);

  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState(() =>
    normalizeInitial({
      name: "",
      slug: "",
      category_id: "",
      category_label: "",
      short_description_html: "",
      description_html: "",
      description: "",
      product_image: null,
      existing_product_image_url: "",
      gallery_images: [],
      existing_gallery_urls: [],
      price: "",
      special_price: "",
      status: "Published",
      condition: "New",
      warranty_status: "Select",
      warranty_period: "No warranty",
      manage_inventory: "No",
      in_stock: "In Stock",
      brand: "Select One",
      tax_class: "Select One",
      stockist: "",
      collections: "",
      meta_title: "",
      meta_keywords: "",
      meta_description: "",
      ...initial,
    })
  );

  useEffect(() => {
    if (!initial) return;
    setForm((prev) => ({
      ...prev,
      ...normalizeInitial(initial),
      product_image: prev.product_image,
      gallery_images: prev.gallery_images,
    }));
  }, [initial]);

  const [catOpen, setCatOpen] = useState(false);
  const [catQuery, setCatQuery] = useState("");

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // ===============================
  // ✅ Categories from backend
  // GET /api/products/categories/
  // ===============================
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesErr, setCategoriesErr] = useState("");
  const [categoriesFlat, setCategoriesFlat] = useState([]);

  useEffect(() => {
    let mounted = true;

    async function loadCategories() {
      setCategoriesLoading(true);
      setCategoriesErr("");
      try {
        const res = await api.get("/api/products/categories/");
        if (!mounted) return;

        const raw = res?.data;
        const list = Array.isArray(raw)
          ? raw
          : Array.isArray(raw?.results)
          ? raw.results
          : Array.isArray(raw?.data)
          ? raw.data
          : [];

        setCategoriesFlat(list);
      } catch (e) {
        if (!mounted) return;
        setCategoriesErr(e?.response?.data?.detail || e?.message || "Failed to load categories");
        setCategoriesFlat([]);
      } finally {
        if (mounted) setCategoriesLoading(false);
      }
    }

    loadCategories();
    return () => {
      mounted = false;
    };
  }, []);

  const categoryById = useMemo(() => {
    const m = new Map();
    (categoriesFlat || []).forEach((c) => m.set(Number(c.id), c));
    return m;
  }, [categoriesFlat]);

  function buildCategoryLabel(id) {
    const c = categoryById.get(Number(id));
    if (!c) return "";
    const parentId = c.parent?.id ?? c.parent ?? null;
    if (!parentId) return c.name || "";
    const p = categoryById.get(Number(parentId));
    return p ? `${p.name} → ${c.name}` : c.name || "";
  }

  const categoryTree = useMemo(() => {
    const items = (categoriesFlat || []).map((c) => ({
      ...c,
      id: Number(c.id),
      parent: c.parent?.id ?? c.parent ?? null,
      children: [],
    }));

    const byId = new Map(items.map((c) => [c.id, c]));

    for (const c of items) {
      if (c.parent && byId.has(Number(c.parent))) {
        byId.get(Number(c.parent)).children.push(c);
      }
    }

    const roots = [];
    for (const node of byId.values()) {
      if (!node.parent) roots.push(node);
    }

    roots.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    roots.forEach((p) => p.children.sort((a, b) => (a.name || "").localeCompare(b.name || "")));

    return roots;
  }, [categoriesFlat]);

  useEffect(() => {
    if (!form.category_id) return;
    if (form.category_label) return;
    const label = buildCategoryLabel(form.category_id);
    if (label) {
      setForm((prev) => ({ ...prev, category_label: label }));
    }
  }, [categoriesFlat, form.category_id, form.category_label]);

  const [productImagePreview, setProductImagePreview] = useState("");
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  useEffect(() => {
    if (!(form.product_image instanceof File)) {
      setProductImagePreview("");
      return;
    }
    const url = URL.createObjectURL(form.product_image);
    setProductImagePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.product_image]);

  useEffect(() => {
    const files = Array.isArray(form.gallery_images) ? form.gallery_images.filter((f) => f instanceof File) : [];
    if (!files.length) {
      setGalleryPreviews([]);
      return;
    }

    const previews = files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    setGalleryPreviews(previews);

    return () => {
      previews.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [form.gallery_images]);

  const filteredCategories = useMemo(() => {
    const q = catQuery.trim().toLowerCase();
    if (!q) return categoryTree;

    return categoryTree
      .map((p) => {
        const parentMatch = (p.name || "").toLowerCase().includes(q);
        const children = (p.children || []).filter((c) => (c.name || "").toLowerCase().includes(q));
        if (parentMatch) return p;
        if (children.length) return { ...p, children };
        return null;
      })
      .filter(Boolean);
  }, [catQuery, categoryTree]);

  function selectCategory(id, label) {
    setField("category_id", String(id));
    setField("category_label", label);
    setCatOpen(false);
  }

  function onPickProductImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type?.startsWith("image/")) return;
    setField("product_image", file);
    e.target.value = "";
  }

  function onPickGallery(e) {
    const files = Array.from(e.target.files || []).filter((f) => f.type?.startsWith("image/"));
    if (!files.length) return;

    setForm((prev) => {
      const merged = [...(prev.gallery_images || []), ...files].slice(0, 12);
      return { ...prev, gallery_images: merged };
    });
    e.target.value = "";
  }

  function removeGallery(idx) {
    setForm((prev) => ({
      ...prev,
      gallery_images: prev.gallery_images.filter((_, i) => i !== idx),
    }));
  }

  function toNumber(val) {
    if (val === "" || val === null || typeof val === "undefined") return null;
    const n = Number(val);
    return Number.isFinite(n) ? n : null;
  }

  function validate() {
    if (!String(form.name || "").trim()) return "Name is required.";
    if (!form.category_id) return "Please select a category.";

    const priceN = toNumber(form.price);
    if (priceN === null || priceN < 0) return "Price must be 0 or more.";

    const spN = toNumber(form.special_price);
    if (spN !== null && spN < 0) return "Special price must be 0 or more.";

    return "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");

    const msg = validate();
    if (msg) return setErr(msg);

    setSaving(true);
    try {
      const payload = {
        ...form,
        description:
          form.description ||
          String(form.description_html || "")
            .replace(/<[^>]*>/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
      };

      await onSubmit(payload);
    } catch (e2) {
      setErr(
        e2?.response?.data?.detail ||
          e2?.response?.data?.error ||
          e2?.message ||
          "Failed to save product."
      );
    } finally {
      setSaving(false);
    }
  }

  const seoTitle = form.meta_title?.trim() || form.name?.trim() || "Product title";
  const seoDesc =
    form.meta_description?.trim() ||
    "Add a meta description so NairobiMart customers see a better snippet in search results.";

  return (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-bold text-gray-900">{mode === "edit" ? "Edit Product" : "Add Product"}</div>
          <div className="text-sm text-gray-600">
            NairobiMart vendor product {mode === "edit" ? "editing" : "creation"} (same UI)
          </div>
        </div>

        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border bg-white px-3 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          ← Back
        </button>
      </div>

      {err ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{err}</div>
      ) : null}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
        {/* LEFT */}
        <div className="space-y-4">
          <Section title="General Information">
            <Field label="Name *">
              <input
                value={form.name}
                onChange={(e) => {
                  const v = e.target.value;
                  setField("name", v);
                  if (!form.slug.trim() || form.slug === slugify(form.name)) {
                    setField("slug", slugify(v));
                  }
                  if (!form.meta_title.trim()) setField("meta_title", v);
                }}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
                placeholder="e.g. Samsung Galaxy A54 5G"
              />
            </Field>

            <Field label="Slug">
              <input
                value={form.slug}
                onChange={(e) => setField("slug", slugify(e.target.value))}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
              />
            </Field>

            <Field label="Select Category *">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCatOpen(true)}
                  className="flex-1 rounded-md bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-700"
                >
                  {categoriesLoading
                    ? "Loading categories..."
                    : form.category_label
                    ? form.category_label
                    : "Select category"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setField("category_id", "");
                    setField("category_label", "");
                  }}
                  className="rounded-md border px-3 py-2 text-sm font-semibold hover:bg-gray-50"
                >
                  Clear
                </button>
              </div>

              {categoriesErr ? <div className="mt-2 text-xs font-semibold text-red-700">{categoriesErr}</div> : null}
            </Field>

            <Field label="Short Description *">
              <TinyEditor
                value={form.short_description_html}
                onChange={(html) => setField("short_description_html", html)}
                height={220}
              />
            </Field>

            <Field label="Description *">
              <TinyEditor
                value={form.description_html}
                onChange={(html) => {
                  setField("description_html", html);
                  if (!form.description?.trim()) {
                    const plain = String(html || "")
                      .replace(/<[^>]*>/g, " ")
                      .replace(/\s+/g, " ")
                      .trim();
                    setField("description", plain);
                  }
                }}
                height={280}
              />
            </Field>
          </Section>

          <Section title="Images">
            <div className="space-y-3">
              {/* Primary image */}
              <div className="rounded-md border">
                <div className="flex items-center justify-between bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900">
                  <div>Product Image</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => productImageRef.current?.click()}
                      className="rounded-md bg-white px-2 py-1 text-xs font-bold text-gray-900 ring-1 ring-sky-200 hover:bg-gray-50"
                    >
                      Upload
                    </button>
                    <input
                      ref={productImageRef}
                      type="file"
                      accept="image/*"
                      onChange={onPickProductImage}
                      className="hidden"
                    />
                    {form.product_image ? (
                      <button
                        type="button"
                        onClick={() => setField("product_image", null)}
                        className="rounded-md bg-white px-2 py-1 text-xs font-bold text-red-700 ring-1 ring-red-200 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="p-3">
                  {form.product_image ? (
                    <div className="flex items-start gap-3">
                      <div className="h-20 w-20 overflow-hidden rounded-lg border bg-white">
                        <img src={productImagePreview} alt="product" className="h-full w-full object-cover" />
                      </div>
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900">{form.product_image.name}</div>
                        <div className="text-xs text-gray-600">Primary image for NairobiMart listing.</div>
                      </div>
                    </div>
                  ) : form.existing_product_image_url ? (
                    <div className="flex items-start gap-3">
                      <div className="h-20 w-20 overflow-hidden rounded-lg border bg-white">
                        <img
                          src={form.existing_product_image_url}
                          alt="existing"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="text-sm">
                        <div className="font-semibold text-gray-900">Current product image</div>
                        <div className="text-xs text-gray-600">Upload a new image to replace it.</div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Icon name="img" />
                      No product image selected.
                    </div>
                  )}
                </div>
              </div>

              {/* Gallery */}
              <div className="rounded-md border">
                <div className="flex items-center justify-between bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900">
                  <div>Gallery Images</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => galleryRef.current?.click()}
                      className="rounded-md bg-white px-2 py-1 text-xs font-bold text-gray-900 ring-1 ring-sky-200 hover:bg-gray-50"
                    >
                      Upload
                    </button>
                    <input
                      ref={galleryRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={onPickGallery}
                      className="hidden"
                    />
                  </div>
                </div>

                <div className="space-y-3 p-3">
                  {Array.isArray(form.existing_gallery_urls) && form.existing_gallery_urls.length ? (
                    <div>
                      <div className="mb-2 text-xs font-semibold text-gray-700">Current gallery</div>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {form.existing_gallery_urls.map((url, idx) => (
                          <div key={`${url}-${idx}`} className="overflow-hidden rounded-lg border bg-white">
                            <img src={url} alt={`existing-${idx}`} className="h-24 w-full object-cover" />
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs text-gray-600">
                        Upload new images to add more. (We’ll add delete-by-id when backend is ready.)
                      </div>
                    </div>
                  ) : null}

                  {form.gallery_images.length ? (
                    <div>
                      <div className="mb-2 text-xs font-semibold text-gray-700">New uploads</div>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                        {galleryPreviews.map((g, idx) => (
                          <div key={g.url} className="relative overflow-hidden rounded-lg border bg-white">
                            <img src={g.url} alt={g.name} className="h-24 w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => removeGallery(idx)}
                              className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black"
                              title="Remove"
                            >
                              <Icon name="x" className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {!form.gallery_images.length && !(form.existing_gallery_urls?.length > 0) ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Icon name="img" />
                      No gallery images selected.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </Section>

          <Section title="Pricing">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Price (KES) *">
                <input
                  value={form.price}
                  onChange={(e) => setField("price", e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
                />
              </Field>

              <Field label="Special Price (KES)">
                <input
                  value={form.special_price}
                  onChange={(e) => setField("special_price", e.target.value)}
                  type="number"
                  min="0"
                  step="0.01"
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
                />
              </Field>
            </div>
          </Section>

          <Section title="Search engine listing preview">
            <div className="space-y-3">
              <Field label="Meta Title">
                <input
                  value={form.meta_title}
                  onChange={(e) => setField("meta_title", e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
                />
              </Field>

              <Field label="Meta Keywords">
                <input
                  value={form.meta_keywords}
                  onChange={(e) => setField("meta_keywords", e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
                />
              </Field>

              <Field label="Meta Description">
                <textarea
                  value={form.meta_description}
                  onChange={(e) => setField("meta_description", e.target.value)}
                  rows={4}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
                />
              </Field>

              <div className="rounded-md border bg-white p-3">
                <div className="text-xs text-gray-500">Preview</div>
                <div className="mt-1 text-sm font-semibold text-blue-700">{seoTitle}</div>
                <div className="text-xs text-emerald-700">nairobimart.co.ke/products/{form.slug || "your-product"}</div>
                <div className="mt-1 text-sm text-gray-700">{seoDesc}</div>
              </div>
            </div>
          </Section>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          <Section title="Inventory">
            <div className="space-y-3">
              <Field label="Status *">
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
                >
                  {statuses.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Condition *">
                <select
                  value={form.condition}
                  onChange={(e) => setField("condition", e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
                >
                  {conditions.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Warranty status *">
                <select
                  value={form.warranty_status}
                  onChange={(e) => setField("warranty_status", e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
                >
                  {warrantyStatuses.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Warranty Period *">
                <select
                  value={form.warranty_period}
                  onChange={(e) => setField("warranty_period", e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
                >
                  {warrantyPeriods.map((w) => (
                    <option key={w} value={w}>
                      {w}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Manage Inventory *">
                <select
                  value={form.manage_inventory}
                  onChange={(e) => setField("manage_inventory", e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
                >
                  <option value="No">No</option>
                  <option value="Yes">Yes</option>
                </select>
              </Field>

              <Field label="In Stock">
                <select
                  value={form.in_stock}
                  onChange={(e) => setField("in_stock", e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
                >
                  {inStockOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          <Section title="Product organization">
            <div className="space-y-3">
              <Field label="Brand *">
                <select
                  value={form.brand}
                  onChange={(e) => setField("brand", e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
                >
                  {brands.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Tax Class">
                <select
                  value={form.tax_class}
                  onChange={(e) => setField("tax_class", e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
                >
                  {taxClasses.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Stockist">
                <input
                  value={form.stockist}
                  onChange={(e) => setField("stockist", e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
                />
              </Field>
            </div>
          </Section>

          <Section title="Collections">
            <Field label="Collections">
              <input
                value={form.collections}
                onChange={(e) => setField("collections", e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm outline-none focus:ring"
              />
            </Field>
          </Section>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Saving..." : mode === "edit" ? "Update Product" : "Save Product"}
            </button>
          </div>
        </div>
      </form>

      {/* Category Picker Modal */}
      {catOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-4 py-3">
              <div className="font-bold text-gray-900">Select category</div>
              <button type="button" onClick={() => setCatOpen(false)} className="rounded-lg p-2 hover:bg-gray-100">
                <Icon name="x" className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4">
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
                  <Icon name="search" />
                </div>
                <input
                  value={catQuery}
                  onChange={(e) => setCatQuery(e.target.value)}
                  className="w-full rounded-xl border px-9 py-2 text-sm outline-none focus:ring"
                  placeholder="Search categories..."
                />
              </div>

              <div className="mt-4 max-h-[420px] overflow-auto rounded-xl border">
                {filteredCategories.map((parent) => (
                  <div key={parent.id} className="border-b last:border-b-0">
                    <div className="bg-gray-50 px-3 py-2 text-sm font-bold text-gray-900">{parent.name}</div>
                    <div className="divide-y">
                      {(parent.children || []).map((child) => (
                        <button
                          key={child.id}
                          type="button"
                          onClick={() => selectCategory(child.id, `${parent.name} → ${child.name}`)}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-emerald-50"
                        >
                          {child.name}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => selectCategory(parent.id, parent.name)}
                        className="w-full px-3 py-2 text-left text-sm font-semibold hover:bg-gray-50"
                      >
                        Select "{parent.name}"
                      </button>
                    </div>
                  </div>
                ))}

                {!categoriesLoading && !filteredCategories.length ? (
                  <div className="p-4 text-sm text-gray-600">No categories found.</div>
                ) : null}
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCatOpen(false)}
                  className="rounded-xl border px-4 py-2 text-sm font-semibold hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}