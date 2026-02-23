// src/pages/admin/Orders.jsx

import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

function safeLower(v) {
  return (v ?? "").toString().toLowerCase();
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatMoney(v) {
  const n = toNumber(v);
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function formatDateTime(v) {
  if (!v) return "-";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

function pillClass(type) {
  const t = safeLower(type);

  // order status
  if (["delivered", "completed"].includes(t)) return "bg-green-50 text-green-800 border-green-200";
  if (["processing", "shipped"].includes(t)) return "bg-blue-50 text-blue-800 border-blue-200";
  if (["new", "pending"].includes(t)) return "bg-yellow-50 text-yellow-800 border-yellow-200";
  if (["cancelled", "canceled", "failed"].includes(t)) return "bg-red-50 text-red-800 border-red-200";

  // payment status
  if (["paid", "success"].includes(t)) return "bg-green-50 text-green-800 border-green-200";
  if (["pending"].includes(t)) return "bg-yellow-50 text-yellow-800 border-yellow-200";
  if (["failed"].includes(t)) return "bg-red-50 text-red-800 border-red-200";

  return "bg-gray-50 text-gray-800 border-gray-200";
}

function normalizeOrder(o) {
  return {
    order_id: o?.order_id,
    user_id: o?.user_id,
    user_email: o?.user_email ?? "-",
    status: o?.status ?? "-",
    payment_status: o?.payment_status ?? "-",
    payment_method: o?.payment_method ?? "-",
    total_amount: o?.total_amount ?? 0,
    paid_at: o?.paid_at ?? null,
    created_at: o?.created_at ?? null,
  };
}

export default function AdminOrders() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [orders, setOrders] = useState([]);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [payStatus, setPayStatus] = useState("all");
  const [method, setMethod] = useState("all");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/api/adminpanel/orders/");
      const list = Array.isArray(res.data) ? res.data : [];
      setOrders(list.map(normalizeOrder));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const qq = safeLower(q).trim();

    return orders.filter((o) => {
      const s = safeLower(o.status);
      const ps = safeLower(o.payment_status);
      const pm = safeLower(o.payment_method);

      if (status !== "all" && s !== status) return false;
      if (payStatus !== "all" && ps !== payStatus) return false;
      if (method !== "all" && pm !== method) return false;

      if (!qq) return true;

      const hay = `${o.order_id} ${o.user_id} ${o.user_email} ${o.status} ${o.payment_status} ${o.payment_method}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [orders, q, status, payStatus, method]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin · Orders</h1>
          <p className="text-sm text-gray-600">Platform Order List</p>
        </div>

        <button
          onClick={load}
          className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Loading..." : "Reload"}
        </button>
      </div>

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      ) : null}

      {/* Controls */}
      <div className="rounded-xl border bg-white p-3 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3 md:items-center">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search: order id, user id, email..."
            className="w-full md:max-w-md rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-300"
          />

          <div className="flex gap-2 items-center">
            <label className="text-sm text-gray-600">Order:</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
            >
              <option value="all">All</option>
              <option value="new">new</option>
              <option value="processing">processing</option>
              <option value="delivered">delivered</option>
              <option value="cancelled">cancelled</option>
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <label className="text-sm text-gray-600">Payment:</label>
            <select
              value={payStatus}
              onChange={(e) => setPayStatus(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
            >
              <option value="all">All</option>
              <option value="pending">pending</option>
              <option value="paid">paid</option>
              <option value="failed">failed</option>
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <label className="text-sm text-gray-600">Method:</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm outline-none"
            >
              <option value="all">All</option>
              <option value="mpesa">mpesa</option>
              <option value="card">card</option>
              <option value="cash">cash</option>
            </select>
          </div>

          <div className="text-sm text-gray-600 md:ml-auto">
            Showing <span className="font-semibold">{filtered.length}</span>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <Th>Order</Th>
                <Th>User</Th>
                <Th>Email</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th>Method</Th>
                <Th>Total</Th>
                <Th>Paid At</Th>
                <Th>Created</Th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <Td colSpan={9} className="py-8 text-center text-gray-600">
                    Loading orders…
                  </Td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <Td colSpan={9} className="py-8 text-center text-gray-600">
                    No orders found.
                  </Td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.order_id} className="border-t hover:bg-gray-50">
                    <Td className="font-medium">#{o.order_id}</Td>
                    <Td>#{o.user_id}</Td>
                    <Td className="text-xs text-gray-700">{o.user_email}</Td>

                    <Td>
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs ${pillClass(o.status)}`}>
                        {o.status}
                      </span>
                    </Td>

                    <Td>
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs ${pillClass(o.payment_status)}`}>
                        {o.payment_status}
                      </span>
                    </Td>

                    <Td className="text-xs text-gray-700">{o.payment_method}</Td>
                    <Td>KES {formatMoney(o.total_amount)}</Td>
                    <Td className="text-xs text-gray-600">{formatDateTime(o.paid_at)}</Td>
                    <Td className="text-xs text-gray-600">{formatDateTime(o.created_at)}</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-gray-600">
        Endpoint: <span className="font-mono">GET /api/adminpanel/orders/</span>
      </div>
    </div>
  );
}

/* ---------- small table helpers ---------- */

function Th({ children }) {
  return <th className="px-3 py-2 text-xs font-semibold text-gray-700">{children}</th>;
}

function Td({ children, className = "", colSpan }) {
  return (
    <td colSpan={colSpan} className={`px-3 py-2 align-top ${className}`}>
      {children}
    </td>
  );
}
