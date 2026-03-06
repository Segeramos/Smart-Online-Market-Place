import api from "./axios";

export async function loginApi({ email, password }) {
  const { data } = await api.post("/api/accounts/login/", { email, password });
  return data;
}

export async function meApi() {
  const { data } = await api.get("/api/accounts/me/");
  return data;
}

export async function refreshTokenApi(refresh) {
  const { data } = await api.post("/api/accounts/token/refresh/", { refresh });
  return data;
}
