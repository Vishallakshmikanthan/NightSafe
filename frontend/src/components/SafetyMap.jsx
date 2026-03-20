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
import { fetchSafeRoute } from "../services/api.js";

// ── Chennai centre & zoom ───────────────────────────────────────
const CHENNAI_CENTER = [13.0827, 80.2707];
const DEFAULT_ZOOM = 13;

// ── Realistic mock coordinates for 50 Chennai streets ───────────
const STREET_COORDS = {
  "CHN-001": [13.0604, 80.2496], // Anna Salai
  "CHN-002": [13.0878, 80.2785], // T Nagar Main Rd
  "CHN-003": [13.1067, 80.2849], // Pondy Bazaar
  "CHN-004": [13.0674, 80.2370], // Mount Road
  "CHN-005": [13.0500, 80.2121], // Guindy Industrial Estate
  "CHN-006": [13.0172, 80.2262], // Velachery Main Rd
  "CHN-007": [13.1150, 80.2912], // Kodambakkam High Rd
  "CHN-008": [13.0327, 80.2609], // Adyar Bridge Rd
  "CHN-009": [13.0438, 80.2339], // Saidapet High Rd
  "CHN-010": [13.1250, 80.2144], // Porur Junction
  "CHN-011": [13.0985, 80.2656], // Nungambakkam High Rd
  "CHN-012": [13.0764, 80.2618], // Teynampet
  "CHN-013": [13.1097, 80.2920], // Mambalam
  "CHN-014": [13.0483, 80.2700], // Mylapore
  "CHN-015": [13.0595, 80.2760], // Triplicane
  "CHN-016": [13.0890, 80.2427], // Ashok Nagar
  "CHN-017": [13.1044, 80.2300], // Vadapalani
  "CHN-018": [13.1338, 80.2256], // Virugambakkam
  "CHN-019": [13.0713, 80.2938], // Royapettah
  "CHN-020": [13.0997, 80.2799], // Chetpet
  "CHN-021": [13.1072, 80.2610], // Aminjikarai
  "CHN-022": [13.1210, 80.2534], // Shenoy Nagar
  "CHN-023": [13.1330, 80.2690], // Anna Nagar
  "CHN-024": [13.1490, 80.2475], // Mogappair
  "CHN-025": [13.0637, 80.2876], // Chepauk
  "CHN-026": [13.0556, 80.2877], // Marina Beach Rd
  "CHN-027": [13.1110, 80.2370], // Koyambedu
  "CHN-028": [13.0363, 80.2463], // Nanganallur
  "CHN-029": [13.0106, 80.2200], // Tambaram West
  "CHN-030": [13.1462, 80.2825], // Kilpauk
  "CHN-031": [13.1587, 80.2636], // Villivakkam
  "CHN-032": [13.1740, 80.2776], // Perambur
  "CHN-033": [13.1289, 80.3012], // Egmore
  "CHN-034": [13.1380, 80.2970], // Purasawalkam
  "CHN-035": [13.0916, 80.2927], // Thousand Lights
  "CHN-036": [13.0235, 80.2574], // Thiruvanmiyur
  "CHN-037": [13.0008, 80.2566], // Sholinganallur
  "CHN-038": [13.0400, 80.2767], // Besant Nagar
  "CHN-039": [13.1570, 80.3016], // Tondiarpet
  "CHN-040": [13.1700, 80.2966], // Washermanpet
  "CHN-041": [13.0826, 80.2370], // Saidapet West
  "CHN-042": [13.0267, 80.2073], // Guindy South
  "CHN-043": [13.0550, 80.2210], // Alandur
  "CHN-044": [13.1395, 80.2133], // Valasaravakkam
  "CHN-045": [13.1520, 80.2310], // Maduravoyal
  "CHN-046": [13.0780, 80.2112], // Ashok Pillar
  "CHN-047": [13.0320, 80.2380], // Pallikaranai
  "CHN-048": [13.0680, 80.2040], // Mugalivakkam
  "CHN-049": [13.0160, 80.2470], // Medavakkam
  "CHN-050": [13.1205, 80.2210], // Ramapuram
};

