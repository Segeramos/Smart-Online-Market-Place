// src/pages/vendor/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../api/axios";

// Lightweight inline icons (no deps)
function Icon({ name, className = "h-5 w-5" }) {
  const common = { className, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" };

  switch (name) {
    case "sparkle":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 2l1.2 4.3L17.5 7.5l-4.3 1.2L12 13l-1.2-4.3L6.5 7.5l4.3-1.2L12 2z" />
          <path d="M19 12l.7 2.6L22 15l-2.3.4L19 18l-.7-2.6L16 15l2.3-.4L19 12z" />
          <path d="M5 13l.7 2.6L8 16l-2.3.4L5 19l-.7-2.6L2 16l2.3-.4L5 13z" />
        </svg>
      );
    case "box":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M21 8l-9-5-9 5 9 5 9-5z" />
          <path d="M3 8v10l9 5 9-5V8" />
          <path d="M12 13v10" />
        </svg>
      );
    case "orders":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M8 6h13" />
          <path d="M8 12h13" />
          <path d="M8 18h13" />
          <path d="M3 6h.01" />
          <path d="M3 12h.01" />
          <path d="M3 18h.01" />
        </svg>
      );
    case "money":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 1v22" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7H14a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case "trend":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M3 17l6-6 4 4 7-7" />
          <path d="M14 8h6v6" />
        </svg>
      );
    case "warning":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M10.3 3.2L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.2a2 2 0 0 0-3.4 0z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );
    default:
      return null;
  }
}

function formatValue(value, kind) {
  const n = Number(value || 0);
  if (kind === "money") return `KES ${n.toLocaleString()}`;
  return n.toLocaleString();
}

