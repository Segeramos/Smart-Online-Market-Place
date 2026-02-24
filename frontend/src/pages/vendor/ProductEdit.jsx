// src/pages/vendor/ProductEdit.jsx
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProductForm from "./components/ProductForm";
import api from "../../api/axios"; // ✅ use configured axios instance

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

// NOTE: API_BASE not strictly needed now because api has baseURL,
// but we keep it to avoid affecting other areas.

function mapStatusToUI(apiVal) {
  const v = String(apiVal || "").toLowerCase();
  if (v === "draft") return "Draft";
  if (v === "archived") return "Archived";
  return "Published";
}

function mapStatusToAPI(uiVal) {
  const v = String(uiVal || "").trim().toLowerCase();
  if (v === "draft") return "draft";
  if (v === "published") return "published";
  if (v === "archived") return "archived";
  return "published";
}

function mapConditionToUI(apiVal) {
  const v = String(apiVal || "").toLowerCase();
  if (v === "refurbished") return "Refurbished";
  if (v === "used") return "Used - Good";
  // Some APIs use "like_new"
  if (v === "like_new" || v === "used_like_new") return "Used - Like New";
  return "New";
}

function mapConditionToAPI(uiVal) {
  const v = String(uiVal || "").trim().toLowerCase();
  if (v.includes("refurb")) return "refurbished";
  if (v.includes("like new")) return "like_new";
  if (v.startsWith("used")) return "used";
  return "new";
}

function mapWarrantyToUI(apiVal) {
  const v = String(apiVal || "").toLowerCase();
  if (v === "manufacturer") return "Manufacturer warranty";
  if (v === "store" || v === "seller") return "Seller warranty";
  return "No warranty";
}

function mapWarrantyToAPI(uiVal) {
  const v = String(uiVal || "").trim().toLowerCase();
  if (v.includes("manufacturer")) return "manufacturer";
  if (v.includes("seller") || v.includes("store")) return "store";
  return "none";
}

function toNumber(val) {
  if (val === "" || val === null || typeof val === "undefined") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function boolStr(v) {
  return v ? "true" : "false";
}

/**
 * Try a list of endpoints and return first that works.
 * Only continues on 404; throws immediately on any other error.
 */
async function firstWorkingGET(paths) {
  let last404 = null;
  for (const p of paths) {
    try {
      return await api.get(p);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404) {
        last404 = e;
        continue;
      }
      throw e;
    }
  }
  throw last404 || new Error("No working GET endpoint found");
}

async function firstWorkingPATCH(paths, body) {
  let last404 = null;
  for (const p of paths) {
    try {
      return await api.patch(p, body);
    } catch (e) {
      const status = e?.response?.status;
      if (status === 404) {
        last404 = e;
        continue;
      }
      throw e;
    }
  }
  throw last404 || new Error("No working PATCH endpoint found");
}

/**
 * Normalize images from multiple possible shapes:
 * - data.images: [{id, image_url, is_primary}]
 * - data.photos: [{id, url, is_primary}] or strings
 * - data.image / data.product_image: string url
 */
function normalizeImages(data) {
  const raw =
    (Array.isArray(data?.images) && data.images) ||
    (Array.isArray(data?.photos) && data.photos) ||
    [];

  const images = raw
    .map((i) => {
      if (!i) return null;
      if (typeof i === "string") {
        return { id: null, image_url: i, is_primary: false };
      }
      return {
        id: i.id ?? null,
        image_url: i.image_url ?? i.url ?? i.image ?? i.file ?? "",
        is_primary: Boolean(i.is_primary ?? i.primary ?? false),
      };
    })
    .filter((i) => i && i.image_url);

  // Sometimes API returns a single image field instead of list
  const single =
    data?.image_url ||
    data?.image ||
    data?.product_image_url ||
    data?.product_image ||
    data?.thumbnail ||
    "";

  if (single && !images.some((x) => x.image_url === single)) {
    images.unshift({ id: null, image_url: single, is_primary: images.length === 0 });
  }

  const primary = images.find((i) => i.is_primary) || images[0] || null;
  const gallery = images.filter((i) => !primary || i.image_url !== primary.image_url);

  return { images, primary, gallery };
}

