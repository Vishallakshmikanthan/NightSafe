import { useState } from "react";

export default function RouteSearch({ onSearch }) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (origin.trim() && destination.trim()) {
      onSearch({ origin: origin.trim(), destination: destination.trim() });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 mb-6">
      <input
        type="text"
        placeholder="Origin (e.g. Times Square)"
        value={origin}
        onChange={(e) => setOrigin(e.target.value)}
        className="flex-1 px-4 py-2 rounded-lg bg-night-800 border border-night-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-safe"
      />
      <input
        type="text"
        placeholder="Destination (e.g. Central Park)"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
        className="flex-1 px-4 py-2 rounded-lg bg-night-800 border border-night-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-safe"
      />
      <button
        type="submit"
        className="px-6 py-2 bg-safe text-night-900 font-semibold rounded-lg hover:bg-green-400 transition-colors"
      >
        Find Safe Route
      </button>
    </form>
  );
}
