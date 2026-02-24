import api from "./axios";

/** Dashboard KPIs */
export async function adminKpis() {
  const { data } = await api.get("/api/adminpanel/");
  return data;
}

/** Vendors */
export async function adminVendors(params = {}) {
  const { data } = await api.get("/api/adminpanel/vendors/", { params });
  return data;
}

/**
 * Vendor status update
 * Backend: /api/adminpanel/vendors/<vendor_id>/status/
 * payload example: { status: "approved" } or { is_active: false }
 */
export async function adminUpdateVendorStatus(vendorId, payload) {
  const { data } = await api.patch(`/api/adminpanel/vendors/${vendorId}/status/`, payload);
  return data;
}

/**
 * Vendor commission override
 * Backend: /api/adminpanel/vendors/<vendor_id>/commission/
 * payload example: { commission_rate: 5 } or { rate: 5 }
 */
export async function adminUpdateVendorCommission(vendorId, payload) {
  const { data } = await api.patch(`/api/adminpanel/vendors/${vendorId}/commission/`, payload);
  return data;
}

/** Global commission */
export async function adminCommissionGet() {
  const { data } = await api.get("/api/adminpanel/commission/");
  return data;
}

export async function adminCommissionUpdate(payload) {
  const { data } = await api.post("/api/adminpanel/commission/", payload);
  return data;
}

/** Commission logs */
export async function adminCommissionLogs(params = {}) {
  const { data } = await api.get("/api/adminpanel/commission/logs/", { params });
  return data;
}

/** Reports overview */
export async function adminReportsOverview(params = {}) {
  const { data } = await api.get("/api/adminpanel/reports/overview/", { params });
  return data;
}
