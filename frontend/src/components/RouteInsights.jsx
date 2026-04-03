import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck, ShieldAlert, ShieldOff,
  ChevronDown, ChevronUp, Lightbulb,
  Clock, AlertTriangle, CheckCircle,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function scoreColor(score) {
  if (score >= 70) return '#00F5D4';
  if (score >= 40) return '#FFB703';
  return '#FF4D6D';
}

function zoneDot(zone, score) {
  const s = zone === 'SAFE' || score >= 70
    ? 'bg-[#00F5D4] shadow-[0_0_8px_rgba(0,245,212,0.7)]'
    : zone === 'CAUTION' || score >= 40
    ? 'bg-[#FFB703] shadow-[0_0_8px_rgba(255,183,3,0.7)]'
    : 'bg-[#FF4D6D] shadow-[0_0_8px_rgba(255,77,109,0.7)]';
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 mt-[3px] ${s}`} />;
}

function segmentExplanation(zone, score) {
  if (score >= 70 || zone === 'SAFE') {
    return 'Well-lit, active area with good visibility and footfall.';
  }
  if (score >= 40 || zone === 'CAUTION') {
    return 'Mixed activity — moderate lighting. Stay alert, especially at night.';
  }
  return 'Low footfall and poor lighting. Reported incidents nearby.';
}

function overallLabel(avg) {
  if (avg >= 70) return { text: 'Safe to travel', Icon: ShieldCheck, color: '#00F5D4' };
  if (avg >= 45) return { text: 'Travel with caution', Icon: ShieldAlert, color: '#FFB703' };
  return { text: 'Avoid if possible', Icon: ShieldOff, color: '#FF4D6D' };
}

function timeAdvice(avg, currentHour) {
  if (avg >= 70) return null;
  if (currentHour >= 22 || currentHour < 5) {
    return 'Consider travelling before 10 PM for significantly safer conditions.';
  }
  if (avg < 45) {
    return 'Safest route adds only +2 min — strongly recommended.';
  }
  return 'Take a main road or travel with company.';
}

// ─── component ──────────────────────────────────────────────────────────────

export default function RouteInsights({ selectedRoute, currentHour = 22 }) {
  const [expandedIdx, setExpandedIdx] = useState(null);

  const steps = useMemo(() => {
    try {
      return selectedRoute?.route ?? selectedRoute?.segments ?? [];
    } catch {
      return [];
    }
  }, [selectedRoute]);

  const analysis = useMemo(() => {
    if (!steps.length) return null;
    const scores = steps.map((s) => typeof s.safety_score === 'number' ? s.safety_score : 50);
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    const dangerCount = steps.filter((s) => (s.zone === 'DANGER') || (s.safety_score < 40)).length;
    const cautionCount = steps.filter((s) => (s.zone === 'CAUTION') || (s.safety_score >= 40 && s.safety_score < 70)).length;
    return { avg, dangerCount, cautionCount, total: steps.length };
  }, [steps]);

  if (!selectedRoute || !steps.length || !analysis) return null;

  const { avg, dangerCount, cautionCount, total } = analysis;
  const { text: recText, Icon: RecIcon, color: recColor } = overallLabel(avg);
  const advice = timeAdvice(avg, currentHour);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className="w-full pointer-events-auto"
    >
      <div className="pro-glass rounded-2xl p-4 flex flex-col gap-3 border border-white/8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]">
            Route Insights
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] flex items-center gap-1">
            <Clock size={10} />
            {currentHour}:00
          </span>
        </div>

        {/* ── Summary card ── */}
        <div
          className="rounded-xl px-3 py-2.5 flex items-center gap-3"
          style={{ background: `${recColor}14`, border: `1px solid ${recColor}30` }}
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: `${recColor}22` }}
          >
            <RecIcon size={20} style={{ color: recColor }} />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[15px] font-bold text-white leading-tight font-heading">{avg}</span>
            <span className="text-[11px] font-semibold" style={{ color: recColor }}>{recText}</span>
          </div>
          <div className="ml-auto flex flex-col items-end gap-0.5 shrink-0">
            {dangerCount > 0 && (
              <span className="text-[10px] text-[#FF4D6D] font-semibold flex items-center gap-1">
                <AlertTriangle size={9} /> {dangerCount} risky
              </span>
            )}
            {dangerCount === 0 && (
              <span className="text-[10px] text-[#00F5D4] font-semibold flex items-center gap-1">
                <CheckCircle size={9} /> Clear
              </span>
            )}
            <span className="text-[10px] text-[var(--text-secondary)]">{total} segments</span>
          </div>
        </div>

        {/* ── Risk bar ── */}
        <div className="flex gap-1 h-1.5 rounded-full overflow-hidden">
          {steps.map((s, i) => {
            const sc = typeof s.safety_score === 'number' ? s.safety_score : 50;
            return (
              <div
                key={i}
                className="flex-1 rounded-full"
                style={{ background: scoreColor(sc), opacity: 0.85 }}
              />
            );
          })}
        </div>

        {/* ── Segment list ── */}
        <div className="flex flex-col gap-1 max-h-[200px] overflow-y-auto hide-scrollbar">
          {steps.map((seg, i) => {
            const sc = typeof seg.safety_score === 'number' ? seg.safety_score : 50;
            const zone = seg.zone ?? (sc >= 70 ? 'SAFE' : sc >= 40 ? 'CAUTION' : 'DANGER');
            const name = seg.street_name ?? seg.from_name ?? `Segment ${i + 1}`;
            const isOpen = expandedIdx === i;
            return (
              <div key={i}>
                <button
                  className="w-full flex items-start gap-2 py-1.5 px-2 rounded-lg hover:bg-white/5 transition-colors text-left"
                  onClick={() => setExpandedIdx(isOpen ? null : i)}
                >
                  {zoneDot(zone, sc)}
                  <span className="flex-1 text-[12px] text-white/80 truncate leading-snug">{name}</span>
                  <span
                    className="text-[11px] font-bold shrink-0 ml-1 leading-snug"
                    style={{ color: scoreColor(sc) }}
                  >
                    {sc}
                  </span>
                  {isOpen
                    ? <ChevronUp size={12} className="text-[var(--text-secondary)] shrink-0 mt-0.5" />
                    : <ChevronDown size={12} className="text-[var(--text-secondary)] shrink-0 mt-0.5" />}
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed px-4 pb-1.5">
                        {segmentExplanation(zone, sc)}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* ── Advice banner ── */}
        {advice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-2 px-3 py-2 rounded-xl bg-[#FFB703]/10 border border-[#FFB703]/20"
          >
            <Lightbulb size={13} className="text-[#FFB703] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#FFB703]/90 leading-relaxed">{advice}</p>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
