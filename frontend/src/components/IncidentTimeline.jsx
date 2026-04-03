/**
 * IncidentTimeline — Time Travel / Incident Replay
 *
 * Lets users scrub through 18:00–00:00 and watch how danger zones,
 * risk levels and alerts evolved over the night. Every "tick" fetches
 * (or uses a cached snapshot) the danger zones for that hour and fires
 * an onHourChange callback so the parent can sync DeckMap.
 *
 * Props:
 *   currentHour   {number}   controlled hour from parent
 *   onHourChange  {fn}       parent sets its own currentHour
 *   alerts        {array}    live alerts array (for replay bubbles)
 */

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, RotateCcw, Zap, Clock, TrendingUp,
  TrendingDown, Shield, AlertTriangle, ChevronUp, ChevronDown,
} from 'lucide-react';
import { fetchDangerZones, fetchAlerts } from '../services/api';

// ── constants ─────────────────────────────────────────────────────────────────
const MIN_HOUR = 18;
const MAX_HOUR = 24;
const TOTAL_SPAN = MAX_HOUR - MIN_HOUR; // 6

const HOUR_LABELS = [
  { h: 18, label: '6 PM' },
  { h: 19, label: '7 PM' },
  { h: 20, label: '8 PM' },
  { h: 21, label: '9 PM' },
  { h: 22, label: '10 PM' },
  { h: 23, label: '11 PM' },
  { h: 24, label: '12 AM' },
];

const SPEED_OPTIONS = [0.5, 1, 2, 4];

// ── helpers ───────────────────────────────────────────────────────────────────
function formatHour(h) {
  const raw = h % 24;
  const suffix = raw >= 12 ? 'PM' : 'AM';
  const display = raw % 12 === 0 ? 12 : raw % 12;
  const mins = Math.round((h % 1) * 60);
  return `${display}:${String(mins).padStart(2, '0')} ${suffix}`;
}

function pct(h) {
  return ((h - MIN_HOUR) / TOTAL_SPAN) * 100;
}

// Risk profile per hour — used for the sparkline bar chart
// derived from real data when available, otherwise this seed
const RISK_SEED = {
  18: 30, 19: 38, 20: 52, 21: 68, 22: 78, 23: 72, 24: 55,
};

function riskColor(score) {
  if (score >= 65) return '#FF4D6D';
  if (score >= 45) return '#FFB703';
  return '#00F5D4';
}

function riskLabel(score) {
  if (score >= 65) return 'HIGH';
  if (score >= 45) return 'MED';
  return 'LOW';
}

