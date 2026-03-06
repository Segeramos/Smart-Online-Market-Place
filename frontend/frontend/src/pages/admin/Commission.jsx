// src/pages/admin/Commission.jsx

import { useEffect, useMemo, useState } from "react";
import api from "../../api/axios";

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function safeArr(v) {
  return Array.isArray(v) ? v : [];
}

function formatDateTime(v) {
  if (!v) return "-";
  // supports ISO string from Django
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString();
}

export default function AdminCommission() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const [rate, setRate] = useState(""); // percentage as string
  const [updatedAt, setUpdatedAt] = useState(null);

  const [logsLoading, setLogsLoading] = useState(true);
  const [logsErr, setLogsErr] = useState("");
  const [logs, setLogs] = useState([]);

  async function loadCommission() {
    setLoading(true);
    setErr("");
    try {
      const res = await api.get("/api/adminpanel/commission/");
      // expected shapes:
      // { rate: 5 } OR { commission_rate: 5 } OR { percent: 5, updated_at: ... }
      const r =
        res.data?.rate ??
        res.data?.commission_rate ??
        res.data?.percent ??
        res.data?.global_commission_rate ??
        "";
      setRate(String(r));
      setUpdatedAt(res.data?.updated_at ?? res.data?.last_updated ?? null);
    } catch (e) {
      setErr(e?.response?.data?.detail || e?.message || "Failed to load commission");
    } finally {
      setLoading(false);
    }
  }

  async function loadLogs() {
    setLogsLoading(true);
    setLogsErr("");
    try {
      const res = await api.get("/api/adminpanel/commission/logs/");
      const list = Array.isArray(res.data) ? res.data : res.data?.results ?? res.data?.logs ?? [];
      setLogs(list);
    } catch (e) {
      setLogsErr(e?.response?.data?.detail || e?.message || "Failed to load logs");
    } finally {
      setLogsLoading(false);
    }
  }

  useEffect(() => {
    loadCommission();
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rateNum = useMemo(() => toNumber(rate), [rate]);

  const isValidRate = rate !== "" && rateNum >= 0 && rateNum <= 100;

  async function onSave(e) {
    e.preventDefault();
    setErr("");

    if (!isValidRate) {
      setErr("Commission rate must be between 0 and 100.");
      return;
    }

    setSaving(true);
    try {
      // PATCH global commission
      // common accepted payloads:
      // { rate: 5 } OR { commission_rate: 5 } OR { percent: 5 }
      await api.patch("/api/adminpanel/commission/", {
        rate: rateNum,
        commission_rate: rateNum,
        percent: rateNum,
      });

      // refresh both
      await loadCommission();
      await loadLogs();
    } catch (e2) {
      setErr(e2?.response?.data?.detail || e2?.message || "Failed to save commission");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin · Commission</h1>
          <p className="text-sm text-gray-600">Set platform commission rate and audit changes</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              loadCommission();
              loadLogs();
            }}
            className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
            disabled={loading || logsLoading}
            title="Reload"
          >
            Reload
          </button>
        </div>
      </div>

      {err ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {err}
        </div>
      ) : null}

      {/* Global commission editor */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
          <div>
            <div className="text-sm font-semibold">Global commission rate</div>
            <div className="text-xs text-gray-600">
              This applies platform-wide unless vendor overrides exist.
            </div>
          </div>

          <div className="text-xs text-gray-600">
            Last updated: <span className="font-medium">{formatDateTime(updatedAt)}</span>
          </div>
        </div>

        <form onSubmit={onSave} className="flex flex-col md:flex-row gap-3 md:items-end">
          <div className="flex-1">
            <label className="text-xs text-gray-600">Commission (%)</label>
            <input
              value={rate}
              onChange={(e) => setRate(e.target.value)}
              placeholder="e.g. 5"
              className="mt-1 w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-300"
              inputMode="decimal"
            />
            <div className="mt-1 text-xs text-gray-500">Allowed range: 0 – 100</div>
          </div>

          <button
            type="submit"
            disabled={saving || loading || !isValidRate}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save rate"}
          </button>
        </form>
      </div>

      {/* Logs */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-3">
          <div className="text-sm font-semibold">Commission logs</div>
          <div className="text-xs text-gray-600">Audit trail of commission changes</div>
        </div>

        {logsErr ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {logsErr}
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr className="text-left">
                <Th>When</Th>
                <Th>Old (%)</Th>
                <Th>New (%)</Th>
                <Th>By</Th>
                <Th>Note</Th>
              </tr>
            </thead>

            <tbody>
              {logsLoading ? (
                <tr>
                  <Td colSpan={5} className="py-6 text-center text-gray-600">
                    Loading logs…
                  </Td>
                </tr>
              ) : safeArr(logs).length === 0 ? (
                <tr>
                  <Td colSpan={5} className="py-6 text-center text-gray-600">
                    No logs yet.
                  </Td>
                </tr>
              ) : (
                safeArr(logs).map((l, idx) => {
                  const when = l?.created_at ?? l?.timestamp ?? l?.date ?? null;
                  const oldRate = l?.old_rate ?? l?.old ?? l?.previous_rate ?? "-";
                  const newRate = l?.new_rate ?? l?.new ?? l?.current_rate ?? "-";
                  const by = l?.changed_by ?? l?.admin ?? l?.user_email ?? l?.user ?? "-";
                  const note = l?.note ?? l?.reason ?? "";
                  return (
                    <tr key={l?.id ?? idx} className="border-t">
                      <Td className="text-xs text-gray-700">{formatDateTime(when)}</Td>
                      <Td>{oldRate}</Td>
                      <Td className="font-medium">{newRate}</Td>
                      <Td className="text-xs text-gray-700">{by}</Td>
                      <Td className="text-xs text-gray-600">{note || "-"}</Td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-gray-600">
        Endpoints:{" "}
        <span className="font-mono">GET/PATCH /api/adminpanel/commission/</span> ·{" "}
        <span className="font-mono">GET /api/adminpanel/commission/logs/</span>
      </div>
    </div>
  );
}

/* ---------- table helpers ---------- */

function Th({ children }) {
  return <th className="px-3 py-2 text-xs font-semibold text-gray-700">{children}</th>;
}

function Td({ children, className = "", colSpan }) {
  return (
    <td colSpan={colSpan} className={`px-3 py-2 align-top ${className}`}>
      {children}
    </td>
  );
}
