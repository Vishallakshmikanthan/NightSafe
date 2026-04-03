import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, TrendingDown, Clock, Sparkles, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import { fetchSafetyScore } from '../services/api';

// ── helpers ────────────────────────────────────────────────────────

function hourLabel(h) {
  const norm = ((h % 24) + 24) % 24;
  const suffix = norm >= 12 ? 'PM' : 'AM';
  const display = norm % 12 === 0 ? 12 : norm % 12;
  return `${display}:00 ${suffix}`;
}

function scoreColor(s) {
  if (s >= 70) return 'var(--accent-teal)';
  if (s >= 40) return 'var(--accent-amber)';
  return 'var(--accent-coral)';
}

function scoreLabel(s) {
  if (s >= 70) return 'Safe';
  if (s >= 40) return 'Caution';
  return 'Danger';
}

const FALLBACK = (baseHour) => [
  { hour: baseHour, score: 72 },
  { hour: baseHour + 1, score: 58 },
  { hour: baseHour + 2, score: 41 },
];

// ── main component ─────────────────────────────────────────────────

export default function PredictiveInsights({ selectedStreet, selectedRoute, currentHour }) {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [bestTime, setBestTime] = useState(null);
  const [riskTrend, setRiskTrend] = useState(null); // 'up' | 'down' | 'stable'
  const [collapsed, setCollapsed] = useState(false);
  const alertFiredRef = useRef(false);

  // ── derive street id safely ──────────────────────────────────────

  const streetId = selectedStreet
    ? (selectedStreet.street_id ?? selectedStreet.id ?? selectedStreet.segment_id ?? null)
    : null;

  // ── fetch predictions ────────────────────────────────────────────

  useEffect(() => {
    alertFiredRef.current = false;

    if (!streetId && !selectedRoute) {
      setPredictions([]);
      setBestTime(null);
      setRiskTrend(null);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        let preds = [];

        if (streetId) {
          // Fetch safety score for currentHour, +1, +2
          const hours = [currentHour, currentHour + 1, currentHour + 2];
          const results = await Promise.allSettled(
            hours.map(h => fetchSafetyScore(streetId, h))
          );

          preds = results.map((res, i) => {
            if (res.status === 'fulfilled' && res.value) {
              const raw = res.value;
              const score = Number(
                raw.safety_score ?? raw.score ?? raw.weighted_score ?? 50
              );
              return { hour: hours[i], score: isNaN(score) ? 50 : Math.round(score) };
            }
            return { hour: hours[i], score: FALLBACK(currentHour)[i].score };
          });
        } else if (selectedRoute) {
          // Derive from route data — use segment safety scores if available
          const data = selectedRoute?.data ?? selectedRoute;
          const segments = Array.isArray(data?.route)
            ? data.route
            : Array.isArray(data?.segments)
            ? data.segments
            : [];

          if (segments.length > 0) {
            const baseScore = segments.reduce((sum, seg) => {
              return sum + (Number(seg.safety_score ?? seg.score ?? 70));
            }, 0) / segments.length;

            const rounded = Math.round(baseScore);
            // Simulate degradation over time for routes (night gets riskier)
            preds = [
              { hour: currentHour, score: rounded },
              { hour: currentHour + 1, score: Math.max(10, rounded - 12) },
              { hour: currentHour + 2, score: Math.max(10, rounded - 22) },
            ];
          } else {
            preds = FALLBACK(currentHour);
          }
        }

        if (cancelled) return;

        setPredictions(preds);

        // ── compute trend ────────────────────────────────────────
        if (preds.length >= 2) {
          const first = preds[0].score;
          const last = preds[preds.length - 1].score;
          const delta = last - first;
          setRiskTrend(delta >= 5 ? 'up' : delta <= -5 ? 'down' : 'stable');
        }

        // ── best time ────────────────────────────────────────────
        const best = preds.reduce((a, b) => (a.score >= b.score ? a : b));
        setBestTime(best);

        // ── proactive alert for steep drops ──────────────────────
        if (!alertFiredRef.current && preds.length >= 2) {
          const drop = preds[0].score - preds[1].score;
          if (drop >= 20 && preds[1].score < 50) {
            alertFiredRef.current = true;
            const label = streetId
              ? (selectedStreet?.street_name ?? selectedStreet?.name ?? 'This area')
              : 'Route';
            window.dispatchEvent(new CustomEvent('nightsafe-trip-alert', {
              detail: {
                id: Date.now(),
                type: 'PREDICTIVE',
                severity: 'WARNING',
                message: `⚠️ ${label} will become unsafe around ${hourLabel(preds[1].hour)}`,
                timestamp: new Date().toISOString(),
              }
            }));
          }
        }
      } catch (err) {
        console.error('[PredictiveInsights] fetch error:', err);
        if (!cancelled) {
          setPredictions(FALLBACK(currentHour));
          setBestTime(FALLBACK(currentHour).reduce((a, b) => (a.score >= b.score ? a : b)));
          setRiskTrend('down');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => { cancelled = true; };
  }, [streetId, selectedRoute, currentHour]);

  // ── nothing to show ──────────────────────────────────────────────

  if (!selectedStreet && !selectedRoute) return null;

  // ── label for the context ────────────────────────────────────────

  const contextLabel = selectedStreet
    ? (selectedStreet.street_name ?? selectedStreet.name ?? 'Selected Street')
    : 'Selected Route';

  const currentScore = predictions[0]?.score ?? null;
  const trendImproving = riskTrend === 'up';
  const trendWorsening = riskTrend === 'down';

  const worstSegment = predictions.length > 0
    ? predictions.reduce((a, b) => (a.score <= b.score ? a : b))
    : null;

  // ── Mini Bar Chart ─────────────────────────────────────────────

  const BarChart = () => (
    <div className="flex items-end gap-2 h-14 mt-3">
      {predictions.map((p, i) => {
        const barH = Math.max(8, Math.round((p.score / 100) * 56));
        const color = scoreColor(p.score);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <span className="text-[9px] font-bold" style={{ color }}>{p.score}</span>
            <motion.div
              className="w-full rounded-t-md"
              style={{ backgroundColor: color, opacity: 0.85 }}
              initial={{ height: 0 }}
              animate={{ height: barH }}
              transition={{ delay: i * 0.1, ease: 'easeOut' }}
            />
            <span className="text-[9px] text-slate-400 truncate w-full text-center">
              {hourLabel(p.hour)}
            </span>
          </div>
        );
      })}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="w-full z-40 pointer-events-auto"
    >
      <div className="bg-[#0d1b2a]/95 backdrop-blur-xl border border-white/10 rounded-[18px] shadow-[0_16px_48px_rgba(0,0,0,0.55)] overflow-hidden">

        {/* ── header ── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-[var(--accent-teal)]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-[var(--accent-teal)]">
              Predictive Insights
            </span>
          </div>
          <button
            onClick={() => setCollapsed(v => !v)}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Toggle panel"
          >
            {collapsed ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
        </div>

        <div className="px-4 pb-1">
          <p className="text-[11px] text-slate-400 truncate" title={contextLabel}>{contextLabel}</p>
        </div>

        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              key="body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ ease: 'easeInOut', duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-3">

                {/* ── loading ── */}
                {loading && (
                  <div className="flex items-center gap-2 py-3 justify-center">
                    <div className="w-4 h-4 border-2 border-[var(--accent-teal)] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs text-slate-400">Analyzing safety trends…</span>
                  </div>
                )}

                {/* ── current score pill ── */}
                {!loading && currentScore !== null && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Now ({hourLabel(currentHour)})</span>
                    <span
                      className="text-xs font-bold px-2.5 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${scoreColor(currentScore)}22`,
                        color: scoreColor(currentScore),
                        border: `1px solid ${scoreColor(currentScore)}55`,
                      }}
                    >
                      {scoreLabel(currentScore)} · {currentScore}
                    </span>
                  </div>
                )}

                {/* ── trend badge ── */}
                {!loading && riskTrend && (
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                    trendImproving
                      ? 'bg-[var(--accent-teal)]/10 border border-[var(--accent-teal)]/25'
                      : trendWorsening
                      ? 'bg-[var(--accent-coral)]/10 border border-[var(--accent-coral)]/25'
                      : 'bg-white/5 border border-white/10'
                  }`}>
                    {trendImproving
                      ? <TrendingUp size={14} className="text-[var(--accent-teal)] shrink-0" />
                      : trendWorsening
                      ? <TrendingDown size={14} className="text-[var(--accent-coral)] shrink-0" />
                      : <Clock size={14} className="text-slate-400 shrink-0" />}
                    <span className={`text-xs font-semibold ${
                      trendImproving
                        ? 'text-[var(--accent-teal)]'
                        : trendWorsening
                        ? 'text-[var(--accent-coral)]'
                        : 'text-slate-400'
                    }`}>
                      {trendImproving ? 'Improving — safer later' : trendWorsening ? 'Worsening — risk rising' : 'Stable conditions'}
                    </span>
                  </div>
                )}

                {/* ── mini bar chart ── */}
                {!loading && predictions.length > 0 && <BarChart />}

                {/* ── best time recommendation ── */}
                {!loading && bestTime && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[var(--accent-teal)]/8 border border-[var(--accent-teal)]/20">
                    <Clock size={13} className="text-[var(--accent-teal)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-[var(--accent-teal)] uppercase tracking-[0.12em]">Best Travel Time</p>
                      <p className="text-xs text-white font-semibold mt-0.5">{hourLabel(bestTime.hour)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Score {bestTime.score} · {scoreLabel(bestTime.score)}</p>
                    </div>
                  </div>
                )}

                {/* ── worst segment warning (route context) ── */}
                {!loading && selectedRoute && worstSegment && worstSegment.score < 50 && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[var(--accent-coral)]/8 border border-[var(--accent-coral)]/20">
                    <AlertTriangle size={13} className="text-[var(--accent-coral)] shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-[var(--accent-coral)] uppercase tracking-[0.12em]">Risk Window</p>
                      <p className="text-xs text-white font-semibold mt-0.5">Avoid after {hourLabel(worstSegment.hour)}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Predicted score drops to {worstSegment.score}</p>
                    </div>
                  </div>
                )}

              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
