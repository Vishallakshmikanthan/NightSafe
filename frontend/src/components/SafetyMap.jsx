import { useState, useEffect, useCallback, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Tooltip,
  Polyline,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import RouteSearch from "./RouteSearch.jsx";
import LegendPanel from "./LegendPanel.jsx";
import StreetDetailPanel from "./StreetDetailPanel.jsx";
import TopInfoBar from "./TopInfoBar.jsx";
import { fetchStreets as apiFetchStreets, fetchSafeRoute } from "../services/api.js";

// ── Chennai centre & zoom ───────────────────────────────────────
const CHENNAI_CENTER = [13.0827, 80.2707];
const DEFAULT_ZOOM = 13;

// ── Realistic mock coordinates for 50 Chennai streets ───────────
const STREET_COORDS = {
  "CHN-001": [13.0604, 80.2496],
  "CHN-002": [13.0878, 80.2785],
  "CHN-003": [13.1067, 80.2849],
  "CHN-004": [13.0674, 80.2370],
  "CHN-005": [13.0500, 80.2121],
  "CHN-006": [13.0172, 80.2262],
  "CHN-007": [13.1150, 80.2912],
  "CHN-008": [13.0327, 80.2609],
  "CHN-009": [13.0438, 80.2339],
  "CHN-010": [13.1250, 80.2144],
  "CHN-011": [13.0985, 80.2656],
  "CHN-012": [13.0764, 80.2618],
  "CHN-013": [13.1097, 80.2920],
  "CHN-014": [13.0483, 80.2700],
  "CHN-015": [13.0595, 80.2760],
  "CHN-016": [13.0890, 80.2427],
  "CHN-017": [13.1044, 80.2300],
  "CHN-018": [13.1338, 80.2256],
  "CHN-019": [13.0713, 80.2938],
  "CHN-020": [13.0997, 80.2799],
  "CHN-021": [13.1072, 80.2610],
  "CHN-022": [13.1210, 80.2534],
  "CHN-023": [13.1330, 80.2690],
  "CHN-024": [13.1490, 80.2475],
  "CHN-025": [13.0637, 80.2876],
  "CHN-026": [13.0556, 80.2877],
  "CHN-027": [13.1110, 80.2370],
  "CHN-028": [13.0363, 80.2463],
  "CHN-029": [13.0106, 80.2200],
  "CHN-030": [13.1462, 80.2825],
  "CHN-031": [13.1587, 80.2636],
  "CHN-032": [13.1740, 80.2776],
  "CHN-033": [13.1289, 80.3012],
  "CHN-034": [13.1380, 80.2970],
  "CHN-035": [13.0916, 80.2927],
  "CHN-036": [13.0235, 80.2574],
  "CHN-037": [13.0008, 80.2566],
  "CHN-038": [13.0400, 80.2767],
  "CHN-039": [13.1570, 80.3016],
  "CHN-040": [13.1700, 80.2966],
  "CHN-041": [13.0826, 80.2370],
  "CHN-042": [13.0267, 80.2073],
  "CHN-043": [13.0550, 80.2210],
  "CHN-044": [13.1395, 80.2133],
  "CHN-045": [13.1520, 80.2310],
  "CHN-046": [13.0780, 80.2112],
  "CHN-047": [13.0320, 80.2380],
  "CHN-048": [13.0680, 80.2040],
  "CHN-049": [13.0160, 80.2470],
  "CHN-050": [13.1205, 80.2210],
};

// ── Colour coding ───────────────────────────────────────────────
function scoreToColor(score) {
  if (score >= 70) return "#22c55e";
  if (score >= 40) return "#eab308";
  return "#ef4444";
}

function scoreToLabel(score) {
  if (score >= 70) return "SAFE";
  if (score >= 40) return "CAUTION";
  return "DANGER";
}

// ── Fly map to bounds when data arrives ─────────────────────────
function FitBounds({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords.length > 0) {
      map.fitBounds(coords, { padding: [30, 30], maxZoom: 14 });
    }
  }, [coords, map]);
  return null;
}

// ── Hour label helper ───────────────────────────────────────────
function hourLabel(h) {
  if (h === 0) return "12 AM";
  if (h === 12) return "12 PM";
  return h > 12 ? `${h - 12} PM` : `${h} AM`;
}

