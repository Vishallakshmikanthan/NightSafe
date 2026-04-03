import { useState, useEffect } from "react";
import { fetchStreetNames } from "../services/api.js";
import { Button } from "./ui/button";

export default function RouteSearch({ onSearch, hour }) {
  const [streets, setStreets] = useState([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStreetNames()
      .then(setStreets)
      .catch(() => setStreets([]));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (start && end && start !== end) {
      setLoading(true);
      onSearch({ start, end, hour }).finally(() => setLoading(false));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
      <select
        value={start}
        onChange={(e) => setStart(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-night-900 border border-night-600
                   text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                   focus:border-indigo-500/50 transition-all"
      >
        <option value="">Start street…</option>
        {streets.map((s) => (
          <option key={s.street_id} value={s.street_id}>
            {s.street_name}
          </option>
        ))}
      </select>

      <select
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        className="w-full px-3 py-2 rounded-lg bg-night-900 border border-night-600
                   text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                   focus:border-indigo-500/50 transition-all"
      >
        <option value="">Destination street…</option>
        {streets.map((s) => (
          <option key={s.street_id} value={s.street_id}>
            {s.street_name}
          </option>
        ))}
      </select>

      <Button
        type="submit"
        disabled={!start || !end || start === end || loading}
        className="w-full shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
      >
        {loading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Finding…
          </span>
        ) : (
          "Find Safest Route"
        )}
      </Button>
    </form>
  );
}
