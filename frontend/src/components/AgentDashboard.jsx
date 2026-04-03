import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu, Shield, Users, Bell, Navigation2, TrendingUp,
  X, RefreshCw, CheckCircle, ArrowUp, ArrowDown, Minus,
  Zap, Lightbulb, Activity,
} from 'lucide-react';
import { runAgents } from '../agents/agentEngine';

// ─── constants ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'risk',   label: 'Risk',   Icon: Shield      },
  { id: 'crowd',  label: 'Crowd',  Icon: Users       },
  { id: 'alerts', label: 'Alerts', Icon: Bell        },
  { id: 'routes', label: 'Routes', Icon: Navigation2 },
  { id: 'invest', label: 'Invest', Icon: TrendingUp  },
];

const STATUS_COLOR_MAP = {
  safe:     '#00F5D4',
  stable:   '#00F5D4',
  falling:  '#00F5D4',
  dense:    '#00F5D4',
  none:     '#00F5D4',
  moderate: '#FFB703',
  rising:   '#FFB703',
  low:      '#FFB703',
  sparse:   '#FF4D6D',
  elevated: '#FF9500',
  medium:   '#FF9500',
  critical: '#FF4D6D',
  high:     '#FF4D6D',
  unknown:  '#6B7280',
};

function sc(status) {
  return STATUS_COLOR_MAP[status] ?? '#6B7280';
}

// ─── shared primitives ───────────────────────────────────────────────────────

function StatusDot({ status, size = 8 }) {
  const color   = sc(status);
  const isPulse = ['critical', 'high', 'elevated'].includes(status);
  return (
    <span
      className={`inline-block rounded-full shrink-0${isPulse ? ' animate-pulse' : ''}`}
      style={{ width: size, height: size, background: color, boxShadow: `0 0 ${size}px ${color}80` }}
    />
  );
}

function Chip({ label, color }) {
  return (
    <span
      className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-[0.08em] shrink-0"
      style={{ color, background: `${color}20`, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)] mb-1.5">
      {children}
    </p>
  );
}

function BulletList({ items, color = 'var(--accent-teal)' }) {
  return (
    <ul className="flex flex-col gap-1">
      {items.map((d, i) => (
        <li key={i} className="flex items-start gap-2 text-[11px] text-white/70 leading-snug">
          <span className="shrink-0 mt-0.5" style={{ color }}>›</span>
          {d}
        </li>
      ))}
    </ul>
  );
}

// SVG arc gauge for risk score
function Gauge({ value }) {
  const r     = 27;
  const circ  = 2 * Math.PI * r;
  const safe  = Math.max(0, Math.min(100, Number(value) || 0));
  const dash  = circ * (safe / 100);
  const color = safe >= 70 ? '#00F5D4' : safe >= 45 ? '#FFB703' : '#FF4D6D';
  return (
    <svg width={68} height={68} viewBox="0 0 64 64" className="shrink-0">
      <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="5" />
      <motion.circle
        cx="32" cy="32" r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        transform="rotate(-90 32 32)"
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${dash} ${circ}` }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
        style={{ filter: `drop-shadow(0 0 6px ${color})` }}
      />
      <text x="32" y="36" textAnchor="middle" fill="white" fontSize="15" fontWeight="800">{safe}</text>
    </svg>
  );
}

function FootfallBar({ value }) {
  const safe  = Math.max(0, Math.min(100, Number(value) || 0));
  const color = safe >= 70 ? '#00F5D4' : safe >= 40 ? '#FFB703' : '#FF4D6D';
  return (
    <div className="w-full">
      <div className="flex justify-between mb-1">
        <span className="text-[10px] text-[var(--text-secondary)]">Footfall Index</span>
        <span className="text-[11px] font-bold" style={{ color }}>{safe}%</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <motion.div
          className="h-full rounded-full"
          style={{ background: color, boxShadow: `0 0 8px ${color}80` }}
          initial={{ width: 0 }}
          animate={{ width: `${safe}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-2.5 py-2">
      {[80, 55, 68, 42].map((w, i) => (
        <div
          key={i}
          className="h-3 rounded-full animate-pulse"
          style={{ width: `${w}%`, background: 'rgba(255,255,255,0.07)' }}
        />
      ))}
    </div>
  );
}

