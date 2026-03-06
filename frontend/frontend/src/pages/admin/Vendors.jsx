// src/pages/admin/Vendors.jsx

import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

function safeLower(v) {
  return (v ?? "").toString().toLowerCase();
}

function statusPill(status) {
  const s = safeLower(status);
  if (s === "approved" || s === "active") {
    return "bg-green-50 text-green-800 border-green-200";
  }
  if (s === "pending") {
    return "bg-yellow-50 text-yellow-800 border-yellow-200";
  }
  if (s === "disabled" || s === "inactive") {
    return "bg-red-50 text-red-800 border-red-200";
  }
  return "bg-gray-50 text-gray-800 border-gray-200";
}

function normalizeVendor(v) {
  return {
    id: v?.id ?? v?.vendor_id,
    store_name: v?.store_name ?? "-",
    owner_name: v?.owner_name ?? v?.owner ?? "-",
    email: v?.email ?? "-",
    phone: v?.phone ?? "-",
    status: v?.status ?? (v?.is_active ? "approved" : "disabled"),
    created_at: v?.created_at ?? "-",
  };
}

export default function AdminVendors() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");

  async function load() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/api/adminpanel/vendors/");
      const list = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
      setRows(list.map(normalizeVendor));
    } catch (e) {
      setErr(e?.response?.data?.detail || "Failed to load vendors");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const qq = safeLower(q).trim();
    return rows.filter((v) => {
      const s = safeLower(v.status);

      const matchesFilter =
        filter === "all" ||
        (filter === "pending" && s === "pending") ||
        (filter === "approved" && s === "approved") ||
        (filter === "disabled" && s === "disabled");

      if (!matchesFilter) return false;

      if (!qq) return true;

      const hay = `${v.store_name} ${v.owner_name} ${v.email}`.toLowerCase();
      return hay.includes(qq);
    });
  }, [rows, q, filter]);

  // ✅ PATCH /vendors/<vendor_id>/status/
  async function updateStatus(vendorId, payload) {
    setBusyId(vendorId);
    try {
      await api.patch(`/api/adminpanel/vendors/${vendorId}/status/`, payload);

      // update UI instantly
      setRows((prev) =>
        prev.map((v) =>
          v.id === vendorId
            ? {
                ...v,
                status: payload?.status ?? (payload?.is_active ? "approved" : "disabled"),
              }
            : v
        )
      );
    } catch (e) {
      setErr(e?.response?.data?.detail || "Update failed");
    } finally {
      setBusyId(null);
    }
  }

  function approve(v) {
    updateStatus(v.id, { is_active: true, status: "approved" });
  }

  function disable(v) {
    updateStatus(v.id, { is_active: false, status: "disabled" });
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-semibold">Admin · Vendors</h1>

      {err && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search vendor..."
          className="w-full md:max-w-md rounded-lg border px-3 py-2 text-sm outline-none"
        />

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="all">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="disabled">Disabled</option>
        </select>
      </div>

      {/* Table */}
      <table className="w-full text-sm border rounded-xl overflow-hidden">
        <thead className="bg-gray-50 text-left">
          <tr>
            <th className="px-3 py-2">ID</th>
            <th className="px-3 py-2">Store</th>
            <th className="px-3 py-2">Owner</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="p-4 text-center">
                Loading...
              </td>
            </tr>
          ) : (
            filtered.map((v) => (
              <tr key={v.id} className="border-t">
                <td className="px-3 py-2">#{v.id}</td>
                <td className="px-3 py-2">{v.store_name}</td>
                <td className="px-3 py-2">{v.owner_name}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full border px-2 py-1 text-xs ${statusPill(v.status)}`}>
                    {v.status}
                  </span>
                </td>
                <td className="px-3 py-2 text-right space-x-2">
                  <button
                    disabled={busyId === v.id}
                    onClick={() => approve(v)}
                    className="bg-cyan-600 text-white px-3 py-1 rounded text-xs"
                  >
                    Approve
                  </button>

                  <button
                    disabled={busyId === v.id}
                    onClick={() => disable(v)}
                    className="border px-3 py-1 rounded text-xs"
                  >
                    Disable
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