export default function VendorDashboard() {
  const [overview, setOverview] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setErr("");

      try {
        const [overviewRes, earningsRes] = await Promise.all([
          api.get("/api/vendor/analytics/overview/?range=30d"),
          api.get("/api/vendor/earnings/summary/"),
        ]);

        if (!mounted) return;
        setOverview(overviewRes.data);
        setEarnings(earningsRes.data);
      } catch (e) {
        if (!mounted) return;
        setErr(e?.response?.data?.detail || "Failed to load vendor dashboard");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const kpi = useMemo(() => {
    return [
      {
        title: "Revenue",
        value: overview?.revenue,
        kind: "money",
        icon: "money",
        accent: "from-pink-500/20 via-fuchsia-500/20 to-purple-500/20",
        ring: "ring-pink-500/20",
      },
      {
        title: "Orders",
        value: overview?.orders_count,
        kind: "number",
        icon: "orders",
        accent: "from-cyan-500/20 via-sky-500/20 to-blue-500/20",
        ring: "ring-cyan-500/20",
      },
      {
        title: "Items Sold",
        value: overview?.items_sold,
        kind: "number",
        icon: "box",
        accent: "from-amber-500/20 via-orange-500/20 to-rose-500/20",
        ring: "ring-amber-500/20",
      },
      {
        title: "Avg Order",
        value: overview?.avg_order_value,
        kind: "money",
        icon: "trend",
        accent: "from-emerald-500/20 via-teal-500/20 to-cyan-500/20",
        ring: "ring-emerald-500/20",
      },
    ];
  }, [overview]);

  const payout = useMemo(() => {
    return [
      {
        title: "Gross Total",
        value: earnings?.gross_total,
        kind: "money",
        icon: "money",
        accent: "from-violet-500/20 via-fuchsia-500/20 to-pink-500/20",
        ring: "ring-violet-500/20",
      },
      {
        title: "Net Total",
        value: earnings?.net_total,
        kind: "money",
        icon: "trend",
        accent: "from-emerald-500/20 via-lime-500/20 to-yellow-500/20",
        ring: "ring-emerald-500/20",
      },
      {
        title: "Pending",
        value: earnings?.pending_net_total,
        kind: "money",
        icon: "warning",
        accent: "from-amber-500/20 via-orange-500/20 to-red-500/20",
        ring: "ring-amber-500/20",
      },
      {
        title: "Paid",
        value: earnings?.paid_net_total,
        kind: "money",
        icon: "sparkle",
        accent: "from-sky-500/20 via-blue-500/20 to-indigo-500/20",
        ring: "ring-sky-500/20",
      },
    ];
  }, [earnings]);

  if (loading) {
    return (
      <div className="relative overflow-hidden rounded-3xl border bg-white p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-100 via-white to-cyan-100" />
        <div className="relative">
          <div className="h-7 w-52 animate-pulse rounded-xl bg-black/10" />
          <div className="mt-3 h-4 w-72 animate-pulse rounded-lg bg-black/10" />

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl bg-black/10" />
            ))}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-3xl bg-black/10" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-red-700">
        <div className="font-semibold">NairobiMart Vendor Dashboard</div>
        <div className="mt-1 text-sm">{err}</div>
      </div>
    );
  }

  const showPayoutHint =
    Number(earnings?.net_total || 0) === 0 && Number(overview?.revenue || 0) > 0;

  return (
    <div className="space-y-8">
      {/* HERO */}
      <div className="relative overflow-hidden rounded-3xl border bg-white">
        {/* background blobs */}
        <div className="absolute inset-0">
          <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br from-fuchsia-400/40 to-purple-400/10 blur-2xl" />
          <div className="absolute -right-24 -bottom-24 h-72 w-72 rounded-full bg-gradient-to-br from-cyan-400/40 to-blue-400/10 blur-2xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-white/60" />
        </div>

        <div className="relative p-5 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs font-semibold text-gray-800 shadow-sm backdrop-blur">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                NairobiMart Vendor Center
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">
                Vendor Dashboard
              </h1>
              <p className="mt-1 text-sm text-gray-700">
                Your performance snapshot for the last <span className="font-semibold">30 days</span>.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                to="/vendor/products"
                className="group relative overflow-hidden rounded-2xl border bg-white/70 px-4 py-2 text-sm font-semibold text-gray-900 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-fuchsia-200/60 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                <span className="relative inline-flex items-center gap-2">
                  <Icon name="box" className="h-4 w-4" />
                  Manage Products
                </span>
              </Link>

              <Link
                to="/vendor/orders"
                className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-black to-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="absolute inset-0 opacity-0 bg-gradient-to-r from-fuchsia-500/30 via-cyan-500/30 to-amber-500/30 transition-opacity group-hover:opacity-100" />
                <span className="relative inline-flex items-center gap-2">
                  <Icon name="orders" className="h-4 w-4" />
                  View Orders
                </span>
              </Link>
            </div>
          </div>

          {/* small highlight strip */}
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <MiniStat
              label="Store"
              value="NairobiMart"
              badge="Live"
              gradient="from-fuchsia-500/15 to-purple-500/5"
            />
            <MiniStat
              label="Range"
              value="30 days"
              badge="Auto"
              gradient="from-cyan-500/15 to-blue-500/5"
            />
            <MiniStat
              label="Tip"
              value="Keep stock updated"
              badge="Boost"
              gradient="from-amber-500/15 to-orange-500/5"
            />
          </div>
        </div>
      </div>

      {/* === SALES OVERVIEW === */}
      <section className="space-y-3">
        <HeaderRow title="Sales Overview" right="30 days" />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {kpi.map((c) => (
            <GlowCard
              key={c.title}
              title={c.title}
              value={c.value}
              kind={c.kind}
              icon={c.icon}
              accent={c.accent}
              ring={c.ring}
            />
          ))}
        </div>
      </section>

      {/* === EARNINGS === */}
      <section className="space-y-3">
        <HeaderRow title="Earnings" right="Payout summary" />

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {payout.map((c) => (
            <GlowCard
              key={c.title}
              title={c.title}
              value={c.value}
              kind={c.kind}
              icon={c.icon}
              accent={c.accent}
              ring={c.ring}
            />
          ))}
        </div>

        {showPayoutHint && (
          <div className="relative overflow-hidden rounded-3xl border bg-white p-4">
            <div className="absolute inset-0 bg-gradient-to-r from-amber-200/40 via-white to-fuchsia-200/30" />
            <div className="relative flex gap-3">
              <div className="mt-0.5 rounded-2xl bg-amber-500/10 p-2 text-amber-700">
                <Icon name="warning" className="h-5 w-5" />
              </div>
              <div>
                <div className="font-semibold text-gray-900">
                  Earnings are still 0 — payouts not generated yet
                </div>
                <div className="mt-1 text-sm text-gray-700">
                  Sales are showing, but earnings remain 0 because payout records haven’t been created yet.
                  Once orders are marked paid/completed and payouts are generated, earnings update automatically.
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <FancyQuickLink
          title="Products"
          desc="Add, edit, hide/unhide listings"
          to="/vendor/products"
          icon="box"
          gradient="from-fuchsia-500/15 via-purple-500/10 to-transparent"
        />
        <FancyQuickLink
          title="Orders"
          desc="View and manage customer orders"
          to="/vendor/orders"
          icon="orders"
          gradient="from-cyan-500/15 via-blue-500/10 to-transparent"
        />
        <FancyQuickLink
          title="Disputes"
          desc="Handle disputes and resolutions"
          to="/vendor/disputes"
          icon="warning"
          gradient="from-amber-500/15 via-orange-500/10 to-transparent"
        />
      </section>
    </div>
  );
}

function HeaderRow({ title, right }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-extrabold tracking-wide text-gray-800">
        {title}
      </h2>
      <span className="rounded-full border bg-white px-2 py-0.5 text-xs font-semibold text-gray-600">
        {right}
      </span>
    </div>
  );
}

