import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../api/axios";
import { cartTotals, clearCart, getCartItems } from "../../store/cartStore";

const MPESA_INITIATE_URL = "/api/payments/mpesa/stkpush/"; // change if needed
const MPESA_STATUS_URL = (orderId) => `/api/payments/mpesa/status/${orderId}/`; // change if needed

function normalizeStatus(raw) {
  const s = String(raw || "").toUpperCase();
  if (["SUCCESS", "PAID", "COMPLETED", "OK"].includes(s)) return "SUCCESS";
  if (["FAILED", "CANCELLED", "CANCELED", "ERROR"].includes(s)) return "FAILED";
  if (["PENDING", "PROCESSING", "INITIATED"].includes(s)) return "PENDING";
  return s || "PENDING";
}

// Accept: 07xxxxxxxx, 7xxxxxxxx, +2547xxxxxxx, 2547xxxxxxx
function normalizeKenyanPhone(input) {
  let p = String(input || "").trim();
  p = p.replace(/\s+/g, "").replace(/-/g, "");

  if (p.startsWith("+")) p = p.slice(1);

  // 07xxxxxxxx -> 2547xxxxxxxx
  if (p.startsWith("07") && p.length === 10) return "254" + p.slice(1);

  // 7xxxxxxxx -> 2547xxxxxxxx
  if (p.startsWith("7") && p.length === 9) return "254" + p;

  // already 254...
  if (p.startsWith("254") && p.length === 12) return p;

  return null;
}

