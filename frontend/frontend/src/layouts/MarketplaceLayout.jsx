// src/layouts/MarketplaceLayout.jsx

import { Outlet, Link, useNavigate, useLocation } from "react-router-dom";
import { getCartItems } from "../store/cartStore";
import { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/axios";
import { useMarketplace } from "../context/MarketplaceContext.jsx";
import { getRole, isAuthed, clearAuth, isAdmin, isVendor } from "../store/authStore";

/** ---- Swipe + lock scroll helpers ---- **/
function useBodyScrollLock(locked) {
  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);
}

// Rightward swipe to close (works for left drawers)
function useSwipeToClose({ open, onClose, threshold = 70, maxVertical = 55 }) {
  const ref = useRef(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const dx = useRef(0);
  const active = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!open || !el) return;

    const onTouchStart = (e) => {
      const t = e.touches?.[0];
      if (!t) return;
      active.current = true;
      startX.current = t.clientX;
      startY.current = t.clientY;
      dx.current = 0;
    };

    const onTouchMove = (e) => {
      if (!active.current) return;
      const t = e.touches?.[0];
      if (!t) return;

      const diffX = t.clientX - startX.current;
      const diffY = t.clientY - startY.current;

      if (Math.abs(diffY) > maxVertical) return;

      dx.current = Math.max(0, diffX);

      if (dx.current > 6) e.preventDefault();

      el.style.transition = "none";
      el.style.transform = `translateX(${dx.current}px)`;
    };

    const onTouchEnd = () => {
      if (!active.current) return;
      active.current = false;

      const moved = dx.current;

      el.style.transition = "";
      el.style.transform = "";

      if (moved >= threshold) onClose?.();

      dx.current = 0;
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [open, onClose, threshold, maxVertical]);

  return ref;
}

function normalizeCategories(data) {
  if (!Array.isArray(data)) return [];
  return data
    .filter(Boolean)
    .filter((c) => c.is_active !== false)
    .map((c) => ({
      id: c.id,
      name: c.name ?? "Unnamed",
      slug: c.slug ?? String(c.id),
      parent: c.parent ?? null,
    }));
}

function buildCategoryTree(cats) {
  const byId = new Map();
  const childrenMap = new Map();

  cats.forEach((c) => {
    byId.set(c.id, { ...c, children: [] });
    childrenMap.set(c.id, []);
  });

  cats.forEach((c) => {
    if (c.parent != null && childrenMap.has(c.parent)) {
      childrenMap.get(c.parent).push(c.id);
    }
  });

  byId.forEach((node, id) => {
    const childIds = childrenMap.get(id) || [];
    node.children = childIds.map((cid) => byId.get(cid)).filter(Boolean);
  });

  const roots = cats
    .filter((c) => c.parent == null || !byId.has(c.parent))
    .map((c) => byId.get(c.id))
    .filter(Boolean);

  const sortNodes = (nodes) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((n) => sortNodes(n.children));
  };
  sortNodes(roots);

  return roots;
}

