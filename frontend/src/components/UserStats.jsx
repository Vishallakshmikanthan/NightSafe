import React from 'react';
import { motion } from 'framer-motion';
import { Trophy, Star, Shield, Award, Route } from 'lucide-react';

export default function UserStats() {
  return (
    <motion.div
      initial={{ x: -50, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="absolute top-24 left-6 w-72 bg-slate-900/90 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-2xl z-40 text-slate-100"
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <Trophy className="text-amber-400" />
          My Profile
        </h3>
        <span className="bg-emerald-500/20 text-emerald-400 font-bold px-2 py-1 rounded text-xs">
          Lvl 12
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
          <Route className="text-sky-400 mb-2" size={20} />
          <p className="text-2xl font-extrabold text-white">48</p>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Safe Routes</p>
        </div>
        <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700">
          <Star className="text-amber-400 mb-2" size={20} />
          <p className="text-2xl font-extrabold text-white">12</p>
          <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Reports</p>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-2">Badges Earned</h4>
        
        <div className="flex items-center gap-3 bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-xl hover:bg-indigo-500/20 transition-colors cursor-default">
          <div className="bg-indigo-500 p-2 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <Shield size={16} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-indigo-100">City Guardian</p>
            <p className="text-xs text-indigo-300">Reported 10+ incidents</p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-fuchsia-500/10 border border-fuchsia-500/20 p-3 rounded-xl hover:bg-fuchsia-500/20 transition-colors cursor-default">
          <div className="bg-fuchsia-500 p-2 rounded-full shadow-[0_0_15px_rgba(217,70,239,0.5)]">
            <Award size={16} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-sm text-fuchsia-100">Night Navigator</p>
            <p className="text-xs text-fuchsia-300">Completed 20 safe routes</p>
          </div>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-800 text-center">
        <p className="text-xs text-slate-400">Total Safety Score Contribution</p>
        <p className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-sky-400">
          +1,420 pts
        </p>
      </div>
    </motion.div>
  );
}