// ─── tab panels ──────────────────────────────────────────────────────────────

function RiskTab({ risk }) {
  if (!risk) return <Skeleton />;
  const { status, headline, details, score, trend, affectedAreas } = risk;
  const TrendIcon = trend === 'rising' ? ArrowUp : trend === 'falling' ? ArrowDown : Minus;
  const trendColor = trend === 'rising' ? '#FF4D6D' : trend === 'falling' ? '#00F5D4' : '#FFB703';
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <Gauge value={score} />
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Chip label={status} color={sc(status)} />
            <span className="flex items-center gap-1 text-[10px] font-semibold" style={{ color: trendColor }}>
              <TrendIcon size={10} /> {trend}
            </span>
          </div>
          <p className="text-[12px] text-white/80 leading-snug">{headline}</p>
        </div>
      </div>

      <BulletList items={details} />

      {affectedAreas.length > 0 && (
        <div>
          <SectionLabel>Affected Areas</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {affectedAreas.map((a, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md text-[10px]"
                style={{ background: 'rgba(255,77,109,0.12)', border: '1px solid rgba(255,77,109,0.25)', color: '#FF4D6D' }}
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CrowdTab({ crowd }) {
  if (!crowd) return <Skeleton />;
  const { status, headline, footfallIndex, details, safeZones, unsafeZones } = crowd;
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-2 flex-wrap">
        <Chip label={status} color={sc(status)} />
        <p className="text-[12px] text-white/80 leading-snug flex-1">{headline}</p>
      </div>

      <FootfallBar value={footfallIndex} />
      <BulletList items={details} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <SectionLabel>Safe Zones</SectionLabel>
          {safeZones.slice(0, 3).map((z, i) => (
            <p key={i} className="text-[10px] text-[#00F5D4]/80 truncate leading-relaxed">{z}</p>
          ))}
        </div>
        <div>
          <SectionLabel>Watch Zones</SectionLabel>
          {unsafeZones.slice(0, 3).map((z, i) => (
            <p key={i} className="text-[10px] text-[#FF4D6D]/80 truncate leading-relaxed">{z}</p>
          ))}
        </div>
      </div>
    </div>
  );
}

function AlertsTab({ alert }) {
  if (!alert) return <Skeleton />;
  const { severity, count, predictions, topAlert } = alert;
  const sevColor = sc(severity);
  return (
    <div className="flex flex-col gap-3.5">
      <div className="flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center shrink-0"
          style={{ background: `${sevColor}18`, border: `1px solid ${sevColor}40` }}
        >
          <span className="text-[22px] font-black leading-none" style={{ color: sevColor }}>{count}</span>
          <span className="text-[8px] font-bold uppercase tracking-[0.1em]" style={{ color: sevColor }}>alerts</span>
        </div>
        <div className="flex flex-col gap-1.5 flex-1 min-w-0">
          <Chip label={severity === 'none' ? 'Clear' : severity} color={sevColor} />
          {topAlert && (
            <p className="text-[11px] text-white/70 leading-snug">{topAlert}</p>
          )}
        </div>
      </div>

      {predictions.length > 0 && (
        <div>
          <SectionLabel>Predictive Alerts</SectionLabel>
          <ul className="flex flex-col gap-1.5">
            {predictions.slice(0, 5).map((p, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-white/70 leading-snug">
                <Zap size={10} className="text-[#FFB703] shrink-0 mt-0.5" />
                {p}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RoutesTab({ route }) {
  if (!route) return <Skeleton />;
  const { hasRoute, recommendation, dangerSegments, cautionSegments, safeAlternative, avoidAreas } = route;

  if (!hasRoute) {
    return (
      <div className="flex items-start gap-3 p-3 rounded-xl border border-white/8 bg-white/5">
        <Navigation2 size={20} className="text-[var(--text-secondary)] shrink-0 mt-0.5" />
        <p className="text-[12px] text-[var(--text-secondary)] leading-snug">{recommendation}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3.5">
      <p className="text-[12px] text-white/80 leading-snug">{recommendation}</p>

      <div className="flex gap-2">
        <div className="flex-1 p-2.5 rounded-xl text-center" style={{ background: 'rgba(255,77,109,0.10)', border: '1px solid rgba(255,77,109,0.22)' }}>
          <span className="text-[22px] font-black text-[#FF4D6D] leading-none block">{dangerSegments}</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#FF4D6D]">Danger</span>
        </div>
        <div className="flex-1 p-2.5 rounded-xl text-center" style={{ background: 'rgba(255,183,3,0.10)', border: '1px solid rgba(255,183,3,0.22)' }}>
          <span className="text-[22px] font-black text-[#FFB703] leading-none block">{cautionSegments ?? 0}</span>
          <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-[#FFB703]">Caution</span>
        </div>
      </div>

      {safeAlternative && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.22)' }}>
          <CheckCircle size={13} className="text-[#00F5D4] shrink-0 mt-0.5" />
          <p className="text-[11px] text-[#00F5D4]/90 leading-relaxed">{safeAlternative}</p>
        </div>
      )}

      {avoidAreas.length > 0 && (
        <div>
          <SectionLabel>Avoid</SectionLabel>
          <div className="flex flex-wrap gap-1.5">
            {avoidAreas.map((a, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-md text-[10px]"
                style={{ background: 'rgba(255,77,109,0.12)', border: '1px solid rgba(255,77,109,0.25)', color: '#FF4D6D' }}
              >
                {a}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InvestTab({ investment }) {
  if (!investment) return <Skeleton />;
  const { topAreas, headline, estimatedImpact } = investment;
  const PCOLOR = { high: '#FF4D6D', medium: '#FFB703', low: '#00F5D4' };

  return (
    <div className="flex flex-col gap-3.5">
      <div className="p-3 rounded-xl" style={{ background: 'rgba(123,97,255,0.10)', border: '1px solid rgba(123,97,255,0.22)' }}>
        <p className="text-[12px] text-white/85 leading-snug">{headline}</p>
        {estimatedImpact && (
          <p className="text-[10px] mt-1 leading-snug" style={{ color: '#7B61FF' }}>{estimatedImpact}</p>
        )}
      </div>

      <ul className="flex flex-col gap-2.5">
        {topAreas.map((a, i) => {
          const color = PCOLOR[a.priority] || '#6B7280';
          return (
            <li key={i} className="flex items-start gap-2.5">
              <div
                className="w-2 h-2 rounded-full mt-1 shrink-0"
                style={{ background: color, boxShadow: `0 0 6px ${color}` }}
              />
              <div className="flex flex-col min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="text-[11px] font-semibold text-white/90 truncate">{a.area}</span>
                  <Chip label={a.priority} color={color} />
                </div>
                <p className="text-[10px] text-[var(--text-secondary)] leading-snug">{a.action}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AgentDashboard({ alerts = [], routeData = null, currentHour = 22 }) {
  const [isOpen,    setIsOpen]    = useState(false);
  const [activeTab, setActiveTab] = useState('risk');
  const [insights,  setInsights]  = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error,     setError]     = useState(null);

  const debounceRef = useRef(null);
  const intervalRef = useRef(null);

  const run = useCallback(async () => {
    setIsRunning(true);
    try {
      const result = await runAgents({ alerts, routeData, currentHour });
      setInsights(result);
      setError(null);
    } catch (err) {
      console.error('AgentDashboard run error:', err);
      setError('Agent run failed — retrying on next cycle');
    } finally {
      setIsRunning(false);
    }
  }, [alerts, routeData, currentHour]);

  // Reactive debounce: re-run ~1.2 s after any prop changes
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(run, 1200);
    return () => clearTimeout(debounceRef.current);
  }, [run]);

  // Periodic refresh every 30 s
  useEffect(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(run, 30000);
    return () => clearInterval(intervalRef.current);
  }, [run]);

  // Map tab id → insight branch
  const tabInsights = {
    risk:   insights?.risk,
    crowd:  insights?.crowd,
    alerts: insights?.alert,
    routes: insights?.route,
    invest: insights?.investment,
  };

  // Summary statuses for the header dots
  const summaryStatuses = [
    insights?.risk?.status,
    insights?.crowd?.status,
    insights?.alert?.severity,
    (insights?.route?.dangerSegments ?? 0) > 0 ? 'elevated' : 'safe',
    (insights?.investment?.topAreas ?? []).filter(a => a.priority === 'high').length > 1 ? 'elevated' : 'stable',
  ];

  return (
    <>
      {/* ── FAB trigger ── */}
      <motion.button
        onClick={() => setIsOpen(v => !v)}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed bottom-[88px] left-4 z-[9985] flex items-center gap-2 px-3.5 py-2 rounded-2xl border text-[11px] font-bold uppercase tracking-[0.12em] backdrop-blur-xl shadow-lg transition-all duration-300 pointer-events-auto ${
          isOpen
            ? 'bg-[rgba(0,245,212,0.12)] border-[rgba(0,245,212,0.45)] text-[#00F5D4] shadow-[0_0_24px_rgba(0,245,212,0.18)]'
            : 'pro-glass border-white/10 text-white/55 hover:text-white hover:border-white/25'
        }`}
      >
        <Cpu
          size={14}
          className={isOpen ? 'text-[#00F5D4]' : ''}
          style={isOpen ? { animation: 'spin 3s linear infinite' } : {}}
        />
        <span>AI Agents</span>
        {isRunning && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#00F5D4] animate-pulse" />
        )}
      </motion.button>

      {/* ── Dashboard panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 18, scale: 0.96 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit  ={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed bottom-[144px] left-4 z-[9985] w-[340px] flex flex-col pointer-events-auto overflow-hidden rounded-2xl border border-white/10 shadow-[0_24px_80px_rgba(0,0,0,0.65)]"
            style={{ background: 'rgba(8,10,24,0.92)', backdropFilter: 'blur(32px)', maxHeight: 'calc(100vh - 180px)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5 border-b border-white/8 shrink-0">
              <div className="flex items-center gap-2.5">
                <Activity size={14} className="text-[var(--accent-teal)]" />
                <span className="text-[11px] font-black uppercase tracking-[0.18em] text-white">
                  AI Agents
                </span>
                {isRunning && (
                  <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-[#00F5D4] animate-pulse">
                    Scanning…
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {/* 5 status dots — one per agent */}
                <div className="flex items-center gap-1.5">
                  {summaryStatuses.map((st, i) => (
                    <StatusDot key={i} status={st ?? 'unknown'} size={6} />
                  ))}
                </div>
                <button
                  onClick={run}
                  title="Re-run agents"
                  className="text-[var(--text-secondary)] hover:text-white transition-colors"
                >
                  <RefreshCw size={12} className={isRunning ? 'animate-spin' : ''} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-[var(--text-secondary)] hover:text-white transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-white/8 shrink-0">
              {TABS.map(({ id, label, Icon }) => {
                const active = activeTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setActiveTab(id)}
                    className={`flex-1 flex flex-col items-center gap-0.5 py-2 text-[9px] font-bold uppercase tracking-[0.08em] transition-all border-b-2 ${
                      active
                        ? 'text-[#00F5D4] border-[#00F5D4]'
                        : 'text-[var(--text-secondary)] hover:text-white/60 border-transparent'
                    }`}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto hide-scrollbar p-4">
              {error && (
                <div
                  className="mb-3 flex items-start gap-2 px-3 py-2 rounded-xl text-[11px]"
                  style={{ background: 'rgba(255,77,109,0.10)', border: '1px solid rgba(255,77,109,0.22)', color: '#FF4D6D' }}
                >
                  <Lightbulb size={12} className="shrink-0 mt-0.5" />
                  {error}
                </div>
              )}

              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0  }}
                  exit  ={{ opacity: 0, x: -10 }}
                  transition={{ duration: 0.18 }}
                >
                  {activeTab === 'risk'   && <RiskTab   risk={tabInsights.risk}         />}
                  {activeTab === 'crowd'  && <CrowdTab  crowd={tabInsights.crowd}        />}
                  {activeTab === 'alerts' && <AlertsTab alert={tabInsights.alerts}       />}
                  {activeTab === 'routes' && <RoutesTab route={tabInsights.routes}       />}
                  {activeTab === 'invest' && <InvestTab investment={tabInsights.invest}  />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer */}
            {insights?.timestamp && (
              <div className="px-4 py-2 border-t border-white/8 flex items-center justify-between shrink-0">
                <span className="text-[9px] text-[var(--text-secondary)]">
                  Last run · {insights.timestamp}
                </span>
                <div className="flex items-center gap-1">
                  {summaryStatuses.map((st, i) => (
                    <StatusDot key={i} status={st ?? 'unknown'} size={5} />
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
