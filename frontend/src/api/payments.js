import api from "./axios";
import { ENDPOINTS } from "./endpoints";

export async function initiateMpesa(payload) {
  // payload example: { order_id, phone }
  const res = await api.post(ENDPOINTS.MPESA_INITIATE, payload);
  return res.data;
}

export async function getPaymentStatus(orderId) {
  const res = await api.get(ENDPOINTS.PAYMENT_STATUS(orderId));
  return res.data;
}
