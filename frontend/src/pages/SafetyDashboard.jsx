import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, RadarChart, PolarGrid,
  PolarAngleAxis, Radar,
} from 'recharts';
import {
  Shield, AlertTriangle, Activity, MapPin, TrendingDown, TrendingUp,
  Minus, Lightbulb, CheckCircle2, RefreshCw, Building2, Clock,
  Zap, Eye, Users, ChevronRight, BarChart2,
} from 'lucide-react';
import { fetchStreets, fetchDangerZones, fetchAlerts, fetchSafetyScore } from '../services/api';

// ─── Mock fallback data ───────────────────────────────────────────────────────

const MOCK_STREETS = [
  { street_id: 1,  street_name: 'Perambur North Street',    safety_score: 24, zone: 'DANGER',  lat: 13.1148, lng: 80.2332 },
  { street_id: 2,  street_name: 'Koyambedu Market Road',    safety_score: 31, zone: 'DANGER',  lat: 13.0695, lng: 80.1943 },
  { street_id: 3,  street_name: 'Egmore South Street',      safety_score: 36, zone: 'DANGER',  lat: 13.0785, lng: 80.2625 },
  { street_id: 4,  street_name: 'Tondiarpet Main Road',     safety_score: 41, zone: 'CAUTION', lat: 13.1265, lng: 80.2916 },
  { street_id: 5,  street_name: 'Ayanavaram Circle',        safety_score: 45, zone: 'CAUTION', lat: 13.1027, lng: 80.2494 },
  { street_id: 6,  street_name: 'Villivakkam Ring Road',    safety_score: 48, zone: 'CAUTION', lat: 13.1058, lng: 80.2098 },
  { street_id: 7,  street_name: 'Kolathur Bus Stand Rd',    safety_score: 52, zone: 'CAUTION', lat: 13.1204, lng: 80.2237 },
  { street_id: 8,  street_name: 'Anna Nagar West Extn',     safety_score: 55, zone: 'CAUTION', lat: 13.0844, lng: 80.2101 },
  { street_id: 9,  street_name: 'Pattalam Road',            safety_score: 57, zone: 'CAUTION', lat: 13.0952, lng: 80.2576 },
  { street_id: 10, street_name: 'Adambakkam Main St',       safety_score: 59, zone: 'CAUTION', lat: 12.9824, lng: 80.2061 },
  { street_id: 11, street_name: 'Velachery Bypass Road',    safety_score: 63, zone: 'CAUTION', lat: 12.9815, lng: 80.2180 },
  { street_id: 12, street_name: 'T Nagar Panagal Park Rd',  safety_score: 70, zone: 'SAFE',    lat: 13.0418, lng: 80.2341 },
  { street_id: 13, street_name: 'Adyar Main Road',          safety_score: 74, zone: 'SAFE',    lat: 12.9908, lng: 80.2575 },
  { street_id: 14, street_name: 'Nungambakkam High Road',   safety_score: 78, zone: 'SAFE',    lat: 13.0569, lng: 80.2425 },
  { street_id: 15, street_name: 'Anna Salai Central',       safety_score: 81, zone: 'SAFE',    lat: 13.0566, lng: 80.2543 },
];

const MOCK_TREND = [
  { hour: '6 PM',  label: '18:00', score: 74, avg: 72 },
  { hour: '7 PM',  label: '19:00', score: 71, avg: 69 },
  { hour: '8 PM',  label: '20:00', score: 66, avg: 64 },
  { hour: '9 PM',  label: '21:00', score: 60, avg: 58 },
  { hour: '10 PM', label: '22:00', score: 53, avg: 51 },
  { hour: '11 PM', label: '23:00', score: 46, avg: 44 },
  { hour: '12 AM', label: '00:00', score: 41, avg: 39 },
];

const ISSUE_TAGS = {
  DANGER:  ['Low lighting', 'High crime density', 'No CCTV coverage', 'Liquor outlet proximity', 'Poor infrastructure'],
  CAUTION: ['Reduced footfall', 'Partial lighting', 'Isolated stretches', 'Limited visibility'],
  SAFE:    ['Well lit', 'Regular patrolling', 'CCTV coverage'],
};

