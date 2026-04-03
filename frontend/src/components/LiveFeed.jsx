import React, { useState, useEffect, useRef } from 'react';
import { fetchAlerts } from '../services/api';
import { AlertOctagon, AlertTriangle, ShieldCheck, Info, Activity } from 'lucide-react';

// Helper for relative time (e.g., "2m ago")
const getRelativeTime = (timestamp) => {
  if (!timestamp) return 'Just now';
  const now = new Date();
  const past = new Date(timestamp);
  const diffMs = now - past;
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return `${Math.floor(diffHrs / 24)}d ago`;
};

// Styling based on severity
const getSeverityConfig = (severity) => {
  const norm = (severity || 'INFO').toUpperCase();
  switch (norm) {
    case 'CRITICAL':
      return {
        color: 'text-rose-500',
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        icon: <AlertOctagon size={16} className="text-rose-500 animate-pulse" />,
        glow: 'shadow-[0_0_15px_rgba(244,63,94,0.4)]'
      };
    case 'DANGER':
      return {
        color: 'text-orange-500',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        icon: <AlertTriangle size={16} className="text-orange-500" />,
        glow: ''
      };
    case 'CAUTION':
      return {
        color: 'text-amber-400',
        bg: 'bg-amber-400/10',
        border: 'border-amber-400/30',
        icon: <Activity size={16} className="text-amber-400" />,
        glow: ''
      };
    case 'SAFE':
      return {
        color: 'text-teal-400',
        bg: 'bg-teal-400/10',
        border: 'border-teal-400/30',
        icon: <ShieldCheck size={16} className="text-teal-400" />,
        glow: ''
      };
    default:
      return {
        color: 'text-sky-400',
        bg: 'bg-sky-400/10',
        border: 'border-sky-400/30',
        icon: <Info size={16} className="text-sky-400" />,
        glow: ''
      };
  }
};

export default function LiveFeed() {
  const [alerts, setAlerts] = useState([]);
  const [isHovered, setIsHovered] = useState(false);
  const feedRef = useRef(null);

  const loadAlerts = async () => {
    try {
      const data = await fetchAlerts();
      if (data && Array.isArray(data)) {
        // Assume data might just be the latest alerts.
        // We'll prepend new alerts, filter duplicates, sort by time, and slice to 20
        setAlerts((prev) => {
          const combined = [...data, ...prev];
          // Filter unique by ID (fallback to title+timestamp if no ID)
          const unique = Array.from(new Map(
            combined.map(item => [item.id || `${item.title}-${item.timestamp}`, item])
          ).values());
          
          // Sort descending by timestamp
          unique.sort((a, b) => new Date(b.timestamp || Date.now()) - new Date(a.timestamp || Date.now()));
          
          return unique.slice(0, 20); // Keep last 20 items per performance requirement
        });
      }
    } catch (err) {
      console.error('Failed to fetch live alerts:', err);
    }
  };

  // Poll every 10 seconds
  useEffect(() => {
    loadAlerts(); // Initial load
    const interval = setInterval(loadAlerts, 10000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll animation logic
  useEffect(() => {
    let animationFrameId;
    const scrollFeed = () => {
      if (feedRef.current && !isHovered) {
        // Slow vertical pan
        feedRef.current.scrollTop += 0.5;
        
        // Reset to top if we reach the bottom to create a loop effect if desired
        // Or simply let it scroll through the 20 items
        if (feedRef.current.scrollTop >= (feedRef.current.scrollHeight - feedRef.current.clientHeight)) {
           // Optionally snap back or fetch more, but we just hold at bottom.
        }
      }
      animationFrameId = requestAnimationFrame(scrollFeed);
    };

    animationFrameId = requestAnimationFrame(scrollFeed);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isHovered]);

  return (
    <div 
      className="absolute top-20 right-6 w-[320px] h-[calc(100vh-120px)] flex flex-col pointer-events-auto z-40"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="backdrop-blur-xl bg-[#0f172a]/90 border border-white/10 rounded-t-2xl p-4 shadow-lg border-b-0">
        <div className="flex justify-between items-center">
          <h2 className="text-white font-semibold flex items-center gap-2">
            <Activity size={18} className="text-teal-400" />
            Live Intelligence
          </h2>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
            </span>
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Live</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-1">CrowdSPaFE real-time updates</p>
      </div>

      {/* Feed Container */}
      <div 
        ref={feedRef}
        className="flex-1 overflow-y-auto overflow-x-hidden backdrop-blur-xl bg-[#0f172a]/70 border border-white/10 rounded-b-2xl p-4 space-y-3 hide-scrollbar relative"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <style dangerouslySetInnerHTML={{__html: `
          .hide-scrollbar::-webkit-scrollbar { display: none; }
          
          @keyframes slideInDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .animate-slide-in {
            animation: slideInDown 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
        `}} />

        {alerts.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-10">
            Waiting for live events...
          </div>
        ) : (
          alerts.map((alert, index) => {
            const config = getSeverityConfig(alert.severity);
            return (
              <div 
                key={alert.id || index}
                className={`animate-slide-in relative flex gap-3 p-3 rounded-xl border ${config.bg} ${config.border} ${config.glow} transition-all duration-300 backdrop-blur-md`}
              >
                {/* Timeline connector visual (only if not last) */}
                {index !== alerts.length - 1 && (
                  <div className="absolute left-[23px] top-10 bottom-[-16px] w-[1px] bg-slate-700/50 z-0"></div>
                )}
                
                {/* Icon */}
                <div className="relative z-10 flex-shrink-0 mt-0.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-[#0f172a] border ${config.border}`}>
                    {config.icon}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-medium text-sm truncate pr-2 ${config.color}`}>
                      {alert.title || alert.action_title || 'Alert'}
                    </h4>
                    <span className="text-[10px] text-slate-400 whitespace-nowrap pt-0.5">
                      {getRelativeTime(alert.timestamp)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-snug line-clamp-2">
                    {alert.detail || alert.description}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Bottom fade gradient for smooth scroll cutoff */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-[#0f172a] to-transparent pointer-events-none rounded-b-2xl"></div>
    </div>
  );
}
