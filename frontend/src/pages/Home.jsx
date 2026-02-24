import { useEffect, useMemo, useState } from "react";
import { getProducts } from "../api/products";
import ProductCard from "../components/ProductCard";
import SkeletonProductCard from "../components/SkeletonProductCard";
import { useMarketplace } from "../context/MarketplaceContext.jsx";
import { Link } from "react-router-dom";
import api from "../api/axios"; // ✅ your axios instance (JWT/baseURL)
import { getRecentlyViewed } from "../utils/localLists";

function safeLower(v) {
  return (v ?? "").toString().toLowerCase();
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function getBestPrice(p) {
  const best = toNumber(p?.best_price);
  const fallback = toNumber(p?.price ?? p?.base_price);
  return best > 0 ? best : fallback;
}

function isInStock(p) {
  // your products have offers[].stock sometimes, but product.stock may not exist
  if (p?.stock == null) return getBestPrice(p) > 0;
  return toNumber(p.stock) > 0;
}

function hasOffers(p) {
  return typeof p?.total_offers === "number" ? p.total_offers > 0 : false;
}

function getVendorName(p) {
  if (typeof p?.vendor_name === "string" && p.vendor_name.trim())
    return p.vendor_name.trim();
  if (typeof p?.vendor === "string" && p.vendor.trim()) return p.vendor.trim();
  if (p?.vendor && typeof p.vendor === "object") {
    return (p.vendor.name ||
      p.vendor.shop_name ||
      p.vendor.email ||
      p.vendor.id ||
      "")
      .toString()
      .trim();
  }
  // ✅ your API often stores vendors in offers[]
  const offerVendor = p?.offers?.[0]?.vendor;
  if (typeof offerVendor === "string" && offerVendor.trim())
    return offerVendor.trim();
  return "";
}

// ✅ robust category match (slug vs name vs id vs object)
function matchesCategory(product, categorySlug, categorySlugToId, categorySlugToName) {
  if (!categorySlug) return true;

  const wantedSlugLower = safeLower(categorySlug);

  // Product category can be string (NAME)
  if (typeof product?.category === "string") {
    const prodNameLower = safeLower(product.category);
    const prodSlugLower = prodNameLower.replace(/\s+/g, "-");
    if (prodSlugLower === wantedSlugLower) return true; // "home appliances" -> "home-appliances"
    if (prodNameLower === wantedSlugLower) return true; // if they pass name
  }

  // Product category could be explicit slug fields
  const prodSlug = product?.category_slug || product?.categorySlug;
  if (prodSlug && safeLower(prodSlug) === wantedSlugLower) return true;

  // Product category could be an object
  const catObj =
    product?.category && typeof product.category === "object" ? product.category : null;
  if (catObj) {
    if (catObj.slug && safeLower(catObj.slug) === wantedSlugLower) return true;

    // object name to slug compare
    if (catObj.name && safeLower(catObj.name).replace(/\s+/g, "-") === wantedSlugLower)
      return true;

    const wantedId = categorySlugToId?.get?.(wantedSlugLower);
    const prodId = catObj.id ?? catObj._id ?? catObj.pk;
    if (wantedId != null && prodId != null && String(prodId) === String(wantedId))
      return true;
  }

  // product category stored as id
  const wantedId = categorySlugToId?.get?.(wantedSlugLower);
  const prodCategoryId = product?.category_id ?? product?.categoryId;
  if (wantedId != null && prodCategoryId != null && String(prodCategoryId) === String(wantedId)) {
    return true;
  }

  // fallback: wanted slug -> category name mapping (from categories endpoint)
  const wantedName = categorySlugToName?.get?.(wantedSlugLower);
  if (wantedName && typeof product?.category === "string") {
    if (safeLower(product.category) === safeLower(wantedName)) return true;
    if (safeLower(product.category).replace(/\s+/g, "-") === wantedSlugLower) return true;
  }

  return false;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// ✅ build descendant slugs set for a selected category (so parent includes subcategories)
function buildDescendantSlugSet(wantedSlug, categoriesRaw) {
  const wanted = safeLower(wantedSlug);
  if (!wanted) return new Set();

  const cats = Array.isArray(categoriesRaw) ? categoriesRaw : [];

  // Build quick lookups
  const slugToId = new Map();
  const idToSlug = new Map();
  const childrenById = new Map();

  cats.forEach((c) => {
    const slug = safeLower(c?.slug ?? c?.name);
    const id = c?.id;
    if (!slug || id == null) return;
    slugToId.set(slug, id);
    idToSlug.set(id, slug);
    if (!childrenById.has(id)) childrenById.set(id, []);
  });

  cats.forEach((c) => {
    const id = c?.id;
    const parent = c?.parent ?? null;
    if (id == null) return;
    if (parent != null) {
      if (!childrenById.has(parent)) childrenById.set(parent, []);
      childrenById.get(parent).push(id);
    }
  });

  const rootId = slugToId.get(wanted);
  const result = new Set([wanted]);

  if (rootId == null) return result;

  // BFS descendants
  const q = [rootId];
  const seen = new Set([rootId]);

  while (q.length) {
    const cur = q.shift();
    const kids = childrenById.get(cur) || [];
    for (const kid of kids) {
      if (seen.has(kid)) continue;
      seen.add(kid);
      q.push(kid);
      const kidSlug = idToSlug.get(kid);
      if (kidSlug) result.add(kidSlug);
    }
  }

  return result;
}

export default function Home({ forcedCategory = null }) {
  const marketplace = useMarketplace?.() ?? {};
  const search = marketplace.search ?? "";
  const activeCategory = marketplace.activeCategory ?? null;
  const setResultsCount =
    typeof marketplace.setResultsCount === "function" ? marketplace.setResultsCount : null;

  const effectiveCategory = forcedCategory || activeCategory;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ✅ category maps from backend categories endpoint
  const [catSlugToId, setCatSlugToId] = useState(() => new Map());
  const [catSlugToName, setCatSlugToName] = useState(() => new Map());

  // ✅ keep raw categories so we can compute subcategories/descendants
  const [categoriesRaw, setCategoriesRaw] = useState([]);

  // ✅ Recently viewed (localStorage)
  const [recent, setRecent] = useState([]);

  // Sorting + toggles
  const [sortBy, setSortBy] = useState("PRICE_ASC");
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyWithOffers, setOnlyWithOffers] = useState(false);

  // Vendor filter
  const [vendor, setVendor] = useState("ALL");

  // Price range
  const [priceMin, setPriceMin] = useState(0);
  const [priceMax, setPriceMax] = useState(0);
  const [priceRangeReady, setPriceRangeReady] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(16);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);
        setError("");

        // ✅ if you later want server-side filtering/pagination, pass params here
        const params = {
          // page: 1,
          // page_size: 100,
          // search: search || undefined,
          // category: effectiveCategory || undefined,
        };

        const [productsData, catRes] = await Promise.all([
          getProducts(params),
          api.get("/api/products/categories/").catch(() => ({ data: [] })),
        ]);

        if (!mounted) return;

        // ✅ DEBUG 1: raw response
        console.log("RAW productsData:", productsData);

        // ✅ normalize both array + paginated
        const items = Array.isArray(productsData) ? productsData : productsData?.results || [];

        console.log("NORMALIZED items length:", items.length, items);

        setProducts(items);

        const cats = Array.isArray(catRes?.data) ? catRes.data : [];
        setCategoriesRaw(cats);

        const mId = new Map();
        const mName = new Map();

        cats.forEach((c) => {
          const slugLower = safeLower(c?.slug ?? c?.name);
          if (!slugLower) return;
          if (c?.id != null) mId.set(slugLower, c.id);
          if (c?.name) mName.set(slugLower, c.name);
        });

        setCatSlugToId(mId);
        setCatSlugToName(mName);

        // ✅ load recently viewed from localStorage
        setRecent(getRecentlyViewed());
      } catch (err) {
        if (!mounted) return;
        console.log(err);
        setError("Failed to load products.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ Keep recently viewed fresh if user navigates back to Home
  useEffect(() => {
    setRecent(getRecentlyViewed());
  }, [effectiveCategory, search]);

  // ✅ If user clicks a parent category, include its children (and deeper descendants)
  const includedCategorySlugs = useMemo(() => {
    if (!effectiveCategory) return new Set();
    return buildDescendantSlugSet(effectiveCategory, categoriesRaw);
  }, [effectiveCategory, categoriesRaw]);

  // ✅ subcategories for UI chips (direct children only, like Jumia)
  const subcategories = useMemo(() => {
    if (!effectiveCategory) return [];
    const wanted = safeLower(effectiveCategory);
    const parentId = catSlugToId.get(wanted);
    if (parentId == null) return [];

    const kids = (Array.isArray(categoriesRaw) ? categoriesRaw : []).filter(
      (c) =>
        c?.parent != null &&
        String(c.parent) === String(parentId) &&
        c?.is_active !== false
    );

    return kids
      .map((c) => ({
        id: c.id,
        name: c.name ?? c.slug ?? "Unnamed",
        slug: c.slug ?? String(c.id),
      }))
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [effectiveCategory, categoriesRaw, catSlugToId]);

  // Daily deals only on homepage
  const dailyDeals = useMemo(() => {
    return [...products]
      .filter((p) => getBestPrice(p) > 0)
      .sort((a, b) => getBestPrice(a) - getBestPrice(b))
      .slice(0, 8);
  }, [products]);

  // Base filtered (search + category + toggles + vendor)
  const baseFiltered = useMemo(() => {
    const q = safeLower(search).trim();

    let list = products.filter((p) => {
      const vendorName = getVendorName(p);
      const categoryStr = typeof p?.category === "string" ? p.category : "";

      const matchesSearch =
        !q ||
        safeLower(p?.name).includes(q) ||
        safeLower(p?.slug).includes(q) ||
        safeLower(p?.brand).includes(q) ||
        safeLower(p?.description).includes(q) ||
        safeLower(categoryStr).includes(q) ||
        safeLower(vendorName).includes(q);

      // ✅ category match: parent includes all descendants
      let okCategory = true;
      if (effectiveCategory) {
        const slugsToTry =
          includedCategorySlugs && includedCategorySlugs.size > 0
            ? Array.from(includedCategorySlugs)
            : [effectiveCategory];

        okCategory = slugsToTry.some((slug) =>
          matchesCategory(p, slug, catSlugToId, catSlugToName)
        );
      }

      return matchesSearch && okCategory;
    });

    if (onlyInStock) list = list.filter((p) => isInStock(p));
    if (onlyWithOffers) list = list.filter((p) => hasOffers(p));
    if (vendor !== "ALL") list = list.filter((p) => getVendorName(p) === vendor);

    return list;
  }, [
    products,
    search,
    effectiveCategory,
    includedCategorySlugs,
    onlyInStock,
    onlyWithOffers,
    vendor,
    catSlugToId,
    catSlugToName,
  ]);

  // Vendor dropdown options
  const vendorOptions = useMemo(() => {
    const set = new Set();
    baseFiltered.forEach((p) => {
      const v = getVendorName(p);
      if (v) set.add(v);
    });
    return ["ALL", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [baseFiltered]);

  // Price bounds from baseFiltered
  const derivedPriceBounds = useMemo(() => {
    const prices = baseFiltered.map(getBestPrice).filter((x) => x > 0);
    if (prices.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }, [baseFiltered]);

  // Init / clamp slider when bounds change
  useEffect(() => {
    const { min, max } = derivedPriceBounds;

    if (min === 0 && max === 0) {
      setPriceMin(0);
      setPriceMax(0);
      setPriceRangeReady(false);
      return;
    }

    if (!priceRangeReady) {
      setPriceMin(min);
      setPriceMax(max);
      setPriceRangeReady(true);
      return;
    }

    setPriceMin((prev) => clamp(prev || min, min, max));
    setPriceMax((prev) => clamp(prev || max, min, max));
  }, [derivedPriceBounds, priceRangeReady]);

  // Apply price range + sorting
  const filteredAndSorted = useMemo(() => {
    let list = [...baseFiltered];

    if (priceRangeReady && (priceMin > 0 || priceMax > 0)) {
      list = list.filter((p) => {
        const bp = getBestPrice(p);
        if (bp <= 0) return false;
        return bp >= priceMin && bp <= priceMax;
      });
    }

    list.sort((a, b) => {
      if (sortBy === "PRICE_ASC") return getBestPrice(a) - getBestPrice(b);
      if (sortBy === "PRICE_DESC") return getBestPrice(b) - getBestPrice(a);
      if (sortBy === "OFFERS_DESC") return toNumber(b?.total_offers) - toNumber(a?.total_offers);
      if (sortBy === "NAME_ASC") return safeLower(a?.name).localeCompare(safeLower(b?.name));
      return 0;
    });

    return list;
  }, [baseFiltered, priceRangeReady, priceMin, priceMax, sortBy]);

  // ✅ push results count to navbar (guarded)
  useEffect(() => {
    if (setResultsCount) setResultsCount(filteredAndSorted.length);
  }, [filteredAndSorted.length, setResultsCount]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [
    search,
    effectiveCategory,
    sortBy,
    onlyInStock,
    onlyWithOffers,
    vendor,
    priceMin,
    priceMax,
    pageSize,
  ]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filteredAndSorted.length / pageSize)),
    [filteredAndSorted.length, pageSize]
  );

  const currentPage = clamp(page, 1, totalPages);

  const pagedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredAndSorted.slice(start, start + pageSize);
  }, [filteredAndSorted, currentPage, pageSize]);

  const clearLocalFilters = () => {
    setSortBy("PRICE_ASC");
    setOnlyInStock(false);
    setOnlyWithOffers(false);
    setVendor("ALL");
    setPageSize(16);
    setPage(1);

    const { min, max } = derivedPriceBounds;
    if (min > 0 && max > 0) {
      setPriceMin(min);
      setPriceMax(max);
      setPriceRangeReady(true);
    } else {
      setPriceMin(0);
      setPriceMax(0);
      setPriceRangeReady(false);
    }
  };

  const pageButtons = useMemo(() => {
    const buttons = [];
    const maxBtns = 5;

    let start = Math.max(1, currentPage - Math.floor(maxBtns / 2));
    let end = start + maxBtns - 1;
    if (end > totalPages) {
      end = totalPages;
      start = Math.max(1, end - maxBtns + 1);
    }

    for (let i = start; i <= end; i++) buttons.push(i);
    return buttons;
  }, [currentPage, totalPages]);

  const categoryLabel = useMemo(() => {
    if (!forcedCategory && !effectiveCategory) return null;
    const slug = safeLower(forcedCategory || effectiveCategory);
    const name = catSlugToName.get(slug);
    return name || (forcedCategory || effectiveCategory);
  }, [forcedCategory, effectiveCategory, catSlugToName]);

  return (
    <div className="space-y-8">
      {/* HERO + DAILY DEALS only on homepage */}
      {!forcedCategory && (
        <>
          <section className="rounded-2xl bg-gradient-to-r from-cyan-600 to-yellow-400 text-white p-6 md:p-8 shadow">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="max-w-2xl">
                <h1 className="text-2xl md:text-4xl font-extrabold leading-tight">
                  NairobiMart — Best Prices from Multiple Vendors
                </h1>
                <p className="mt-3 text-white/90">
                  Compare offers automatically, shop confidently, and pay securely via M-Pesa.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href="#deals"
                    className="px-4 py-2 rounded-xl bg-white text-cyan-700 font-semibold hover:bg-white/90"
                  >
                    See Daily Deals
                  </a>

                  <a
                    href="#products"
                    className="px-4 py-2 rounded-xl bg-black/20 text-white border border-white/30 hover:bg-black/25"
                  >
                    Browse Products
                  </a>

                  <Link
                    to="/orders"
                    className="px-4 py-2 rounded-xl bg-black/20 text-white border border-white/30 hover:bg-black/25"
                  >
                    My Orders
                  </Link>
                </div>
              </div>

              <div className="rounded-2xl bg-white/15 border border-white/30 p-4 w-full md:w-[360px]">
                <div className="text-sm text-white/90">Today’s tip</div>
                <div className="mt-2 font-bold text-lg">Best Price = lowest offer</div>
                <div className="text-sm text-white/85 mt-1">
                  NairobiMart picks the cheapest vendor offer so you don’t have to compare manually.
                </div>
              </div>
            </div>
          </section>

          <section id="deals" className="space-y-3">
            <div className="flex items-end justify-between">
              <h2 className="text-xl font-extrabold">Daily Deals</h2>
              <div className="text-sm text-gray-600">Cheapest best_price picks</div>
            </div>

            {loading && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <SkeletonProductCard key={i} />
                ))}
              </div>
            )}

            {!loading && error && <div className="text-red-600">{error}</div>}

            {!loading && !error && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {dailyDeals.map((p) => (
                  <ProductCard key={p.slug || p.id || p._id} product={p} />
                ))}
              </div>
            )}
          </section>

          {/* ✅ Recently Viewed (only on homepage) */}
          {recent.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-end justify-between">
                <h2 className="text-xl font-extrabold">Recently Viewed</h2>
                <div className="text-sm text-gray-600">Pick up where you left off</div>
              </div>

              <div className="flex gap-3 overflow-x-auto pb-2">
                {recent.map((r) => (
                  <Link
                    key={r.slug}
                    to={`/product/${r.slug}`}
                    className="min-w-[220px] bg-white border rounded-2xl shadow-sm hover:shadow-md transition overflow-hidden"
                  >
                    <div className="h-28 bg-gray-100 flex items-center justify-center">
                      {r.image ? (
                        <img src={r.image} alt={r.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-sm text-gray-500">Image</span>
                      )}
                    </div>
                    <div className="p-3">
                      <div className="font-semibold text-sm text-gray-900 line-clamp-2">
                        {r.name}
                      </div>
                      <div className="mt-1 text-sm text-cyan-700 font-extrabold">
                        KSh {toNumber(r.best_price).toFixed(0)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* PRODUCTS */}
      <section id="products" className="space-y-3">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <h2 className="text-xl font-extrabold">
                {forcedCategory ? `Category: ${categoryLabel}` : "Products"}
              </h2>

              <div className="text-sm text-gray-600">
                Showing <span className="font-semibold">{filteredAndSorted.length}</span> item(s)
                {effectiveCategory ? (
                  <>
                    {" "}
                    • Category:{" "}
                    <span className="font-semibold">{categoryLabel || effectiveCategory}</span>
                  </>
                ) : null}
                {search ? (
                  <>
                    {" "}
                    • Search: <span className="font-semibold">"{search}"</span>
                  </>
                ) : null}
                {forcedCategory && (
                  <>
                    {" "}
                    •{" "}
                    <Link to="/" className="text-cyan-700 hover:underline">
                      Back to Home
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="border rounded-xl px-3 py-2 bg-white"
              >
                <option value="PRICE_ASC">Sort: Price (Low → High)</option>
                <option value="PRICE_DESC">Sort: Price (High → Low)</option>
                <option value="OFFERS_DESC">Sort: Most Offers</option>
                <option value="NAME_ASC">Sort: Name (A → Z)</option>
              </select>

              <select
                value={vendor}
                onChange={(e) => setVendor(e.target.value)}
                className="border rounded-xl px-3 py-2 bg-white"
                title="Filter by vendor"
              >
                {vendorOptions.map((v) => (
                  <option key={v} value={v}>
                    {v === "ALL" ? "Vendor: All" : v}
                  </option>
                ))}
              </select>

              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) || 16)}
                className="border rounded-xl px-3 py-2 bg-white"
                title="Items per page"
              >
                <option value={8}>8 / page</option>
                <option value={16}>16 / page</option>
                <option value={24}>24 / page</option>
                <option value={32}>32 / page</option>
              </select>

              <button
                type="button"
                onClick={clearLocalFilters}
                className="border rounded-xl px-3 py-2 bg-white hover:bg-gray-50 text-sm"
              >
                Clear filters
              </button>
            </div>
          </div>

          {/* ✅ Subcategories chips (only when current category has children) */}
          {effectiveCategory && subcategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-600 mr-1">Subcategories:</span>

              <Link
                to={`/category/${safeLower(effectiveCategory)}`}
                className="text-sm px-3 py-1.5 rounded-full border bg-white hover:bg-gray-50"
              >
                All in {categoryLabel || effectiveCategory}
              </Link>

              {subcategories.map((sc) => (
                <Link
                  key={sc.id || sc.slug}
                  to={`/category/${sc.slug}`}
                  className="text-sm px-3 py-1.5 rounded-full border bg-white hover:bg-gray-50 hover:border-cyan-300"
                >
                  {sc.name}
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Toggles + Price slider */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 border rounded-xl px-3 py-2 bg-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                />
                <span className="text-sm">In stock</span>
              </label>

              <label className="flex items-center gap-2 border rounded-xl px-3 py-2 bg-white cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyWithOffers}
                  onChange={(e) => setOnlyWithOffers(e.target.checked)}
                />
                <span className="text-sm">Has offers</span>
              </label>
            </div>

            {/* Price range */}
            <div className="flex-1 md:max-w-xl">
              <div className="flex items-center justify-between text-sm text-gray-700">
                <span className="font-semibold">Price range</span>
                <span className="text-gray-600">
                  KSh {priceMin.toFixed(0)} — KSh {priceMax.toFixed(0)}
                </span>
              </div>

              {derivedPriceBounds.max === 0 ? (
                <div className="text-xs text-gray-500 mt-1">No priced items available for range.</div>
              ) : (
                <div className="mt-2 space-y-2">
                  <input
                    type="range"
                    min={derivedPriceBounds.min}
                    max={derivedPriceBounds.max}
                    value={priceMin}
                    onChange={(e) => setPriceMin(Math.min(toNumber(e.target.value), priceMax))}
                    className="w-full"
                  />

                  <input
                    type="range"
                    min={derivedPriceBounds.min}
                    max={derivedPriceBounds.max}
                    value={priceMax}
                    onChange={(e) => setPriceMax(Math.max(toNumber(e.target.value), priceMin))}
                    className="w-full"
                  />

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
                      onClick={() => {
                        setPriceMin(derivedPriceBounds.min);
                        setPriceMax(derivedPriceBounds.max);
                      }}
                    >
                      Reset price range
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {error && !loading && <div className="text-red-600">{error}</div>}

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: pageSize }).map((_, i) => (
              <SkeletonProductCard key={i} />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {pagedProducts.map((p) => (
                <ProductCard key={p.slug || p.id || p._id} product={p} />
              ))}
            </div>

            {filteredAndSorted.length === 0 && (
              <div className="text-gray-500">
                No products match your filters.
                {forcedCategory && (
                  <>
                    {" "}
                    <Link to="/" className="text-cyan-700 underline">
                      Go Home
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* Pagination */}
            {filteredAndSorted.length > 0 && (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
                <div className="text-sm text-gray-600">
                  Page <span className="font-semibold">{currentPage}</span> of{" "}
                  <span className="font-semibold">{totalPages}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                    className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Prev
                  </button>

                  {pageButtons[0] > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() => setPage(1)}
                        className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
                      >
                        1
                      </button>
                      <span className="text-gray-400 px-1">…</span>
                    </>
                  )}

                  {pageButtons.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPage(n)}
                      className={[
                        "px-3 py-2 rounded-xl border hover:bg-gray-50",
                        n === currentPage
                          ? "bg-cyan-600 text-white border-cyan-600 hover:bg-cyan-700"
                          : "bg-white",
                      ].join(" ")}
                    >
                      {n}
                    </button>
                  ))}

                  {pageButtons[pageButtons.length - 1] < totalPages && (
                    <>
                      <span className="text-gray-400 px-1">…</span>
                      <button
                        type="button"
                        onClick={() => setPage(totalPages)}
                        className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50"
                      >
                        {totalPages}
                      </button>
                    </>
                  )}

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                    className="px-3 py-2 rounded-xl border bg-white hover:bg-gray-50 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}