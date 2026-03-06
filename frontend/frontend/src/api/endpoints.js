export const ENDPOINTS = {
  // Orders
  CREATE_ORDER: "/api/orders/checkout/",      // change if yours differs
  ORDER_DETAIL: (orderId) => `/api/orders/${orderId}/`, // change if yours differs

  // Payments (M-Pesa)
  MPESA_INITIATE: "/api/payments/mpesa/stkpush/",       // change if yours differs
  PAYMENT_STATUS: (orderId) => `/api/payments/status/${orderId}/`, // change if yours differs
};
