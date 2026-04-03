import React, { useState, useEffect } from 'react';
import DeckMap from '../components/DeckMap';
import StreetExplorer from '../components/StreetExplorer';
import RoutePlanner from '../components/RoutePlanner';
import LiveAlerts from '../components/LiveAlerts';
import TimeSlider from '../components/TimeSlider';
import TripMode from '../components/TripMode';
import PredictiveInsights from '../components/PredictiveInsights';
import ShareTrip from '../components/ShareTrip';
import { fetchStreets, fetchDangerZones, fetchAlerts } from '../services/api';
import { Map, AlertTriangle, Activity, Clapperboard } from 'lucide-react';
import { motion, AnimatePresence, useSpring, useTransform } from 'framer-motion';
import AmbientBackground from '../components/AmbientBackground';
import CursorGlow from '../components/CursorGlow';
import AICompanion from '../components/AICompanion';
import SOSButton from '../components/SOSButton';
import SafetyTimer from '../components/SafetyTimer';
import GeoFence from '../components/GeoFence';
import FakeCall from '../components/FakeCall';
import CrashDetection from '../components/CrashDetection';
import IncidentTimeline from '../components/IncidentTimeline';
import RouteInsights from '../components/RouteInsights';
import AgentDashboard from '../components/AgentDashboard';

// Custom CountUp Component using Framer Motion
const CountUp = ({ value, duration = 1.5 }) => {
  const springValue = useSpring(0, { stiffness: 50, damping: 20, duration: duration * 1000 });
  const displayValue = useTransform(springValue, (val) => Math.floor(val));

  useEffect(() => {
    springValue.set(value);
  }, [value, springValue]);

  return <motion.span>{displayValue}</motion.span>;
};