export default function ProductEdit() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [initial, setInitial] = useState(null);

  // ✅ Candidate vendor detail endpoints
  const detailCandidates = [
    `/api/vendor/products/${id}/`,
    `/api/vendor/products/${id}`,
    `/api/vendor/product/${id}/`,
    `/api/vendor/product/${id}`,
    `/api/products/vendor/${id}/`,
  ];

  const patchCandidates = [
    `/api/vendor/products/${id}/`,
    `/api/vendor/products/${id}`,
    `/api/vendor/product/${id}/`,
    `/api/vendor/product/${id}`,
    `/api/products/vendor/${id}/`,
  ];

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        const res = await firstWorkingGET(detailCandidates);
        const data = res.data || {};

        // Offer may be nested or flat depending on serializer
        const offer = data.offer || data.current_offer || data.offer_data || data || {};

        // Category may be id or object
        const categoryId =
          data.category_id ??
          data.category ??
          data.category?.id ??
          data.category_obj?.id ??
          "";

        const categoryLabel =
          data.category_label ??
          data.category_name ??
          data.category?.name ??
          "";

        // Descriptions might be under different keys
        const shortHtml =
          data.short_description_html ??
          data.short_html ??
          data.short_description ??
          "";

        const longHtml =
          data.description_html ??
          data.long_description_html ??
          data.long_html ??
          data.description ??
          "";

        // Plain text description
        const plainDesc =
          data.description ??
          data.long_description ??
          "";

        const { images, primary, gallery } = normalizeImages(data);

        const mapped = {
          // Catalog
          name: data.name || data.title || data.product_name || "",
          slug: data.slug || data.handle || "",
          category_id: categoryId ? String(categoryId) : "",
          category_label: categoryLabel || "",

          short_description_html: shortHtml || "",
          description_html: longHtml || "",
          description: plainDesc || "",

          status: mapStatusToUI(data.status),
          condition: mapConditionToUI(data.condition),
          warranty_status: mapWarrantyToUI(data.warranty_status),
          warranty_period: data.warranty_period || "No warranty",

          brand: data.brand || data.brand_name || "Select One",
          tax_class: data.tax_class || "Select One",
          stockist: data.stockist || "",

          meta_title: data.meta_title || "",
          meta_keywords: data.meta_keywords || "",
          meta_description: data.meta_description || "",

          // Offer
          price:
            offer.price != null
              ? String(offer.price)
              : data.price != null
              ? String(data.price)
              : "",
          special_price:
            offer.special_price != null
              ? String(offer.special_price)
              : data.special_price != null
              ? String(data.special_price)
              : "",
          manage_inventory: offer.manage_inventory ? "Yes" : "No",
          in_stock: offer.in_stock ? "In Stock" : "Out of Stock",

          // Existing images for display
          existing_product_image_url: primary?.image_url || "",
          existing_gallery_urls: gallery.map((i) => i.image_url),

          existing_image_ids: images.map((i) => i.id).filter(Boolean),
          existing_primary_image_id: primary?.id || null,

          // Local uploads reset
          product_image: null,
          gallery_images: [],
        };

        if (!mounted) return;
        setInitial(mapped);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.response?.data?.detail || e?.response?.data?.error || e?.message || "Failed to load product");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) return <div className="text-gray-600">Loading product...</div>;
  if (err) return <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">{err}</div>;
  if (!initial) return null;

  return (
    <ProductForm
      mode="edit"
      initial={initial}
      onCancel={() => navigate("/vendor/products")}
      onSubmit={async (payload) => {
        const fd = new FormData();

        if (payload.name) {
          fd.append("name", payload.name);
          fd.append("title", payload.name); // compat
        }
        if (payload.slug) fd.append("slug", payload.slug);

        if (payload.category_id) {
          fd.append("category_id", String(payload.category_id));
          fd.append("category", String(payload.category_id)); // compat
        }

        fd.append("short_description_html", payload.short_description_html || "");

        fd.append("description_html", payload.description_html || "");
        fd.append("long_description_html", payload.description_html || ""); // compat

        fd.append("description", payload.description || "");
        fd.append("long_description", payload.description || ""); // compat

        fd.append("status", mapStatusToAPI(payload.status));
        fd.append("condition", mapConditionToAPI(payload.condition));
        fd.append("warranty_status", mapWarrantyToAPI(payload.warranty_status));
        fd.append("warranty_period", payload.warranty_period || "");

        if (payload.brand && payload.brand !== "Select One") fd.append("brand", payload.brand);
        if (payload.tax_class && payload.tax_class !== "Select One") fd.append("tax_class", payload.tax_class);
        if (payload.stockist) fd.append("stockist", payload.stockist);

        if (payload.meta_title) fd.append("meta_title", payload.meta_title);
        if (payload.meta_keywords) fd.append("meta_keywords", payload.meta_keywords);
        if (payload.meta_description) fd.append("meta_description", payload.meta_description);

        const priceN = toNumber(payload.price);
        if (priceN !== null) {
          fd.append("price", String(priceN));
          fd.append("offer_price", String(priceN));
        }

        const spN = toNumber(payload.special_price);
        if (spN !== null && spN > 0) {
          fd.append("special_price", String(spN));
          fd.append("offer_special_price", String(spN));
        }

        const manageInv = payload.manage_inventory === "Yes";
        const inStock = payload.in_stock === "In Stock";

        fd.append("manage_inventory", boolStr(manageInv));
        fd.append("in_stock", boolStr(inStock));
        fd.append("offer_manage_inventory", boolStr(manageInv));
        fd.append("offer_in_stock", boolStr(inStock));

        fd.append("stock", "0");
        fd.append("offer_is_active", "true");

        let uploadedCount = 0;

        if (payload.product_image instanceof File) {
          fd.append("images", payload.product_image);
          fd.append("photos", payload.product_image); // compat
          uploadedCount += 1;
        }

        if (Array.isArray(payload.gallery_images)) {
          payload.gallery_images.forEach((file) => {
            if (file instanceof File) {
              fd.append("images", file);
              fd.append("photos", file); // compat
              uploadedCount += 1;
            }
          });
        }

        if (uploadedCount > 0) fd.append("primary_image", "new:0");

        await firstWorkingPATCH(patchCandidates, fd);

        navigate("/vendor/products");
      }}
    />
  );
}