import { useEffect, useMemo, useState } from "react";
import { adminReportsOverview } from "../../api/admin";

function isObject(v) {
  return v && typeof v === "object" && !Array.isArray(v);
}

function normalizeArray(v) {
  if (Array.isArray(v)) return v;
  if (Array.isArray(v?.results)) return v.results;
  if (Array.isArray(v?.data)) return v.data;
  return [];
}

function fmtMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v ?? "—");
  return `KSh ${n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function fmtNumber(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v ?? "—");
  return n.toLocaleString();
}

function fmtPercent(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return String(v ?? "—");
  return `${n}%`;
}

function pickFirst(obj, keys) {
  for (const k of keys) {
    if (obj?.[k] != null) return obj[k];
  }
  return null;
}

function Card({ title, value, sub }) {
  return (
    <div className="bg-white rounded-2xl shadow p-5 border border-gray-100">
      <div className="text-sm text-gray-500">{title}</div>
      <div className="text-2xl font-extrabold text-gray-900 mt-1">{value}</div>
      {sub ? <div className="text-xs text-gray-500 mt-2">{sub}</div> : null}
    </div>
  );
}

export default function Reports() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const res = await adminReportsOverview();
      setData(res);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load reports overview.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const kpis = useMemo(() => {
    const o = isObject(data) ? data : {};

    // Try common KPI keys, fallback to null if missing
    const revenue =
      pickFirst(o, ["revenue", "total_revenue", "platform_revenue", "gross_revenue"]) ??
      pickFirst(o?.kpis, ["revenue", "total_revenue", "platform_revenue"]) ??
      null;

    const orders =
      pickFirst(o, ["orders", "total_orders", "order_count"]) ??
      pickFirst(o?.kpis, ["orders", "total_orders", "order_count"]) ??
      null;

    const customers =
      pickFirst(o, ["customers", "total_customers", "customer_count", "users"]) ??
      pickFirst(o?.kpis, ["customers", "total_customers", "customer_count"]) ??
      null;

    const vendors =
      pickFirst(o, ["vendors", "total_vendors", "vendor_count"]) ??
      pickFirst(o?.kpis, ["vendors", "total_vendors", "vendor_count"]) ??
      null;

    const commission =
      pickFirst(o, ["commission_rate", "global_commission", "commission"]) ??
      pickFirst(o?.kpis, ["commission_rate", "global_commission", "commission"]) ??
      null;

    const disputesOpen =
      pickFirst(o, ["open_disputes", "disputes_open", "pending_disputes"]) ??
      pickFirst(o?.kpis, ["open_disputes", "disputes_open", "pending_disputes"]) ??
      null;

    return { revenue, orders, customers, vendors, commission, disputesOpen };
  }, [data]);

  const topVendors = useMemo(() => {
    const o = isObject(data) ? data : {};
    return (
      normalizeArray(o?.top_vendors) ||
      normalizeArray(o?.vendors_top) ||
      normalizeArray(o?.tables?.top_vendors) ||
      []
    );
  }, [data]);

  const topProducts = useMemo(() => {
    const o = isObject(data) ? data : {};
    return (
      normalizeArray(o?.top_products) ||
      normalizeArray(o?.products_top) ||
      normalizeArray(o?.tables?.top_products) ||
      []
    );
  }, [data]);

  const recentOrders = useMemo(() => {
    const o = isObject(data) ? data : {};
    return (
      normalizeArray(o?.recent_orders) ||
      normalizeArray(o?.orders_recent) ||
      normalizeArray(o?.tables?.recent_orders) ||
      []
    );
  }, [data]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold text-gray-900">Reports Overview</h2>
            <p className="text-sm text-gray-500">
              Platform performance snapshot (orders, revenue, vendors, and activity).
            </p>
          </div>

          <button
            onClick={load}
            className="px-4 py-2 rounded-xl border border-gray-200 hover:bg-gray-50 font-semibold"
          >
            Refresh
          </button>
        </div>

        {err && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200">
            {err}
          </div>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card
          title="Total Revenue"
          value={kpis.revenue == null ? "—" : fmtMoney(kpis.revenue)}
          sub="Gross platform revenue"
        />
        <Card
          title="Total Orders"
          value={kpis.orders == null ? "—" : fmtNumber(kpis.orders)}
          sub="All time / overview"
        />
        <Card
          title="Customers"
          value={kpis.customers == null ? "—" : fmtNumber(kpis.customers)}
          sub="Registered buyers"
        />
        <Card
          title="Vendors"
          value={kpis.vendors == null ? "—" : fmtNumber(kpis.vendors)}
          sub="Approved + pending"
        />
        <Card
          title="Global Commission"
          value={kpis.commission == null ? "—" : fmtPercent(kpis.commission)}
          sub="Current platform rate"
        />
        <Card
          title="Open Disputes"
          value={kpis.disputesOpen == null ? "—" : fmtNumber(kpis.disputesOpen)}
          sub="Unresolved cases"
        />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Top Vendors */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="text-lg font-extrabold text-gray-900">Top Vendors</h3>
          <p className="text-sm text-gray-500 mt-1">Best performing sellers</p>

          {topVendors.length === 0 ? (
            <div className="text-gray-600 mt-4">No data.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-3">Vendor</th>
                    <th className="py-2 pr-3">Orders</th>
                    <th className="py-2 pr-3">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topVendors.slice(0, 8).map((v, idx) => (
                    <tr key={v?.id ?? idx} className="border-b">
                      <td className="py-2 pr-3 font-semibold text-gray-900">
                        {v?.store_name || v?.name || v?.vendor || "Vendor"}
                      </td>
                      <td className="py-2 pr-3 text-gray-700">
                        {fmtNumber(v?.orders ?? v?.order_count ?? v?.count ?? "—")}
                      </td>
                      <td className="py-2 pr-3 text-gray-700">
                        {v?.revenue != null || v?.total != null
                          ? fmtMoney(v?.revenue ?? v?.total)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="text-lg font-extrabold text-gray-900">Top Products</h3>
          <p className="text-sm text-gray-500 mt-1">Most purchased items</p>

          {topProducts.length === 0 ? (
            <div className="text-gray-600 mt-4">No data.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-3">Product</th>
                    <th className="py-2 pr-3">Sold</th>
                    <th className="py-2 pr-3">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.slice(0, 8).map((p, idx) => (
                    <tr key={p?.id ?? p?.slug ?? idx} className="border-b">
                      <td className="py-2 pr-3 font-semibold text-gray-900">
                        {p?.name || p?.title || p?.product || "Product"}
                      </td>
                      <td className="py-2 pr-3 text-gray-700">
                        {fmtNumber(p?.sold ?? p?.qty ?? p?.quantity ?? p?.count ?? "—")}
                      </td>
                      <td className="py-2 pr-3 text-gray-700">
                        {p?.revenue != null || p?.total != null
                          ? fmtMoney(p?.revenue ?? p?.total)
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow p-5">
          <h3 className="text-lg font-extrabold text-gray-900">Recent Orders</h3>
          <p className="text-sm text-gray-500 mt-1">Latest platform orders</p>

          {recentOrders.length === 0 ? (
            <div className="text-gray-600 mt-4">No data.</div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 border-b">
                    <th className="py-2 pr-3">Order</th>
                    <th className="py-2 pr-3">Customer</th>
                    <th className="py-2 pr-3">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.slice(0, 8).map((o, idx) => (
                    <tr key={o?.order_id ?? o?.id ?? idx} className="border-b">
                      <td className="py-2 pr-3 font-semibold text-gray-900">
                        #{o?.order_id ?? o?.id ?? "—"}
                      </td>
                      <td className="py-2 pr-3 text-gray-700">
                        {o?.customer_email || o?.customer || o?.user || "—"}
                      </td>
                      <td className="py-2 pr-3 text-gray-700">
                        {o?.total != null || o?.amount != null ? fmtMoney(o?.total ?? o?.amount) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Raw debug (optional for dev) */}
      <details className="bg-white rounded-2xl shadow p-5">
        <summary className="cursor-pointer font-semibold text-gray-900">
          Developer: Raw response (toggle)
        </summary>
        <pre className="mt-3 text-xs bg-gray-50 p-4 rounded-xl overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  );
}