export default function HomePage() {
  const [currentHour, setCurrentHour] = useState(22);
  const [routeData, setRouteData] = useState(null);
  const [selectedStreet, setSelectedStreet] = useState(null);
  
  const [isTripActive, setIsTripActive] = useState(false);
  const [tripPosition, setTripPosition] = useState(null);
  const [isCinematic, setIsCinematic] = useState(false);
  const [isSharingOpen, setIsSharingOpen] = useState(false);
  const [shareRouteData, setShareRouteData] = useState(null);
  const [sharePosition, setSharePosition] = useState(null);
  const [stats, setStats] = useState({ streets: 0, dangerZones: 0, alerts: 0 });
  const [liveAlerts, setLiveAlerts] = useState([]);
  const [sosLog, setSosLog] = useState([]);

  const handleSOSTrigger = React.useCallback((entry) => {
    setSosLog(prev => [entry, ...prev].slice(0, 10));
  }, []);

  // Derive a single 0-100 safety score from loaded stats for ambient glow
  const avgSafetyScore = stats.streets > 0
    ? Math.max(20, 100 - Math.round((stats.dangerZones / Math.max(stats.streets, 1)) * 200))
    : 65;

  useEffect(() => {
    const loadStats = async () => {
      try {
        const [sts, dz, al] = await Promise.all([
          fetchStreets(),
          fetchDangerZones(currentHour),
          fetchAlerts()
        ]);
        setStats({
          streets: Array.isArray(sts) ? sts.length : 0,
          dangerZones: Array.isArray(dz) ? dz.length : 0,
          alerts: Array.isArray(al) ? al.length : 0
        });
        if (Array.isArray(al)) setLiveAlerts(al);
      } catch (err) {
        console.error('Failed to load stats', err);
      }
    };
    loadStats();
    
    const intv = setInterval(loadStats, 30000);
    return () => clearInterval(intv);
  }, [currentHour]);

  return (
    <div className="w-full h-screen relative bg-[var(--bg-primary)] overflow-hidden font-sans">
      <div className="absolute inset-0 z-0">
        <DeckMap
          currentHour={currentHour}
          routeData={routeData}
          selectedStreet={selectedStreet}
          onStreetSelect={(s) => setSelectedStreet(s)}
          tripPosition={tripPosition}
          cinematicMode={isCinematic}
          sharePosition={sharePosition}
        />
      </div>

      {/* Ambient glow — reacts to safety level + time of day */}
      <AmbientBackground
        avgSafetyScore={avgSafetyScore}
        currentHour={currentHour}
        alertCount={stats.alerts}
      />
      <div className="map-vignette z-[2] pointer-events-none" />

      {/* Light sweep overlay — only in cinematic mode */}
      <AnimatePresence>
        {isCinematic && (
          <motion.div
            key="sweep"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[1] pointer-events-none overflow-hidden"
          >
            <motion.div
              className="absolute inset-y-0 w-[40%]"
              style={{
                background: 'linear-gradient(90deg, transparent 0%, rgba(0,245,212,0.04) 50%, transparent 100%)',
              }}
              animate={{ x: ['-40%', '160%'] }}
              transition={{ repeat: Infinity, duration: 9, ease: 'linear' }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic mode active badge */}
      <AnimatePresence>
        {isCinematic && (
          <motion.div
            key="cinebadge"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
          >
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0d1b2a]/90 backdrop-blur-xl border border-[var(--accent-teal)]/40 shadow-lg">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-teal)] animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--accent-teal)]">Cinematic Mode</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cinematic toggle button */}
      <motion.button
        onClick={() => setIsCinematic(v => !v)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.97 }}
        className={`absolute top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-xl border text-xs font-bold uppercase tracking-widest transition-all duration-300 shadow-lg pointer-events-auto ${
          isCinematic
            ? 'bg-[var(--accent-teal)]/15 border-[var(--accent-teal)]/60 text-[var(--accent-teal)] shadow-[0_0_20px_rgba(0,245,212,0.25)]'
            : 'bg-[#0d1b2a]/80 border-white/10 text-slate-400 hover:text-white hover:border-white/25'
        }`}
      >
        <Clapperboard size={14} className={isCinematic ? 'animate-pulse' : ''} />
        {isCinematic ? 'Exit Cinematic' : 'Cinematic Mode'}
      </motion.button>

      <StreetExplorer
        currentHour={currentHour}
        onStreetSelect={(s) => setSelectedStreet(s)}
      />

      {/* ── Right Panel Column — Predictive + Route Insights ── */}
      <div className="absolute top-4 right-4 w-[272px] z-40 flex flex-col gap-3 pointer-events-none">
        <PredictiveInsights
          selectedStreet={selectedStreet}
          selectedRoute={routeData}
          currentHour={currentHour}
        />
        <AnimatePresence>
          {routeData && (
            <RouteInsights
              selectedRoute={routeData}
              currentHour={currentHour}
            />
          )}
        </AnimatePresence>
      </div>
      
      <RoutePlanner 
        currentHour={currentHour}
        onRouteSelect={(r) => { setRouteData(r); setIsTripActive(false); setTripPosition(null); }}
        onStartTrip={(r) => { 
          if(r) setRouteData(r); 
          setIsTripActive(true); 
          setSelectedStreet(null); 
        }}
        onShareTrip={(r) => {
          if (r) setShareRouteData(r);
          setIsSharingOpen(true);
        }}
      />

      {isTripActive && routeData && (
        <TripMode 
          routeData={routeData} 
          onEndTrip={() => {
            setIsTripActive(false);
            setTripPosition(null);
          }}
          onPositionUpdate={(pos) => setTripPosition(pos)}
        />
      )}

      {isSharingOpen && (
        <ShareTrip
          routeData={shareRouteData}
          onClose={() => { setIsSharingOpen(false); setSharePosition(null); }}
          onSharePositionUpdate={(pos) => setSharePosition(pos)}
        />
      )}

      {/* ── Bottom Center — Temporal Engine ── */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto w-[480px] max-w-[calc(100vw-2rem)]">
        <TimeSlider 
          currentHour={currentHour}
          onChange={(hour) => setCurrentHour(hour)}
        />
      </div>

      {/* ── Bottom Left — Compact Stats Strip (above AI Companion button) ── */}
      <div className="absolute bottom-24 left-4 flex flex-col gap-2 z-40 pointer-events-none">
        <motion.div
          initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1, ease: 'easeOut' }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl pro-glass border border-white/8"
        >
          <Map size={12} className="text-[var(--accent-teal)] shrink-0" />
          <span className="text-[13px] font-bold text-white font-heading leading-none">
            <CountUp value={stats.streets} />
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase tracking-[0.1em]">Streets</span>
        </motion.div>
        <motion.div
          initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2, ease: 'easeOut' }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl pro-glass border border-white/8"
        >
          <AlertTriangle size={12} className="text-[var(--accent-coral)] shrink-0" />
          <span className="text-[13px] font-bold text-white font-heading leading-none">
            <CountUp value={stats.dangerZones} />
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase tracking-[0.1em]">Danger</span>
        </motion.div>
        <motion.div
          initial={{ x: -16, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.3, ease: 'easeOut' }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl pro-glass border border-white/8"
        >
          <Activity size={12} className="text-[var(--accent-amber)] shrink-0" />
          <span className="text-[13px] font-bold text-white font-heading leading-none">
            <CountUp value={stats.alerts} />
          </span>
          <span className="text-[10px] text-[var(--text-secondary)] font-semibold uppercase tracking-[0.1em]">Alerts</span>
        </motion.div>
      </div>
      <CursorGlow />

      {/* ── Safety FAB Stack — shared backdrop pill ── */}
      <div
        className="fixed z-[9995] rounded-[32px] pointer-events-none"
        style={{
          bottom: '10px',
          right: '10px',
          width: '68px',
          height: '282px',
          background: 'rgba(5,5,16,0.70)',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(24px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      />

      {/* ── Floating Safety Features ── */}
      <SOSButton selectedStreet={selectedStreet} onSOSTrigger={handleSOSTrigger} />
      <SafetyTimer onSOSTrigger={handleSOSTrigger} />
      <GeoFence />
      <FakeCall />
      <CrashDetection onSOSTrigger={handleSOSTrigger} />

      <AICompanion
        selectedStreet={selectedStreet}
        routeData={routeData}
        currentHour={currentHour}
        alerts={liveAlerts}
      />

      {/* ── Multi-Agent AI Orchestrator ── */}
      <AgentDashboard
        alerts={liveAlerts}
        routeData={routeData}
        currentHour={currentHour}
      />

      {/* ── Incident Timeline — Time Travel Feature ── */}
      <IncidentTimeline
        currentHour={currentHour}
        onHourChange={(h) => setCurrentHour(h)}
        alerts={liveAlerts}
      />
    </div>
  );
}
