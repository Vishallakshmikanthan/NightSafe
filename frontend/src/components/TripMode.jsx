import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Navigation2, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function TripMode({ routeData, onEndTrip, onPositionUpdate }) {
  const [isActive, setIsActive] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [currentScore, setCurrentScore] = useState(100);
  const [coordsList, setCoordsList] = useState([]);
  const [statusName, setStatusName] = useState('');
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    try {
      if (!routeData) return;
      let extracted = [];
      const data = routeData.data || routeData;

      if (data && Array.isArray(data.route)) {
        extracted = data.route.map(r => ({
          lat: Number(r.lat) || 0,
          lng: Number(r.lng) || 0,
          name: r.street_name || 'Segment',
          zone: r.zone || 'SAFE',
          score: Number(r.safety_score) || 100
        }));
      } else if (data && data.waypoints && data.segments) {
        const wpMap = new Map(data.waypoints.map(w => [w.street_id, w]));
        extracted = data.segments.map(seg => {
          const w = wpMap.get(seg.from) || {};
          return {
            lat: Number(w.lat) || 0,
            lng: Number(w.lng) || 0,
            name: seg.from_name || 'Connecting Route',
            zone: seg.zone || 'SAFE',
            score: 100
          };
        });
      }

      extracted = extracted.filter(c => c.lat !== 0 && c.lng !== 0);

      if (extracted.length === 0) {
        extracted = [
          { lat: 13.0827, lng: 80.2707, name: 'Safe Ave', zone: 'SAFE', score: 90 },
          { lat: 13.0830, lng: 80.2715, name: 'Caution Blvd', zone: 'CAUTION', score: 65 },
          { lat: 13.0845, lng: 80.2730, name: 'Danger St', zone: 'DANGER', score: 35 },
          { lat: 13.0855, lng: 80.2745, name: 'Safe Ave 2', zone: 'SAFE', score: 85 },
        ];
      }

      setCoordsList(extracted);
      setStepIndex(0);
    } catch (err) {
      console.error('Failed parsing route coords', err);
    }
  }, [routeData]);

  useEffect(() => {
    if (!isActive || coordsList.length === 0) return;

    const triggerPos = (idx) => {
      const curr = coordsList[idx];
      if (curr && typeof onPositionUpdate === 'function') {
        onPositionUpdate({ lat: curr.lat, lng: curr.lng, score: curr.score, zone: curr.zone });
      }
    };

    triggerPos(0);

    const interval = setInterval(() => {
      setStepIndex(prev => {
        if (prev >= coordsList.length - 1) {
          clearInterval(interval);
          setAlert({ type: 'success', msg: 'Destination Reached Safely!' });
          if (typeof onPositionUpdate === 'function') onPositionUpdate(null);
          return prev;
        }

        const nextIdx = prev + 1;
        const currentData = coordsList[nextIdx];

        setCurrentScore(currentData.score);
        setStatusName(currentData.name);
        triggerPos(nextIdx);

        if (currentData.score < 40 || currentData.zone === 'DANGER') {
          setAlert({ type: 'danger', msg: `Danger Zone Ahead: ${currentData.name}` });
          const ev = new CustomEvent('nightsafe-trip-alert', {
            detail: {
              id: Date.now(),
              type: 'TRIP_ALERT',
              severity: 'CRITICAL',
              message: `Live Trip: Entering High Risk Zone (${currentData.name})`,
              timestamp: new Date().toISOString()
            }
          });
          window.dispatchEvent(ev);
        } else if (currentData.score < 70 || currentData.zone === 'CAUTION') {
          setAlert({ type: 'warning', msg: 'Caution: Lower visibility/footfall.' });
        } else {
          setAlert(null);
        }

        return nextIdx;
      });
    }, 1500);

    return () => {
      clearInterval(interval);
      if (typeof onPositionUpdate === 'function') onPositionUpdate(null);
    };
  }, [isActive, coordsList, onPositionUpdate]);

  if (!routeData || coordsList.length === 0) {
    return (
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[340px] bg-[var(--bg-primary)]/90 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl z-50"
      >
        <h3 className="text-white font-bold text-center mb-2">Simulating Location...</h3>
        <div className="w-full flex items-center justify-center p-2 mb-2">
          <div className="animate-spin w-6 h-6 border-2 border-[var(--accent-teal)] border-t-transparent rounded-full" />
        </div>
        <button
          onClick={onEndTrip}
          className="w-full py-2 bg-white/10 hover:bg-white/20 transition-colors text-white rounded-xl text-sm font-bold uppercase tracking-widest"
        >
          Cancel
        </button>
      </motion.div>
    );
  }

  const progress = Math.min(100, Math.floor((stepIndex / Math.max(1, coordsList.length - 1)) * 100));

  const borderColor = currentScore >= 70
    ? 'border-[var(--accent-teal)]/40'
    : currentScore >= 40
    ? 'border-[var(--accent-amber)]/40'
    : 'border-[var(--accent-coral)]/40';

  const scoreColor = currentScore >= 70
    ? 'text-[var(--accent-teal)]'
    : currentScore >= 40
    ? 'text-[var(--accent-amber)]'
    : 'text-[var(--accent-coral)]';

  const progressBg = currentScore >= 70
    ? 'bg-[var(--accent-teal)]'
    : currentScore >= 40
    ? 'bg-[var(--accent-amber)]'
    : 'bg-[var(--accent-coral)]';

  const alertBg = alert
    ? alert.type === 'danger'
      ? 'bg-[var(--accent-coral)]/10 border border-[var(--accent-coral)]/30'
      : alert.type === 'warning'
      ? 'bg-[var(--accent-amber)]/10 border border-[var(--accent-amber)]/30'
      : 'bg-[var(--accent-teal)]/10 border border-[var(--accent-teal)]/30'
    : '';

  const alertTextColor = alert
    ? alert.type === 'danger'
      ? 'text-[var(--accent-coral)]'
      : alert.type === 'warning'
      ? 'text-[var(--accent-amber)]'
      : 'text-[var(--accent-teal)]'
    : '';

  return (
    <motion.div
      initial={{ y: 50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 50, opacity: 0, scale: 0.95 }}
      className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[380px] bg-[#0f172a]/95 backdrop-blur-xl border border-white/10 rounded-[20px] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-50 overflow-hidden"
    >
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-start gap-4">
          <div className={`relative shrink-0 flex items-center justify-center h-11 w-11 rounded-full bg-[#1e293b] border shadow-inner ${borderColor}`}>
            <Navigation2
              size={24}
              className={currentScore >= 70 ? 'text-[var(--accent-teal)]' : currentScore >= 40 ? 'text-[var(--accent-amber)]' : 'text-[var(--accent-coral)]'}
              style={{ transform: 'rotate(45deg)' }}
            />
            <span className={`absolute inset-0 rounded-full border opacity-60 animate-[ping_2s_infinite] ${borderColor}`}></span>
          </div>
          <div className="flex flex-col min-w-0 pr-2">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1">Live Navigation</p>
            <p className="font-heading font-bold text-white text-base leading-tight truncate" title={statusName || 'Route Start'}>
              {statusName || 'Moving...'}
            </p>
          </div>
        </div>
        <div className="text-right flex flex-col items-end shrink-0 pl-2">
          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-1">Safety Index</span>
          <div className={`font-mono font-black text-3xl leading-none drop-shadow-md ${scoreColor}`}>
            {currentScore}
          </div>
        </div>
      </div>

      <div className="w-full h-2 bg-[#1e293b] rounded-full overflow-hidden mb-4 relative shadow-inner">
        <motion.div
          className={`h-full ${progressBg}`}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: 'linear' }}
        />
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        {alert && (
          <motion.div
            key={alert.msg}
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: 'auto' }}
            exit={{ opacity: 0, scale: 0.95, height: 0 }}
            className={`flex items-start gap-3 p-3 rounded-xl mb-4 overflow-hidden shadow-inner ${alertBg}`}
          >
            {alert.type === 'danger'
              ? <ShieldAlert size={20} className="text-[var(--accent-coral)] animate-pulse shrink-0 mt-0.5" />
              : alert.type === 'warning'
              ? <AlertTriangle size={20} className="text-[var(--accent-amber)] shrink-0 mt-0.5" />
              : <CheckCircle2 size={20} className="text-[var(--accent-teal)] shrink-0 mt-0.5" />}
            <p className={`text-xs font-semibold leading-relaxed ${alertTextColor}`}>{alert.msg}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => {
          setIsActive(false);
          if (typeof onPositionUpdate === 'function') onPositionUpdate(null);
          if (typeof onEndTrip === 'function') onEndTrip();
        }}
        className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--bg-secondary)] hover:bg-[#2a131b] hover:text-[var(--accent-coral)] text-slate-300 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-colors border border-transparent shadow shadow-black/20"
      >
        {progress >= 100 ? 'Finish Trip' : 'End Trip Early'}
      </button>
    </motion.div>
  );
}
