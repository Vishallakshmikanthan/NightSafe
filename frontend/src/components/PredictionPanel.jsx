import { useState, useEffect } from "react";
import { fetchPredictions } from "../services/api.js";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";

function trendIcon(trend) {
  if (trend === "declining") return { symbol: "\u2193", color: "text-red-400" };
  if (trend === "rising") return { symbol: "\u2191", color: "text-green-400" };
  return { symbol: "\u2192", color: "text-gray-400" };
}

function scoreColor(score) {
  if (score >= 70) return "text-green-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

export default function PredictionPanel({ hour }) {
  const [preds, setPreds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchPredictions(hour)
      .then((data) => setPreds(data))
      .catch(() => setPreds([]))
      .finally(() => setLoading(false));
  }, [hour]);

  const declining = preds.filter((p) => p.trend === "declining");
  const shown = expanded ? declining : declining.slice(0, 5);

  return (
    <Card className="bg-card/75 backdrop-blur-sm animate-slide-up">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
            Next-Hour Predictions
          </CardTitle>
          {!loading && declining.length > 0 && (
            <span className="text-[11px] font-bold text-orange-400 tabular-nums">
              {declining.length} declining
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>

      {loading ? (
        <div className="flex items-center gap-2 py-3">
          <div className="w-4 h-4 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <span className="text-xs text-gray-400">Predicting...</span>
        </div>
      ) : declining.length === 0 ? (
        <p className="text-xs text-gray-500 py-2">All streets stable or improving</p>
      ) : (
        <>
          <div className="space-y-1.5">
            {shown.map((p) => {
              const t = trendIcon(p.trend);
              return (
                <div
                  key={p.street_id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/15
                             transition-all duration-300 hover:bg-red-500/12"
                >
                  <span className={`text-sm font-bold ${t.color}`}>{t.symbol}</span>
                  <span className="text-xs text-gray-300 font-medium truncate flex-1">
                    {p.street_name || p.street_id}
                  </span>
                  <span className={`text-xs font-bold tabular-nums ${scoreColor(p.predicted_score)}`}>
                    {typeof p.predicted_score === "number" ? p.predicted_score.toFixed(1) : p.predicted_score}
                  </span>
                </div>
              );
            })}
          </div>

          {declining.length > 5 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2 text-xs text-indigo-400 hover:text-indigo-300"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? "Show less" : `Show all ${declining.length} declining`}
            </Button>
          )}
        </>
      )}
      </CardContent>
    </Card>
  );
}
