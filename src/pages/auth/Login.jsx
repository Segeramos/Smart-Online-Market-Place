import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { login } from "../../store/authStore";

function ProductIcon({ type, className = "h-8 w-8" }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: "1.9",
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };

  switch (type) {
    case "phone":
      return (
        <svg {...common}>
          <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
          <path d="M10 5h4" />
          <path d="M12 18.5h.01" />
        </svg>
      );
    case "laptop":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="10" rx="1.5" />
          <path d="M2.5 18h19" />
        </svg>
      );
    case "headphones":
      return (
        <svg {...common}>
          <path d="M4 13a8 8 0 0 1 16 0" />
          <rect x="3" y="12" width="4" height="7" rx="2" />
          <rect x="17" y="12" width="4" height="7" rx="2" />
        </svg>
      );
    case "watch":
      return (
        <svg {...common}>
          <rect x="8" y="6" width="8" height="12" rx="3" />
          <path d="M10 2h4" />
          <path d="M10 22h4" />
          <path d="M12 9v3l2 1" />
        </svg>
      );
    case "shoe":
      return (
        <svg {...common}>
          <path d="M4 15c2.5 0 4.5-1 6-3l2 2c1 .9 2.4 1.5 4 1.7l3 .3V19H4z" />
          <path d="M9 12V9" />
        </svg>
      );
    case "bag":
      return (
        <svg {...common}>
          <path d="M6 8h12l-1 11H7L6 8z" />
          <path d="M9 8a3 3 0 0 1 6 0" />
        </svg>
      );
    case "camera":
      return (
        <svg {...common}>
          <path d="M4 8h4l1.5-2h5L16 8h4v10H4z" />
          <circle cx="12" cy="13" r="3.5" />
        </svg>
      );
    case "tv":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="12" rx="2" />
          <path d="M9 20h6" />
          <path d="M12 17v3" />
        </svg>
      );
    case "chair":
      return (
        <svg {...common}>
          <path d="M7 11V7a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v4" />
          <path d="M6 11h12v4H6z" />
          <path d="M8 15v4" />
          <path d="M16 15v4" />
        </svg>
      );
    case "cart":
      return (
        <svg {...common}>
          <circle cx="9" cy="19" r="1.5" />
          <circle cx="17" cy="19" r="1.5" />
          <path d="M3 4h2l2.2 9.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H7" />
        </svg>
      );
    case "speaker":
      return (
        <svg {...common}>
          <rect x="7" y="3" width="10" height="18" rx="2" />
          <circle cx="12" cy="9" r="2" />
          <circle cx="12" cy="15.5" r="3" />
        </svg>
      );
    case "gift":
      return (
        <svg {...common}>
          <path d="M4 10h16v10H4z" />
          <path d="M12 10v10" />
          <path d="M4 7h16v3H4z" />
          <path d="M10.5 7S8 7 8 5.5A2 2 0 0 1 10 3.7C11.4 3.7 12 5 12 5" />
          <path d="M13.5 7S16 7 16 5.5A2 2 0 0 0 14 3.7C12.6 3.7 12 5 12 5" />
        </svg>
      );
    default:
      return (
        <svg {...common}>
          <rect x="5" y="5" width="14" height="14" rx="3" />
        </svg>
      );
  }
}