export default function MarketplaceLayout() {
  const nav = useNavigate();
  const location = useLocation();

  // Context: search/category + resultsCount (Home sets it)
  const { search, setSearch, setActiveCategory, resultsCount } = useMarketplace();

  const [count, setCount] = useState(0);

  const [catLoading, setCatLoading] = useState(true);
  const [catError, setCatError] = useState("");
  const [categories, setCategories] = useState([]);
  const [openParents, setOpenParents] = useState(() => new Set());

  // MOBILE drawers
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCatsOpen, setMobileCatsOpen] = useState(false);

  // animation mount state
  const [menuMounted, setMenuMounted] = useState(false);
  const [catsMounted, setCatsMounted] = useState(false);

  // debounce: local input updates immediately, global search updates after delay
  const [searchInput, setSearchInput] = useState(search || "");

  // ✅ reactive auth snapshot so Navbar flips Login/Logout reliably
  const [authed, setAuthed] = useState(() => isAuthed());
  const [role, setRole] = useState(() => getRole()); // may be null if backend doesn't send role/flags

  useEffect(() => {
    const syncAuth = () => {
      setAuthed(isAuthed());
      setRole(getRole());
    };

    syncAuth();
    window.addEventListener("storage", syncAuth);

    // same-tab fallback (covers login/logout if no custom events)
    const t = setInterval(syncAuth, 500);

    return () => {
      window.removeEventListener("storage", syncAuth);
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    setSearchInput(search || "");
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput, setSearch]);

  // close drawers on route change (mobile)
  useEffect(() => {
    closeMenu();
    closeCats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // lock scroll when any drawer open
  useBodyScrollLock(mobileMenuOpen || mobileCatsOpen);

  // Cart badge count
  useEffect(() => {
    const updateCount = () => {
      const total = getCartItems().reduce((sum, i) => sum + (i.qty || 0), 0);
      setCount(total);
    };

    updateCount();
    window.addEventListener("storage", updateCount);
    const interval = setInterval(updateCount, 500);

    return () => {
      window.removeEventListener("storage", updateCount);
      clearInterval(interval);
    };
  }, []);

  // Fetch categories (public) — use api instance (baseURL)
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setCatLoading(true);
        setCatError("");

        const res = await api.get("/api/products/categories/", {
          timeout: 15000,
          headers: { Accept: "application/json" },
        });

        if (!mounted) return;

        const normalized = normalizeCategories(res.data);
        setCategories(normalized);

        const parentIds = new Set();
        const ids = new Set(normalized.map((c) => c.id));
        normalized.forEach((c) => {
          if (c.parent != null && ids.has(c.parent)) parentIds.add(c.parent);
        });
        setOpenParents(parentIds);
      } catch (e) {
        if (!mounted) return;
        console.error("[Categories] Fetch error:", e);

        const status = e?.response?.status;
        if (status) setCatError(`Failed to load categories (HTTP ${status}).`);
        else setCatError("Failed to load categories (Network/CORS).");
      } finally {
        if (mounted) setCatLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const tree = useMemo(() => buildCategoryTree(categories), [categories]);

  const toggleParent = (id) => {
    setOpenParents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Search submit behavior: go to home/category pages if needed
  const onSubmitSearch = (e) => {
    e.preventDefault();
    const path = location.pathname;
    const isBrowsingPage =
      path === "/" ||
      path.startsWith("/category/") ||
      path.startsWith("/orders") ||
      path.startsWith("/disputes");

    if (!isBrowsingPage) nav("/");
  };

  const clearSearch = () => {
    setSearchInput("");
    setSearch("");
  };

  const goHome = () => {
    setActiveCategory(null);
    nav("/");
  };

  const logout = () => {
    clearAuth();
    setAuthed(false);
    setRole(null);
    nav("/login", { replace: true });
  };

  const renderNode = (node, depth = 0, closeDrawer = null) => {
    const hasChildren = node.children && node.children.length > 0;
    const isOpen = openParents.has(node.id);

    return (
      <li key={node.id}>
        <div className="flex items-center justify-between gap-2" style={{ paddingLeft: depth * 10 }}>
          <button
            type="button"
            onClick={() => {
              setActiveCategory(null);
              nav(`/category/${node.slug}`);
              if (closeDrawer) closeDrawer();
            }}
            className="flex-1 text-left cursor-pointer px-2 py-1 rounded transition hover:text-cyan-600"
          >
            {node.name}
          </button>

          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleParent(node.id)}
              className="text-xs px-2 py-1 rounded hover:bg-gray-100 text-gray-600"
              title={isOpen ? "Collapse" : "Expand"}
            >
              {isOpen ? "▾" : "▸"}
            </button>
          )}
        </div>

        {hasChildren && isOpen && (
          <ul className="mt-1 space-y-1">
            {node.children.map((child) => renderNode(child, depth + 1, closeDrawer))}
          </ul>
        )}
      </li>
    );
  };

  /** ---- Open/Close with smooth animation ---- **/
  const openMenu = () => {
    setMenuMounted(true);
    requestAnimationFrame(() => setMobileMenuOpen(true));
  };
  const openCats = () => {
    setCatsMounted(true);
    requestAnimationFrame(() => setMobileCatsOpen(true));
  };

  const closeMenu = () => {
    setMobileMenuOpen(false);
    setTimeout(() => setMenuMounted(false), 220);
  };
  const closeCats = () => {
    setMobileCatsOpen(false);
    setTimeout(() => setCatsMounted(false), 220);
  };

  // swipe-to-close refs
  const menuSwipeRef = useSwipeToClose({ open: mobileMenuOpen, onClose: closeMenu });
  const catsSwipeRef = useSwipeToClose({ open: mobileCatsOpen, onClose: closeCats });

  // ✅ role label (debug)
  const roleLabel = authed ? role || "unknown" : "guest";

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white shadow p-4 hidden md:block">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Categories</h2>
          <button type="button" onClick={goHome} className="text-xs text-cyan-700 hover:text-cyan-900">
            Home
          </button>
        </div>

        {catLoading && <div className="text-sm text-gray-500">Loading…</div>}
        {!catLoading && catError && <div className="text-sm text-red-600">{catError}</div>}

        {!catLoading && !catError && <ul className="space-y-2 text-sm">{tree.map((n) => renderNode(n))}</ul>}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col">
        {/* Navbar */}
        <nav className="bg-cyan-600 text-white p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Left */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {/* Mobile hamburger */}
              <div className="flex items-center gap-2 md:hidden">
                <button
                  type="button"
                  onClick={openMenu}
                  className="px-3 py-2 rounded-xl bg-black/20 border border-white/25 hover:bg-black/25 active:scale-[0.99] transition"
                  aria-label="Open menu"
                >
                  ☰
                </button>
              </div>

              <Link to="/" className="text-xl font-bold">
                NairobiMart
              </Link>

              {/* ✅ Role badge */}
              <span className="ml-2 text-[11px] px-2 py-1 rounded-lg bg-black/10 border border-white/25">
                {roleLabel}
              </span>
            </div>

            {/* Mobile cart badge */}
            <div className="flex items-center gap-4 md:hidden">
              <Link to="/cart" className="relative text-2xl" aria-label="Cart">
                🛒
                {count > 0 && (
                  <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs px-2 rounded-full">
                    {count}
                  </span>
                )}
              </Link>
            </div>
          </div>

          {/* Search */}
          <form onSubmit={onSubmitSearch} className="w-full md:w-[520px]">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 select-none">🔎</span>

              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search products, category, vendor..."
                className="w-full pl-10 pr-32 py-2.5 rounded-xl bg-white text-gray-900 placeholder:text-gray-400 border border-white/40 shadow-sm focus:outline-none focus:ring-2 focus:ring-yellow-300"
              />

              <span className="absolute right-16 top-1/2 -translate-y-1/2 text-xs px-2 py-1 rounded-lg bg-black/10 border border-white/30">
                {Number(resultsCount) || 0} results
              </span>

              {searchInput?.trim() && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm px-2 py-1 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="text-[11px] text-white/85 mt-1">Debounced search • {Number(resultsCount) || 0} match(es)</div>
          </form>

          {/* Right (desktop) */}
          <div className="hidden md:flex items-center gap-5">
            <Link to="/orders" className="hover:text-yellow-200 font-medium">
              Orders
            </Link>
            <Link to="/disputes" className="hover:text-yellow-200 font-medium">
              Disputes
            </Link>

            {/* ✅ Vendor/Admin links use robust helpers (handles Django flags) */}
            {authed && isVendor() ? (
              <Link to="/vendor" className="hover:text-yellow-200 font-semibold">
                Vendor
              </Link>
            ) : null}
            {authed && isAdmin() ? (
              <Link to="/admin" className="hover:text-yellow-200 font-semibold">
                Admin
              </Link>
            ) : null}

            {/* Auth button */}
            {authed ? (
              <button onClick={logout} className="hover:text-yellow-200 font-medium">
                Logout
              </button>
            ) : (
              <Link to="/login" className="hover:text-yellow-200 font-medium">
                Login
              </Link>
            )}

            <Link to="/cart" className="relative text-2xl" aria-label="Cart">
              🛒
              {count > 0 && (
                <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-xs px-2 rounded-full">
                  {count}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile shortcut */}
          <div className="flex md:hidden gap-4 text-sm">
            <button
              type="button"
              onClick={goHome}
              className="hover:text-yellow-200 font-medium underline decoration-white/30"
            >
              Home
            </button>
          </div>
        </nav>

        {/* Mobile Categories Drawer */}
        {catsMounted && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              className={[
                "absolute inset-0 bg-black/50 transition-opacity duration-200",
                mobileCatsOpen ? "opacity-100" : "opacity-0",
              ].join(" ")}
              aria-label="Close categories overlay"
              onClick={closeCats}
            />

            <aside
              ref={catsSwipeRef}
              className={[
                "absolute left-0 top-0 h-full w-[86%] max-w-[360px] bg-white shadow-xl p-4 overflow-y-auto",
                "transform transition-transform duration-200 ease-out will-change-transform",
                mobileCatsOpen ? "translate-x-0" : "-translate-x-full",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="font-extrabold text-lg">Categories</div>
                <button
                  type="button"
                  onClick={closeCats}
                  className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
                  aria-label="Close categories"
                >
                  ✕
                </button>
              </div>

              <div className="flex items-center justify-between mb-4">
                <button
                  type="button"
                  onClick={() => {
                    goHome();
                    closeCats();
                  }}
                  className="text-sm text-cyan-700 hover:text-cyan-900 font-semibold"
                >
                  Home
                </button>
                <div className="text-xs text-gray-500">{Number(resultsCount) || 0} results</div>
              </div>

              <div className="text-[11px] text-gray-500 mb-3">Swipe right to close</div>

              {catLoading && <div className="text-sm text-gray-500">Loading…</div>}
              {!catLoading && catError && <div className="text-sm text-red-600">{catError}</div>}

              {!catLoading && !catError && (
                <ul className="space-y-2 text-sm">{tree.map((n) => renderNode(n, 0, closeCats))}</ul>
              )}
            </aside>
          </div>
        )}

        {/* Mobile Side Menu Drawer */}
        {menuMounted && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
            <button
              type="button"
              className={[
                "absolute inset-0 bg-black/50 transition-opacity duration-200",
                mobileMenuOpen ? "opacity-100" : "opacity-0",
              ].join(" ")}
              aria-label="Close menu overlay"
              onClick={closeMenu}
            />

            <aside
              ref={menuSwipeRef}
              className={[
                "absolute left-0 top-0 h-full w-[78%] max-w-[320px] bg-white shadow-xl p-4",
                "transform transition-transform duration-200 ease-out will-change-transform",
                mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="font-extrabold text-lg">Menu</div>
                <button
                  type="button"
                  onClick={closeMenu}
                  className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
                  aria-label="Close menu"
                >
                  ✕
                </button>
              </div>

              <div className="text-[11px] text-gray-500 mb-3">Swipe right to close</div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    goHome();
                    closeMenu();
                  }}
                  className="w-full text-left px-3 py-3 rounded-xl border bg-white hover:bg-gray-50"
                >
                  Home
                </button>

                <button
                  type="button"
                  onClick={() => {
                    openCats();
                    closeMenu();
                  }}
                  className="w-full text-left px-3 py-3 rounded-xl border bg-white hover:bg-gray-50"
                >
                  Categories
                </button>

                <Link to="/orders" onClick={closeMenu} className="block px-3 py-3 rounded-xl border bg-white hover:bg-gray-50">
                  Orders
                </Link>

                <Link to="/disputes" onClick={closeMenu} className="block px-3 py-3 rounded-xl border bg-white hover:bg-gray-50">
                  Disputes
                </Link>

                {/* ✅ Vendor/Admin links use robust helpers */}
                {authed && isVendor() ? (
                  <Link to="/vendor" onClick={closeMenu} className="block px-3 py-3 rounded-xl border bg-white hover:bg-gray-50">
                    Vendor Dashboard
                  </Link>
                ) : null}
                {authed && isAdmin() ? (
                  <Link to="/admin" onClick={closeMenu} className="block px-3 py-3 rounded-xl border bg-white hover:bg-gray-50">
                    Admin Dashboard
                  </Link>
                ) : null}

                {authed ? (
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      closeMenu();
                    }}
                    className="w-full text-left px-3 py-3 rounded-xl border bg-white hover:bg-gray-50"
                  >
                    Logout
                  </button>
                ) : (
                  <Link to="/login" onClick={closeMenu} className="block px-3 py-3 rounded-xl border bg-white hover:bg-gray-50">
                    Login
                  </Link>
                )}

                <Link
                  to="/cart"
                  onClick={closeMenu}
                  className="flex items-center justify-between px-3 py-3 rounded-xl border bg-white hover:bg-gray-50"
                >
                  <span>Cart</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-yellow-400 text-black">{count}</span>
                </Link>
              </div>

              <div className="mt-5 text-xs text-gray-500">
                Tip: use “Categories” to browse fast • {Number(resultsCount) || 0} match(es)
              </div>
            </aside>
          </div>
        )}

        <main className="p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}