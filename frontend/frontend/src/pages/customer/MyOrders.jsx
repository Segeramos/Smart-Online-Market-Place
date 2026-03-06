import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

function formatMoneyKES(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "—";
  return `KSh ${n.toFixed(2)}`;
}

function formatDate(v) {
  if (!v) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString();
}

function getStatus(o) {
  return (
    o.status ||
    o.payment_status ||
    o.delivery_status ||
    o.state ||
    "PENDING"
  )
    .toString()
    .toUpperCase();
}

function StatusPill({ status }) {
  const s = (status || "").toUpperCase();

  // group statuses
  const success = ["PAID", "COMPLETED", "DELIVERED", "SUCCESS", "CONFIRMED"];
  const pending = ["PENDING", "PROCESSING", "AWAITING_PAYMENT", "IN_PROGRESS"];
  const failed = ["FAILED", "CANCELLED", "CANCELED", "REJECTED", "EXPIRED"];

  let cls =
    "bg-gray-100 text-gray-700 border-gray-200";
  if (success.includes(s))
    cls = "bg-green-50 text-green-700 border-green-200";
  else if (pending.includes(s))
    cls = "bg-yellow-50 text-yellow-800 border-yellow-200";
  else if (failed.includes(s))
    cls = "bg-red-50 text-red-700 border-red-200";

  return (
    <span className={`text-xs px-2 py-1 rounded-full border ${cls}`}>
      {s}
    </span>
  );
}

export default function MyOrders() {
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setErr("");
      setLoading(true);
      try {
        const res = await api.get("/api/orders/my-orders/");
        if (!mounted) return;
        setOrders(Array.isArray(res.data) ? res.data : []);
      } catch (e) {
        console.log(e);
        if (!mounted) return;

        const status = e?.response?.status;
        if (status === 401) setErr("Please login to view your orders.");
        else setErr("Failed to load orders.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const sortedOrders = useMemo(() => {
    // Sort newest first if created_at exists, otherwise keep original order
    const copy = [...orders];
    copy.sort((a, b) => {
      const da = new Date(a.created_at || a.created || a.date || 0).getTime();
      const db = new Date(b.created_at || b.created || b.date || 0).getTime();
      return db - da;
    });
    return copy;
  }, [orders]);

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold">My Orders</h2>
        <Link
          to="/"
          className="text-sm text-cyan-700 hover:text-cyan-900 font-semibold"
        >
          Continue shopping →
        </Link>
      </div>

      {loading && (
        <div className="text-gray-600">Loading your orders…</div>
      )}

      {!loading && err && (
        <div className="text-red-600 mb-3">{err}</div>
      )}

      {!loading && !err && sortedOrders.length === 0 && (
        <div className="text-gray-600">
          No orders yet.{" "}
          <Link className="text-cyan-700 underline" to="/">
            Shop now
          </Link>
        </div>
      )}

      {!loading && !err && sortedOrders.length > 0 && (
        <div className="space-y-3">
          {sortedOrders.map((o) => {
            const orderId = o.order_id || o.id || o._id;
            const status = getStatus(o);
            const total =
              o.total ?? o.total_amount ?? o.amount ?? o.grand_total;

            const created =
              formatDate(o.created_at || o.created || o.date || o.ordered_at);

            const items = Array.isArray(o.items) ? o.items : [];

            return (
              <div
                key={orderId}
                className="border rounded-2xl p-4 hover:shadow-sm transition bg-white"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="font-bold text-gray-900">
                    Order #{orderId}
                  </div>

                  <div className="flex items-center gap-3">
                    {created && (
                      <div className="text-xs text-gray-500">{created}</div>
                    )}
                    <StatusPill status={status} />
                  </div>
                </div>

                <div className="mt-2 text-sm text-gray-700 flex flex-wrap gap-x-6 gap-y-1">
                  <div>
                    Total:{" "}
                    <span className="font-semibold">
                      {total != null ? formatMoneyKES(total) : "—"}
                    </span>
                  </div>

                  {o.phone_number && (
                    <div>
                      Phone:{" "}
                      <span className="font-semibold">{o.phone_number}</span>
                    </div>
                  )}

                  {o.delivery_address && (
                    <div className="truncate">
                      Address:{" "}
                      <span className="font-semibold">
                        {o.delivery_address}
                      </span>
                    </div>
                  )}
                </div>

                {/* Items (optional) */}
                {items.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-500 mb-2">
                      Items ({items.length})
                    </div>
                    <ul className="space-y-1">
                      {items.slice(0, 5).map((it, idx) => (
                        <li key={idx} className="text-sm text-gray-800">
                          <span className="font-semibold">
                            {it.product_name || it.product || it.name || "Item"}
                          </span>{" "}
                          × {it.quantity || it.qty || 1}
                          {it.price != null && (
                            <span className="text-gray-600">
                              {" "}
                              • {formatMoneyKES(it.price)}
                            </span>
                          )}
                        </li>
                      ))}
                      {items.length > 5 && (
                        <li className="text-sm text-gray-500">
                          +{items.length - 5} more…
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