// ── replay bubble ─────────────────────────────────────────────────────────────
function ReplayBubble({ alert, idx }) {
  return (
    <motion.div
      key={alert.id ?? idx}
      initial={{ opacity: 0, y: -8, scale: 0.85 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 380, damping: 26, delay: idx * 0.06 }}
      className="flex items-start gap-2 px-3 py-2 rounded-xl"
      style={{
        background: 'rgba(255,77,109,0.08)',
        border: '1px solid rgba(255,77,109,0.22)',
      }}
    >
      <AlertTriangle size={11} className="text-[#FF4D6D] mt-0.5 shrink-0" />
      <p className="text-[11px] text-slate-300 leading-tight line-clamp-2">
        {alert.message || alert.description || 'Incident reported'}
      </p>
    </motion.div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function IncidentTimeline({ currentHour, onHourChange, alerts = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [speedIdx, setSpeedIdx] = useState(1); // index into SPEED_OPTIONS
  const [localHour, setLocalHour] = useState(currentHour ?? MIN_HOUR);

  // Per-hour danger zone snapshots cache { [hour]: count }
  const snapshotsRef = useRef({});
  const [snapshotCounts, setSnapshotCounts] = useState({});

  // Replay alert bubbles shown during playback
  const [replayAlerts, setReplayAlerts] = useState([]);

  // Dragging the timeline
  const trackRef = useRef(null);
  const isDragging = useRef(false);

  // Playback interval
  const playIntervalRef = useRef(null);

  // Peak / safest derived
  const peakHour = useMemo(() => {
    const entries = Object.entries(snapshotCounts);
    if (entries.length === 0) return 22;
    return parseInt(entries.reduce((a, b) => (a[1] >= b[1] ? a : b))[0], 10);
  }, [snapshotCounts]);

  const safestHour = useMemo(() => {
    const entries = Object.entries(snapshotCounts);
    if (entries.length === 0) return 18;
    return parseInt(entries.reduce((a, b) => (a[1] <= b[1] ? a : b))[0], 10);
  }, [snapshotCounts]);

  // ── pre-fetch all hourly snapshots once panel opens ──────────────────────
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;

    const fetchAll = async () => {
      const hours = Array.from({ length: TOTAL_SPAN + 1 }, (_, i) => MIN_HOUR + i);
      await Promise.allSettled(
        hours.map(async (h) => {
          if (snapshotsRef.current[h] !== undefined) return;
          try {
            const zones = await fetchDangerZones(h);
            if (cancelled) return;
            const count = Array.isArray(zones) ? zones.length : 0;
            snapshotsRef.current[h] = count;
            setSnapshotCounts((prev) => ({ ...prev, [h]: count }));
          } catch {
            snapshotsRef.current[h] = RISK_SEED[h] ?? 40;
            if (!cancelled) {
              setSnapshotCounts((prev) => ({ ...prev, [h]: RISK_SEED[h] ?? 40 }));
            }
          }
        })
      );
    };

    fetchAll();
    return () => { cancelled = true; };
  }, [isOpen]);

  // ── sync localHour ← parent when not dragging / playing ─────────────────
  useEffect(() => {
    if (!isPlaying && !isDragging.current) {
      setLocalHour(currentHour ?? MIN_HOUR);
    }
  }, [currentHour, isPlaying]);

  // ── playback engine ──────────────────────────────────────────────────────
  const stopPlayback = useCallback(() => {
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
      playIntervalRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startPlayback = useCallback(() => {
    if (playIntervalRef.current) clearInterval(playIntervalRef.current);

    setIsPlaying(true);

    const step = 0.5; // advance 30 minutes per tick
    const intervalMs = Math.round(1800 / speed); // base 1800ms ÷ speed

    playIntervalRef.current = setInterval(() => {
      setLocalHour((prev) => {
        const next = parseFloat((prev + step).toFixed(1));
        if (next >= MAX_HOUR) {
          stopPlayback();
          return MAX_HOUR;
        }
        if (onHourChange) onHourChange(Math.floor(next));

        // surface a random alert bubble occasionally
        if (alerts.length > 0 && Math.random() < 0.35) {
          const pick = alerts[Math.floor(Math.random() * alerts.length)];
          setReplayAlerts((ra) => [pick, ...ra].slice(0, 3));
          setTimeout(() => setReplayAlerts((ra) => ra.filter((a) => a !== pick)), 3500);
        }

        return next;
      });
    }, intervalMs);
  }, [speed, onHourChange, alerts, stopPlayback]);

  // Restart interval when speed changes during playback
  useEffect(() => {
    if (isPlaying) {
      startPlayback();
    }
  }, [speed]); // eslint-disable-line react-hooks/exhaustive-deps

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playIntervalRef.current) clearInterval(playIntervalRef.current);
    };
  }, []);

  const handlePlayPause = () => {
    if (isPlaying) {
      stopPlayback();
    } else {
      if (localHour >= MAX_HOUR) setLocalHour(MIN_HOUR);
      startPlayback();
    }
  };

  const handleReset = () => {
    stopPlayback();
    setLocalHour(MIN_HOUR);
    if (onHourChange) onHourChange(MIN_HOUR);
    setReplayAlerts([]);
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEED_OPTIONS.length;
    setSpeedIdx(next);
    setSpeed(SPEED_OPTIONS[next]);
  };

  // ── timeline drag ────────────────────────────────────────────────────────
  const getHourFromPointer = useCallback((clientX) => {
    if (!trackRef.current) return MIN_HOUR;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const raw = MIN_HOUR + ratio * TOTAL_SPAN;
    return Math.round(raw * 2) / 2; // snap to 0.5 steps
  }, []);

  const handleTrackPointerDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    isDragging.current = true;
    stopPlayback();
    const h = getHourFromPointer(e.clientX);
    setLocalHour(h);
    if (onHourChange) onHourChange(Math.floor(h));
  };

  const handleTrackPointerMove = (e) => {
    if (!isDragging.current) return;
    const h = getHourFromPointer(e.clientX);
    setLocalHour(h);
    if (onHourChange) onHourChange(Math.floor(h));
  };

  const handleTrackPointerUp = () => {
    isDragging.current = false;
  };

  // ── sparkline bar heights ────────────────────────────────────────────────
  const maxCount = useMemo(() => {
    const vals = Object.values(snapshotCounts);
    return vals.length > 0 ? Math.max(...vals, 1) : 80;
  }, [snapshotCounts]);

  const barData = useMemo(() => {
    return Array.from({ length: TOTAL_SPAN + 1 }, (_, i) => {
      const h = MIN_HOUR + i;
      const count = snapshotCounts[h] ?? RISK_SEED[h] ?? 40;
      return { h, count };
    });
  }, [snapshotCounts]);

  // current risk score (proxy from danger count → 0-100)
  const currentRiskScore = useMemo(() => {
    const count = snapshotCounts[Math.floor(localHour)] ?? RISK_SEED[Math.floor(localHour)] ?? 50;
    return Math.min(100, count * 2);
  }, [snapshotCounts, localHour]);

  // ── render ───────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Floating Replay Alerts ── */}
      <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[9980] flex flex-col gap-2 pointer-events-none w-[300px]">
        <AnimatePresence>
          {replayAlerts.map((a, i) => (
            <ReplayBubble key={`${a.id ?? i}-${i}`} alert={a} idx={i} />
          ))}
        </AnimatePresence>
      </div>

      {/* ── Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="incident-timeline-panel"
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="fixed z-[9970] pointer-events-auto"
            style={{
              bottom: '72px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'min(680px, calc(100vw - 32px))',
              background: 'rgba(5,5,16,0.94)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderRadius: '20px',
              backdropFilter: 'blur(24px)',
              boxShadow: '0 0 60px rgba(0,0,0,0.6), 0 0 30px rgba(123,97,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)',
            }}
          >
            {/* ─ Header ─ */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(123,97,255,0.18)', border: '1px solid rgba(123,97,255,0.35)' }}>
                  <Clock size={13} style={{ color: '#7B61FF' }} />
                </div>
                <div>
                  <h3 className="text-white text-[13px] font-bold tracking-wide">Incident Replay</h3>
                  <p className="text-[10px] text-slate-500 font-medium">Time-travel through the city's safety evolution</p>
                </div>
              </div>

              {/* Big time label */}
              <motion.div
                key={formatHour(localHour)}
                initial={{ opacity: 0, scale: 0.88 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.18 }}
                className="text-right"
              >
                <div className="text-[26px] font-black text-white leading-none tracking-tight"
                  style={{ textShadow: '0 0 20px rgba(123,97,255,0.6)' }}>
                  {formatHour(localHour)}
                </div>
                <div className="text-[10px] font-bold mt-0.5 tracking-widest"
                  style={{ color: riskColor(currentRiskScore) }}>
                  {riskLabel(currentRiskScore)} RISK
                </div>
              </motion.div>
            </div>

            <div className="px-5 py-4 flex flex-col gap-4">
              {/* ─ Sparkline bar chart ─ */}
              <div className="relative">
                {/* Peak / safest markers */}
                <div className="flex justify-between mb-1 px-0.5">
                  <span className="text-[9px] font-bold text-[#00F5D4] uppercase tracking-widest flex items-center gap-1">
                    <Shield size={8} /> Safest {formatHour(safestHour)}
                  </span>
                  <span className="text-[9px] font-bold text-[#FF4D6D] uppercase tracking-widest flex items-center gap-1">
                    <AlertTriangle size={8} /> Peak {formatHour(peakHour)}
                  </span>
                </div>

                <div className="flex items-end gap-0.5 h-10">
                  {barData.map(({ h, count }) => {
                    const barH = Math.max(4, Math.round((count / maxCount) * 40));
                    const isActive = Math.floor(localHour) === h;
                    const isPeak = h === peakHour;
                    const isSafest = h === safestHour;
                    let color = isPeak ? '#FF4D6D' : isSafest ? '#00F5D4' : '#7B61FF';
                    return (
                      <motion.div
                        key={h}
                        className="flex-1 rounded-t-sm cursor-pointer"
                        style={{
                          height: barH,
                          background: isActive
                            ? `${color}`
                            : `${color}50`,
                          boxShadow: isActive ? `0 0 10px ${color}80` : 'none',
                          transition: 'background 0.3s, box-shadow 0.3s',
                        }}
                        whileHover={{ opacity: 0.9 }}
                        onClick={() => {
                          stopPlayback();
                          setLocalHour(h);
                          if (onHourChange) onHourChange(h);
                        }}
                        title={`${formatHour(h)} — ${count} danger zones`}
                      />
                    );
                  })}
                </div>

                {/* Hour labels */}
                <div className="flex justify-between mt-1.5 px-0.5">
                  {HOUR_LABELS.map(({ h, label }) => (
                    <span
                      key={h}
                      className="text-[9px] font-semibold"
                      style={{
                        color: Math.floor(localHour) === h ? '#ffffff' : 'rgba(255,255,255,0.3)',
                        transition: 'color 0.2s',
                      }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>

              {/* ─ Scrub track ─ */}
              <div
                ref={trackRef}
                className="relative h-8 flex items-center cursor-pointer select-none"
                onPointerDown={handleTrackPointerDown}
                onPointerMove={handleTrackPointerMove}
                onPointerUp={handleTrackPointerUp}
                onPointerLeave={handleTrackPointerUp}
              >
                {/* track bg */}
                <div className="absolute inset-y-[13px] left-0 right-0 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.08)' }} />

                {/* filled portion */}
                <div
                  className="absolute inset-y-[13px] left-0 rounded-full"
                  style={{
                    width: `${pct(localHour)}%`,
                    background: `linear-gradient(90deg, #00F5D4, #7B61FF ${pct(localHour) > 60 ? '60%' : '100%'}, #FF4D6D)`,
                    transition: isPlaying ? 'width 0.4s linear' : 'none',
                  }}
                />

                {/* Peak marker */}
                <div
                  className="absolute w-0.5 inset-y-[11px] rounded-full"
                  style={{ left: `${pct(peakHour)}%`, background: '#FF4D6D', opacity: 0.7 }}
                />

                {/* thumb */}
                <motion.div
                  className="absolute w-5 h-5 rounded-full -translate-x-1/2 z-10"
                  style={{
                    left: `${pct(localHour)}%`,
                    background: '#fff',
                    border: `3px solid ${riskColor(currentRiskScore)}`,
                    boxShadow: `0 0 14px ${riskColor(currentRiskScore)}80`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                  whileHover={{ scale: 1.25 }}
                />
              </div>

              {/* ─ Controls ─ */}
              <div className="flex items-center justify-between gap-3">
                {/* Left — play controls */}
                <div className="flex items-center gap-2">
                  {/* Reset */}
                  <motion.button
                    whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
                    onClick={handleReset}
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                    title="Reset to 6 PM"
                  >
                    <RotateCcw size={13} className="text-slate-400" />
                  </motion.button>

                  {/* Play / Pause */}
                  <motion.button
                    whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
                    onClick={handlePlayPause}
                    className="w-10 h-10 rounded-full flex items-center justify-center font-bold"
                    style={{
                      background: isPlaying
                        ? 'linear-gradient(135deg, #FF4D6D, #C9184A)'
                        : 'linear-gradient(135deg, #7B61FF, #5046e4)',
                      boxShadow: isPlaying
                        ? '0 0 20px rgba(255,77,109,0.45)'
                        : '0 0 20px rgba(123,97,255,0.45)',
                    }}
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying
                      ? <Pause size={16} className="text-white" fill="white" />
                      : <Play size={16} className="text-white" fill="white" style={{ marginLeft: 2 }} />
                    }
                  </motion.button>

                  {/* Speed */}
                  <motion.button
                    whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
                    onClick={cycleSpeed}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-black"
                    style={{
                      background: 'rgba(123,97,255,0.12)',
                      border: '1px solid rgba(123,97,255,0.3)',
                      color: '#7B61FF',
                    }}
                    title="Cycle speed"
                  >
                    <Zap size={10} />
                    {SPEED_OPTIONS[speedIdx]}×
                  </motion.button>
                </div>

                {/* Right — risk insight */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.2)' }}>
                    <Shield size={11} style={{ color: '#00F5D4' }} />
                    <span className="text-[10px] font-bold text-[#00F5D4]">Safest {formatHour(safestHour)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.2)' }}>
                    <AlertTriangle size={11} style={{ color: '#FF4D6D' }} />
                    <span className="text-[10px] font-bold text-[#FF4D6D]">Peak {formatHour(peakHour)}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── FAB Toggle Button ── */}
      <motion.button
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
        onClick={() => setIsOpen((v) => !v)}
        className="fixed z-[9971] flex items-center gap-2 pointer-events-auto"
        style={{
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '8px 18px',
          borderRadius: '36px',
          background: isOpen
            ? 'linear-gradient(135deg, rgba(123,97,255,0.3), rgba(80,70,228,0.25))'
            : 'rgba(5,5,16,0.82)',
          border: isOpen
            ? '1px solid rgba(123,97,255,0.55)'
            : '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(20px)',
          boxShadow: isOpen
            ? '0 0 28px rgba(123,97,255,0.3)'
            : '0 4px 20px rgba(0,0,0,0.4)',
          color: isOpen ? '#a89bff' : '#9ca3af',
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: '0.06em',
          whiteSpace: 'nowrap',
        }}
        title="Incident Replay — scrub through the night's safety data"
      >
        <Clock size={13} style={{ color: isOpen ? '#a89bff' : '#9ca3af' }} />
        TIME TRAVEL
        {isOpen
          ? <ChevronDown size={12} />
          : <ChevronUp size={12} />
        }
        {isPlaying && (
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF4D6D] animate-pulse ml-0.5" />
        )}
      </motion.button>
    </>
  );
}
