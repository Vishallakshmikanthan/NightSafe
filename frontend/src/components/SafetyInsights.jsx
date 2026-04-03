import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lightbulb, MapPin, AlertTriangle, Activity, TrendingUp, TrendingDown } from 'lucide-react';

export default function SafetyInsights({ streetData, onClose }) {
  if (!streetData) return null;

  const score = Number(streetData.safety_score) || 0;
  const isImproving = score > 60; // Mock trend

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: '100%', opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 200 }}
        className="absolute top-24 right-6 w-80 bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-2xl z-40 text-slate-100"
      >
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${score >= 70 ? 'bg-emerald-500/20 text-emerald-400' : score >= 40 ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
              <Shield size={20} />
            </div>
            <div>
              <h3 className="font-bold text-lg leading-tight truncate w-48">{streetData.name || "Selected Area"}</h3>
              <p className="text-xs text-slate-400">AI Safety Analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded-full transition-colors">
            <span className="sr-only">Close</span>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="mb-5 flex justify-between items-end">
          <div>
            <div className="text-4xl font-extrabold tracking-tighter">
              {score}
              <span className="text-lg bg-clip-text text-transparent bg-gradient-to-br from-slate-400 to-slate-600 font-medium">/100</span>
            </div>
          </div>
          <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${isImproving ? 'bg-emerald-500/10 text-emerald-400 ' : 'bg-rose-500/10 text-rose-400'}`}>
            {isImproving ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {isImproving ? 'IMPROVING' : 'WORSENING'}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Key Risk Factors</h4>
            <div className="space-y-2">
              <div className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded-lg text-sm border border-slate-700/50">
                <span className="flex items-center gap-2 text-slate-300">
                  <Lightbulb size={16} className="text-amber-400" />
                  Lighting Level
                </span>
                <span className="font-mono text-amber-400">Poor</span>
              </div>
              <div className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded-lg text-sm border border-slate-700/50">
                <span className="flex items-center gap-2 text-slate-300">
                  <Activity size={16} className="text-sky-400" />
                  Footfall
                </span>
                <span className="font-mono text-sky-400">Low</span>
              </div>
              <div className="flex justify-between items-center bg-slate-800/50 px-3 py-2 rounded-lg text-sm border border-slate-700/50">
                <span className="flex items-center gap-2 text-slate-300">
                  <AlertTriangle size={16} className="text-rose-400" />
                  Past Incidents
                </span>
                <span className="font-mono text-rose-400">Elevated</span>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}