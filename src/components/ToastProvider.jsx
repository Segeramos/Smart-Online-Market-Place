import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const remove = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message, opts = {}) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const type = opts.type || "info"; // info | success | error | warn
      const duration = Number.isFinite(opts.duration) ? opts.duration : 2200;

      setToasts((prev) => [...prev, { id, message, type }]);
      window.setTimeout(() => remove(id), duration);
    },
    [remove]
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastCtx.Provider value={api}>
      {children}

      {/* Toast stack */}
      <div className="fixed z-[200] right-3 bottom-3 flex flex-col gap-2 max-w-[92vw] sm:max-w-md">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "rounded-2xl shadow-lg border px-4 py-3 text-sm bg-white",
              t.type === "success" ? "border-green-200" : "",
              t.type === "error" ? "border-red-200" : "",
              t.type === "warn" ? "border-yellow-200" : "",
              t.type === "info" ? "border-gray-200" : "",
            ].join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="text-gray-900">{t.message}</div>
              <button
                onClick={() => remove(t.id)}
                className="text-gray-400 hover:text-gray-700"
                aria-label="Dismiss toast"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}
