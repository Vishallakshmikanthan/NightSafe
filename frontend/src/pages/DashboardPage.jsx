import { useState, useEffect, useCallback } from "react";
import {
  fetchPoliceAlerts,
  fetchGccAlerts,
  fetchAnomalies,
  fetchPredictions,
  fetchInvestmentReport,
  fetchLearningStatus,
} from "../services/api.js";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "../components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";

const TABS = [
  { key: "police", label: "Police Alerts" },
  { key: "gcc", label: "GCC Alerts" },
  { key: "anomalies", label: "Anomalies" },
  { key: "predictions", label: "Predictions" },
  { key: "investment", label: "Investment" },
  { key: "learning", label: "Learning" },
];

function scoreColor(score) {
  if (score >= 70) return "text-green-400";
  if (score >= 40) return "text-yellow-400";
  return "text-red-400";
}

function scoreBg(score) {
  if (score >= 70) return "bg-green-500/10 border-green-500/20";
  if (score >= 40) return "bg-yellow-500/10 border-yellow-500/20";
  return "bg-red-500/10 border-red-500/20";
}

export default function DashboardPage() {
  const [tab, setTab] = useState("police");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setData(null);
    try {
      switch (tab) {
        case "police":
          setData(await fetchPoliceAlerts());
          break;
        case "gcc":
          setData(await fetchGccAlerts());
          break;
        case "anomalies":
          setData(await fetchAnomalies());
          break;
        case "predictions":
          setData(await fetchPredictions());
          break;
        case "investment":
          setData(await fetchInvestmentReport(15));
          break;
        case "learning":
          setData(await fetchLearningStatus());
          break;
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto py-6 px-4 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white">Agent Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Real-time outputs from the NightSafe multi-agent system
            </p>
          </div>
          <Button
            onClick={load}
            disabled={loading}
            variant="outline"
            size="sm"
            className="text-xs font-semibold"
          >
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full justify-start gap-1 bg-muted/50 p-1 mb-6 overflow-x-auto">
            {TABS.map((t) => (
              <TabsTrigger key={t.key} value={t.key} className="text-xs font-semibold">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              <span className="text-sm text-gray-400">Loading data...</span>
            </div>
          </div>
        ) : !data ? (
          <div className="text-center py-20 text-gray-500">
            <p>No data available. Is the backend running?</p>
          </div>
        ) : (
          <div className="animate-slide-up">
            <TabsContent value="police"><PoliceTab data={data} /></TabsContent>
            <TabsContent value="gcc"><GccTab data={data} /></TabsContent>
            <TabsContent value="anomalies"><AnomaliesTab data={data} /></TabsContent>
            <TabsContent value="predictions"><PredictionsTab data={data} /></TabsContent>
            <TabsContent value="investment"><InvestmentTab data={data} /></TabsContent>
            <TabsContent value="learning"><LearningTab data={data} /></TabsContent>
          </div>
        )}
        </Tabs>
      </div>
    </div>
  );
}

/* ── Police Alerts ─────────────────────────────────────────────── */
function PoliceTab({ data }) {
  if (!Array.isArray(data) || data.length === 0)
    return <Empty msg="No police alerts at this time" />;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 mb-2">{data.length} active alert(s)</p>
      {data.map((a, i) => (
        <Card
          key={a.alert_id || i}
          className="bg-card/75 backdrop-blur-sm border-red-500/20 hover:border-red-500/40 transition-all"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <Badge variant="destructive" className="text-[10px] uppercase">
                  {a.priority || "ALERT"}
                </Badge>
                {a.alert_id && (
                  <span className="text-[10px] text-gray-600 font-mono">{a.alert_id}</span>
                )}
              </div>
              <p className="text-sm text-white font-semibold">{a.street_name || a.street_id}</p>
              <p className="text-xs text-gray-400 mt-1">{a.reason || a.message}</p>
            </div>
            <div className="text-right shrink-0">
              {a.safety_score !== undefined && (
                <span className={`text-lg font-black tabular-nums ${scoreColor(a.safety_score)}`}>
                  {typeof a.safety_score === "number" ? a.safety_score.toFixed(0) : a.safety_score}
                </span>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ── GCC Alerts ────────────────────────────────────────────────── */
function GccTab({ data }) {
  if (!Array.isArray(data) || data.length === 0)
    return <Empty msg="No GCC infrastructure alerts" />;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 mb-2">{data.length} infrastructure alert(s)</p>
      {data.map((a, i) => (
        <Card
          key={a.alert_id || i}
          className="bg-card/75 backdrop-blur-sm border-yellow-500/20 hover:border-yellow-500/40 transition-all"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-xs font-bold text-yellow-400 uppercase">
                  {a.priority || "INFRASTRUCTURE"}
                </span>
              </div>
              <p className="text-sm text-white font-semibold">{a.street_name || a.street_id}</p>
              <p className="text-xs text-gray-400 mt-1">{a.reason || a.message}</p>
              {a.recommendation && (
                <p className="text-xs text-yellow-400/80 mt-1.5 italic">{a.recommendation}</p>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

/* ── Anomalies ─────────────────────────────────────────────────── */
function AnomaliesTab({ data }) {
  if (!Array.isArray(data) || data.length === 0)
    return <Empty msg="No anomalies detected" />;

  const SEVERITY = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const sorted = [...data].sort(
    (a, b) => (SEVERITY[a.severity] ?? 9) - (SEVERITY[b.severity] ?? 9)
  );

  return (
    <div>
      <div className="flex gap-3 mb-4">
        {["CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => {
          const count = data.filter((a) => a.severity === sev).length;
          if (count === 0) return null;
          const colors = {
            CRITICAL: "text-red-400 bg-red-500/10 border-red-500/30",
            HIGH: "text-orange-400 bg-orange-500/10 border-orange-500/30",
            MEDIUM: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
            LOW: "text-blue-400 bg-blue-500/10 border-blue-500/30",
          };
          return (
            <span
              key={sev}
              className={`text-xs font-bold px-3 py-1.5 rounded-full border ${colors[sev]}`}
            >
              {count} {sev}
            </span>
          );
        })}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {sorted.map((a, i) => {
          const dotColor = {
            CRITICAL: "bg-red-500",
            HIGH: "bg-orange-500",
            MEDIUM: "bg-yellow-500",
            LOW: "bg-blue-400",
          }[a.severity] || "bg-gray-500";

          return (
            <Card
              key={`${a.street_id}-${i}`}
              className="bg-card/75 backdrop-blur-sm hover:scale-[1.01] transition-all"
            >
              <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full ${dotColor}`} />
                <span className="text-xs font-bold text-gray-300">{a.severity}</span>
                <span className="text-[10px] text-gray-600 ml-auto font-mono">
                  {a.street_id}
                </span>
              </div>
              <p className="text-sm text-white font-semibold mb-1">
                {a.street_name || a.street_id}
              </p>
              <div className="flex gap-4 text-xs text-gray-400">
                <span>
                  Actual: <span className={`font-bold ${scoreColor(a.actual_score)}`}>
                    {typeof a.actual_score === "number" ? a.actual_score.toFixed(1) : a.actual_score}
                  </span>
                </span>
                {a.expected_score !== undefined && (
                  <span>
                    Expected: <span className="font-bold text-gray-300">
                      {typeof a.expected_score === "number" ? a.expected_score.toFixed(1) : a.expected_score}
                    </span>
                  </span>
                )}
              </div>
              {a.reason && (
                <p className="text-[11px] text-gray-500 mt-1.5">{a.reason}</p>
              )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ── Predictions ───────────────────────────────────────────────── */
function PredictionsTab({ data }) {
  if (!Array.isArray(data) || data.length === 0)
    return <Empty msg="No predictions available" />;

  const sorted = [...data].sort(
    (a, b) => (a.predicted_score ?? 100) - (b.predicted_score ?? 100)
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="text-[11px] text-gray-500 uppercase tracking-widest border-b border-night-600">
            <th className="py-3 px-3">Street</th>
            <th className="py-3 px-3 text-right">Current</th>
            <th className="py-3 px-3 text-right">Predicted</th>
            <th className="py-3 px-3 text-center">Trend</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => {
            const trendColor =
              p.trend === "declining"
                ? "text-red-400"
                : p.trend === "rising"
                ? "text-green-400"
                : "text-gray-500";
            const trendSymbol =
              p.trend === "declining" ? "\u2193" : p.trend === "rising" ? "\u2191" : "\u2192";

            return (
              <tr
                key={p.street_id}
                className="border-b border-night-700/50 hover:bg-night-800/50 transition-colors"
              >
                <td className="py-2.5 px-3">
                  <p className="text-white font-medium">{p.street_name || p.street_id}</p>
                  <p className="text-[10px] text-gray-600">{p.street_id}</p>
                </td>
                <td className={`py-2.5 px-3 text-right font-bold tabular-nums ${scoreColor(p.current_score)}`}>
                  {typeof p.current_score === "number" ? p.current_score.toFixed(1) : p.current_score ?? "-"}
                </td>
                <td className={`py-2.5 px-3 text-right font-bold tabular-nums ${scoreColor(p.predicted_score)}`}>
                  {typeof p.predicted_score === "number" ? p.predicted_score.toFixed(1) : p.predicted_score}
                </td>
                <td className={`py-2.5 px-3 text-center font-bold ${trendColor}`}>
                  {trendSymbol} {p.trend}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ── Investment Report ─────────────────────────────────────────── */
function InvestmentTab({ data }) {
  if (!data) return <Empty msg="No investment data" />;

  const items = Array.isArray(data) ? data : data.recommendations || data.streets || [];

  if (items.length === 0) return <Empty msg="No investment recommendations" />;

  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500 mb-2">
        Top streets recommended for infrastructure investment
      </p>
      {items.map((item, i) => (
        <Card
          key={item.street_id || i}
          className={`bg-card/75 backdrop-blur-sm ${scoreBg(item.safety_score ?? item.score ?? 50)}`}
        >
          <CardContent className="pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-lg font-black text-gray-600 tabular-nums w-8 text-center">
                #{i + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm text-white font-semibold truncate">
                  {item.street_name || item.street_id}
                </p>
                {item.reason && (
                  <p className="text-xs text-gray-400 mt-0.5 truncate">{item.reason}</p>
                )}
              </div>
            </div>
            <span className={`text-xl font-black tabular-nums ${scoreColor(item.safety_score ?? item.score ?? 50)}`}>
              {(item.safety_score ?? item.score ?? 0).toFixed?.(0) ?? item.safety_score}
            </span>
          </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/* ── Learning Status ───────────────────────────────────────────── */
function LearningTab({ data }) {
  if (!data) return <Empty msg="No learning data available" />;

  return (
    <div className="space-y-4">
      {/* Weights */}
      <Card className="bg-card/75 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-sm font-bold text-white">Current Model Weights</CardTitle>
        </CardHeader>
        <CardContent>
        <div className="space-y-3">
          {data.weights &&
            Object.entries(data.weights).map(([key, val]) => (
              <div key={key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-300 capitalize">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span className="text-xs font-bold text-indigo-300 tabular-nums">
                    {(val * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="h-2 bg-night-700 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-indigo-500 transition-all duration-700"
                    style={{ width: `${val * 100}%` }}
                  />
                </div>
              </div>
            ))}
        </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Rounds" value={data.rounds ?? 0} />
        <StatCard label="Pending" value={data.pending_feedback ?? 0} />
        <StatCard label="Applied" value={data.total_applied ?? 0} />
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <Card className="bg-card/75 backdrop-blur-sm text-center">
      <CardContent className="pt-4">
        <p className="text-xl font-black text-white tabular-nums">{value}</p>
        <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

function Empty({ msg }) {
  return (
    <div className="text-center py-16">
      <p className="text-gray-500 text-sm">{msg}</p>
    </div>
  );
}
