// src/pages/admin/Dashboard.jsx

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/axios";

function formatMoney(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}
function formatNumber(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString();
}
function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

export default function AdminDashboard() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErrorMsg("");
      try {
        const res = await api.get("/api/adminpanel/");
        if (!mounted) return;
        setData(res.data);
      } catch (err) {
        if (!mounted) return;

        const status = err?.response?.status;
        const detail =
          err?.response?.data?.detail ||
          err?.response?.data?.message ||
          err?.message ||
          "Request failed";

        setErrorMsg(status ? `API Error ${status}: ${detail}` : `API Error: ${detail}`);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const k = useMemo(() => data?.kpis || {}, [data]);
  const recentOrders = useMemo(() => safeArr(data?.recent_orders), [data]);
  const topVendors = useMemo(() => safeArr(data?.top_vendors), [data]);
  const lowStock = useMemo(() => safeArr(data?.low_stock), [data]);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
          <p className="text-sm text-gray-600">Platform KPIs & monitoring</p>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm">
          <div className="font-semibold text-green-800">Live Data</div>
          <div className="text-green-700">Fetched from /api/adminpanel/</div>
        </div>
      </div>

      {errorMsg ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {errorMsg}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray-600">Loading KPIs…</p>
      ) : !data ? (
        <p className="text-sm text-gray-600">No data returned.</p>
      ) : (
        <>
          {/* KPI cards (some clickable) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiCard
              title="Orders"
              value={formatNumber(k.total_orders)}
              onClick={() => nav("/admin/orders")}
            />
            <KpiCard
              title="Customers"
              value={formatNumber(k.total_customers)}
            />
            <KpiCard
              title="Vendors"
              value={formatNumber(k.total_vendors)}
              onClick={() => nav("/admin/vendors")}
            />
            <KpiCard
              title="Gross Sales (KES)"
              value={formatMoney(k.gross_sales)}
            />

            <KpiCard
              title="Commissions (KES)"
              value={formatMoney(k.commissions)}
              onClick={() => nav("/admin/commission")}
            />
            <KpiCard
              title="Net Payouts Due (KES)"
              value={formatMoney(k.net_payouts_due)}
            />
            <KpiCard
              title="Pending Disputes"
              value={formatNumber(k.pending_disputes)}
              onClick={() => nav("/admin/disputes")}
            />
            <KpiCard
              title="Low Stock Products"
              value={formatNumber(k.low_stock_products)}
            />
          </div>

          {/* Tables */}
          <div className="grid md:grid-cols-2 gap-4">
            <Panel
              title="Recent Orders"
              actionLabel="View all"
              onAction={() => nav("/admin/orders")}
            >
              <Table>
                <thead>
                  <tr>
                    <Th>ID</Th>
                    <Th>Customer</Th>
                    <Th>Total</Th>
                    <Th>Status</Th>
                    <Th>Date</Th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((o) => (
                    <tr key={o.id} className="border-t">
                      <Td>#{o.id}</Td>
                      <Td>{o.customer ?? "-"}</Td>
                      <Td>KES {formatMoney(o.total)}</Td>
                      <Td>
                        <span className="rounded-full bg-gray-100 px-2 py-1 text-xs">
                          {o.status ?? "—"}
                        </span>
                      </Td>
                      <Td>{o.created_at ?? "-"}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>

            <Panel
              title="Top Vendors (by Gross)"
              actionLabel="Manage vendors"
              onAction={() => nav("/admin/vendors")}
            >
              <Table>
                <thead>
                  <tr>
                    <Th>Store</Th>
                    <Th>Gross</Th>
                    <Th>Commission</Th>
                    <Th>Net</Th>
                  </tr>
                </thead>
                <tbody>
                  {topVendors.map((v) => (
                    <tr key={v.id} className="border-t">
                      <Td className="font-medium">{v.store_name ?? "-"}</Td>
                      <Td>KES {formatMoney(v.gross)}</Td>
                      <Td>KES {formatMoney(v.commission)}</Td>
                      <Td>KES {formatMoney(v.net)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>

            <Panel title="Low Stock Alerts">
              <Table>
                <thead>
                  <tr>
                    <Th>Product</Th>
                    <Th>Stock</Th>
                  </tr>
                </thead>
                <tbody>
                  {lowStock.map((p) => (
                    <tr key={p.id} className="border-t">
                      <Td className="font-medium">{p.name ?? "-"}</Td>
                      <Td>{formatNumber(p.stock)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Panel>

            <Panel title="Quick Actions">
              <div className="flex flex-wrap gap-2">
                <ActionBtn label="Review disputes" onClick={() => nav("/admin/disputes")} />
                <ActionBtn label="Approve vendors" onClick={() => nav("/admin/vendors")} />
                <ActionBtn label="Commission settings" onClick={() => nav("/admin/commission")} />
                <ActionBtn label="Reports overview" onClick={() => nav("/admin/reports")} />
              </div>
              <p className="mt-2 text-xs text-gray-600">
                These routes are now wired to your admin pages.
              </p>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}

/* ---------- UI helpers ---------- */

function KpiCard({ title, value, onClick }) {
  const clickable = typeof onClick === "function";
  return (
    <div
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      className={[
        "rounded-xl border bg-white p-3 shadow-sm",
        clickable ? "cursor-pointer hover:bg-gray-50" : "",
      ].join(" ")}
      title={clickable ? "Open" : undefined}
    >
      <div className="text-xs text-gray-600">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {clickable ? <div className="mt-1 text-xs text-cyan-700">Open</div> : null}
    </div>
  );
}

function Panel({ title, children, actionLabel, onAction }) {
  const hasAction = actionLabel && typeof onAction === "function";
  return (
    <div className="rounded-xl border bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold">{title}</div>
        {hasAction ? (
          <button
            onClick={onAction}
            className="rounded-lg border px-3 py-1 text-xs hover:bg-gray-50"
          >
            {actionLabel}
          </button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function ActionBtn({ label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
    >
      {label}
    </button>
  );
}

function Table({ children }) {
  return <table className="w-full text-sm">{children}</table>;
}
function Th({ children }) {
  return <th className="py-2 text-left text-xs font-semibold text-gray-600">{children}</th>;
}
function Td({ children, className = "" }) {
  return <td className={`py-2 pr-2 align-top ${className}`}>{children}</td>;
}


