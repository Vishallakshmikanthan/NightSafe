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

function riskFactors(street) {
  const footfallRisk = Math.max(0, Math.min(100, 100 - (street.footfall / 250) * 100));
  const lightingRisk = street.lighting_status === 0 ? 95 : 10;
  const liquorRisk = Math.max(0, Math.min(100, 100 - (street.liquor_distance / 500) * 100));
  const crimeRisk = Math.min(100, street.crime_score * 100);

  return [
    {
      label: "Low Footfall",
      value: footfallRisk,
      raw: `${street.footfall} people/hr`,
      color: footfallRisk > 60 ? "#ef4444" : footfallRisk > 30 ? "#eab308" : "#22c55e",
      icon: "👥",
    },
    {
      label: "Poor Lighting",
      value: lightingRisk,
      raw: street.lighting_status === 0 ? "Off" : "On",
      color: lightingRisk > 60 ? "#ef4444" : lightingRisk > 30 ? "#eab308" : "#22c55e",
      icon: "💡",
    },
    {
      label: "Liquor Proximity",
      value: liquorRisk,
      raw: `${street.liquor_distance}m away`,
      color: liquorRisk > 60 ? "#ef4444" : liquorRisk > 30 ? "#eab308" : "#22c55e",
      icon: "🍺",
    },
    {
      label: "Crime Activity",
      value: crimeRisk,
      raw: `${(street.crime_score * 100).toFixed(0)}%`,
      color: crimeRisk > 60 ? "#ef4444" : crimeRisk > 30 ? "#eab308" : "#22c55e",
      icon: "🚨",
    },
  ];
}

export default function StreetDetailPanel({ street, onClose }) {
  if (!street) return null;

  const zone = scoreToLabel(street.safety_score);
  const color = scoreToColor(street.safety_score);
  const factors = riskFactors(street);

  return (
    <div className="glass-card rounded-xl p-4 animate-slide-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-white truncate">
            {street.street_name}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">{street.street_id}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition-colors text-sm shrink-0"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Score display */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-lg font-black"
          style={{
            backgroundColor: `${color}15`,
            border: `2px solid ${color}40`,
            color: color,
          }}
        >
          {street.safety_score.toFixed(0)}
        </div>
        <div>
          <span
            className="inline-block text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
            style={{
              backgroundColor: `${color}20`,
              color: color,
              border: `1px solid ${color}30`,
            }}
          >
            {zone}
          </span>
          <p className="text-xs text-gray-400 mt-1">Safety Score</p>
        </div>
      </div>

      {/* Risk Factors */}
      <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2.5">
        Risk Factors
      </h4>
      <div className="space-y-3">
        {factors.map((f) => (
          <div key={f.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-300 flex items-center gap-1.5">
                <span className="text-sm">{f.icon}</span>
                {f.label}
              </span>
              <span className="text-[11px] text-gray-500 tabular-nums">
                {f.raw}
              </span>
            </div>
            <div className="h-1.5 bg-night-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${f.value}%`,
                  backgroundColor: f.color,
                  boxShadow: `0 0 8px ${f.color}40`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* AI Explanation */}
      {street.explanation && street.explanation.length > 0 && (
        <div className="mt-4">
          <h4 className="text-[11px] font-semibold text-gray-500 uppercase tracking-widest mb-2">
            Why this score?
          </h4>
          <div
            className="rounded-lg p-3 space-y-1.5"
            style={{
              backgroundColor: `${color}08`,
              border: `1px solid ${color}20`,
            }}
          >
            <p className="text-xs font-semibold" style={{ color }}>
              Safety Score {street.safety_score.toFixed(0)} ({zone})
            </p>
            <ul className="space-y-1">
              {street.explanation.map((reason, i) => (
                <li
                  key={i}
                  className="text-xs text-gray-300 flex items-start gap-1.5"
                >
                  <span className="text-[10px] mt-0.5" style={{ color }}>
                    ●
                  </span>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
