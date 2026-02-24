import api from "./axios";

// Customer orders (adjust endpoint names if yours differ)
export async function getMyOrders(params = {}) {
  const { data } = await api.get("/api/orders/my-orders/", { params });
  return data;
}

export async function getOrderById(orderId) {
  const { data } = await api.get(`/api/orders/${orderId}/`);
  return data;
}

export async function createOrder(payload) {
  const { data } = await api.post("/api/orders/create/", payload);
  return data;
}
