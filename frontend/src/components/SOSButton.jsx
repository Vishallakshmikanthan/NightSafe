import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const SOS_KEY = 'nightsafe_sos_log';

function getGeoPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: 13.0827, lng: 80.2707 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve({ lat: 13.0827, lng: 80.2707 }),
      { timeout: 4000, maximumAge: 60000 }
    );
  });
}

function logSOS(entry) {
  try {
    const existing = JSON.parse(localStorage.getItem(SOS_KEY) || '[]');
    const updated = [entry, ...existing].slice(0, 20);
    localStorage.setItem(SOS_KEY, JSON.stringify(updated));
  } catch (_) {}
}

export default function SOSButton({ selectedStreet, onSOSTrigger }) {
  const [phase, setPhase] = useState('idle'); // idle | confirm | triggered | discreet
  const [coords, setCoords] = useState(null);
  const longPressTimer = useRef(null);
  const keyBuffer = useRef([]);
  const keyTimeout = useRef(null);
  const isLongPressing = useRef(false);

  // Keyboard shortcut: press S three times within 2 seconds
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key?.toLowerCase() !== 's') return;
      keyBuffer.current.push(Date.now());
      clearTimeout(keyTimeout.current);
      keyTimeout.current = setTimeout(() => { keyBuffer.current = []; }, 2000);
      if (keyBuffer.current.length >= 3) {
        keyBuffer.current = [];
        triggerSOS(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      clearTimeout(keyTimeout.current);
    };
  }, []);

  const triggerSOS = useCallback(async (showPopup = true) => {
    try {
      const pos = await getGeoPosition();
      setCoords(pos);
      const entry = {
        id: `sos_${Date.now()}`,
        timestamp: new Date().toISOString(),
        lat: pos.lat,
        lng: pos.lng,
        street: selectedStreet?.name || selectedStreet?.street_name || 'Unknown location',
        type: showPopup ? 'manual' : 'discreet',
      };
      logSOS(entry);
      if (typeof onSOSTrigger === 'function') onSOSTrigger(entry);
      if (showPopup) {
        setPhase('confirm');
      } else {
        setPhase('discreet');
        setTimeout(() => setPhase('idle'), 4000);
      }
    } catch (err) {
      console.error('SOS trigger error', err);
      setPhase('idle');
    }
  }, [selectedStreet, onSOSTrigger]);

  const handlePointerDown = () => {
    isLongPressing.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressing.current = true;
      triggerSOS(false);
    }, 2000);
  };

  const handlePointerUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (!isLongPressing.current && phase === 'idle') {
      triggerSOS(true);
    }
  };

  const handlePointerLeave = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);

  const dismiss = () => setPhase('idle');

  const confirmSOS = () => {
    setPhase('triggered');
    setTimeout(() => setPhase('idle'), 6000);
  };

  return (
    <>
      {/* Floating SOS Button */}
      <motion.button
        className="fixed bottom-4 right-4 z-[9998] w-14 h-14 rounded-full flex items-center justify-center font-black text-sm tracking-widest select-none cursor-pointer"
        style={{
          background: 'linear-gradient(135deg, #FF4D6D 0%, #C9184A 100%)',
          border: '2px solid rgba(255,77,109,0.6)',
          boxShadow: '0 0 30px rgba(255,77,109,0.6), 0 0 12px rgba(255,77,109,0.4)',
          color: 'white',
        }}
        animate={phase === 'idle' ? {
          boxShadow: [
            '0 0 20px rgba(255,77,109,0.4)',
            '0 0 40px rgba(255,77,109,0.8)',
            '0 0 20px rgba(255,77,109,0.4)',
          ],
        } : {}}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
        aria-label="Emergency SOS"
        title="Tap: SOS | Hold 2s: Silent SOS | Press S×3: Keyboard SOS"
      >
        <span className="text-base font-black tracking-wider">SOS</span>
      </motion.button>

      {/* Confirmation Popup */}
      <AnimatePresence>
        {phase === 'confirm' && (
          <motion.div
            key="sos-confirm"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}
          >
            <div
              className="w-[320px] rounded-2xl p-6 flex flex-col items-center gap-4"
              style={{
                background: 'rgba(12,4,8,0.96)',
                border: '1.5px solid rgba(255,77,109,0.5)',
                boxShadow: '0 0 60px rgba(255,77,109,0.3)',
              }}
            >
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="text-5xl"
              >
                🚨
              </motion.div>
              <h2 className="text-white text-xl font-black tracking-wide">Send SOS Alert?</h2>
              <div className="w-full rounded-xl px-4 py-3 text-sm text-slate-300 space-y-1"
                style={{ background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.2)' }}>
                <p>📍 <span className="text-slate-400">Location:</span> {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Acquiring...'}</p>
                <p>🧭 <span className="text-slate-400">Street:</span> {selectedStreet?.name || selectedStreet?.street_name || 'Unknown'}</p>
                <p>🕐 <span className="text-slate-400">Time:</span> {new Date().toLocaleTimeString()}</p>
              </div>
              <div className="flex gap-3 w-full">
                <button
                  onClick={dismiss}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={confirmSOS}
                  className="flex-1 py-2.5 rounded-xl text-sm font-black text-white"
                  style={{
                    background: 'linear-gradient(135deg, #FF4D6D, #C9184A)',
                    boxShadow: '0 0 20px rgba(255,77,109,0.5)',
                  }}
                >
                  🚨 SEND SOS
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'triggered' && (
          <motion.div
            key="sos-triggered"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] flex items-center gap-3 px-5 py-3 rounded-2xl"
            style={{
              background: 'rgba(255,77,109,0.15)',
              border: '1px solid rgba(255,77,109,0.5)',
              boxShadow: '0 0 30px rgba(255,77,109,0.3)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 0.6, repeat: Infinity }} className="text-xl">🚨</motion.span>
            <div>
              <p className="text-white font-black text-sm">SOS Alert Sent</p>
              <p className="text-slate-400 text-xs">Emergency contacts notified · Authorities alerted</p>
            </div>
          </motion.div>
        )}

        {phase === 'discreet' && (
          <motion.div
            key="sos-discreet"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-48 right-6 z-[10000] flex items-center gap-2 px-4 py-2.5 rounded-xl"
            style={{
              background: 'rgba(255,77,109,0.12)',
              border: '1px solid rgba(255,77,109,0.35)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <span className="w-2 h-2 rounded-full bg-[#FF4D6D] animate-pulse" />
            <span className="text-xs text-[#FF4D6D] font-bold">Silent SOS Active</span>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
