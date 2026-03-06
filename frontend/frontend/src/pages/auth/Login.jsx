// src/pages/auth/Login.jsx

import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { login } from "../../store/authStore";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const nav = useNavigate();
  const location = useLocation();

  // support both state.from and ?from=
  const params = new URLSearchParams(location.search);
  const fromQuery = params.get("from");
  const fromState = location.state?.from?.pathname;
  const from = fromQuery || fromState || "/";

  async function onSubmit(e) {
    e.preventDefault();
    setErr("");
    setLoading(true);

    try {
      const user = await login({ email, password });

      // role-based redirect
      if (user?.role === "admin") nav("/admin", { replace: true });
      else if (user?.role === "vendor") nav("/vendor", { replace: true });
      else nav(from, { replace: true });
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
      <form onSubmit={onSubmit} className="w-full max-w-md bg-slate-900 rounded-2xl p-6 shadow">
        <h1 className="text-2xl font-semibold">Login</h1>
        <p className="text-slate-400 mt-1">Access your account</p>

        {err && <div className="mt-4 p-3 rounded bg-red-900/40 text-red-200">{err}</div>}

        <div className="mt-5 space-y-3">
          <input
            className="w-full p-3 rounded bg-slate-800 outline-none"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            className="w-full p-3 rounded bg-slate-800 outline-none"
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          <button
            disabled={loading}
            className="w-full p-3 rounded bg-cyan-500 text-slate-950 font-semibold disabled:opacity-60"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>
      </form>
    </div>
  );
}
