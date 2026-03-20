import { useState, useEffect } from "react";
import MapView from "../components/MapView.jsx";
import RouteSearch from "../components/RouteSearch.jsx";
import { fetchSafetyScores } from "../services/api.js";

export default function HomePage() {
  const [safetyData, setSafetyData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDefaultData();
  }, []);

  const loadDefaultData = async () => {
    setLoading(true);
    try {
      const data = await fetchSafetyScores();
      setSafetyData(data);
    } catch (err) {
      setError("Could not load safety data. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async ({ origin, destination }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSafetyScores({ origin, destination });
      setSafetyData(data);
    } catch (err) {
      setError("Route search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Find Your Safest Route</h1>
      <RouteSearch onSearch={handleSearch} />
      {error && (
        <p className="text-danger text-sm mb-4">{error}</p>
      )}
      {loading && (
        <p className="text-gray-400 text-sm mb-4">Loading safety data...</p>
      )}
      <MapView safetyData={safetyData} />
    </div>
  );
}
