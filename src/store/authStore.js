// src/store/authStore.js

import api from "../api/axios";

const AUTH_KEY = "auth";
const AUTH_EVENT = "auth:changed";

function emitAuthChanged() {
  // same-tab reactive updates (Navbar, RoleRoute, etc.)
  window.dispatchEvent(new Event(AUTH_EVENT));
}

/** Subscribe to same-tab auth changes. Returns an unsubscribe function. */
export function onAuthChanged(handler) {
  window.addEventListener(AUTH_EVENT, handler);
  return () => window.removeEventListener(AUTH_EVENT, handler);
}

export function saveAuth(payload) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(payload));
  emitAuthChanged();
}

export function getAuth() {
  const raw = localStorage.getItem(AUTH_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  emitAuthChanged();
}

export function getTokens() {
  const a = getAuth();
  return a?.tokens || null;
}

export function isAuthed() {
  const t = getTokens();
  return !!t?.access;
}

export function getAccessToken() {
  const t = getTokens();
  return t?.access || null;
}

export function getUser() {
  const a = getAuth();
  return a?.user || null;
}

export function normalizeRole(role) {
  const r = (role ?? "").toString().trim().toLowerCase();
  if (r === "admin" || r === "administrator" || r === "staff") return "admin";
  if (r === "vendor" || r === "seller") return "vendor";
  if (r === "customer" || r === "buyer" || r === "user") return "customer";
  return r || null;
}

/**
 * Returns role normalized: "admin" | "vendor" | "customer" | null
 * Supports backend variations: role, user_role, type, is_admin, is_staff
 */
export function getRole() {
  const u = getUser();

  const roleRaw = u?.role ?? u?.user_role ?? u?.type ?? null;
  const normalized = normalizeRole(roleRaw);
  if (normalized) return normalized;

  if (u?.is_admin === true || u?.is_staff === true) return "admin";

  return null;
}

export function isAdmin() {
  return getRole() === "admin";
}

export function isVendor() {
  return getRole() === "vendor";
}

export function isCustomer() {
  return getRole() === "customer";
}

/**
 * Login against backend and persist the full auth payload.
 * Expected backend response:
 * {
 *   user: {...},
 *   tokens: { access, refresh }
 * }
 */
export async function login({ email, password }) {
  const res = await api.post("/api/accounts/login/", { email, password });

  // ✅ Hard check: if backend didn't send tokens, fail early
  if (!res?.data?.tokens?.access) {
    throw new Error("Login response missing tokens.access");
  }

  // Persist full payload (user + tokens)
  saveAuth(res.data);

  // Return user with normalized role for caller logic
  const user = res.data?.user || null;
  const role =
    normalizeRole(user?.role ?? user?.user_role ?? user?.type) ||
    (user?.is_admin || user?.is_staff ? "admin" : null);

  return { ...user, role };
}

export async function logout() {
  clearAuth();
}