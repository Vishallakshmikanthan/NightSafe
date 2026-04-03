import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert, TrendingUp, Lightbulb, Users, Activity, BarChart, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';

export default function InvestmentDashboard() {
  const [data, setData] = useState([]);
  
  useEffect(() => {
    // Mock GET /api/routes/investment
    setTimeout(() => {
      setData([
        { id: 1, name: "Kasturi Rangan Road", dangerScore: 88, issue: "No Streetlights", cost: "$5k", impact: "+45% Safety" },
        { id: 2, name: "Velachery Link Road", dangerScore: 76, issue: "Low Footfall", cost: "$12k", impact: "+30% Safety" },
        { id: 3, name: "OMR Stretch B", dangerScore: 72, issue: "History of Incidents", cost: "$20k", impact: "+50% Safety" },
      ]);
    }, 800);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 p-6 lg:p-12 max-w-6xl w-full mx-auto relative pt-24 z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-4xl font-extrabold tracking-tight mb-2">Investment Insights <span className="text-rose-500">Government Angle</span></h1>
          <p className="text-slate-400 text-lg">AI-powered prioritization for urban safety infrastructure.</p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-slate-900/50 border border-slate-800 backdrop-blur-xl p-6 rounded-2xl">
            <div className="bg-rose-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <ShieldAlert className="text-rose-500" size={24} />
            </div>
            <h3 className="text-3xl font-bold mb-1">12</h3>
            <p className="text-slate-400 font-medium">High Risk Zones Identified</p>
          </motion.div>
          
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="bg-slate-900/50 border border-slate-800 backdrop-blur-xl p-6 rounded-2xl">
            <div className="bg-amber-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <Lightbulb className="text-amber-500" size={24} />
            </div>
            <h3 className="text-3xl font-bold mb-1">$37k</h3>
            <p className="text-slate-400 font-medium">Est. Immediate Investment Required</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }} className="bg-slate-900/50 border border-slate-800 backdrop-blur-xl p-6 rounded-2xl">
            <div className="bg-emerald-500/20 w-12 h-12 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="text-emerald-500" size={24} />
            </div>
            <h3 className="text-3xl font-bold mb-1">+42%</h3>
            <p className="text-slate-400 font-medium">Avg Projected Safety Increase</p>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-slate-900/80 border border-slate-800 backdrop-blur-xl rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <Activity className="text-sky-400" />
            <h2 className="text-xl font-bold">Top Dangerous Streets for Intervention</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-950/50 text-slate-400 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Street Name</th>
                  <th className="px-6 py-4 font-semibold">Danger Score</th>
                  <th className="px-6 py-4 font-semibold">Primary Issue</th>
                  <th className="px-6 py-4 font-semibold">Suggested Fix</th>
                  <th className="px-6 py-4 font-semibold">Impact Return</th>
                  <th className="px-6 py-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50 text-sm">
                {data.map((row, i) => (
                  <motion.tr key={row.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.1 }} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-medium text-white">{row.name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-rose-500/20 text-rose-400 px-2 py-1 rounded font-bold">{row.dangerScore}/100</span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">{row.issue}</td>
                    <td className="px-6 py-4 font-mono text-amber-400">{row.cost}</td>
                    <td className="px-6 py-4 text-emerald-400 font-semibold">{row.impact}</td>
                    <td className="px-6 py-4">
                      <button className="flex items-center gap-2 text-sky-400 hover:text-sky-300 font-medium transition-colors">
                        Approve <ArrowRight size={14} />
                      </button>
                    </td>
                  </motion.tr>
                ))}
                {data.length === 0 && (
                  <tr>
                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500 italic">
                      Analyzing city safety data...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>
      
      {/* Background glow effects */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] bg-sky-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[40%] h-[50%] bg-rose-900/10 blur-[120px] rounded-full pointer-events-none" />
    </div>
  );
}