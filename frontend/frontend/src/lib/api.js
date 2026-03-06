import axios from "axios";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/$/, "");

export const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  const access = localStorage.getItem("access"); // change if your key is different
  if (access) config.headers.Authorization = `Bearer ${access}`;
  return config;
});