import api from "./axios";

/**
 * Base: /api/disputes/
 * URLs:
 *  - GET    /api/disputes/
 *  - POST   /api/disputes/
 *  - GET    /api/disputes/<id>/
 *  - PATCH  /api/disputes/<id>/   (optional if your view supports)
 *  - GET    /api/disputes/<id>/messages/
 *  - POST   /api/disputes/<id>/messages/
 *  - POST   /api/disputes/<id>/resolve/
 */

// list disputes (customer/vendor/admin depending on backend permissions)
export async function listDisputes(params = {}) {
  const { data } = await api.get("/api/disputes/", { params });
  return data;
}

// create dispute
export async function createDispute(payload) {
  const { data } = await api.post("/api/disputes/", payload);
  return data;
}

// dispute detail
export async function getDispute(disputeId) {
  const { data } = await api.get(`/api/disputes/${disputeId}/`);
  return data;
}

// (optional) update dispute if allowed
export async function updateDispute(disputeId, payload) {
  const { data } = await api.patch(`/api/disputes/${disputeId}/`, payload);
  return data;
}

// messages thread
export async function getDisputeMessages(disputeId) {
  const { data } = await api.get(`/api/disputes/${disputeId}/messages/`);
  return data;
}

// send message into thread
export async function sendDisputeMessage(disputeId, payload) {
  const { data } = await api.post(`/api/disputes/${disputeId}/messages/`, payload);
  return data;
}

// resolve dispute (usually admin; depends on your permissions)
export async function resolveDispute(disputeId, payload = {}) {
  const { data } = await api.post(`/api/disputes/${disputeId}/resolve/`, payload);
  return data;
}