const INSIGHTS = [
  { icon: TrendingDown, color: '#FF4D6D', title: 'Koyambedu Risk Surge', text: 'Koyambedu Market area consistently shows high-risk after 10 PM due to late-night vendor activity and poor lighting coverage.', tag: 'Pattern Detected' },
  { icon: AlertTriangle, color: '#FFB703', title: 'Velachery Low Footfall', text: 'Velachery bypass roads see a sharp risk increase past 9 PM as pedestrian footfall drops by ~70%, leaving isolated stretches unmonitored.', tag: 'Footfall Risk' },
  { icon: Eye, color: '#a78bfa', title: 'Egmore Night Blind Spot', text: 'Egmore south streets record the highest gap between daytime and nighttime safety scores — 42-point average drop between 6 PM and midnight.', tag: 'Blind Spot' },
  { icon: CheckCircle2, color: '#00F5D4', title: 'Adyar Stability Zone', text: 'Adyar Main Road maintains above-70 safety scores across all nocturnal hours, driven by active commercial presence and regular police patrolling.', tag: 'Safe Zone' },
  { icon: Zap, color: '#FFB703', title: 'Perambur Lighting Failure', text: 'Perambur North Street has 14 consecutive dark segments flagged by IoT lighting sensors, directly correlating with a 3× increase in reported incidents.', tag: 'Infrastructure Alert' },
  { icon: Users, color: '#38bdf8', title: 'Weekend Crowd Shift', text: 'T Nagar and Anna Salai show elevated risk readings on Saturdays (10 PM–1 AM) as large crowds interact with low-visibility side lanes.', tag: 'Crowd Pattern' },
];

const RECOMMENDATIONS = [
  { icon: '💡', title: 'Install Smart Lighting on Perambur North St', priority: 'CRITICAL', dept: 'GCC / TNEB', impact: 'Estimated +28 point safety score improvement', color: '#FF4D6D' },
  { icon: '🚔', title: 'Increase Night Patrols in Koyambedu Zone', priority: 'HIGH', dept: 'Chennai Police', impact: 'Target: 11 PM – 2 AM patrol window', color: '#FFB703' },
  { icon: '📷', title: 'Deploy CCTV at Egmore South Intersections', priority: 'HIGH', dept: 'Smart City Mission', impact: '8 intersections flagged as surveillance gaps', color: '#FFB703' },
  { icon: '🚧', title: 'Audit Liquor Outlet Perimeter Zones', priority: 'MODERATE', dept: 'TASMAC / Police', impact: '12 outlets identified near DANGER-rated segments', color: '#a78bfa' },
  { icon: '🛤️', title: 'Pedestrian Pathway Repair — Ayanavaram', priority: 'MODERATE', dept: 'Corporation', impact: 'Broken footpaths increase road exposure by 40%', color: '#a78bfa' },
];

