function hourLabel(h) {
  if (h === 0) return "12:00 AM";
  if (h === 12) return "12:00 PM";
  return h > 12 ? `${h - 12}:00 PM` : `${h}:00 AM`;
}

export default function TopInfoBar({ hour, dangerCount, totalStreets, loading }) {
  return (
    <div className="glass-card rounded-xl px-5 py-3 flex items-center justify-between gap-4 animate-fade-in shrink-0">
      {/* Live indicator + time */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
          </span>
          <span className="text-xs font-medium text-green-400 uppercase tracking-wider">
            Live
          </span>
        </div>
        <div className="h-4 w-px bg-night-600" />
        <span className="text-sm text-gray-300">
          Simulated Time:{" "}
          <span className="font-bold text-white tabular-nums">
            {hourLabel(hour)}
          </span>
        </span>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full bg-red-500 animate-pulse-glow"
            style={{ boxShadow: "0 0 8px rgba(239,68,68,0.6)" }}
          />
          <span className="text-sm text-gray-300">
            Danger Zones:{" "}
            <span className="font-bold text-red-400 tabular-nums">
              {loading ? "—" : dangerCount}
            </span>
          </span>
        </div>

        <div className="h-4 w-px bg-night-600" />

        <span className="text-sm text-gray-400">
          Monitoring{" "}
          <span className="font-semibold text-gray-200 tabular-nums">
            {loading ? "—" : totalStreets}
          </span>{" "}
          streets
        </span>
      </div>
    </div>
  );
}
