// src/api/vendor.js
import api from "./axios";

/**
 * Some projects use:
 *   POST /api/vendor/products/         (expects catalog_product)
 * Others use:
 *   POST /api/products/vendor/         (creates full product)
 *
 * We'll support both intelligently.
 */
const CREATE_PRODUCT_PRIMARY = "/api/vendor/products/";
const CREATE_PRODUCT_FALLBACK = "/api/products/vendor/";

// =========================
// DASHBOARD / ANALYTICS
// =========================
export async function vendorDashboard(range = "30d") {
  const { data } = await api.get("/api/vendor/analytics/overview/", {
    params: { range },
  });
  return data;
}

export async function vendorTopProducts(range = "30d") {
  const { data } = await api.get("/api/vendor/analytics/top-products/", {
    params: { range },
  });
  return data;
}

export async function vendorDailySales(range = "30d") {
  const { data } = await api.get("/api/vendor/analytics/daily-sales/", {
    params: { range },
  });
  return data;
}

// =========================
// EARNINGS / PAYOUTS
// =========================
export async function vendorEarningsSummary() {
  const { data } = await api.get("/api/vendor/earnings/summary/");
  return data;
}

export async function vendorPayouts(params = {}) {
  const { data } = await api.get("/api/vendor/payouts/", { params });
  return data;
}

// =========================
// PRODUCTS
// =========================
export async function vendorProducts(params = {}) {
  const { data } = await api.get("/api/vendor/products/", { params });
  return data;
}

export async function vendorProductDetail(id) {
  const { data } = await api.get(`/api/vendor/products/${id}/`);
  return data;
}

/**
 * Create product:
 * - Try /api/vendor/products/ first
 * - If backend complains "catalog_product is required", fallback to /api/products/vendor/
 * - Also fallback on 404/405 for route mismatch
 */
export async function vendorCreateProduct(payload) {
  try {
    const { data } = await api.post(CREATE_PRODUCT_PRIMARY, payload);
    return data;
  } catch (err) {
    const status = err?.response?.status;
    const body = err?.response?.data;

    // ✅ Fallback cases:
    // - route not found / wrong method
    if (status === 404 || status === 405) {
      const { data } = await api.post(CREATE_PRODUCT_FALLBACK, payload);
      return data;
    }

    // ✅ Your exact case:
    // {"catalog_product":["This field is required."]}
    const catalogProductError =
      status === 400 &&
      body &&
      (body.catalog_product ||
        body.catalogProduct ||
        body.catalog_product_id ||
        body.catalog_product?.length);

    if (catalogProductError) {
      const { data } = await api.post(CREATE_PRODUCT_FALLBACK, payload);
      return data;
    }

    throw err;
  }
}

export async function vendorUpdateProduct(id, payload) {
  const { data } = await api.patch(`/api/vendor/products/${id}/`, payload);
  return data;
}

// Soft delete (hide)
export async function vendorDeleteProduct(id) {
  const { data } = await api.delete(`/api/vendor/products/${id}/`);
  return data;
}

// Unhide (if backend action exists)
export async function vendorUnhideProduct(id) {
  const { data } = await api.patch(`/api/vendor/products/${id}/unhide/`);
  return data;
}

// =========================
// ORDERS
// =========================
export async function vendorOrders(params = {}) {
  const { data } = await api.get("/api/vendor/orders/", { params });
  return data;
}

export async function vendorOrderDetail(orderId) {
  const { data } = await api.get(`/api/vendor/orders/${orderId}/`);
  return data;
}

// =========================
// DISPUTES
// =========================
export async function vendorDisputes(params = {}) {
  const { data } = await api.get("/api/vendor/disputes/", { params });
  return data;
}