const RADAR_DATA = [
  { subject: 'Lighting', score: 42 },
  { subject: 'Patrolling', score: 58 },
  { subject: 'CCTV', score: 35 },
  { subject: 'Footfall', score: 61 },
  { subject: 'Infrastructure', score: 48 },
  { subject: 'Incidents', score: 30 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getRiskLabel(score) {
  if (score < 40) return { label: 'HIGH RISK', color: '#FF4D6D', bg: 'rgba(255,77,109,0.12)', border: 'rgba(255,77,109,0.3)' };
  if (score < 65) return { label: 'MODERATE',  color: '#FFB703', bg: 'rgba(255,183,3,0.12)',  border: 'rgba(255,183,3,0.3)' };
  return               { label: 'SAFE',       color: '#00F5D4', bg: 'rgba(0,245,212,0.12)',  border: 'rgba(0,245,212,0.3)' };
}

function getPrimaryIssue(street) {
  const zone = street.zone || (street.safety_score < 40 ? 'DANGER' : street.safety_score < 65 ? 'CAUTION' : 'SAFE');
  const tags = ISSUE_TAGS[zone] || ISSUE_TAGS.CAUTION;
  // deterministic pick based on street id
  return tags[(street.street_id || 0) % tags.length];
}

function avg(arr, key) {
  if (!arr || arr.length === 0) return 0;
  const vals = arr.map(a => typeof a[key] === 'number' ? a[key] : 0);
  return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
}

// ─── CountUp ─────────────────────────────────────────────────────────────────

function CountUp({ value, decimals = 0, suffix = '' }) {
  const spring = useSpring(0, { stiffness: 40, damping: 18 });
  const display = useTransform(spring, v =>
    decimals > 0 ? v.toFixed(decimals) + suffix : Math.floor(v) + suffix
  );
  useEffect(() => { spring.set(value); }, [value, spring]);
  return <motion.span>{display}</motion.span>;
}

// ─── Custom Recharts tooltip ──────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="bg-[#0d1b2a]/95 backdrop-blur-xl border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-xs text-slate-300">{p.name === 'score' ? 'City Avg' : 'Baseline'}:</span>
          <span className="text-xs font-bold text-white">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function SafetyDashboard() {
  const [streets,     setStreets]     = useState([]);
  const [dangerZones, setDangerZones] = useState([]);
  const [alerts,      setAlerts]      = useState([]);
  const [trendData,   setTrendData]   = useState(MOCK_TREND);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [refreshKey,  setRefreshKey]  = useState(0);

  // ── Data loading ─────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [rawStreets, rawDangerZones, rawAlerts] = await Promise.allSettled([
          fetchStreets(),
          fetchDangerZones(22),
          fetchAlerts(),
        ]);

        if (!cancelled) {
          const streetsVal = rawStreets.status === 'fulfilled' && Array.isArray(rawStreets.value) && rawStreets.value.length > 0
            ? rawStreets.value : MOCK_STREETS;
          const dzVal = rawDangerZones.status === 'fulfilled' && Array.isArray(rawDangerZones.value)
            ? rawDangerZones.value : [];
          const alertsVal = rawAlerts.status === 'fulfilled' && Array.isArray(rawAlerts.value)
            ? rawAlerts.value : [];

          setStreets(streetsVal);
          setDangerZones(dzVal);
          setAlerts(alertsVal);
          setLastUpdated(new Date());
        }
      } catch {
        if (!cancelled) {
          setStreets(MOCK_STREETS);
          setError('Live API unavailable — showing demo data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }

      // Trend: fetch safety score for multiple hours (best-effort)
      try {
        const HOURS = [18, 19, 20, 21, 22, 23, 0];
        const LABELS = ['6 PM', '7 PM', '8 PM', '9 PM', '10 PM', '11 PM', '12 AM'];
        const STREET_ID = 1;
        const results = await Promise.allSettled(
          HOURS.map(h => fetchSafetyScore(STREET_ID, h))
        );
        const trend = results.map((r, i) => ({
          hour: LABELS[i],
          score: r.status === 'fulfilled' && r.value?.safety_score != null
            ? Math.round(r.value.safety_score) : MOCK_TREND[i].score,
          avg: MOCK_TREND[i].avg,
        }));
        if (!cancelled) setTrendData(trend);
      } catch {
        // keep MOCK_TREND
      }
    }
    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  // ── Derived metrics ──────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const allStreets = streets.length > 0 ? streets : MOCK_STREETS;
    const avgScore = avg(allStreets, 'safety_score');
    return {
      totalStreets:  allStreets.length,
      dangerCount:   dangerZones.length > 0 ? dangerZones.length : allStreets.filter(s => (s.safety_score || 0) < 40).length,
      alertsToday:   alerts.length > 0 ? alerts.length : 12,
      avgSafetyScore: avgScore || 61,
    };
  }, [streets, dangerZones, alerts]);

  const topDangerStreets = useMemo(() => {
    const source = streets.length > 0 ? streets : MOCK_STREETS;
    return [...source]
      .sort((a, b) => (a.safety_score || 0) - (b.safety_score || 0))
      .slice(0, 10);
  }, [streets]);

  // ── Render ───────────────────────────────────────────────────────────

  const containerVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.07 } },
  };
  const itemVariants = {
    hidden:  { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
  };

  return (
    <div className="h-full overflow-y-auto bg-[#050510] hide-scrollbar">
      <div className="max-w-[1200px] mx-auto px-6 py-8">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="flex items-start justify-between mb-8"
        >
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-[var(--accent-teal)]/10 border border-[var(--accent-teal)]/25 flex items-center justify-center">
                <BarChart2 size={18} className="text-[var(--accent-teal)]" />
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white">
                City Safety Intelligence
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-[var(--accent-teal)]/10 border border-[var(--accent-teal)]/25 text-[10px] font-bold uppercase tracking-widest text-[var(--accent-teal)]">
                Live
              </span>
            </div>
            <p className="text-sm text-slate-400 ml-12">
              Chennai Urban Safety Scorecard · Real-time municipal intelligence
            </p>
          </div>

          <div className="flex flex-col items-end gap-2">
            <button
              onClick={() => setRefreshKey(k => k + 1)}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-slate-400 hover:text-white text-xs font-semibold transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            {lastUpdated && (
              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                <Clock size={9} />
                Updated {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </div>
        </motion.div>

        {/* Error banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl bg-[#FFB703]/[0.08] border border-[#FFB703]/20 text-[#FFB703] text-xs font-semibold"
            >
              <AlertTriangle size={14} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-4">
            <div className="w-10 h-10 border-2 border-[var(--accent-teal)]/20 border-t-[var(--accent-teal)] rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Loading city intelligence...</p>
          </div>
        ) : (
          <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">

            {/* ── Hero Metrics ─────────────────────────────────────────── */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                icon={Building2}
                label="Streets Monitored"
                value={metrics.totalStreets}
                color="#00F5D4"
                glowColor="rgba(0,245,212,0.15)"
                trend="+2 this week"
                trendUp
              />
              <MetricCard
                icon={AlertTriangle}
                label="Active Danger Zones"
                value={metrics.dangerCount}
                color="#FF4D6D"
                glowColor="rgba(255,77,109,0.15)"
                trend="3 new tonight"
                trendUp={false}
              />
              <MetricCard
                icon={Activity}
                label="Alerts Today"
                value={metrics.alertsToday}
                color="#FFB703"
                glowColor="rgba(255,183,3,0.15)"
                trend="Peak: 11 PM"
              />
              <MetricCard
                icon={Shield}
                label="Avg Safety Score"
                value={metrics.avgSafetyScore}
                suffix="/100"
                color={metrics.avgSafetyScore >= 65 ? '#00F5D4' : metrics.avgSafetyScore >= 45 ? '#FFB703' : '#FF4D6D'}
                glowColor={metrics.avgSafetyScore >= 65 ? 'rgba(0,245,212,0.15)' : 'rgba(255,183,3,0.15)'}
                trend={metrics.avgSafetyScore >= 65 ? 'City is stable' : 'Caution recommended'}
                trendUp={metrics.avgSafetyScore >= 65}
              />
            </motion.div>

            {/* ── Zone Ranking + Trend Chart ───────────────────────────── */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">

              {/* Zone ranking table */}
              <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-white">Zone Risk Ranking</h2>
                    <p className="text-[10px] text-slate-500 mt-0.5">Top 10 most dangerous segments · sorted by safety score</p>
                  </div>
                  <span className="text-[10px] px-2 py-1 rounded-full bg-[#FF4D6D]/10 border border-[#FF4D6D]/20 text-[#FF4D6D] font-bold uppercase tracking-wider">
                    22:00 Snapshot
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-white/[0.05]">
                        <th className="px-5 py-2.5 text-left w-8">#</th>
                        <th className="px-3 py-2.5 text-left">Street</th>
                        <th className="px-3 py-2.5 text-center">Score</th>
                        <th className="px-3 py-2.5 text-center">Risk</th>
                        <th className="px-5 py-2.5 text-left hidden sm:table-cell">Primary Issue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topDangerStreets.map((street, i) => {
                        const risk = getRiskLabel(street.safety_score || 0);
                        const isSelected = selectedRow === i;
                        return (
                          <motion.tr
                            key={street.street_id || i}
                            onClick={() => setSelectedRow(isSelected ? null : i)}
                            whileHover={{ backgroundColor: 'rgba(255,255,255,0.03)' }}
                            animate={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0)' }}
                            className="border-b border-white/[0.04] last:border-0 cursor-pointer transition-colors"
                          >
                            <td className="px-5 py-3">
                              <span className={`text-xs font-black tabular-nums ${
                                i < 3 ? 'text-[#FF4D6D]' : 'text-slate-500'
                              }`}>{String(i + 1).padStart(2, '0')}</span>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-2">
                                <MapPin size={11} style={{ color: risk.color }} className="shrink-0" />
                                <span className="text-[13px] font-semibold text-white truncate max-w-[160px]">
                                  {street.street_name || `Street ${street.street_id}`}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3 text-center">
                              <ScoreBar score={street.safety_score || 0} color={risk.color} />
                            </td>
                            <td className="px-3 py-3 text-center">
                              <span
                                className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest"
                                style={{ background: risk.bg, border: `1px solid ${risk.border}`, color: risk.color }}
                              >
                                {risk.label}
                              </span>
                            </td>
                            <td className="px-5 py-3 hidden sm:table-cell">
                              <span className="text-[11px] text-slate-400">{getPrimaryIssue(street)}</span>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right column: Trend chart + Radar */}
              <div className="flex flex-col gap-4">
                {/* Safety trend chart */}
                <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-5 flex-1">
                  <div className="mb-4">
                    <h2 className="text-sm font-bold text-white">Safety Trend</h2>
                    <p className="text-[10px] text-slate-500 mt-0.5">City avg · 6 PM → Midnight</p>
                  </div>
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={trendData} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="gradTeal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#00F5D4" stopOpacity={0.25} />
                          <stop offset="95%" stopColor="#00F5D4" stopOpacity={0.02} />
                        </linearGradient>
                        <linearGradient id="gradGray" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#64748b" stopOpacity={0.15} />
                          <stop offset="95%" stopColor="#64748b" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis
                        dataKey="hour"
                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 600 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[20, 100]}
                        tick={{ fill: '#64748b', fontSize: 9 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <ReferenceLine y={50} stroke="rgba(255,77,109,0.3)" strokeDasharray="4 4" />
                      <Area
                        type="monotone"
                        dataKey="avg"
                        name="avg"
                        stroke="#475569"
                        strokeWidth={1.5}
                        fill="url(#gradGray)"
                        strokeDasharray="4 4"
                        dot={false}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        name="score"
                        stroke="#00F5D4"
                        strokeWidth={2}
                        fill="url(#gradTeal)"
                        dot={{ fill: '#00F5D4', r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5, fill: '#00F5D4', strokeWidth: 0 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 bg-[#00F5D4]" />
                      <span className="text-[9px] text-slate-500">City Average</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 bg-slate-600 border-dashed border" />
                      <span className="text-[9px] text-slate-500">Baseline</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-0.5 bg-[#FF4D6D]/50" />
                      <span className="text-[9px] text-slate-500">Risk threshold (50)</span>
                    </div>
                  </div>
                </div>

                {/* Infrastructure radar */}
                <div className="bg-white/[0.025] border border-white/[0.07] rounded-2xl p-5">
                  <h2 className="text-sm font-bold text-white mb-0.5">Infrastructure Index</h2>
                  <p className="text-[10px] text-slate-500 mb-3">City-wide coverage scores</p>
                  <ResponsiveContainer width="100%" height={160}>
                    <RadarChart data={RADAR_DATA}>
                      <PolarGrid stroke="rgba(255,255,255,0.07)" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: '#64748b', fontSize: 9, fontWeight: 600 }}
                      />
                      <Radar
                        name="Score"
                        dataKey="score"
                        stroke="#a78bfa"
                        strokeWidth={2}
                        fill="#a78bfa"
                        fillOpacity={0.15}
                        dot={{ fill: '#a78bfa', r: 2.5, strokeWidth: 0 }}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>

            {/* ── AI Insights ──────────────────────────────────────────── */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#a78bfa]/10 border border-[#a78bfa]/20 flex items-center justify-center">
                  <Lightbulb size={13} className="text-[#a78bfa]" />
                </div>
                <h2 className="text-sm font-bold text-white">AI-Generated Safety Insights</h2>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#a78bfa]/10 border border-[#a78bfa]/20 text-[#a78bfa] font-bold uppercase tracking-widest">
                  Pattern Analysis
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {INSIGHTS.map((ins, i) => (
                  <InsightCard key={i} {...ins} delay={i * 0.05} />
                ))}
              </div>
            </motion.div>

            {/* ── Actionable Recommendations ───────────────────────────── */}
            <motion.div variants={itemVariants}>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#00F5D4]/10 border border-[#00F5D4]/20 flex items-center justify-center">
                  <CheckCircle2 size={13} className="text-[#00F5D4]" />
                </div>
                <h2 className="text-sm font-bold text-white">Actionable Recommendations</h2>
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#00F5D4]/10 border border-[#00F5D4]/20 text-[#00F5D4] font-bold uppercase tracking-widest">
                  For Authorities
                </span>
              </div>
              <div className="space-y-2.5">
                {RECOMMENDATIONS.map((rec, i) => (
                  <RecommendationRow key={i} {...rec} idx={i} />
                ))}
              </div>
            </motion.div>

            {/* Bottom spacer */}
            <div className="h-6" />
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({ icon: Icon, label, value, suffix = '', color, glowColor, trend, trendUp }) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      transition={{ type: 'spring', stiffness: 320, damping: 25 }}
      className="relative bg-white/[0.025] border border-white/[0.07] rounded-2xl p-5 overflow-hidden group"
      style={{ boxShadow: `0 0 0 1px transparent` }}
    >
      {/* Background glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top left, ${glowColor} 0%, transparent 70%)` }}
      />

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center"
            style={{ background: `${color}18`, border: `1px solid ${color}30` }}
          >
            <Icon size={15} style={{ color }} />
          </div>
          {trend && (
            <span className="flex items-center gap-1 text-[9px] font-semibold" style={{ color: trendUp === false ? '#FF4D6D' : '#00F5D4' }}>
              {trendUp === false ? <TrendingDown size={9} /> : trendUp ? <TrendingUp size={9} /> : <Minus size={9} />}
              {trend}
            </span>
          )}
        </div>
        <p className="text-[28px] font-black tabular-nums leading-none" style={{ color }}>
          <CountUp value={typeof value === 'number' ? value : 0} />
          {suffix && <span className="text-base font-bold text-slate-400">{suffix}</span>}
        </p>
        <p className="text-[11px] font-semibold text-slate-400 mt-1.5 uppercase tracking-wider">{label}</p>
      </div>
    </motion.div>
  );
}

function ScoreBar({ score, color }) {
  return (
    <div className="flex items-center gap-2 justify-center">
      <span className="text-sm font-black tabular-nums" style={{ color }}>{score}</span>
      <div className="w-16 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}

function InsightCard({ icon: Icon, color, title, text, tag, delay = 0 }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      whileHover={{ y: -2 }}
      onClick={() => setExpanded(v => !v)}
      className="bg-white/[0.025] border border-white/[0.07] hover:border-white/[0.12] rounded-xl p-4 cursor-pointer transition-colors duration-200 group"
    >
      <div className="flex items-start gap-3">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: `${color}15`, border: `1px solid ${color}25` }}
        >
          <Icon size={12} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <p className="text-[12px] font-bold text-white leading-tight">{title}</p>
            <ChevronRight
              size={12}
              className={`text-slate-500 shrink-0 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
            />
          </div>
          <span
            className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full"
            style={{ background: `${color}15`, border: `1px solid ${color}25`, color }}
          >
            {tag}
          </span>
          <AnimatePresence>
            {expanded && (
              <motion.p
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="text-[11px] text-slate-400 leading-relaxed mt-2 overflow-hidden"
              >
                {text}
              </motion.p>
            )}
          </AnimatePresence>
          {!expanded && (
            <p className="text-[11px] text-slate-500 leading-relaxed mt-2 line-clamp-2">{text}</p>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function RecommendationRow({ icon, title, priority, dept, impact, color, idx }) {
  const PRIORITY_STYLE = {
    CRITICAL: { bg: 'rgba(255,77,109,0.10)',  border: 'rgba(255,77,109,0.25)',  text: '#FF4D6D' },
    HIGH:     { bg: 'rgba(255,183,3,0.10)',   border: 'rgba(255,183,3,0.25)',   text: '#FFB703' },
    MODERATE: { bg: 'rgba(167,139,250,0.10)', border: 'rgba(167,139,250,0.25)', text: '#a78bfa' },
  };
  const s = PRIORITY_STYLE[priority] || PRIORITY_STYLE.MODERATE;
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: idx * 0.06, duration: 0.35 }}
      whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.035)' }}
      className="flex items-center gap-4 px-5 py-3.5 bg-white/[0.025] border border-white/[0.07] rounded-xl transition-colors duration-200"
    >
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-white">{title}</p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] text-slate-400">{dept}</span>
          <span className="text-slate-600">·</span>
          <span className="text-[10px] text-slate-400 italic">{impact}</span>
        </div>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1.5">
        <span
          className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
          style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
        >
          {priority}
        </span>
      </div>
    </motion.div>
  );
}