// ── Colour coding ───────────────────────────────────────────────
function scoreToColor(score) {
  if (score >= 70) return "#22c55e"; // safe – green
  if (score >= 40) return "#eab308"; // caution – yellow
  return "#ef4444"; // danger – red
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
  const [hour, setHour] = useState(20); // default 8 PM
  const [streets, setStreets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [route, setRoute] = useState(null);
  const [routeError, setRouteError] = useState(null);

  const API_BASE =
    import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8001";

  // Fetch street data from backend for the selected hour
  const fetchStreets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/streets`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      // Filter to selected hour and attach coordinates
      const filtered = data
        .filter((s) => s.hour === hour)
        .map((s) => ({
          ...s,
          coords: STREET_COORDS[s.street_id] || null,
        }))
        .filter((s) => s.coords !== null);

      setStreets(filtered);
    } catch (err) {
      setError("Could not load street data. Is the backend running?");
      setStreets([]);
    } finally {
      setLoading(false);
    }
  }, [hour, API_BASE]);

  useEffect(() => {
    fetchStreets();
  }, [fetchStreets]);

  // Precompute coordinate bounds
  const allCoords = useMemo(
    () => streets.map((s) => s.coords),
    [streets]
  );

  // Stats
  const stats = useMemo(() => {
    const safe = streets.filter((s) => s.safety_score >= 70).length;
    const caution = streets.filter(
      (s) => s.safety_score >= 40 && s.safety_score < 70
    ).length;
    const danger = streets.filter((s) => s.safety_score < 40).length;
    return { safe, caution, danger, total: streets.length };
  }, [streets]);

  // ── Route search handler ──────────────────────────────────────
  const handleRouteSearch = useCallback(
    async ({ start, end, hour: h }) => {
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
    },
    []
  );

  // Polyline coordinates for the route
  const routeCoords = useMemo(
    () => (route ? route.route.map((s) => [s.lat, s.lng]) : []),
    [route]
  );

  // IDs of streets on route for highlighting
  const routeStreetIds = useMemo(
    () => new Set(route ? route.route.map((s) => s.street_id) : []),
    [route]
  );

  return (
    <div className="space-y-4">
      {/* ── Route Search ─────────────────────────────────────── */}
      <RouteSearch onSearch={handleRouteSearch} hour={hour} />
      <div className="bg-night-800 rounded-xl p-4 border border-night-600">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-300 tracking-wide uppercase">
            Time of Night
          </h3>
          <span className="text-lg font-bold text-white tabular-nums">
            {hourLabel(hour)}
          </span>
        </div>

        <input
          type="range"
          min={20}
          max={24}
          step={1}
          value={hour > 23 ? 0 : hour}
          onChange={(e) => {
            const v = parseInt(e.target.value, 10);
            setHour(v === 24 ? 0 : v);
          }}
          className="w-full h-2 rounded-lg appearance-none cursor-pointer
                     bg-night-600 accent-indigo-500"
        />

        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>8 PM</span>
          <span>9 PM</span>
          <span>10 PM</span>
          <span>11 PM</span>
          <span>12 AM</span>
        </div>
      </div>

      {/* ── Stats Bar ────────────────────────────────────────── */}
      <div className="flex gap-3">
        <StatBadge color="bg-green-500/20 text-green-400" label="Safe" count={stats.safe} />
        <StatBadge color="bg-yellow-500/20 text-yellow-400" label="Caution" count={stats.caution} />
        <StatBadge color="bg-red-500/20 text-red-400" label="Danger" count={stats.danger} />
      </div>

      {/* ── Route Result ─────────────────────────────────────── */}
      {routeError && (
        <p className="text-red-400 text-sm bg-red-900/20 rounded-lg px-4 py-2">
          {routeError}
        </p>
      )}
      {route && (
        <div className="bg-night-800 rounded-xl p-4 border border-indigo-500/40">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-indigo-300 tracking-wide uppercase">
              Safest Route Found
            </h3>
            <button
              onClick={() => setRoute(null)}
              className="text-gray-500 hover:text-gray-300 text-xs"
            >
              Clear
            </button>
          </div>
          <p className="text-white text-sm">
            <span className="font-semibold">{route.total_streets}</span> streets
            &nbsp;·&nbsp; Avg Safety:{" "}
            <span
              className="font-bold"
              style={{
                color:
                  route.avg_safety_score >= 70
                    ? "#22c55e"
                    : route.avg_safety_score >= 40
                    ? "#eab308"
                    : "#ef4444",
              }}
            >
              {route.avg_safety_score}
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {route.route.map((s, i) => (
              <span
                key={s.street_id}
                className="text-[11px] px-2 py-0.5 rounded-full border"
                style={{
                  borderColor:
                    s.zone === "SAFE"
                      ? "#22c55e"
                      : s.zone === "CAUTION"
                      ? "#eab308"
                      : "#ef4444",
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

      {/* ── Error / Loading ──────────────────────────────────── */}
      {error && (
        <p className="text-red-400 text-sm bg-red-900/20 rounded-lg px-4 py-2">
          {error}
        </p>
      )}
      {loading && (
        <p className="text-gray-400 text-sm animate-pulse">
          Fetching safety data…
        </p>
      )}

      {/* ── Map ──────────────────────────────────────────────── */}
      <div className="h-[65vh] w-full rounded-xl overflow-hidden border border-night-600 shadow-2xl">
        <MapContainer
          center={CHENNAI_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={true}
          className="h-full w-full"
        >
          {/* Dark Carto tile layer */}
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
              radius={routeStreetIds.has(street.street_id) ? 13 : 10}
              pathOptions={{
                color: routeStreetIds.has(street.street_id)
                  ? "#818cf8"
                  : scoreToColor(street.safety_score),
                fillColor: scoreToColor(street.safety_score),
                fillOpacity: routeStreetIds.has(street.street_id) ? 0.8 : 0.55,
                weight: routeStreetIds.has(street.street_id) ? 3 : 2,
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
  );
}

// ── Tiny stat badge ─────────────────────────────────────────────
function StatBadge({ color, label, count }) {
  return (
    <div className={`flex-1 rounded-lg px-3 py-2 text-center ${color}`}>
      <p className="text-xl font-bold tabular-nums">{count}</p>
      <p className="text-xs uppercase tracking-wide">{label}</p>
    </div>
  );
}
