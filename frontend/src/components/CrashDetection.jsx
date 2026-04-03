import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

export default function CrashDetection({ onSOSTrigger }) {
  const [phase, setPhase] = useState('idle'); // idle | detected | countdown | triggered | dismissed
  const [countdown, setCountdown] = useState(10);
  const [isOpen, setIsOpen] = useState(false);
  const countdownRef = useRef(null);

  const clearCountdown = useCallback(() => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  useEffect(() => () => clearCountdown(), [clearCountdown]);

  const startDetection = useCallback(() => {
    setIsOpen(false);
    setPhase('detected');
  }, []);

  const beginCountdown = useCallback(() => {
    setCountdown(10);
    setPhase('countdown');
    clearCountdown();

    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearCountdown();
          setPhase('triggered');
          try {
            if (typeof onSOSTrigger === 'function') {
              onSOSTrigger({
                id: `crash_sos_${Date.now()}`,
                timestamp: new Date().toISOString(),
                type: 'crash_detection',
                lat: 13.0827,
                lng: 80.2707,
                street: 'Crash Detection Auto-SOS',
              });
            }
          } catch (_) {}
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearCountdown, onSOSTrigger]);

  // Auto-begin countdown after detection popup shows
  useEffect(() => {
    if (phase === 'detected') {
      const t = setTimeout(() => beginCountdown(), 2500);
      return () => clearTimeout(t);
    }
  }, [phase, beginCountdown]);

  const dismiss = useCallback(() => {
    clearCountdown();
    setPhase('dismissed');
    setTimeout(() => setPhase('idle'), 3000);
  }, [clearCountdown]);

  const resetToIdle = useCallback(() => {
    clearCountdown();
    setPhase('idle');
    setCountdown(10);
  }, [clearCountdown]);

  const strokePct = countdown / 10;
  const circumference = 2 * Math.PI * 28;

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-[236px] right-[22px] z-[9997] w-11 h-11 rounded-full flex items-center justify-center"
        style={{
          background: phase !== 'idle' ? 'rgba(255,77,109,0.2)' : 'rgba(255,183,3,0.1)',
          border: `1.5px solid ${phase !== 'idle' ? 'rgba(255,77,109,0.5)' : 'rgba(255,183,3,0.4)'}`,
          boxShadow: phase !== 'idle' ? '0 0 20px rgba(255,77,109,0.4)' : '0 0 14px rgba(255,183,3,0.2)',
          backdropFilter: 'blur(12px)',
        }}
        aria-label="Crash Detection"
        title="Crash Detection — simulates sudden impact detection"
      >
        <AlertTriangle size={16} color={phase !== 'idle' ? '#FF4D6D' : '#FFB703'} />
        {phase !== 'idle' && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#FF4D6D] animate-pulse" />
        )}
      </motion.button>

      {/* Trigger panel */}
      <AnimatePresence>
        {isOpen && phase === 'idle' && (
          <motion.div
            key="crash-panel"
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-16 right-[76px] z-[9997] w-[240px] rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(5,5,16,0.95)',
              border: '1px solid rgba(255,183,3,0.25)',
              boxShadow: '0 0 30px rgba(255,183,3,0.1), 0 16px 40px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,183,3,0.07)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle size={13} color="#FFB703" />
                  <span className="text-xs font-bold text-white tracking-wider uppercase">Crash Detection</span>
                </div>
                <button onClick={() => setIsOpen(false)} className="text-slate-600 hover:text-white transition-colors">
                  <X size={13} />
                </button>
              </div>
              <p className="text-[10px] text-slate-500 mt-1">Simulates sudden impact / accident detection</p>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="px-3 py-2.5 rounded-xl text-xs text-slate-400"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p>In a real app, this uses the <strong className="text-white">device accelerometer</strong> to detect sudden deceleration. Here we simulate it manually.</p>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={startDetection}
                className="w-full py-3 rounded-xl text-sm font-black"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,183,3,0.25), rgba(255,183,3,0.12))',
                  border: '1px solid rgba(255,183,3,0.5)',
                  color: '#FFB703',
                  boxShadow: '0 0 16px rgba(255,183,3,0.2)',
                }}
              >
                🚗 Simulate Crash
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Crash detected popup */}
      <AnimatePresence>
        {(phase === 'detected' || phase === 'countdown') && (
          <motion.div
            key="crash-detected"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
          >
            <div
              className="w-[300px] rounded-2xl p-6 flex flex-col items-center gap-4 text-center"
              style={{
                background: 'rgba(15,5,6,0.98)',
                border: '1.5px solid rgba(255,77,109,0.5)',
                boxShadow: '0 0 60px rgba(255,77,109,0.3)',
              }}
            >
              <motion.div
                animate={{ rotate: [-3, 3, -3], scale: [1, 1.05, 1] }}
                transition={{ duration: 0.3, repeat: Infinity }}
                className="text-5xl"
              >
                💥
              </motion.div>

              <div>
                <h2 className="text-white text-lg font-black">Possible Crash Detected!</h2>
                <p className="text-slate-400 text-xs mt-1">Sudden impact registered. Are you okay?</p>
              </div>

              {/* Countdown ring */}
              {phase === 'countdown' && (
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,77,109,0.15)" strokeWidth="4" />
                    <circle
                      cx="32" cy="32" r="28" fill="none"
                      stroke="#FF4D6D" strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference * (1 - strokePct)}
                      style={{ transition: 'stroke-dashoffset 1s linear', filter: 'drop-shadow(0 0 6px rgba(255,77,109,0.6))' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-black text-[#FF4D6D]">{countdown}</span>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-400">
                {phase === 'detected' ? 'Initialising emergency response...' : `SOS will be sent in ${countdown} seconds`}
              </p>

              <div className="flex gap-3 w-full">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={dismiss}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black text-black"
                  style={{
                    background: 'linear-gradient(135deg, #00F5D4, #00C4AA)',
                    boxShadow: '0 0 16px rgba(0,245,212,0.4)',
                  }}
                >
                  ✅ I'm OK
                </motion.button>
                <button
                  onClick={resetToIdle}
                  className="px-3 rounded-xl text-xs text-slate-500 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'triggered' && (
          <motion.div
            key="crash-sos"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 px-5 py-3 rounded-2xl"
            style={{
              background: 'rgba(255,77,109,0.15)',
              border: '1px solid rgba(255,77,109,0.5)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <ShieldAlert size={16} color="#FF4D6D" />
            <div>
              <p className="text-white font-black text-sm">Crash SOS Sent</p>
              <p className="text-slate-400 text-xs">Emergency responders notified</p>
            </div>
            <button onClick={resetToIdle} className="ml-2 text-slate-500 hover:text-white">
              <X size={14} />
            </button>
          </motion.div>
        )}

        {phase === 'dismissed' && (
          <motion.div
            key="crash-ok"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-32 right-6 z-[10000] flex items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{
              background: 'rgba(0,245,212,0.1)',
              border: '1px solid rgba(0,245,212,0.3)',
              backdropFilter: 'blur(12px)',
            }}
          >
            <span className="text-[#00F5D4] text-sm">✅ Glad you're safe!</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