function StatusPill({ status }) {
  const s = normalizeStatus(status);
  let cls = "bg-gray-100 text-gray-700 border-gray-200";
  if (s === "PENDING") cls = "bg-yellow-50 text-yellow-800 border-yellow-200";
  if (s === "SUCCESS") cls = "bg-green-50 text-green-700 border-green-200";
  if (s === "FAILED") cls = "bg-red-50 text-red-700 border-red-200";

  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${cls}`}>
      {s}
    </span>
  );
}

export default function Checkout() {
  const nav = useNavigate();

  const [items, setItems] = useState([]);
  const [address, setAddress] = useState("");
  const [phoneInput, setPhoneInput] = useState("254");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [orderId, setOrderId] = useState(null);
  const [payStatus, setPayStatus] = useState(""); // PENDING/SUCCESS/FAILED
  const [polling, setPolling] = useState(false);

  const pollTimerRef = useRef(null);

  useEffect(() => {
    setItems(getCartItems());
  }, []);

  const { subtotal } = useMemo(() => cartTotals(items), [items]);
  const hasItems = items.length > 0;

  const stopPolling = () => {
    setPolling(false);
    if (pollTimerRef.current) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  // Poll payment status after initiating payment
  useEffect(() => {
    if (!orderId) return;

    // If payment already finished, don’t poll.
    const normalized = normalizeStatus(payStatus);
    if (normalized && normalized !== "PENDING" && normalized !== "") return;

    let stopped = false;
    const startedAt = Date.now();
    const timeoutMs = 120000; // 2 minutes

    async function tick() {
      if (stopped) return;

      try {
        const res = await api.get(MPESA_STATUS_URL(orderId));
        const data = res.data;

        const raw =
          data?.status ||
          data?.payment_status ||
          data?.order?.payment_status ||
          data?.result?.status ||
          data?.CheckoutRequestState;

        const next = normalizeStatus(raw);
        if (!stopped) setPayStatus(next);

        if (next === "SUCCESS") {
          stopPolling();
          clearCart();
          setMessage("Payment successful ✅ Redirecting to orders…");
          setTimeout(() => nav("/orders"), 800);
          return;
        }

        if (next === "FAILED") {
          stopPolling();
          setMessage("Payment failed ❌ Please try again.");
          return;
        }

        // still pending
        if (Date.now() - startedAt < timeoutMs) {
          pollTimerRef.current = setTimeout(tick, 3500);
        } else {
          stopPolling();
          setMessage("Still pending… check your phone or try again.");
        }
      } catch (e) {
        console.log(e);
        if (Date.now() - startedAt < timeoutMs) {
          pollTimerRef.current = setTimeout(tick, 4000);
        } else {
          stopPolling();
          setMessage("Unable to confirm payment status. Please refresh.");
        }
      }
    }

    setPolling(true);
    setPayStatus("PENDING");
    tick();

    return () => {
      stopped = true;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  async function handleMpesaCheckout(e) {
    e.preventDefault();
    setMessage("");

    if (!hasItems) {
      setMessage("Your cart is empty.");
      return;
    }

    const normalizedPhone = normalizeKenyanPhone(phoneInput);
    if (!normalizedPhone) {
      setMessage("Enter a valid phone number: 07XXXXXXXX, 7XXXXXXXX, or 2547XXXXXXXX.");
      return;
    }

    setLoading(true);
    try {
      // 1) Create order
      const orderRes = await api.post("/api/orders/checkout/", {
        address,
        items: items.map((i) => ({ slug: i.slug, qty: i.qty })),
      });

      const createdOrderId =
        orderRes.data?.order_id ||
        orderRes.data?.id ||
        orderRes.data?.order?.id ||
        orderRes.data?.order?.order_id;

      if (!createdOrderId) {
        throw new Error("Order created but no order_id returned. Check backend response.");
      }

      setOrderId(createdOrderId);
      setMessage("Order created ✅ Sending STK push…");

      // 2) Initiate M-Pesa STK push
      await api.post(MPESA_INITIATE_URL, {
        order_id: createdOrderId,
        phone: normalizedPhone,
      });

      setMessage("STK push sent. Complete payment on your phone…");
      setPayStatus("PENDING");
      setPolling(true);
    } catch (e2) {
      console.log(e2);
      stopPolling();
      setPayStatus("");

      setMessage(
        e2?.response?.data?.detail ||
          e2?.response?.data?.error ||
          e2?.response?.data?.message ||
          e2?.message ||
          "Checkout failed."
      );
    } finally {
      setLoading(false);
    }
  }

  const canPay = hasItems && !loading && !polling;

  const resetPayment = () => {
    stopPolling();
    setPayStatus("");
    setOrderId(null);
    setMessage("");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Checkout */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold">Checkout</h2>
          <Link to="/cart" className="text-sm text-cyan-700 hover:underline">
            ← Back to cart
          </Link>
        </div>

        {!hasItems ? (
          <div className="text-gray-600">
            Cart is empty.{" "}
            <Link className="text-cyan-700 underline" to="/">
              Shop now
            </Link>
          </div>
        ) : (
          <form onSubmit={handleMpesaCheckout} className="space-y-4">
            {/* Phone */}
            <div>
              <label className="text-sm font-semibold">M-Pesa Phone</label>
              <input
                className="w-full border rounded-xl p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                placeholder="07XXXXXXXX or 2547XXXXXXXX"
                disabled={polling}
              />
              <p className="text-xs text-gray-500 mt-1">
                Accepted formats: 07XXXXXXXX, 7XXXXXXXX, 2547XXXXXXXX
              </p>
            </div>

            {/* Address */}
            <div>
              <label className="text-sm font-semibold">
                Delivery Address (optional)
              </label>
              <input
                className="w-full border rounded-xl p-3 mt-1 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Nairobi, CBD..."
                disabled={polling}
              />
            </div>

            {/* Status box */}
            {(orderId || message) && (
              <div className="rounded-2xl border bg-gray-50 p-4">
                {orderId && (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-sm">
                      <span className="font-semibold">Order ID:</span> {orderId}
                    </div>
                    <StatusPill status={payStatus || "PENDING"} />
                    {polling && (
                      <span className="text-xs text-gray-500">
                        Checking payment…
                      </span>
                    )}
                  </div>
                )}

                {message && (
                  <div className="text-sm text-gray-800 mt-2">{message}</div>
                )}

                {/* actions */}
                {(payStatus === "FAILED" || (!polling && orderId)) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={resetPayment}
                      className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm"
                    >
                      Try Again
                    </button>

                    <button
                      type="button"
                      onClick={() => nav("/orders")}
                      className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 text-sm"
                    >
                      View Orders
                    </button>
                  </div>
                )}

                {polling && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        stopPolling();
                        setMessage("Polling stopped. You can retry or check orders.");
                      }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Stop checking
                    </button>
                  </div>
                )}
              </div>
            )}

            <button
              disabled={!canPay}
              className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold p-3 rounded-xl disabled:opacity-50"
            >
              {loading ? "Processing..." : polling ? "Waiting for payment..." : "Pay with M-Pesa"}
            </button>
          </form>
        )}
      </div>

      {/* Summary */}
      <div className="bg-white rounded-2xl shadow p-5 h-fit">
        <h3 className="text-lg font-extrabold mb-3">Summary</h3>

        <div className="space-y-2 text-sm">
          {items.map((i) => (
            <div key={i.slug} className="flex justify-between gap-3">
              <span className="text-gray-700">
                {i.name} × {i.qty}
              </span>
              <span className="font-semibold">
                KSh {(Number(i.price || 0) * Number(i.qty || 1)).toFixed(2)}
              </span>
            </div>
          ))}
        </div>

        <div className="border-t mt-3 pt-3 flex justify-between">
          <span className="font-semibold">Subtotal</span>
          <span className="font-extrabold">KSh {subtotal.toFixed(2)}</span>
        </div>

        <div className="text-xs text-gray-500 mt-2">
          After you tap “Pay with M-Pesa”, check your phone to enter your PIN.
        </div>
      </div>
    </div>
  );
}


