// src/pages/vendor/ProductCreate.jsx
import { useNavigate } from "react-router-dom";
import ProductForm from "./components/ProductForm";
import api from "../../api/axios";

function mapStatus(ui) {
  const v = String(ui || "").trim().toLowerCase();
  if (v === "draft") return "draft";
  if (v === "published") return "published";
  if (v === "archived") return "archived";
  return "published";
}

function mapCondition(ui) {
  const v = String(ui || "").trim().toLowerCase();
  if (v === "new") return "new";
  if (v.includes("refurb")) return "refurbished";
  if (v.startsWith("used")) return "used";
  return "new";
}

function mapWarrantyStatus(ui) {
  const v = String(ui || "").trim().toLowerCase();
  if (v.includes("manufacturer")) return "manufacturer";
  if (v.includes("seller") || v.includes("store")) return "store";
  if (v.includes("no warranty") || v === "none" || v === "select") return "none";
  return "none";
}

function toNumber(val) {
  if (val === "" || val === null || typeof val === "undefined") return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

export default function ProductCreate() {
  const navigate = useNavigate();

  return (
    <ProductForm
      mode="create"
      initial={{
        status: "Published",
        manage_inventory: "No",
        in_stock: "In Stock",
      }}
      onCancel={() => navigate("/vendor/products")}
      onSubmit={async (payload) => {
        try {
          const fd = new FormData();

          // Required
          fd.append("name", payload?.name || "");

          // ✅ IMPORTANT: don't send slug (backend will generate a unique one)
          // if (payload?.slug) fd.append("slug", payload.slug);

          // category: support both keys, but DON'T send empty string
          const cat = payload?.category_id ?? payload?.category ?? null;
          if (cat) {
            fd.append("category_id", String(cat));
            fd.append("category", String(cat));
          }

          // Rich text
          fd.append("short_description_html", payload?.short_description_html || "");
          fd.append("description_html", payload?.description_html || "");
          fd.append("description", payload?.description || "");

          // Catalog
          fd.append("status", mapStatus(payload?.status));
          fd.append("condition", mapCondition(payload?.condition));
          fd.append("warranty_status", mapWarrantyStatus(payload?.warranty_status));
          if (payload?.warranty_period) fd.append("warranty_period", payload.warranty_period);

          // Optional strings
          if (payload?.brand && payload.brand !== "Select One") fd.append("brand", payload.brand);
          if (payload?.tax_class && payload.tax_class !== "Select One") fd.append("tax_class", payload.tax_class);
          if (payload?.stockist) fd.append("stockist", payload.stockist);

          // SEO
          if (payload?.meta_title) fd.append("meta_title", payload.meta_title);
          if (payload?.meta_keywords) fd.append("meta_keywords", payload.meta_keywords);
          if (payload?.meta_description) fd.append("meta_description", payload.meta_description);

          // Offer (price)
          const priceN = toNumber(payload?.price);
          if (priceN === null) throw new Error("Price is required");
          fd.append("price", String(priceN));

          const spN = toNumber(payload?.special_price);
          if (spN !== null && spN > 0) fd.append("special_price", String(spN));

          // Booleans
          fd.append("manage_inventory", String(payload?.manage_inventory === "Yes"));
          fd.append("in_stock", String(payload?.in_stock === "In Stock"));

          // Stock
          fd.append("stock", "0");

          // Offer active
          fd.append("offer_is_active", "true");

          // Images
          let uploadedCount = 0;

          if (payload?.product_image instanceof File) {
            fd.append("images", payload.product_image);
            fd.append("images[]", payload.product_image);
            uploadedCount += 1;
          }

          if (Array.isArray(payload?.gallery_images)) {
            payload.gallery_images.forEach((file) => {
              if (file instanceof File) {
                fd.append("images", file);
                fd.append("images[]", file);
                uploadedCount += 1;
              }
            });
          }

          if (uploadedCount > 0) fd.append("primary_image", "new:0");

          await api.post("/api/products/vendor/", fd);

          navigate("/vendor/products");
        } catch (err) {
          console.error("Create product failed:", err?.response?.data || err);
          const data = err?.response?.data;
          if (data) throw new Error(typeof data === "string" ? data : JSON.stringify(data));
          throw err;
        }
      }}
    />
  );
}