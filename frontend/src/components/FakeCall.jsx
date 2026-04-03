import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Phone, PhoneOff } from 'lucide-react';

const CALLER_OPTIONS = [
  { name: 'Mom', emoji: '👩', number: '+91 98765 XXXXX' },
  { name: 'Dad', emoji: '👨', number: '+91 98765 XXXXX' },
  { name: 'Best Friend', emoji: '🧑‍🤝‍🧑', number: '+91 87654 XXXXX' },
  { name: 'Office', emoji: '🏢', number: '+91 44-2345-XXXX' },
];

export default function FakeCall() {
  const [phase, setPhase] = useState('idle'); // idle | ringing | calling | ended
  const [caller, setCaller] = useState(CALLER_OPTIONS[0]);
  const [isOpen, setIsOpen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const delayTimer = useRef(null);
  const callTimer = useRef(null);

  const cleanup = useCallback(() => {
    clearTimeout(delayTimer.current);
    clearInterval(callTimer.current);
  }, []);

  useEffect(() => () => cleanup(), [cleanup]);

  const startFakeCall = useCallback((selectedCaller) => {
    cleanup();
    setCaller(selectedCaller || CALLER_OPTIONS[0]);
    setPhase('ringing');
    setIsOpen(false);

    // Auto-end ringing after 30 seconds if not answered
    delayTimer.current = setTimeout(() => {
      setPhase('idle');
    }, 30000);
  }, [cleanup]);

  const acceptCall = useCallback(() => {
    cleanup();
    setCallDuration(0);
    setPhase('calling');

    callTimer.current = setInterval(() => {
      setCallDuration(d => d + 1);
    }, 1000);

    // Auto-end after 45 seconds (realistic mock)
    delayTimer.current = setTimeout(() => {
      cleanup();
      setPhase('ended');
      setTimeout(() => setPhase('idle'), 2500);
    }, 45000);
  }, [cleanup]);

  const rejectCall = useCallback(() => {
    cleanup();
    setPhase('idle');
  }, [cleanup]);

  const endCall = useCallback(() => {
    cleanup();
    setPhase('ended');
    setTimeout(() => setPhase('idle'), 2000);
  }, [cleanup]);

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-[132px] right-[22px] z-[9997] w-11 h-11 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(123,97,255,0.15)',
          border: '1.5px solid rgba(123,97,255,0.45)',
          boxShadow: '0 0 18px rgba(123,97,255,0.3)',
          backdropFilter: 'blur(12px)',
        }}
        aria-label="Fake Call"
        title="Trigger a fake incoming call to escape a situation"
      >
        <span className="text-lg">📞</span>
      </motion.button>

      {/* Caller chooser panel */}
      <AnimatePresence>
        {isOpen && phase === 'idle' && (
          <motion.div
            key="fake-call-panel"
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-16 right-[76px] z-[9997] w-[220px] rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(5,5,16,0.95)',
              border: '1px solid rgba(123,97,255,0.3)',
              boxShadow: '0 0 30px rgba(123,97,255,0.15), 0 16px 40px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(20px)',
            }}
          >
            <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(123,97,255,0.08)' }}>
              <p className="text-xs font-bold text-white tracking-wider uppercase">📞 Fake Call</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Choose who's "calling"</p>
            </div>
            <div className="p-2 flex flex-col gap-1">
              {CALLER_OPTIONS.map((c) => (
                <button
                  key={c.name}
                  onClick={() => {
                    const delay = 3000 + Math.random() * 2000;
                    setIsOpen(false);
                    setTimeout(() => startFakeCall(c), delay);
                  }}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(123,97,255,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; }}
                >
                  <span className="text-xl">{c.emoji}</span>
                  <div>
                    <p className="text-xs font-bold text-white">{c.name}</p>
                    <p className="text-[10px] text-slate-500">{c.number}</p>
                  </div>
                </button>
              ))}
              <p className="text-[9px] text-slate-600 text-center py-1">Call arrives in 3–5 seconds</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Incoming call screen */}
      <AnimatePresence>
        {phase === 'ringing' && (
          <motion.div
            key="incoming"
            initial={{ opacity: 0, y: -40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] w-[300px] rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #1a0a2e 0%, #0d1b2a 100%)',
              border: '1px solid rgba(123,97,255,0.4)',
              boxShadow: '0 0 60px rgba(123,97,255,0.25), 0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            {/* Animated ring background */}
            <div className="relative flex flex-col items-center py-8 gap-3">
              <motion.div
                className="absolute inset-0 rounded-3xl"
                animate={{ opacity: [0.1, 0.2, 0.1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                style={{ background: 'radial-gradient(circle at 50% 40%, rgba(123,97,255,0.3) 0%, transparent 70%)' }}
              />
              <div className="relative">
                {[1, 1.3, 1.6].map((scale, i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-full"
                    animate={{ scale: [1, scale], opacity: [0.4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                    style={{ background: 'rgba(123,97,255,0.3)', width: '72px', height: '72px', top: '0', left: '0' }}
                  />
                ))}
                <div className="relative w-18 h-18 w-[72px] h-[72px] rounded-full flex items-center justify-center text-4xl"
                  style={{ background: 'linear-gradient(135deg, rgba(123,97,255,0.3), rgba(123,97,255,0.1))', border: '2px solid rgba(123,97,255,0.5)' }}>
                  {caller.emoji}
                </div>
              </div>
              <div className="text-center z-10">
                <p className="text-white text-xl font-black">{caller.name}</p>
                <p className="text-slate-400 text-xs mt-1">{caller.number}</p>
                <motion.p
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="text-indigo-300 text-xs mt-2 font-medium"
                >
                  Incoming call...
                </motion.p>
              </div>
              <div className="flex gap-8 mt-2 z-10">
                <button
                  onClick={rejectCall}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-90"
                  style={{ background: 'linear-gradient(135deg, #FF4D6D, #C9184A)', boxShadow: '0 0 20px rgba(255,77,109,0.5)' }}
                >
                  <PhoneOff size={20} color="white" />
                </button>
                <button
                  onClick={acceptCall}
                  className="w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-90"
                  style={{ background: 'linear-gradient(135deg, #00F5D4, #00A896)', boxShadow: '0 0 20px rgba(0,245,212,0.5)' }}
                >
                  <Phone size={20} color="black" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {phase === 'calling' && (
          <motion.div
            key="calling"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] w-[280px] rounded-3xl overflow-hidden"
            style={{
              background: 'linear-gradient(160deg, #0d1b0f 0%, #050510 100%)',
              border: '1px solid rgba(0,245,212,0.3)',
              boxShadow: '0 0 40px rgba(0,245,212,0.1), 0 20px 60px rgba(0,0,0,0.6)',
            }}
          >
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="w-[72px] h-[72px] rounded-full flex items-center justify-center text-4xl"
                style={{ background: 'rgba(0,245,212,0.1)', border: '2px solid rgba(0,245,212,0.4)' }}>
                {caller.emoji}
              </div>
              <div className="text-center">
                <p className="text-white text-lg font-black">{caller.name}</p>
                <p className="text-[#00F5D4] text-sm mt-1 font-mono">{formatDuration(callDuration)}</p>
              </div>
              <button
                onClick={endCall}
                className="w-14 h-14 rounded-full flex items-center justify-center mt-2"
                style={{ background: 'linear-gradient(135deg, #FF4D6D, #C9184A)', boxShadow: '0 0 20px rgba(255,77,109,0.4)' }}
              >
                <PhoneOff size={20} color="white" />
              </button>
            </div>
          </motion.div>
        )}

        {phase === 'ended' && (
          <motion.div
            key="ended"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[10001] px-5 py-3 rounded-2xl"
            style={{
              background: 'rgba(5,5,16,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <p className="text-slate-300 text-sm">📵 Call ended</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
