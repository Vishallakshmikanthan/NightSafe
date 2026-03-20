import { useState, useEffect, useCallback, useRef } from "react";
import { fetchAlerts } from "../services/api.js";

const POLL_INTERVAL = 10_000; // 10 seconds

export default function DangerToast() {
  const [toasts, setToasts] = useState([]);
  const seenRef = useRef(new Set());

  const poll = useCallback(async () => {
    try {
      const alerts = await fetchAlerts();
      const newToasts = [];

      for (const alert of alerts) {
        const key = `${alert.street_id}-${alert.hour}`;
        if (!seenRef.current.has(key)) {
          seenRef.current.add(key);
          newToasts.push({ ...alert, id: key, ts: Date.now() });
        }
      }

      if (newToasts.length > 0) {
        setToasts((prev) => [...prev, ...newToasts].slice(-5)); // keep last 5
      }
    } catch {
      // silently skip on network error
    }
  }, []);

  // Start polling
  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(id);
  }, [poll]);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 8000);
    return () => clearTimeout(timer);
  }, [toasts]);

  const dismiss = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 w-80">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="bg-red-950/95 border border-red-500/60 rounded-xl px-4 py-3
                     shadow-lg shadow-red-900/40 backdrop-blur-sm
                     animate-slide-in"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-red-400 text-lg shrink-0" aria-hidden>
                ⚠
              </span>
              <div className="min-w-0">
                <p className="text-red-300 font-bold text-sm truncate">
                  {toast.street_name}
                </p>
                <p className="text-red-400/80 text-xs mt-0.5">
                  Safety Score:{" "}
                  <span className="font-semibold text-red-300">
                    {toast.safety_score.toFixed(1)}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-red-400/60 hover:text-red-300 text-sm leading-none
                         shrink-0 mt-0.5"
              aria-label="Dismiss alert"
            >
              ✕
            </button>
          </div>
          <p className="text-red-400 text-[11px] mt-1.5 font-medium tracking-wide uppercase">
            Danger Alert
          </p>
        </div>
      ))}
    </div>
  );
}
