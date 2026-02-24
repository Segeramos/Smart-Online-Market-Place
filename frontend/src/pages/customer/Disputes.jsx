import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { listDisputes, createDispute } from "../../api/disputes";

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

  // quick-create (optional MVP)
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

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

  const hasItems = items.length > 0;

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => {
      const da = new Date(a?.created_at || a?.created || 0).getTime();
      const db = new Date(b?.created_at || b?.created || 0).getTime();
      return db - da;
    });
  }, [items]);

  async function onCreate(e) {
    e.preventDefault();
    setErr("");
    setCreating(true);
    try {
      // payload fields depend on your serializer.
      // This is a safe MVP: subject + initial_message.
      const payload = {
        subject,
        message,
      };
      await createDispute(payload);
      setSubject("");
      setMessage("");
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2?.message || "Failed to create dispute.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* List */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-extrabold">My Disputes</h2>
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
        ) : !hasItems ? (
          <div className="text-gray-600">No disputes yet.</div>
        ) : (
          <div className="space-y-3">
            {sorted.map((d) => {
              const id = d?.id ?? d?.dispute_id;
              const title = d?.subject || d?.title || `Dispute #${id}`;
              const status = d?.status || "open";
              const created = fmtDate(d?.created_at || d?.created);

              return (
                <Link
                  key={id}
                  to={`/disputes/${id}`}
                  className="block border rounded-2xl p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-bold text-gray-900">{title}</div>
                      <div className="text-xs text-gray-500 mt-1">{created}</div>
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
      </div>

      {/* Create (optional MVP) */}
      <div className="bg-white rounded-2xl shadow p-5 h-fit">
        <h3 className="text-lg font-extrabold mb-3">Open a Dispute</h3>

        <form onSubmit={onCreate} className="space-y-3">
          <input
            className="w-full p-3 rounded-xl border outline-none"
            placeholder="Subject (e.g. Wrong item delivered)"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />

          <textarea
            className="w-full p-3 rounded-xl border outline-none min-h-[120px]"
            placeholder="Explain the issue..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />

          <button
            disabled={creating || !subject.trim() || !message.trim()}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-semibold p-3 rounded-xl disabled:opacity-50"
          >
            {creating ? "Submitting..." : "Submit Dispute"}
          </button>

          <div className="text-xs text-gray-500">
            Tip: later we can connect this to an order (open dispute from Orders page).
          </div>
        </form>
      </div>
    </div>
  );
}
