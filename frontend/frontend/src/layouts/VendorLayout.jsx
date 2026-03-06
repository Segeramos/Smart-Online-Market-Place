// src/layouts/VendorLayout.jsx
import { NavLink, Outlet, useNavigate } from "react-router-dom";

function Item({ to, label, end = false }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition
        ${isActive ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"}`
      }
    >
      {label}
    </NavLink>
  );
}

export default function VendorLayout() {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold leading-tight">Vendor Panel</h1>
            <p className="text-sm text-gray-600">
              Manage products, orders, disputes and earnings.
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-xl border bg-white px-4 py-2 text-sm hover:bg-gray-50"
          >
            Logout
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
          <aside className="rounded-2xl border bg-white p-4 shadow-sm">
            <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-500">
              Navigation
            </div>

            <div className="space-y-1">
              <Item to="/vendor" label="Dashboard" end />
              <Item to="/vendor/products" label="Products" />
              <Item to="/vendor/orders" label="Orders" />
              <Item to="/vendor/disputes" label="Disputes" />
            </div>

            <div className="mt-6 rounded-xl bg-gray-50 p-3">
              <div className="text-xs font-semibold text-gray-700">Quick actions</div>
              <button
                onClick={() => navigate("/vendor/products/new")}
                className="mt-2 w-full rounded-xl bg-black px-3 py-2 text-sm text-white hover:opacity-90"
              >
                + Add Product
              </button>
            </div>
          </aside>

          <main className="rounded-2xl border bg-white p-6 shadow-sm">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}