const WISHLIST_KEY = "nm_wishlist";
const RECENT_KEY = "nm_recently_viewed";
const MAX_RECENT = 12;

function safeParse(v, fallback) {
  try {
    const x = JSON.parse(v);
    return x ?? fallback;
  } catch {
    return fallback;
  }
}

export function getWishlist() {
  return new Set(safeParse(localStorage.getItem(WISHLIST_KEY), []));
}

export function toggleWishlist(slug) {
  const set = getWishlist();
  if (set.has(slug)) set.delete(slug);
  else set.add(slug);
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(Array.from(set)));
  return set;
}

export function isWishlisted(slug) {
  return getWishlist().has(slug);
}

export function getRecentlyViewed() {
  return safeParse(localStorage.getItem(RECENT_KEY), []);
}

export function addRecentlyViewed(item) {
  // item: { slug, name, best_price, image? }
  const list = getRecentlyViewed();
  const filtered = list.filter((x) => x?.slug !== item?.slug);
  filtered.unshift(item);
  const next = filtered.slice(0, MAX_RECENT);
  localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}
