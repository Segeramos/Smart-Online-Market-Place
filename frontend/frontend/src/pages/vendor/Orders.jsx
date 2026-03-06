// src/pages/vendor/Orders.jsx

import { useEffect, useState } from "react";
import api from "../../api/axios";

export default function VendorOrders() {
  const [orders, setOrders] = useState([]);
  const [err, setErr] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get("/api/orders/vendor/orders/");
        setOrders(res.data);
      } catch (e) {
        setErr(e?.response?.data?.detail || "Failed to load vendor orders");
      }
    }
    load();
  }, []);

  if (err) return <div className="p-4 text-red-600">{err}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-semibold">Vendor Orders</h1>
      <ul className="mt-4 space-y-2">
        {orders.map((o) => (
          <li key={o.order_id} className="border p-2 rounded">
            Order #{o.order_id} — Qty: {o.quantity}
          </li>
        ))}
      </ul>
    </div>
  );
}
