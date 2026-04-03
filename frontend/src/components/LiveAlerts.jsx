import React, { useState, useEffect } from 'react';
import { fetchAlerts } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ShieldAlert, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export default function LiveAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  const getSeverityStyle = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
        return {
          icon: <ShieldAlert size={18} className="text-[var(--accent-coral)] drop-shadow-[0_0_12px_rgba(239,71,111,0.8)]" />,
          color: 'var(--accent-coral)',
          bg: 'bg-[var(--accent-coral)]/10',
          textClass: 'text-[var(--accent-coral)]',
          glow: 'pro-glow-coral'
        };
      case 'high':
        return {
          icon: <AlertTriangle size={18} className="text-[var(--accent-amber)] drop-shadow-[0_0_10px_rgba(255,183,3,0.6)]" />,
          color: 'var(--accent-amber)',
          bg: 'bg-[var(--accent-amber)]/10',
          textClass: 'text-[var(--accent-amber)]',
          glow: 'pro-glow-amber'
        };
      case 'medium':
        return {
          icon: <AlertCircle size={18} className="text-[var(--accent-amber)] drop-shadow-[0_0_8px_rgba(255,183,3,0.4)]" />,
          color: 'var(--accent-amber)',
          bg: 'bg-[var(--accent-amber)]/5',
          textClass: 'text-[var(--accent-amber)]',
          glow: ''
        };
      default:
        return {
          icon: <Info size={18} className="text-[var(--accent-teal)] drop-shadow-[0_0_8px_rgba(0,245,212,0.4)]" />,
          color: 'var(--accent-teal)',
          bg: 'bg-[var(--accent-teal)]/10',
          textClass: 'text-[var(--accent-teal)]',
          glow: 'pro-glow-teal'
        };
    }
  };

  const getRelativeTime = (timestamp) => {
    const diffMins = Math.floor((new Date() - new Date(timestamp)) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return `${Math.floor(diffMins / 60)}h ago`;
  };

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await fetchAlerts();
        if (mounted) setAlerts(data);
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 8000);
    
    const handleTripAlert = (e) => {
        setAlerts(prev => [e.detail, ...prev].slice(0, 15));
    };
    window.addEventListener('nightsafe-trip-alert', handleTripAlert);

    return () => {
      mounted = false;
      clearInterval(interval);
      window.removeEventListener('nightsafe-trip-alert', handleTripAlert);
    };
  }, []);

  return (
    <div className="absolute top-28 right-6 w-[340px] h-[calc(100vh-160px)] flex flex-col pointer-events-auto z-40">
      
      {/* Cinematic Header Panel */}
      <div className="pro-glass rounded-t-2xl p-4 border-b-0 relative overflow-hidden flex-shrink-0">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent-coral)] to-[var(--accent-amber)] opacity-50"></div>
        <div className="flex justify-between items-center relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--accent-coral)]/10 flex items-center justify-center border border-[var(--accent-coral)]/30 pro-glow-coral">
              <Activity size={16} className="text-[var(--accent-coral)]" />
            </div>
            <h2 className="text-white font-heading font-semibold text-[16px] tracking-wide">Live Network</h2>
          </div>
          
          {/* Animated Ping Indicator */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--accent-coral)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--accent-coral)]"></span>
            </span>
            <span className="text-[9px] uppercase tracking-[0.15em] text-[var(--text-secondary)] font-bold shrink-0">Live Sync</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pro-glass rounded-b-2xl p-4 space-y-3 relative">
        <AnimatePresence mode="popLayout">
          {loading && alerts.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full gap-4 text-center py-10"
            >
              <div className="relative w-12 h-12 flex items-center justify-center">
                <div className="absolute inset-0 border-2 border-[var(--accent-teal)]/20 rounded-full animate-ping"></div>
                <div className="absolute inset-2 border-2 border-[var(--accent-teal)]/40 rounded-full animate-pulse"></div>
                <Activity size={20} className="text-[var(--accent-teal)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium text-[var(--accent-teal)] font-sans">Listening to urban activity...</span>
                <span className="text-[11px] text-[var(--text-secondary)]">Syncing with safety grid parameters</span>
              </div>
            </motion.div>
          ) : (
            alerts.map((alert, idx) => {
              const type = getSeverityStyle(alert.severity);
              return (
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.3, delay: idx * 0.05 }}
                  key={alert.id || alert.timestamp || idx}
                  className="group relative flex gap-3 p-3.5 rounded-xl border border-white/5 border-l-4 bg-[var(--bg-secondary)]/40 hover:bg-[var(--bg-secondary)]/80 transition-all duration-300 hover:translate-x-1"
                  style={{ borderLeftColor: type.color }}
                >
                  <div className={`mt-0.5 p-2 rounded-lg bg-[var(--bg-primary)] shadow-inner text-${type.color}`}>
                    {type.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <div className="flex justify-between items-center mb-0.5">
                      <h4 className={`text-white font-bold text-[11px] uppercase tracking-widest ${type.textClass} truncate pr-2 font-heading `}>
                        {alert.type || 'System Event'}
                      </h4>
                      <span className="text-[9px] text-[var(--text-secondary)] whitespace-nowrap font-mono opacity-80">
                        {getRelativeTime(alert.timestamp)}
                      </span>
                    </div>
                    <p className="text-[12.5px] text-[var(--text-primary)] leading-snug line-clamp-2 font-sans opacity-90 group-hover:opacity-100 transition-opacity">
                      {alert.message}
                    </p>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[var(--glass-bg)] via-[var(--glass-bg)] to-transparent rounded-b-2xl pointer-events-none z-10"></div>
    </div>
  );
}