function FloatingIcon({
  type,
  cardClass = "",
  style = {},
  iconClass = "h-8 w-8",
}) {
  return (
    <div
      className={`pointer-events-none absolute z-[2] rounded-[24px] border border-white/30 bg-white/18 p-4 text-white shadow-[0_20px_60px_rgba(255,255,255,0.08)] backdrop-blur-md ${cardClass}`}
      style={style}
    >
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-white/95">
        <ProductIcon type={type} className={iconClass} />
      </div>
    </div>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(true);

  const nav = useNavigate();
  const location = useLocation();

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
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-sky-300 via-cyan-300 to-indigo-500">
      <style>{`
        @keyframes driftDown1 {
          0% {
            transform: translateY(-140px) translateX(0px) rotate(-10deg) scale(0.95);
            opacity: 0;
          }
          10% {
            opacity: 0.58;
          }
          50% {
            transform: translateY(290px) translateX(18px) rotate(-4deg) scale(1);
            opacity: 0.48;
          }
          100% {
            transform: translateY(760px) translateX(-12px) rotate(8deg) scale(0.94);
            opacity: 0;
          }
        }

        @keyframes driftDown2 {
          0% {
            transform: translateY(-160px) translateX(0px) rotate(8deg) scale(0.95);
            opacity: 0;
          }
          10% {
            opacity: 0.55;
          }
          50% {
            transform: translateY(320px) translateX(-16px) rotate(2deg) scale(1);
            opacity: 0.44;
          }
          100% {
            transform: translateY(760px) translateX(12px) rotate(-8deg) scale(0.94);
            opacity: 0;
          }
        }

        @keyframes driftDown3 {
          0% {
            transform: translateY(-180px) translateX(0px) rotate(-6deg) scale(0.95);
            opacity: 0;
          }
          10% {
            opacity: 0.56;
          }
          45% {
            transform: translateY(260px) translateX(12px) rotate(-2deg) scale(1);
            opacity: 0.46;
          }
          100% {
            transform: translateY(760px) translateX(-18px) rotate(6deg) scale(0.94);
            opacity: 0;
          }
        }
      `}</style>

      {/* background decorations */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-16 -left-16 h-56 w-56 rounded-full bg-fuchsia-600/80 blur-sm" />
        <div className="absolute top-10 left-20 h-24 w-24 rounded-full bg-violet-700/90" />
        <div className="absolute top-24 right-24 h-40 w-40 rounded-full bg-cyan-300/70 blur-sm" />
        <div className="absolute bottom-10 left-10 h-64 w-64 rounded-full bg-violet-700/30 blur-2xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-blue-500/30 blur-3xl" />

        <div className="absolute -left-10 top-32 h-24 w-80 rotate-[-35deg] rounded-full bg-gradient-to-r from-violet-700 to-cyan-300 opacity-90" />
        <div className="absolute left-24 bottom-8 h-24 w-96 rotate-[-35deg] rounded-full bg-gradient-to-r from-violet-700 to-cyan-300 opacity-80" />
        <div className="absolute right-10 top-24 h-16 w-72 rotate-[-35deg] rounded-full bg-gradient-to-r from-violet-700 to-cyan-300 opacity-90" />
        <div className="absolute right-24 top-52 h-16 w-64 rotate-[-35deg] rounded-full bg-gradient-to-r from-violet-700 to-cyan-300 opacity-90" />
        <div className="absolute right-16 top-80 h-16 w-72 rotate-[-35deg] rounded-full bg-gradient-to-r from-violet-700 to-cyan-300 opacity-90" />
        <div className="absolute right-48 bottom-20 h-20 w-80 rotate-[-35deg] rounded-full bg-gradient-to-r from-violet-700 to-cyan-300 opacity-80" />

        <div className="absolute left-6 top-6 grid grid-cols-6 gap-2 opacity-50">
          {Array.from({ length: 30 }).map((_, i) => (
            <span key={i} className="h-1 w-1 rounded-full bg-white" />
          ))}
        </div>

        <div className="absolute right-20 top-36 grid grid-cols-8 gap-2 opacity-40">
          {Array.from({ length: 48 }).map((_, i) => (
            <span key={i} className="h-1 w-1 rounded-full bg-white" />
          ))}
        </div>

        <div className="absolute right-10 bottom-10 grid grid-cols-8 gap-2 opacity-50">
          {Array.from({ length: 64 }).map((_, i) => (
            <span key={i} className="h-1 w-1 rounded-full bg-white" />
          ))}
        </div>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center p-4 md:p-8">
        <div className="w-full max-w-6xl overflow-hidden rounded-[28px] bg-white/10 shadow-2xl ring-1 ring-white/20 backdrop-blur-sm">
          <div className="grid min-h-[700px] grid-cols-1 lg:grid-cols-[460px_1fr]">
            {/* left panel */}
            <div className="relative flex items-center justify-center bg-transparent p-6 md:p-10">
              <div className="relative w-full max-w-md overflow-hidden rounded-[42px] bg-white px-8 py-10 text-slate-800 shadow-xl md:px-10 md:py-12">
                <div className="pointer-events-none absolute -right-24 top-0 h-full w-44 rounded-l-[100px] bg-white" />

                <div className="relative z-10">
                  <div className="mb-8 flex items-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-violet-700 to-fuchsia-500 text-lg font-extrabold text-white shadow-lg">
                      aw.
                    </div>
                  </div>

                  <div className="mb-8">
                    <p className="text-sm text-slate-500">We are</p>
                    <h1 className="bg-gradient-to-r from-violet-700 to-sky-400 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
                      Nairobi Marketplace
                    </h1>
                    <p className="mt-2 text-sm text-slate-400">
                      Welcome back, please login to your account.
                    </p>
                  </div>

                  <div className="mb-6 flex gap-6 text-sm">
                    <button
                      type="button"
                      className="border-b-2 border-violet-600 pb-1 font-medium text-slate-900"
                    >
                      Login
                    </button>
                    <Link
                      to="/signup"
                      className="pb-1 text-slate-400 transition hover:text-slate-700"
                    >
                      Sign up
                    </Link>
                  </div>

                  {err && (
                    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {err}
                    </div>
                  )}

                  <form onSubmit={onSubmit} className="space-y-5">
                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-500">
                        Your Email
                      </label>
                      <input
                        className="w-full border-0 border-b-2 border-slate-200 bg-slate-50 px-0 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-transparent"
                        placeholder="hello@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        autoComplete="email"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-xs font-medium text-slate-500">
                        Password
                      </label>
                      <input
                        className="w-full border-0 border-b-2 border-slate-200 bg-slate-50 px-0 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-transparent"
                        placeholder="••••••••••••"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                    </div>

                    <div className="flex flex-col gap-3 pt-1 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={remember}
                          onChange={(e) => setRemember(e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        <span>Remember Me</span>
                      </label>

                      <Link
                        to="/forgot-password"
                        className="transition hover:text-violet-600"
                      >
                        Forgot Password?
                      </Link>
                    </div>

                    <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                      <button
                        disabled={loading}
                        className="inline-flex h-11 items-center justify-center rounded-xl bg-gradient-to-r from-violet-700 to-indigo-500 px-8 text-sm font-semibold text-white shadow-md transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {loading ? "Logging in..." : "Login"}
                      </button>

                      <Link
                        to="/signup"
                        className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-8 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                      >
                        Sign up
                      </Link>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* right panel */}
            <div className="relative hidden overflow-hidden lg:flex">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-300/10 via-transparent to-violet-500/10" />

              {/* floating icons only */}
              <FloatingIcon
                type="phone"
                cardClass="left-[7%] top-[-140px]"
                style={{ animation: "driftDown1 11s linear infinite" }}
              />
              <FloatingIcon
                type="laptop"
                cardClass="left-[24%] top-[-180px]"
                style={{ animation: "driftDown2 12s linear infinite", animationDelay: "1s" }}
              />
              <FloatingIcon
                type="headphones"
                cardClass="left-[44%] top-[-150px]"
                style={{ animation: "driftDown3 10.5s linear infinite", animationDelay: "0.5s" }}
              />
              <FloatingIcon
                type="watch"
                cardClass="left-[62%] top-[-200px]"
                style={{ animation: "driftDown1 11.5s linear infinite", animationDelay: "2s" }}
              />
              <FloatingIcon
                type="shoe"
                cardClass="right-[20%] top-[-160px]"
                style={{ animation: "driftDown2 10.8s linear infinite", animationDelay: "1.6s" }}
              />
              <FloatingIcon
                type="bag"
                cardClass="right-[8%] top-[-190px]"
                style={{ animation: "driftDown3 12.2s linear infinite", animationDelay: "2.8s" }}
              />
              <FloatingIcon
                type="camera"
                cardClass="left-[14%] top-[-240px]"
                style={{ animation: "driftDown3 11.2s linear infinite", animationDelay: "3.2s" }}
              />
              <FloatingIcon
                type="tv"
                cardClass="left-[36%] top-[-220px]"
                style={{ animation: "driftDown1 10.7s linear infinite", animationDelay: "4s" }}
              />
              <FloatingIcon
                type="chair"
                cardClass="left-[55%] top-[-250px]"
                style={{ animation: "driftDown2 11.8s linear infinite", animationDelay: "4.7s" }}
              />
              <FloatingIcon
                type="cart"
                cardClass="right-[30%] top-[-230px]"
                style={{ animation: "driftDown3 10.9s linear infinite", animationDelay: "5.2s" }}
              />
              <FloatingIcon
                type="speaker"
                cardClass="right-[12%] top-[-260px]"
                style={{ animation: "driftDown1 11.4s linear infinite", animationDelay: "6s" }}
              />
              <FloatingIcon
                type="gift"
                cardClass="left-[72%] top-[-210px]"
                style={{ animation: "driftDown2 10.6s linear infinite", animationDelay: "6.6s" }}
              />

              {/* decorative circles */}
              <div className="absolute right-12 top-12 h-20 w-20 rounded-full bg-gradient-to-br from-violet-600 to-cyan-300 opacity-90 shadow-xl" />
              <div className="absolute right-32 top-28 h-10 w-10 rounded-full bg-gradient-to-br from-cyan-200 to-violet-500 opacity-90" />
              <div className="absolute right-24 bottom-24 h-14 w-14 rounded-full bg-gradient-to-br from-violet-600 to-cyan-300 opacity-90" />

              {/* slanted pills */}
              <div className="absolute right-24 top-24 h-20 w-80 rotate-[-35deg] rounded-full bg-gradient-to-r from-violet-700 to-cyan-300 opacity-90" />
              <div className="absolute right-0 top-44 h-20 w-72 rotate-[-35deg] rounded-full bg-gradient-to-r from-violet-700 to-cyan-300 opacity-90" />
              <div className="absolute right-20 top-64 h-20 w-96 rotate-[-35deg] rounded-full bg-gradient-to-r from-violet-700 to-cyan-300 opacity-90" />
              <div className="absolute right-10 top-[26rem] h-20 w-72 rotate-[-35deg] rounded-full bg-gradient-to-r from-violet-700 to-cyan-300 opacity-90" />
              <div className="absolute left-16 bottom-16 h-24 w-80 rotate-[-35deg] rounded-full bg-gradient-to-r from-violet-700 to-cyan-300 opacity-80" />

              <div className="absolute inset-0 z-[3] grid place-items-center px-10">
                <div className="max-w-lg">
                  <h2 className="text-6xl font-extrabold leading-[0.95] tracking-tight text-white drop-shadow-[0_10px_30px_rgba(80,0,180,0.35)]">
                    Smarter
                    <br />
                    Shopping
                    <br />
                    Starts Here.
                  </h2>
                </div>
              </div>

              <div className="absolute right-8 top-8 z-[3] text-xs text-white/80">
                Nairobi Mart
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}