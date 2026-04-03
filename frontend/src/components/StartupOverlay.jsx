import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StartupOverlay({ onComplete }) {
  const [step, setStep] = React.useState(0);
  const steps = [
    "INITIALIZING NEURAL SUBSYSTEMS...",
    "FETCHING CHENNAI STREET DATA...",
    "ANALYZING CRIME METRICS...",
    "CALIBRATING SAFETY FORMULAS...",
    "NIGHTSAFE READY."
  ];

  React.useEffect(() => {
    if (step < steps.length) {
      const timer = setTimeout(() => setStep(s => s + 1), 800);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(onComplete, 1000);
      return () => clearTimeout(timer);
    }
  }, [step, onComplete]);

  return (
    <motion.div 
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.1 }}
      transition={{ duration: 1 }}
      className="fixed inset-0 z-[1000] bg-[#050510] flex flex-col items-center justify-center p-8"
    >
      <div className="relative w-full max-w-lg">
        {/* Abstract Scanner Effect */}
        <motion.div 
          animate={{ height: ['0%', '100%', '0%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          className="absolute left-0 right-0 top-0 bg-gradient-to-b from-transparent via-[#00F5D4]/20 to-transparent z-0 pointer-events-none"
        />

        {/* HUD Elements */}
        <div className="border border-white/10 rounded-2xl p-6 backdrop-blur-md bg-black/40 relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-3 h-3 rounded-full bg-[#FF4D6D] animate-pulse" />
            <h1 className="text-white font-bold tracking-widest text-sm font-mono">NIGHTSAFE v0.1.0 // SYSTEM CORE</h1>
          </div>

          <div className="space-y-4 font-mono text-[11px] tracking-tight">
            <AnimatePresence mode="popLayout">
              {steps.slice(0, step + 1).map((s, i) => (
                <motion.div 
                  key={s}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={i === step ? "text-[#00F5D4] font-bold" : "text-slate-500"}
                >
                  <span className="mr-2">[{i.toString().padStart(2, '0')}]</span>
                  {s}
                  {i === step && <motion.span animate={{ opacity: [0, 1] }} transition={{ repeat: Infinity, duration: 0.5 }}>_</motion.span>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <div className="mt-12 h-1 bg-white/5 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(step / steps.length) * 100}%` }}
              className="h-full bg-gradient-to-r from-[#FF4D6D] via-[#FFB703] to-[#00F5D4]"
            />
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-[10px] text-slate-600 font-mono italic">SECURE CONNECTION ESTABLISHED // LAT: 13.0827 LNG: 80.2707</p>
        </div>
      </div>
    </motion.div>
  );
}
