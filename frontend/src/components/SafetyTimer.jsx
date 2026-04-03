import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, X, RotateCcw, ShieldCheck } from 'lucide-react';

export default function SafetyTimer({ onSOSTrigger }) {
  const [isOpen, setIsOpen] = useState(false);
  const [minutes, setMinutes] = useState(15);
  const [secondsLeft, setSecondsLeft] = useState(null); // null = not running
  const [phase, setPhase] = useState('idle'); // idle | running | warning | triggered | safe
  const intervalRef = useRef(null);

  const totalSeconds = minutes * 60;

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    if (minutes < 1) return;
    clearTimer();
    setSecondsLeft(minutes * 60);
    setPhase('running');
  }, [minutes, clearTimer]);

  // Tick
  useEffect(() => {
    if (phase !== 'running' && phase !== 'warning') return;
    if (secondsLeft === null) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearTimer();
          setPhase('triggered');
          // Auto-trigger SOS
          try {
            if (typeof onSOSTrigger === 'function') {
              onSOSTrigger({
                id: `timer_sos_${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: 'safety_timer',
                lat: 13.0827,
                lng: 80.2707,
                street: 'Safety Timer Expired',
              });
            }
          } catch (_) {}
          return 0;
        }
        if (prev <= 30) setPhase('warning');
        return prev - 1;
      });
    }, 1000);

    return () => clearTimer();
  }, [phase, clearTimer, onSOSTrigger]);

  const stopTimer = useCallback(() => {
    clearTimer();
    setPhase('safe');
    setSecondsLeft(null);
    setTimeout(() => setPhase('idle'), 3000);
  }, [clearTimer]);

  const resetTimer = useCallback(() => {
    clearTimer();
    setSecondsLeft(null);
    setPhase('idle');
  }, [clearTimer]);

  const formatTime = (secs) => {
    if (secs === null || secs === undefined) return '--:--';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progress = secondsLeft !== null ? ((totalSeconds - secondsLeft) / totalSeconds) : 0;
  const circumference = 2 * Math.PI * 36;

  const phaseColor = {
    idle: '#00F5D4',
    running: '#00F5D4',
    warning: '#FFB703',
    triggered: '#FF4D6D',
    safe: '#00F5D4',
  }[phase] || '#00F5D4';

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-[80px] right-[22px] z-[9997] w-11 h-11 rounded-full flex items-center justify-center"
        style={{
          background: `rgba(${phase === 'warning' ? '255,183,3' : phase === 'triggered' ? '255,77,109' : '0,245,212'},0.15)`,
          border: `1.5px solid ${phaseColor}55`,
          boxShadow: `0 0 18px ${phaseColor}40`,
          backdropFilter: 'blur(12px)',
        }}
        aria-label="Safety Timer"
        title="Safety Timer — auto-SOS if you don't check in"
      >
        <Timer size={18} style={{ color: phaseColor }} />
        {phase === 'running' || phase === 'warning' ? (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-pulse"
            style={{ background: phaseColor }} />
        ) : null}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="timer-panel"
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-16 right-[76px] z-[9997] w-[260px] rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(5,5,16,0.92)',
              border: `1px solid ${phaseColor}33`,
              boxShadow: `0 0 40px ${phaseColor}15, 0 16px 40px rgba(0,0,0,0.5)`,
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: `${phaseColor}10` }}>
              <div className="flex items-center gap-2">
                <Timer size={14} style={{ color: phaseColor }} />
                <span className="text-xs font-bold text-white tracking-wider uppercase">Safety Timer</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>

            <div className="p-4 flex flex-col items-center gap-4">
              {/* Circular progress */}
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="5" />
                  <motion.circle
                    cx="40" cy="40" r="36" fill="none"
                    stroke={phaseColor}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                    style={{ filter: `drop-shadow(0 0 6px ${phaseColor}80)`, transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-lg font-black text-white tabular-nums" style={{ color: phaseColor }}>
                    {formatTime(secondsLeft)}
                  </span>
                  {phase === 'running' && <span className="text-[9px] text-slate-400 uppercase tracking-wider mt-0.5">Active</span>}
                  {phase === 'warning' && <span className="text-[9px] text-[#FFB703] animate-pulse uppercase tracking-wider mt-0.5">Soon!</span>}
                  {phase === 'triggered' && <span className="text-[9px] text-[#FF4D6D] animate-pulse uppercase tracking-wider mt-0.5">SOS!</span>}
                  {phase === 'safe' && <span className="text-[9px] text-[#00F5D4] uppercase tracking-wider mt-0.5">Safe!</span>}
                </div>
              </div>

              {/* Status messages */}
              <AnimatePresence mode="wait">
                {phase === 'triggered' && (
                  <motion.div key="trig" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-full px-3 py-2 rounded-xl text-center text-xs font-bold text-[#FF4D6D]"
                    style={{ background: 'rgba(255,77,109,0.1)', border: '1px solid rgba(255,77,109,0.3)' }}>
                    🚨 Timer expired — SOS triggered automatically
                  </motion.div>
                )}
                {phase === 'safe' && (
                  <motion.div key="safe" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-full px-3 py-2 rounded-xl text-center text-xs font-bold text-[#00F5D4]"
                    style={{ background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.25)' }}>
                    <ShieldCheck size={12} className="inline mr-1" />
                    You checked in safely!
                  </motion.div>
                )}
                {phase === 'warning' && (
                  <motion.div key="warn" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-full px-3 py-2 rounded-xl text-center text-xs font-bold"
                    style={{ background: 'rgba(255,183,3,0.1)', border: '1px solid rgba(255,183,3,0.3)', color: '#FFB703' }}>
                    ⚠️ Check in soon or SOS will trigger
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Duration input (only when idle) */}
              {(phase === 'idle') && (
                <div className="w-full flex flex-col gap-2">
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                    I'll arrive in
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1} max={120} step={1}
                      value={minutes}
                      onChange={e => setMinutes(Number(e.target.value))}
                      className="flex-1 accent-[#00F5D4] bg-transparent"
                    />
                    <span className="text-sm font-bold text-white w-14 text-right">{minutes} min</span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="w-full flex gap-2">
                {phase === 'idle' && (
                  <motion.button whileTap={{ scale: 0.95 }} onClick={startTimer}
                    className="flex-1 py-2.5 rounded-xl text-xs font-black text-black"
                    style={{ background: 'linear-gradient(135deg, #00F5D4, #00C4AA)', boxShadow: '0 0 16px rgba(0,245,212,0.4)' }}>
                    Start Timer
                  </motion.button>
                )}
                {(phase === 'running' || phase === 'warning') && (
                  <>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={stopTimer}
                      className="flex-1 py-2.5 rounded-xl text-xs font-black text-black"
                      style={{ background: 'linear-gradient(135deg, #00F5D4, #00C4AA)', boxShadow: '0 0 16px rgba(0,245,212,0.4)' }}>
                      ✅ I'm Safe
                    </motion.button>
                    <button onClick={resetTimer}
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <RotateCcw size={13} />
                    </button>
                  </>
                )}
                {(phase === 'triggered' || phase === 'safe') && (
                  <button onClick={resetTimer}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-300 transition-colors"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    Reset
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
