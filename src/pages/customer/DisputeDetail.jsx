import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDispute, getDisputeMessages, resolveDispute, sendDisputeMessage } from "../../api/disputes";
import { getRole } from "../../store/authStore";

function normalizeList(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.messages)) return data.messages;
  return [];
}

function fmtDate(v) {
  if (!v) return "";
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleString();
}

export default function DisputeDetail() {
  const { id } = useParams();
  const role = getRole();

  const [dispute, setDispute] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const [resNote, setResNote] = useState("");
  const [resolving, setResolving] = useState(false);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const d = await getDispute(id);
      setDispute(d);

      const m = await getDisputeMessages(id);
      setMessages(normalizeList(m));
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load dispute.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const title = dispute?.subject || dispute?.title || `Dispute #${id}`;
  const status = dispute?.status || "open";

  const sortedMsgs = useMemo(() => {
    return [...messages].sort((a, b) => {
      const da = new Date(a?.created_at || a?.created || 0).getTime();
      const db = new Date(b?.created_at || b?.created || 0).getTime();
      return da - db;
    });
  }, [messages]);

  async function onSend(e) {
    e.preventDefault();
    if (!text.trim()) return;

    setSending(true);
    setErr("");
    try {
      // payload fields depend on serializer; "message" is a common choice
      await sendDisputeMessage(id, { message: text });
      setText("");
      const m = await getDisputeMessages(id);
      setMessages(normalizeList(m));
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  async function onResolve() {
    setResolving(true);
    setErr("");
    try {
      // payload depends on your DisputeResolveView; keep it minimal:
      await resolveDispute(id, { note: resNote });
      setResNote("");
      await load();
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2?.message || "Failed to resolve dispute.");
    } finally {
      setResolving(false);
    }
  }

  if (loading) {
    return <div className="bg-white rounded-2xl shadow p-5">Loading...</div>;
  }

  if (err && !dispute) {
    return (
      <div className="bg-white rounded-2xl shadow p-5">
        <div className="text-red-600">{err}</div>
        <Link className="text-cyan-700 underline mt-2 inline-block" to="/disputes">
          Back to disputes
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main */}
      <div className="lg:col-span-2 bg-white rounded-2xl shadow p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-gray-900">{title}</h1>
            <div className="text-xs text-gray-500 mt-1">
              Created: {fmtDate(dispute?.created_at || dispute?.created)}
            </div>
          </div>

          <span className="text-xs px-2 py-1 rounded-full border bg-gray-50">
            {String(status).toUpperCase()}
          </span>
        </div>

        {err && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 text-red-700 border border-red-200">
            {err}
          </div>
        )}

        {/* Messages */}
        <div className="mt-5">
          <h2 className="font-bold text-gray-900">Messages</h2>

          <div className="mt-3 space-y-3">
            {sortedMsgs.length === 0 ? (
              <div className="text-gray-600 text-sm">No messages yet.</div>
            ) : (
              sortedMsgs.map((m, idx) => {
                const who =
                  m?.sender_name ||
                  m?.sender ||
                  m?.user?.email ||
                  m?.user?.name ||
                  "User";
                const body = m?.message || m?.body || m?.text || "";
                const when = fmtDate(m?.created_at || m?.created);

                return (
                  <div key={m?.id ?? idx} className="border rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-semibold text-gray-900">{who}</div>
                      <div className="text-xs text-gray-500">{when}</div>
                    </div>
                    <div className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                      {body}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Send message */}
          <form onSubmit={onSend} className="mt-4 flex gap-2">
            <input
              className="flex-1 p-3 rounded-xl border outline-none"
              placeholder="Write a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <button
              disabled={sending || !text.trim()}
              className="px-4 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold disabled:opacity-50"
            >
              {sending ? "Sending..." : "Send"}
            </button>
          </form>
        </div>

        <div className="mt-6">
          <Link className="text-cyan-700 hover:underline" to="/disputes">
            ← Back to disputes
          </Link>
        </div>
      </div>

      {/* Side: Info + resolve (admin) */}
      <div className="bg-white rounded-2xl shadow p-5 h-fit">
        <h3 className="text-lg font-extrabold">Details</h3>

        <div className="mt-3 text-sm text-gray-700 space-y-2">
          <div>
            <span className="text-gray-500">Dispute ID:</span>{" "}
            <span className="font-semibold">{id}</span>
          </div>

          {dispute?.order_id && (
            <div>
              <span className="text-gray-500">Order:</span>{" "}
              <span className="font-semibold">#{dispute.order_id}</span>
            </div>
          )}

          {dispute?.reason && (
            <div>
              <span className="text-gray-500">Reason:</span>{" "}
              <span className="font-semibold">{dispute.reason}</span>
            </div>
          )}
        </div>

        {/* Admin resolve */}
        {role === "admin" && (
          <div className="mt-6 border-t pt-4">
            <h4 className="font-bold text-gray-900">Resolve</h4>

            <textarea
              className="w-full mt-2 p-3 rounded-xl border outline-none min-h-[100px]"
              placeholder="Resolution note (optional)"
              value={resNote}
              onChange={(e) => setResNote(e.target.value)}
            />

            <button
              disabled={resolving}
              onClick={onResolve}
              className="w-full mt-3 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-extrabold p-3 rounded-xl disabled:opacity-50"
            >
              {resolving ? "Resolving..." : "Resolve Dispute"}
            </button>

            <div className="text-xs text-gray-500 mt-2">
              If your backend expects specific fields (status/action), tell me and I’ll match it.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
