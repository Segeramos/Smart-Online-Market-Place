// src/api/axios.js

import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(
  /\/$/,
  ""
);

const AUTH_KEY = "auth";

const api = axios.create({
  baseURL: API_BASE,
  // NOTE: Don't force Content-Type globally; FormData uploads need browser to set boundary.
  // We'll set JSON content-type only when payload is plain object.
  withCredentials: false,
});

/**
 * Attach JWT to every request + handle JSON content-type safely
 */
api.interceptors.request.use(
  (config) => {
    // ✅ Attach Bearer token if present
    const raw = localStorage.getItem(AUTH_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const token = parsed?.tokens?.access;

        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }
      } catch {
        localStorage.removeItem(AUTH_KEY);
      }
    }

    // ✅ Only set JSON content-type when body is NOT FormData
    // (If it's FormData, browser must set multipart boundary)
    const isFormData =
      typeof FormData !== "undefined" && config.data instanceof FormData;

    config.headers = config.headers || {};
    if (!isFormData) {
      // If user already set a content-type, keep it; otherwise set JSON.
      if (!config.headers["Content-Type"] && !config.headers["content-type"]) {
        config.headers["Content-Type"] = "application/json";
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Handle 401 globally:
 * - clear auth
 * - redirect to login
 * - preserve current path for post-login redirect
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;

    if (status === 401) {
      localStorage.removeItem(AUTH_KEY);

      // avoid infinite loop if already on login
      const currentPath = window.location.pathname;
      if (currentPath !== "/login") {
        const redirect = encodeURIComponent(currentPath + window.location.search);
        window.location.href = `/login?from=${redirect}`;
      }
    }

    return Promise.reject(error);
  }
);

export default api;