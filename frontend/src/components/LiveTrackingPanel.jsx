import React from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2,
  MapPin, Clock, UserCheck, X, Wifi
} from 'lucide-react';

const STATUS_CONFIG = {
  safe: {
    Icon: ShieldCheck,
    color: '#00F5D4',
    bgRgba: 'rgba(0,245,212,0.10)',
    borderRgba: 'rgba(0,245,212,0.25)',
    label: 'Safe Zone',
    msg: '✔ Moving through safe area',
    pulse: false,
  },
  caution: {
    Icon: AlertTriangle,
    color: '#FFB703',
    bgRgba: 'rgba(255,183,3,0.10)',
    borderRgba: 'rgba(255,183,3,0.25)',
    label: 'Caution',
    msg: '⚠ Lower visibility ahead',
    pulse: false,
  },
  danger: {
    Icon: ShieldAlert,
    color: '#FF4D6D',
    bgRgba: 'rgba(255,77,109,0.10)',
    borderRgba: 'rgba(255,77,109,0.25)',
    label: 'Risky Area',
    msg: '⚠️ Entering high-risk zone',
    pulse: true,
  },
  arrived: {
    Icon: CheckCircle2,
    color: '#00F5D4',
    bgRgba: 'rgba(0,245,212,0.10)',
    borderRgba: 'rgba(0,245,212,0.25)',
    label: 'Arrived',
    msg: '✅ Reached destination safely!',
    pulse: false,
  },
};

export default function LiveTrackingPanel({
  contacts = [],
  currentStreet,
  safetyScore,
  stepsRemaining,
  status,
  onStop,
  totalSteps,
  currentStep,
}) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.safe;
  const { Icon } = cfg;
  const isArrived = status === 'arrived';

  const progress = totalSteps > 1
    ? Math.min(100, Math.floor((currentStep / (totalSteps - 1)) * 100))
    : 0;

  const scoreColor =
    typeof safetyScore === 'number'
      ? safetyScore >= 70 ? '#00F5D4' : safetyScore >= 40 ? '#FFB703' : '#FF4D6D'
      : '#94a3b8';

  const contactNames = contacts.length > 0
    ? contacts.map(c => c.name).join(', ')
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      transition={{ type: 'spring', stiffness: 260, damping: 28 }}
      className="absolute bottom-28 right-4 w-[300px] z-50 pointer-events-auto"
    >
      <div className="bg-[#0d1b2a]/97 backdrop-blur-xl border border-white/10 rounded-[20px] shadow-[0_20px_56px_rgba(0,0,0,0.55)] overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: cfg.color,
                boxShadow: `0 0 6px ${cfg.color}`,
                animation: 'pulse 2s infinite',
              }}
            />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Live Safety Share
            </span>
          </div>
          <button
            onClick={onStop}
            className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/12 flex items-center justify-center transition-colors"
            aria-label="Stop sharing"
          >
            <X size={11} className="text-slate-400" />
          </button>
        </div>

        <div className="px-4 pb-4 space-y-3">

          {/* ── Who is sharing ── */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#00F5D4]/15 border border-[#00F5D4]/30 flex items-center justify-center shrink-0">
              <UserCheck size={14} className="text-[#00F5D4]" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">You are on the way</p>
              {contactNames && (
                <p className="text-[10px] text-slate-400 truncate">Sharing with {contactNames}</p>
              )}
            </div>
          </div>

          {/* ── Status badge ── */}
          <motion.div
            key={status}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl"
            style={{ backgroundColor: cfg.bgRgba, border: `1px solid ${cfg.borderRgba}` }}
          >
            <Icon
              size={14}
              style={{ color: cfg.color }}
              className={cfg.pulse ? 'animate-pulse' : ''}
            />
            <span className="text-xs font-semibold" style={{ color: cfg.color }}>
              {cfg.msg}
            </span>
          </motion.div>

          {/* ── Location + score ── */}
          <div className="flex items-start gap-2">
            <MapPin size={12} className="text-slate-400 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white leading-snug truncate">
                {currentStreet || 'Locating…'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-slate-400 uppercase tracking-wide font-semibold">Safety</span>
                <span className="text-[11px] font-bold" style={{ color: scoreColor }}>
                  {safetyScore ?? '—'}
                </span>
              </div>
            </div>
            {!isArrived && stepsRemaining != null && (
              <div className="flex items-center gap-1 shrink-0 mt-0.5">
                <Clock size={11} className="text-slate-400" />
                <span className="text-[11px] text-slate-300 font-mono">
                  {stepsRemaining} stops
                </span>
              </div>
            )}
          </div>

          {/* ── Progress bar ── */}
          {!isArrived && (
            <div className="w-full h-1.5 bg-[#1e293b] rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: cfg.color }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ ease: 'linear' }}
              />
            </div>
          )}

          {/* ── Arrival celebration ── */}
          {isArrived && (
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center py-2"
            >
              <p className="text-[#00F5D4] font-bold text-sm">Destination Reached Safely!</p>
              {contacts.length > 0 && (
                <p className="text-[10px] text-slate-400 mt-1">
                  {contacts[0].name} has been notified
                </p>
              )}
            </motion.div>
          )}

          {/* ── Stop button ── */}
          <button
            onClick={onStop}
            className="w-full py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.10] text-slate-300 text-[10px] font-bold uppercase tracking-widest transition-colors border border-white/8 flex items-center justify-center gap-1.5"
          >
            {isArrived ? (
              <>Done</>
            ) : (
              <>
                <Wifi size={11} className="opacity-70" />
                Stop Sharing
              </>
            )}
          </button>

        </div>
      </div>
    </motion.div>
  );
}
