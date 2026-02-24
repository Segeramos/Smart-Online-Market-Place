import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listDisputes } from "../../api/disputes";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}

function fmtDate(v) {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString();
}

export default function Disputes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const data = await listDisputes();
      setItems(normalizeList(data));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load disputes.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const da = new Date(a?.created_at || a?.created || 0).getTime();
      const db = new Date(b?.created_at || b?.created || 0).getTime();
      return db - da;
    });
  }, [items]);

  return (
    <div className="bg-white rounded-2xl shadow p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-extrabold">Vendor Disputes</h2>
        <button
          onClick={load}
          className="text-sm px-3 py-2 rounded-xl border hover:bg-gray-50"
        >
          Refresh
        </button>
      </div>

      {err && (
        <div className="mb-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200">
          {err}
        </div>
      )}

      {loading ? (
        <div className="text-gray-600">Loading...</div>
      ) : sorted.length === 0 ? (
        <div className="text-gray-600">No disputes assigned to you.</div>
      ) : (
        <div className="space-y-3">
          {sorted.map((d) => {
            const id = d?.id ?? d?.dispute_id;
            const title = d?.subject || d?.title || `Dispute #${id}`;
            const status = d?.status || "open";

            return (
              <Link
                key={id}
                to={`/vendor/disputes/${id}`}
                className="block border rounded-2xl p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-bold text-gray-900">{title}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {fmtDate(d?.created_at || d?.created)}
                    </div>
                  </div>

                  <span className="text-xs px-2 py-1 rounded-full border bg-gray-50">
                    {String(status).toUpperCase()}
                  </span>
                </div>

                {d?.order_id && (
                  <div className="text-sm text-gray-600 mt-2">
                    Order: <span className="font-semibold">#{d.order_id}</span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      <div className="text-xs text-gray-500 mt-4">
        Note: this links to <code>/vendor/disputes/:id</code>. Add the route snippet below.
      </div>
    </div>
  );
}
