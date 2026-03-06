// src/pages/vendor/Products.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  vendorDeleteProduct,
  vendorProducts,
  vendorUnhideProduct,
} from "../../api/vendor";

/** Tiny inline icons (no deps) */
function Icon({ name, className = "h-5 w-5" }) {
  const common = {
    className,
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  switch (name) {
    case "box":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M21 8l-9-5-9 5 9 5 9-5z" />
          <path d="M3 8v10l9 5 9-5V8" />
          <path d="M12 13v10" />
        </svg>
      );
    case "plus":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 5v14" />
          <path d="M5 12h14" />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      );
    case "sliders":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M4 21v-7" />
          <path d="M4 10V3" />
          <path d="M12 21v-9" />
          <path d="M12 8V3" />
          <path d="M20 21v-5" />
          <path d="M20 12V3" />
          <path d="M2 10h4" />
          <path d="M10 8h4" />
          <path d="M18 16h4" />
        </svg>
      );
    case "dots":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 12h.01" />
          <path d="M12 5h.01" />
          <path d="M12 19h.01" />
        </svg>
      );
    case "edit":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>
      );
    case "eyeOff":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M3 3l18 18" />
          <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4" />
          <path d="M9.9 5.1A10.4 10.4 0 0 1 12 5c7 0 10 7 10 7a18.7 18.7 0 0 1-3.2 4.2" />
          <path d="M6.6 6.6C3.7 8.9 2 12 2 12s3 7 10 7a10.7 10.7 0 0 0 3.4-.6" />
        </svg>
      );
    case "eye":
      return (
        <svg viewBox="0 0 24 24" {...common}>
          <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "alert":
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

function formatMoneyKes(n) {
  return `KES ${Number(n || 0).toLocaleString()}`;
}

export default function VendorProducts() {
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);

  const menuRef = useRef(null);

  // ✅ Vendor LIST (uses authenticated api via vendorProducts())
  useEffect(() => {
    let mounted = true;

    async function load() {
      setErr("");
      setLoading(true);
      try {
        const data = await vendorProducts(); // ✅ uses /api/vendor/products/ with Bearer token
        const items = Array.isArray(data) ? data : data?.results || [];
        if (mounted) setProducts(items);
      } catch (e) {
        const msg =
          e?.response?.data?.detail ||
          (typeof e?.response?.data === "string" ? e.response.data : null) ||
          e?.message ||
          "Failed to load products";
        if (mounted) setErr(msg);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, []);

  // close menu when clicking outside
  useEffect(() => {
    function onDocClick(e) {
      if (!openMenuId) return;
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openMenuId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;

    return products.filter((p) => {
      const name = String(p.name ?? "").toLowerCase();
      const slug = String(p.slug ?? "").toLowerCase();
      const category = String(p.category_name ?? p.category?.name ?? "").toLowerCase();
      return name.includes(q) || slug.includes(q) || category.includes(q);
    });
  }, [products, query]);

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.is_active !== false).length;
    const hidden = total - active;

    const low = products.filter((p) => {
      const stock = Number(p.stock ?? 0);
      return stock <= Number(lowStockThreshold || 0);
    }).length;

    return { total, active, hidden, low };
  }, [products, lowStockThreshold]);

  async function handleHide(productId) {
    const ok = window.confirm("Hide this product? (You can unhide later)");
    if (!ok) return;

    setErr("");
    try {
      await vendorDeleteProduct(productId);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_active: false } : p))
      );
      setOpenMenuId(null);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to hide product");
    }
  }

  async function handleUnhide(productId) {
    setErr("");
    try {
      await vendorUnhideProduct(productId);
      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, is_active: true } : p))
      );
      setOpenMenuId(null);
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to unhide product");
    }
  }

  return (
    <div className="space-y-6">
      {/* HERO HEADER */}
      <div className="relative overflow-hidden rounded-3xl border bg-white">
        <div className="absolute inset-0">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-gradient-to-br from-fuchsia-400/35 to-purple-400/10 blur-2xl" />
          <div className="absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-gradient-to-br from-cyan-400/35 to-blue-400/10 blur-2xl" />
          <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-white/60" />
        </div>

        <div className="relative p-5 md:p-7">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border bg-white/70 px-3 py-1 text-xs font-semibold text-gray-800 shadow-sm backdrop-blur">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                NairobiMart • Products Manager
              </div>

              <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900 md:text-3xl">
                Products
              </h1>
              <p className="mt-1 text-sm text-gray-700">
                Manage your listings, stock levels, and visibility like a pro.
              </p>
            </div>

            <button
              onClick={() => navigate("/vendor/products/new")}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-r from-gray-900 via-black to-gray-900 px-4 py-2 text-sm font-extrabold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <span className="absolute inset-0 opacity-0 bg-gradient-to-r from-fuchsia-500/30 via-cyan-500/30 to-amber-500/30 transition-opacity group-hover:opacity-100" />
              <span className="relative inline-flex items-center gap-2">
                <Icon name="plus" className="h-4 w-4" />
                Add Product
              </span>
            </button>
          </div>

          {/* STATS */}
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard
              title="Total Products"
              value={stats.total}
              icon="box"
              accent="from-fuchsia-500/20 via-purple-500/15 to-transparent"
              ring="ring-fuchsia-500/20"
            />
            <StatCard
              title="Active"
              value={stats.active}
              icon="eye"
              accent="from-emerald-500/20 via-teal-500/15 to-transparent"
              ring="ring-emerald-500/20"
            />
            <StatCard
              title="Hidden"
              value={stats.hidden}
              icon="eyeOff"
              accent="from-slate-500/15 via-gray-500/10 to-transparent"
              ring="ring-slate-500/20"
            />
            <StatCard
              title="Low Stock"
              value={stats.low}
              icon="alert"
              accent="from-amber-500/20 via-orange-500/15 to-transparent"
              ring="ring-amber-500/25"
            />
          </div>
        </div>
      </div>

      {/* CONTROLS */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <div className="relative">
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
            <Icon name="search" className="h-4 w-4" />
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, slug, or category…"
            className="w-full rounded-2xl border bg-white px-10 py-3 text-sm outline-none transition focus:ring-2 focus:ring-fuchsia-300"
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          <div className="inline-flex items-center gap-2 rounded-2xl border bg-white px-3 py-2">
            <span className="text-gray-600">
              <Icon name="sliders" className="h-4 w-4" />
            </span>
            <span className="text-sm font-semibold text-gray-700">Low stock ≤</span>
            <input
              value={lowStockThreshold}
              onChange={(e) => setLowStockThreshold(Number(e.target.value))}
              type="number"
              min="0"
              step="1"
              className="w-24 rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-amber-300"
            />
          </div>
        </div>
      </div>

      {/* ERROR */}
      {err ? (
        <div className="relative overflow-hidden rounded-3xl border border-red-200 bg-white p-4">
          <div className="absolute inset-0 bg-gradient-to-r from-red-200/40 via-white to-rose-200/30" />
          <div className="relative flex gap-3 text-red-700">
            <div className="mt-0.5 rounded-2xl bg-red-500/10 p-2">
              <Icon name="alert" className="h-5 w-5" />
            </div>
            <div>
              <div className="font-extrabold text-red-800">Something went wrong</div>
              <div className="mt-1 text-sm">{err}</div>
            </div>
          </div>
        </div>
      ) : null}

      {/* TABLE */}
      {loading ? (
        <div className="relative overflow-hidden rounded-3xl border bg-white p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-100 via-white to-cyan-100" />
          <div className="relative space-y-3">
            <div className="h-4 w-56 animate-pulse rounded-lg bg-black/10" />
            <div className="h-24 animate-pulse rounded-2xl bg-black/10" />
            <div className="h-24 animate-pulse rounded-2xl bg-black/10" />
          </div>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-3xl border bg-white">
          {/* soft wash */}
          <div className="absolute inset-0 bg-gradient-to-br from-fuchsia-500/5 via-transparent to-cyan-500/5" />

          <div className="relative overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 z-10 bg-white/80 backdrop-blur">
                <tr className="border-b">
                  <Th>ID</Th>
                  <Th>Product</Th>
                  <Th>Category</Th>
                  <Th>Price</Th>
                  <Th>Stock</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Options</Th>
                </tr>
              </thead>

              <tbody className="divide-y">
                {filtered.length === 0 ? (
                  <tr>
                    <td className="px-4 py-10 text-gray-600" colSpan={7}>
                      <div className="flex flex-col items-center gap-2">
                        <div className="rounded-2xl bg-black/5 p-3 text-gray-800">
                          <Icon name="search" className="h-6 w-6" />
                        </div>
                        <div className="font-extrabold text-gray-900">No products found</div>
                        <div className="text-sm text-gray-600">
                          Try a different keyword, or add a new NairobiMart product.
                        </div>
                        <button
                          onClick={() => navigate("/vendor/products/new")}
                          className="mt-2 rounded-2xl bg-black px-4 py-2 text-sm font-bold text-white hover:opacity-90"
                        >
                          Add Product
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const stock = Number(p.stock ?? 0);
                    const isHidden = p.is_active === false;
                    const status = isHidden ? "Hidden" : "Active";
                    const categoryName = p.category_name ?? p.category?.name ?? "-";
                    const isLow = stock <= Number(lowStockThreshold || 0);

                    return (
                      <tr key={p.id} className="hover:bg-black/[0.02]">
                        <td className="px-4 py-4 font-semibold text-gray-700">{p.id}</td>

                        <td className="px-4 py-4">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-2xl bg-gradient-to-br from-fuchsia-500/15 to-cyan-500/10 p-2 text-gray-900">
                              <Icon name="box" className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-extrabold text-gray-900">
                                {p.name ?? "Untitled"}
                              </div>
                              {p.slug ? (
                                <div className="mt-0.5 truncate text-xs font-semibold text-gray-500">
                                  {p.slug}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-gray-700">{categoryName}</td>

                        <td className="px-4 py-4 font-semibold text-gray-800">
                          {formatMoneyKes(p.price)}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={
                              isLow
                                ? "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 px-2.5 py-1 text-xs font-extrabold text-orange-700 ring-1 ring-orange-200"
                                : "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-50 to-teal-50 px-2.5 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-emerald-200"
                            }
                          >
                            {isLow ? "Low" : "In Stock"} ({stock})
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={
                              status === "Active"
                                ? "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-sky-50 to-blue-50 px-2.5 py-1 text-xs font-extrabold text-blue-700 ring-1 ring-blue-200"
                                : "inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-gray-50 to-slate-50 px-2.5 py-1 text-xs font-extrabold text-gray-700 ring-1 ring-gray-200"
                            }
                          >
                            {status}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div
                            className="relative inline-block"
                            ref={openMenuId === p.id ? menuRef : null}
                          >
                            <button
                              onClick={() =>
                                setOpenMenuId((prev) => (prev === p.id ? null : p.id))
                              }
                              className="group rounded-2xl border bg-white px-3 py-2 text-sm font-bold text-gray-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-black/[0.02] hover:shadow-md"
                            >
                              <span className="inline-flex items-center gap-2">
                                <Icon name="dots" className="h-4 w-4" />
                                Options
                              </span>
                            </button>

                            {openMenuId === p.id ? (
                              <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border bg-white shadow-xl z-20">
                                <div className="bg-gradient-to-r from-fuchsia-500/10 via-transparent to-cyan-500/10 px-4 py-2 text-xs font-extrabold text-gray-700">
                                  NairobiMart Actions
                                </div>

                                <button
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    navigate(`/vendor/products/${p.id}/edit`);
                                  }}
                                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold hover:bg-black/[0.03]"
                                >
                                  <Icon name="edit" className="h-4 w-4" />
                                  View / Edit
                                </button>

                                {!isHidden ? (
                                  <button
                                    onClick={() => handleHide(p.id)}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-extrabold text-red-600 hover:bg-red-50"
                                  >
                                    <Icon name="eyeOff" className="h-4 w-4" />
                                    Hide product
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUnhide(p.id)}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-extrabold text-gray-900 hover:bg-black/[0.03]"
                                  >
                                    <Icon name="eye" className="h-4 w-4" />
                                    Unhide product
                                  </button>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children, className = "" }) {
  return (
    <th
      className={[
        "px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-gray-700",
        className,
      ].join(" ")}
    >
      {children}
    </th>
  );
}

function StatCard({ title, value, icon, accent, ring }) {
  return (
    <div
      className={[
        "group relative overflow-hidden rounded-3xl border bg-white p-4 shadow-sm transition",
        "hover:-translate-y-0.5 hover:shadow-md",
        "ring-1",
        ring,
      ].join(" ")}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${accent}`} />
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-gray-700">{title}</div>
          <div className="mt-1 text-2xl font-extrabold tracking-tight text-gray-950">
            {Number(value || 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl bg-black/5 p-2 text-gray-800">
          <Icon name={icon} className="h-5 w-5" />
        </div>
      </div>
      <div className="relative mt-3 text-[11px] font-semibold text-gray-600">
        NairobiMart • Live inventory
      </div>
    </div>
  );
}