// ═════════════════════════════════════════════════════════════════
// SafetyMap component
// ═════════════════════════════════════════════════════════════════
export default function SafetyMap() {
  const [hour, setHour] = useState(20);
  const [streets, setStreets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState(null);
  const [selectedStreet, setSelectedStreet] = useState(null);

  // Fetch street data via the axios service
  const loadStreets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetchStreets();
      const filtered = data
        .filter((s) => s.hour === hour)
        .map((s) => ({
          ...s,
          coords: STREET_COORDS[s.street_id] || null,
        }))
        .filter((s) => s.coords !== null);
      setStreets(filtered);
    } catch {
      setError("Could not load street data. Is the backend running?");
      setStreets([]);
    } finally {
      setLoading(false);
    }
  }, [hour]);

  useEffect(() => {
    loadStreets();
  }, [loadStreets]);

  // Keep selected street in sync when hour changes
  useEffect(() => {
    if (selectedStreet) {
      const updated = streets.find(
        (s) => s.street_id === selectedStreet.street_id
      );
      setSelectedStreet(updated || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streets]);

  const allCoords = useMemo(() => streets.map((s) => s.coords), [streets]);

  const stats = useMemo(() => {
    const safe = streets.filter((s) => s.safety_score >= 70).length;
    const caution = streets.filter(
      (s) => s.safety_score >= 40 && s.safety_score < 70
    ).length;
    const danger = streets.filter((s) => s.safety_score < 40).length;
    return { safe, caution, danger, total: streets.length };
  }, [streets]);

  const handleRouteSearch = useCallback(async ({ start, end, hour: h }) => {
    setRouteError(null);
    try {
      const data = await fetchSafeRoute(start, end, h);
      setRoute(data);
    } catch (err) {
      setRoute(null);
      setRouteError(
        err?.response?.data?.detail || "Could not find a safe route."
      );
    }
  }, []);

  const routeCoords = useMemo(
    () => (route ? route.route.map((s) => [s.lat, s.lng]) : []),
    [route]
  );

  const routeStreetIds = useMemo(
    () => new Set(route ? route.route.map((s) => s.street_id) : []),
    [route]
  );

  const isSelected = (id) => selectedStreet?.street_id === id;

  return (
    <div className="flex flex-col gap-3 flex-1 min-h-0">
      {/* ── Top info bar ─────────────────────────────────────── */}
      <TopInfoBar
        hour={hour}
        dangerCount={stats.danger}
        totalStreets={stats.total}
        loading={loading}
      />

      <div className="flex gap-3 flex-1 min-h-0">
        {/* ── Sidebar ────────────────────────────────────────── */}
        <div className="w-80 shrink-0 flex flex-col gap-3 overflow-y-auto">
          {/* Time slider */}
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest">
                Time of Night
              </h3>
              <span className="text-lg font-black text-white tabular-nums">
                {hourLabel(hour)}
              </span>
            </div>
            <input
              type="range"
              min={20}
              max={24}
              step={1}
              value={hour > 23 ? 24 : hour}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setHour(v === 24 ? 0 : v);
              }}
              className="w-full cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-gray-500 mt-1.5 font-medium">
              <span>8 PM</span>
              <span>9 PM</span>
              <span>10 PM</span>
              <span>11 PM</span>
              <span>12 AM</span>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-2">
            <StatBadge color="green" label="Safe" count={stats.safe} />
            <StatBadge color="yellow" label="Caution" count={stats.caution} />
            <StatBadge color="red" label="Danger" count={stats.danger} />
          </div>

          {/* Legend */}
          <LegendPanel />

          {/* Street detail */}
          {selectedStreet && (
            <StreetDetailPanel
              street={selectedStreet}
              onClose={() => setSelectedStreet(null)}
            />
          )}

          {/* Route search */}
          <div className="glass-card rounded-xl p-4">
            <h3 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-3">
              Route Finder
            </h3>
            <RouteSearch onSearch={handleRouteSearch} hour={hour} />
          </div>

          {/* Route error */}
          {routeError && (
            <p className="text-red-400 text-sm bg-red-900/20 rounded-xl px-4 py-3 border border-red-500/20">
              {routeError}
            </p>
          )}

          {/* Route result */}
          {route && (
            <div className="glass-card rounded-xl p-4 border-indigo-500/30 animate-slide-up">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-[11px] font-semibold text-indigo-300 uppercase tracking-widest">
                  Safest Route
                </h3>
                <button
                  onClick={() => setRoute(null)}
                  className="text-gray-500 hover:text-gray-300 text-xs transition-colors"
                >
                  Clear
                </button>
              </div>
              <p className="text-white text-sm mb-2">
                <span className="font-semibold">{route.total_streets}</span>{" "}
                streets &nbsp;·&nbsp; Avg:{" "}
                <span
                  className="font-bold"
                  style={{
                    color: scoreToColor(route.avg_safety_score),
                  }}
                >
                  {route.avg_safety_score}
                </span>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {route.route.map((s, i) => (
                  <span
                    key={s.street_id}
                    className="text-[11px] px-2 py-0.5 rounded-full border transition-all duration-300 hover:scale-105 cursor-default"
                    style={{
                      borderColor: scoreToColor(s.safety_score),
                      color:
                        s.zone === "SAFE"
                          ? "#86efac"
                          : s.zone === "CAUTION"
                          ? "#fde047"
                          : "#fca5a5",
                    }}
                  >
                    {i + 1}. {s.street_name} ({s.safety_score})
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Map ────────────────────────────────────────────── */}
        <div className="flex-1 min-h-[300px] rounded-xl overflow-hidden border border-night-600 relative shadow-2xl shadow-black/40">
          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-night-900/80 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                <span className="text-sm text-gray-400">
                  Loading safety data…
                </span>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {error && !loading && (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-night-900/90">
              <div className="text-center">
                <p className="text-red-400 text-sm mb-2">{error}</p>
                <button
                  onClick={loadStreets}
                  className="text-indigo-400 text-sm hover:underline"
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          <MapContainer
            center={CHENNAI_CENTER}
            zoom={DEFAULT_ZOOM}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://carto.com/">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />

            <FitBounds coords={allCoords} />

            {/* Route polyline */}
            {routeCoords.length > 1 && (
              <Polyline
                positions={routeCoords}
                pathOptions={{
                  color: "#818cf8",
                  weight: 4,
                  opacity: 0.85,
                  dashArray: "8 6",
                }}
              />
            )}

            {streets.map((street) => (
              <CircleMarker
                key={street.street_id}
                center={street.coords}
                radius={
                  isSelected(street.street_id)
                    ? 14
                    : routeStreetIds.has(street.street_id)
                    ? 12
                    : 9
                }
                pathOptions={{
                  color: isSelected(street.street_id)
                    ? "#ffffff"
                    : routeStreetIds.has(street.street_id)
                    ? "#818cf8"
                    : scoreToColor(street.safety_score),
                  fillColor: scoreToColor(street.safety_score),
                  fillOpacity: isSelected(street.street_id)
                    ? 0.9
                    : routeStreetIds.has(street.street_id)
                    ? 0.7
                    : 0.5,
                  weight: isSelected(street.street_id) ? 3 : 2,
                }}
                eventHandlers={{
                  click: () => setSelectedStreet(street),
                }}
              >
                <Tooltip
                  direction="top"
                  offset={[0, -8]}
                  className="safety-tooltip"
                >
                  <div className="text-xs leading-snug">
                    <p className="font-bold text-sm">{street.street_name}</p>
                    <p>
                      Score:{" "}
                      <span
                        style={{ color: scoreToColor(street.safety_score) }}
                        className="font-semibold"
                      >
                        {street.safety_score.toFixed(1)}
                      </span>
                    </p>
                    <p className="opacity-70">
                      {scoreToLabel(street.safety_score)} · {hourLabel(hour)}
                    </p>
                  </div>
                </Tooltip>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}

// ── Stat badge ──────────────────────────────────────────────────
function StatBadge({ color, label, count }) {
  const styles = {
    green: "bg-green-500/10 border-green-500/20 text-green-400",
    yellow: "bg-yellow-500/10 border-yellow-500/20 text-yellow-400",
    red: "bg-red-500/10 border-red-500/20 text-red-400",
  };
  return (
    <div
      className={`flex-1 rounded-lg px-3 py-2.5 text-center border
                  transition-all duration-500 ${styles[color]}`}
    >
      <p className="text-xl font-black tabular-nums">{count}</p>
      <p className="text-[10px] uppercase tracking-wider font-medium opacity-80">
        {label}
      </p>
    </div>
  );
}
