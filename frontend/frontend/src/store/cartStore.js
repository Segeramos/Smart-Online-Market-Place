const CART_KEY = "cart";

function safeParse(raw, fallback) {
  try {
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function save(items) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function read() {
  return safeParse(localStorage.getItem(CART_KEY), []);
}

/**
 * Stored cart item shape (this store normalizes to this):
 * {
 *   id: string|number,
 *   slug: string,
 *   name: string,
 *   price: number,
 *   best_price?: number,
 *   base_price?: number,
 *   image?: string,
 *   qty: number
 * }
 */

function toNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeQty(q) {
  const n = Math.floor(toNumber(q, 1));
  return Math.max(1, n);
}

function bestId(p) {
  return p?.id ?? p?._id ?? p?.slug;
}

function bestPrice(p) {
  // Keep your existing field expectations
  const v = p?.best_price ?? p?.price ?? p?.base_price ?? 0;
  return toNumber(v, 0);
}

/** ✅ used by ProductDetail.jsx */
export function addToCart(product, qty = 1) {
  const items = read();

  const id = bestId(product);
  const slug = product?.slug;
  const name = product?.name || product?.title;
  const price = bestPrice(product);
  const image = product?.image || product?.thumbnail || product?.image_url;

  if (!slug || !name) {
    throw new Error("Product must have at least slug and name/title.");
  }

  const key = id ?? slug;
  const idx = items.findIndex((x) => (x.id ?? x.slug) === key);

  if (idx >= 0) {
    items[idx].qty = normalizeQty(toNumber(items[idx].qty, 1) + toNumber(qty, 1));
  } else {
    items.push({
      id: key,
      slug,
      name,
      price,
      best_price: product?.best_price,
      base_price: product?.base_price,
      image,
      qty: normalizeQty(qty),
    });
  }

  save(items);
  return items;
}

/** ✅ used by Cart.jsx */
export function getCartItems() {
  return read();
}

/** ✅ used by Cart.jsx */
export function clearCart() {
  save([]);
  return [];
}

/** ✅ used by Cart.jsx */
export function removeFromCart(slugOrId) {
  const items = read().filter((x) => (x.slug ?? x.id) !== slugOrId && (x.id ?? x.slug) !== slugOrId);
  save(items);
  return items;
}

/** ✅ used by Cart.jsx */
export function updateQty(slugOrId, qty) {
  const items = read();
  const q = normalizeQty(qty);

  const idx = items.findIndex((x) => (x.slug ?? x.id) === slugOrId || (x.id ?? x.slug) === slugOrId);
  if (idx < 0) return items;

  items[idx].qty = q;
  save(items);
  return items;
}

/** ✅ used by Cart.jsx */
export function cartTotals(items = read()) {
  const subtotal = items.reduce((sum, i) => {
    const price = bestPrice(i);
    const qty = normalizeQty(i?.qty);
    return sum + price * qty;
  }, 0);

  const count = items.reduce((sum, i) => sum + normalizeQty(i?.qty), 0);

  return { subtotal, count };
}
