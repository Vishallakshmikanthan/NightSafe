import { useState, useEffect } from "react";
import { fetchStreetNames } from "../services/api.js";

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
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-4">
      <select
        value={start}
        onChange={(e) => setStart(e.target.value)}
        className="flex-1 px-4 py-2 rounded-lg bg-night-800 border border-night-600
                   text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">Start street…</option>
        {streets.map((s) => (
          <option key={s.street_id} value={s.street_id}>
            {s.street_name} ({s.street_id})
          </option>
        ))}
      </select>

      <select
        value={end}
        onChange={(e) => setEnd(e.target.value)}
        className="flex-1 px-4 py-2 rounded-lg bg-night-800 border border-night-600
                   text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">End street…</option>
        {streets.map((s) => (
          <option key={s.street_id} value={s.street_id}>
            {s.street_name} ({s.street_id})
          </option>
        ))}
      </select>

      <button
        type="submit"
        disabled={!start || !end || start === end || loading}
        className="px-6 py-2 bg-indigo-500 text-white font-semibold rounded-lg
                   hover:bg-indigo-400 transition-colors disabled:opacity-40
                   disabled:cursor-not-allowed"
      >
        {loading ? "Finding…" : "Find Safest Route"}
      </button>
    </form>
  );
}
