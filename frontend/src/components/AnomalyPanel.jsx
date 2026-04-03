import { useState, useEffect } from "react";
import { fetchAnomalies } from "../services/api.js";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

const SEVERITY_STYLES = {
  CRITICAL: { bg: "bg-red-500/15", border: "border-red-500/40", text: "text-red-400", dot: "bg-red-500" },
  HIGH:     { bg: "bg-orange-500/15", border: "border-orange-500/40", text: "text-orange-400", dot: "bg-orange-500" },
  MEDIUM:   { bg: "bg-yellow-500/15", border: "border-yellow-500/40", text: "text-yellow-400", dot: "bg-yellow-500" },
  LOW:      { bg: "bg-blue-500/15", border: "border-blue-500/40", text: "text-blue-400", dot: "bg-blue-400" },
};

export default function AnomalyPanel({ hour }) {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchAnomalies(hour)
      .then((data) => setAnomalies(data))
      .catch(() => setAnomalies([]))
      .finally(() => setLoading(false));
  }, [hour]);

  const critical = anomalies.filter((a) => a.severity === "CRITICAL").length;
  const high = anomalies.filter((a) => a.severity === "HIGH").length;
  const shown = expanded ? anomalies : anomalies.slice(0, 4);

  return (
    <Card className="bg-card/75 backdrop-blur-sm animate-slide-up">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Anomaly Detection
          </CardTitle>
          {!loading && anomalies.length > 0 && (
            <span className="text-[11px] font-bold text-red-400 tabular-nums">
              {anomalies.length} found
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>

      {loading ? (
        <div className="flex items-center gap-2 py-3">
          <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-xs text-gray-400">Scanning...</span>
        </div>
      ) : anomalies.length === 0 ? (
        <p className="text-xs text-gray-500 py-2">No anomalies detected this hour</p>
      ) : (
        <>
          {/* Summary badges */}
          {(critical > 0 || high > 0) && (
            <div className="flex gap-2 mb-3">
              {critical > 0 && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                  {critical} CRITICAL
                </span>
              )}
              {high > 0 && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  {high} HIGH
                </span>
              )}
            </div>
          )}

          {/* List */}
          <div className="space-y-2">
            {shown.map((a, i) => {
              const s = SEVERITY_STYLES[a.severity] || SEVERITY_STYLES.LOW;
              return (
                <div
                  key={`${a.street_id}-${i}`}
                  className={`${s.bg} border ${s.border} rounded-lg px-3 py-2 transition-all duration-300 hover:scale-[1.01]`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                    <span className={`text-xs font-bold ${s.text}`}>
                      {a.severity}
                    </span>
                    <span className="text-[11px] text-gray-400 ml-auto tabular-nums">
                      Score: {typeof a.actual_score === "number" ? a.actual_score.toFixed(1) : a.actual_score}
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 font-medium truncate">
                    {a.street_name || a.street_id}
                  </p>
                  {a.reason && (
                    <p className="text-[11px] text-gray-500 mt-0.5 truncate">{a.reason}</p>
                  )}
                </div>
              );
            })}
          </div>

          {anomalies.length > 4 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs text-indigo-400 hover:text-indigo-300"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Show less" : `Show all ${anomalies.length} anomalies`}
            </Button>
          )}
        </>
      )}
      </CardContent>
    </Card>
  );
}