function MiniStat({ label, value, badge, gradient }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border bg-white/60 p-4 shadow-sm backdrop-blur">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-gray-600">{label}</div>
          <div className="mt-1 text-base font-extrabold text-gray-900">
            {value}
          </div>
        </div>
        <span className="rounded-full bg-black/5 px-2 py-1 text-xs font-bold text-gray-800">
          {badge}
        </span>
      </div>
    </div>
  );
}

function GlowCard({ title, value, kind = "number", icon, accent, ring }) {
  return (
    <div
      className={[
        "group relative overflow-hidden rounded-3xl border bg-white p-4 shadow-sm transition",
        "hover:-translate-y-0.5 hover:shadow-md",
        "ring-1",
        ring,
      ].join(" ")}
    >
      {/* gradient wash */}
      <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />

      {/* shine */}
      <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <div className="absolute -left-1/2 top-0 h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shine_1.2s_ease-in-out_1]" />
      </div>

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-gray-700">{title}</div>
          <div className="mt-1 text-xl font-extrabold tracking-tight text-gray-950">
            {formatValue(value, kind)}
          </div>
        </div>

        <div className="rounded-2xl bg-black/5 p-2 text-gray-800">
          <Icon name={icon} className="h-5 w-5" />
        </div>
      </div>

      {/* tiny footer */}
      <div className="relative mt-3 text-[11px] font-semibold text-gray-600">
        NairobiMart • Live metrics
      </div>

      {/* keyframes */}
      <style>{`
        @keyframes shine {
          0% { transform: translateX(-140%) skewX(-12deg); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateX(260%) skewX(-12deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

function FancyQuickLink({ title, desc, to, icon, gradient }) {
  return (
    <Link
      to={to}
      className="group relative overflow-hidden rounded-3xl border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="relative flex items-start gap-3">
        <div className="rounded-2xl bg-black/5 p-2 text-gray-900">
          <Icon name={icon} className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="font-extrabold text-gray-900">{title}</div>
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-bold text-gray-700">
              Open
            </span>
          </div>
          <div className="mt-1 text-sm text-gray-700">{desc}</div>
          <div className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-gray-900">
            Go to {title}
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </div>
        </div>
      </div>
    </Link>
  );
}