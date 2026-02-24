import { Outlet, Link } from "react-router-dom";

export default function AdminLayout() {
  return (
    <div className="flex min-h-screen">

      {/* SIDEBAR */}
      <div className="w-64 bg-gray-900 text-white p-4 space-y-4">
        <h2 className="text-xl font-bold mb-4">Admin Panel</h2>

        <Link to="/admin" className="block">Dashboard</Link>
        <Link to="/admin/vendors" className="block">Vendors</Link>
        <Link to="/admin/commission" className="block">Commission</Link>
        <Link to="/admin/reports" className="block">Reports</Link>
        <Link to="/admin/disputes" className="block">Disputes</Link>
        <Link to="/admin/orders" className="block">Orders</Link>
      </div>

      {/* PAGE CONTENT */}
      <div className="flex-1 p-6 bg-gray-100">
        <Outlet />
      </div>

    </div>
  );
}