import api from "./axios";

/**
 * Tries a list of paths; returns the first successful response.
 * Falls through on:
 *  - 404 (not found)
 *  - 401/403 (exists but requires auth) → try next candidate because another endpoint may be public
 *
 * Any other error (500/etc) is thrown immediately.
 */
async function getFirstWorking(paths = [], params) {
  let lastErr = null;

  for (const path of paths) {
    try {
      const { data } = await api.get(path, params ? { params } : undefined);
      return data;
    } catch (e) {
      const status = e?.response?.status;

      // ✅ DEBUG which endpoint failed (super useful)
      console.log("[getFirstWorking] failed:", { path, status, params, data: e?.response?.data });

      // Treat these as "try next candidate"
      if (status === 404 || status === 401 || status === 403) {
        lastErr = e;
        continue;
      }

      // Any other error means endpoint exists and is broken (500/etc)
      throw e;
    }
  }

  // If we tried everything and none worked, throw last error
  throw lastErr || new Error("No working endpoint found");
}

/**
 * Normalize DRF-ish responses:
 * - Array => return it
 * - Paginated => return results
 * - Otherwise => []
 */
function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

/**
 * PUBLIC + API CATALOG
 * Your backend may mount these routes differently depending on urls.py,
 * so we try common patterns.
 */
export async function getCategories(params = {}) {
  const data = await getFirstWorking(
    [
      // Most common DRF patterns:
      "/api/categories/",
      "/api/products/categories/",
      "/api/products/categories", // just in case
      // Root-mounted patterns:
      "/categories/",
      "/products/categories/",
    ],
    params
  );

  return normalizeList(data);
}

export async function getProducts(params = {}) {
  // ✅ Return RAW response so Home can log and normalize (and you can debug)
  return getFirstWorking(
    [
      // Most common:
      "/api/products/",
      "/api/products/products/",
      "/api/catalog/products/",
      // Root-mounted:
      "/products/",
      "/products/products/",
    ],
    params
  );
}

// Optional convenience (always array)
export async function getProductsList(params = {}) {
  const data = await getProducts(params);
  return normalizeList(data);
}

export async function getProductBySlug(slug) {
  return getFirstWorking([
    "/api/products/" + slug + "/",
    "/api/products/products/" + slug + "/",
    "/products/" + slug + "/",
    "/products/products/" + slug + "/",
  ]);
}

/**
 * Keep your explicit API namespace helpers unchanged
 */
export async function apiGetCategories(params = {}) {
  const { data } = await api.get("/api/products/categories/", { params });
  return normalizeList(data);
}

export async function apiGetProducts(params = {}) {
  const { data } = await api.get("/api/products/products/", { params });
  return data; // raw
}

export async function apiGetProductsList(params = {}) {
  const data = await apiGetProducts(params);
  return normalizeList(data);
}

export async function apiGetProductBySlug(slug) {
  const { data } = await api.get(`/api/products/products/${slug}/`);
  return data;
}