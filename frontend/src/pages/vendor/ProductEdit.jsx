// src/pages/vendor/ProductEdit.jsx
import { useEffect, useMemo, useState } from "react";
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

function pickFirst(...values) {
  for (const v of values) {
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return "";
}

function asBool(v, fallback = false) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  const s = String(v ?? "").trim().toLowerCase();
  if (["true", "1", "yes", "y", "on", "in stock", "published"].includes(s)) return true;
  if (["false", "0", "no", "n", "off", "out of stock"].includes(s)) return false;
  return fallback;
}

/**
 * Some APIs return:
 * - product directly
 * - { product: {...} }
 * - { data: {...} }
 * - { results: [...] }
 */
function unwrapProductPayload(raw) {
  if (!raw || typeof raw !== "object") return {};

  if (raw.product && typeof raw.product === "object") return raw.product;
  if (raw.data && typeof raw.data === "object" && !Array.isArray(raw.data)) return raw.data;
  if (raw.result && typeof raw.result === "object") return raw.result;
  if (raw.item && typeof raw.item === "object") return raw.item;

  return raw;
}

/**
 * Offer can be nested or flat depending on serializer.
 */
function extractOffer(data) {
  return (
    data?.offer ||
    data?.current_offer ||
    data?.offer_data ||
    data?.pricing ||
    data?.inventory ||
    {}
  );
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
    (Array.isArray(data?.gallery) && data.gallery) ||
    [];

  const images = raw
    .map((i) => {
      if (!i) return null;

      if (typeof i === "string") {
        return { id: null, image_url: i, is_primary: false };
      }

      return {
        id: i.id ?? null,
        image_url:
          i.image_url ??
          i.url ??
          i.image ??
          i.file ??
          i.src ??
          "",
        is_primary: Boolean(i.is_primary ?? i.primary ?? i.is_main ?? false),
      };
    })
    .filter((i) => i && i.image_url);

  const single =
    data?.image_url ||
    data?.image ||
    data?.product_image_url ||
    data?.product_image ||
    data?.thumbnail ||
    data?.featured_image ||
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

  const detailCandidates = useMemo(
    () => [
      `/api/vendor/products/${id}/`,
      `/api/vendor/products/${id}`,
      `/api/vendor/product/${id}/`,
      `/api/vendor/product/${id}`,
      `/api/products/vendor/${id}/`,
      `/api/products/vendor/${id}`,
      `/api/products/${id}/`,
      `/api/products/${id}`,
    ],
    [id]
  );

  const patchCandidates = useMemo(
    () => [
      `/api/vendor/products/${id}/`,
      `/api/vendor/products/${id}`,
      `/api/vendor/product/${id}/`,
      `/api/vendor/product/${id}`,
      `/api/products/vendor/${id}/`,
      `/api/products/vendor/${id}`,
      `/api/products/${id}/`,
      `/api/products/${id}`,
    ],
    [id]
  );

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        const res = await firstWorkingGET(detailCandidates);
        const raw = res?.data || {};
        const data = unwrapProductPayload(raw);
        const offer = extractOffer(data);

        const categoryId = pickFirst(
          data.category_id,
          data.category,
          data.category?.id,
          data.category_obj?.id
        );

        const categoryLabel = pickFirst(
          data.category_label,
          data.category_name,
          data.category?.name,
          data.category_obj?.name
        );

        const shortHtml = pickFirst(
          data.short_description_html,
          data.short_html,
          data.short_description
        );

        const longHtml = pickFirst(
          data.description_html,
          data.long_description_html,
          data.long_html,
          data.description,
          data.long_description
        );

        const plainDesc = pickFirst(
          data.description,
          data.long_description,
          data.description_text
        );

        const { images, primary, gallery } = normalizeImages(data);

        const priceValue = pickFirst(
          offer.price,
          offer.regular_price,
          offer.amount,
          data.price,
          data.regular_price
        );

        const specialPriceValue = pickFirst(
          offer.special_price,
          offer.sale_price,
          offer.discount_price,
          data.special_price,
          data.sale_price,
          data.discount_price
        );

        const manageInventoryValue = asBool(
          pickFirst(
            offer.manage_inventory,
            data.manage_inventory,
            offer.track_inventory,
            data.track_inventory
          ),
          false
        );

        const inStockValue = asBool(
          pickFirst(
            offer.in_stock,
            data.in_stock,
            data.is_in_stock,
            offer.is_in_stock
          ),
          true
        );

        const mapped = {
          // Catalog
          name: pickFirst(data.name, data.title, data.product_name),
          slug: pickFirst(data.slug, data.handle),
          category_id: categoryId ? String(categoryId) : "",
          category_label: categoryLabel || "",

          short_description_html: shortHtml || "",
          description_html: longHtml || "",
          description: plainDesc || "",

          status: mapStatusToUI(data.status),
          condition: mapConditionToUI(data.condition),
          warranty_status: mapWarrantyToUI(data.warranty_status),
          warranty_period: pickFirst(data.warranty_period, "No warranty"),

          brand: pickFirst(
            data.brand_name,
            data.brand?.name,
            data.brand,
            "Select One"
          ),
          tax_class: pickFirst(
            data.tax_class?.name,
            data.tax_class,
            "Select One"
          ),
          stockist: pickFirst(
            data.stockist,
            data.sku,
            data.seller_sku,
            ""
          ),

          meta_title: pickFirst(data.meta_title, ""),
          meta_keywords: pickFirst(data.meta_keywords, ""),
          meta_description: pickFirst(data.meta_description, ""),

          // Offer / Pricing
          price: priceValue !== "" ? String(priceValue) : "",
          special_price: specialPriceValue !== "" ? String(specialPriceValue) : "",
          manage_inventory: manageInventoryValue ? "Yes" : "No",
          in_stock: inStockValue ? "In Stock" : "Out of Stock",

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
        setErr(
          e?.response?.data?.detail ||
            e?.response?.data?.error ||
            e?.message ||
            "Failed to load product"
        );
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [detailCandidates]);

  if (loading) return <div className="text-gray-600">Loading product...</div>;
  if (err) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-red-700">
        {err}
      </div>
    );
  }
  if (!initial) return null;

  return (
    <ProductForm
      key={`edit-product-${id}`}
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

        if (payload.brand && payload.brand !== "Select One") {
          fd.append("brand", payload.brand);
        }

        if (payload.tax_class && payload.tax_class !== "Select One") {
          fd.append("tax_class", payload.tax_class);
        }

        if (payload.stockist) fd.append("stockist", payload.stockist);

        if (payload.meta_title) fd.append("meta_title", payload.meta_title);
        if (payload.meta_keywords) fd.append("meta_keywords", payload.meta_keywords);
        if (payload.meta_description) {
          fd.append("meta_description", payload.meta_description);
        }

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