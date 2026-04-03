import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Timer, MapPin, User, Share2, Bell, Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { subscribeToNetworkState, isOnline, getOfflineAlerts, storeOfflineAlert } from '../utils/offlineMode';
import { fetchAlerts } from '../services/api';

// Lazily import sub-features (full components) rather than duplicating logic
import SOSButton from '../components/SOSButton';
import SafetyTimer from '../components/SafetyTimer';
import GeoFence from '../components/GeoFence';
import FakeCall from '../components/FakeCall';
import CrashDetection from '../components/CrashDetection';

// ─── Offline Banner ────────────────────────────────────────────────────────────
function OfflineBanner({ offline }) {
  return (
    <AnimatePresence>
      {offline && (
        <motion.div
          key="offline-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl mb-4"
          style={{
            background: 'rgba(255,183,3,0.1)',
            border: '1px solid rgba(255,183,3,0.35)',
          }}
        >
          <WifiOff size={13} color="#FFB703" />
          <span className="text-xs font-bold text-[#FFB703]">Offline mode active</span>
          <span className="text-xs text-slate-500">— Alerts stored locally, SMS queued</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── Stats Card ────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, sublabel }) {
  return (
    <div className="flex items-center gap-3 p-3.5 rounded-xl"
      style={{ background: `${color}08`, border: `1px solid ${color}22` }}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: `${color}15`, border: `1px solid ${color}35` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div className="min-w-0">
        <p className="text-lg font-black text-white leading-none" style={{ color }}>{value}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{label}</p>
        {sublabel && <p className="text-[9px] text-slate-600 mt-0.5">{sublabel}</p>}
      </div>
    </div>
  );
}

// ─── Quick Action Tile ─────────────────────────────────────────────────────────
function ActionTile({ emoji, label, sublabel, color, onClick, pulse }) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="p-4 rounded-2xl flex flex-col items-start gap-2 text-left relative overflow-hidden"
      style={{
        background: `${color}0a`,
        border: `1px solid ${color}30`,
        boxShadow: `0 0 12px ${color}10`,
      }}
    >
      {pulse && (
        <motion.span
          className="absolute top-2 right-2 w-2 h-2 rounded-full"
          style={{ background: color }}
          animate={{ opacity: [1, 0.2, 1] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="text-sm font-black text-white">{label}</p>
        <p className="text-[10px] text-slate-500 mt-0.5">{sublabel}</p>
      </div>
    </motion.button>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function SafetyHub() {
  const [offline, setOffline] = useState(!isOnline());
  const [alerts, setAlerts] = useState([]);
  const [sosLog, setSosLog] = useState([]);
  const [offlineAlerts, setOfflineAlerts] = useState(getOfflineAlerts);
  const [activeFeature, setActiveFeature] = useState(null); // 'timer' | 'geofence' | null

  // Network state
  useEffect(() => {
    return subscribeToNetworkState(
      () => setOffline(false),
      () => setOffline(true)
    );
  }, []);

  // Load alerts
  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchAlerts();
        if (Array.isArray(data)) setAlerts(data);
      } catch (_) {
        setAlerts([]);
      }
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const handleSOSTrigger = useCallback((entry) => {
    setSosLog(prev => [entry, ...prev].slice(0, 10));
    if (offline) {
      storeOfflineAlert({ ...entry, event: 'sos' });
      setOfflineAlerts(getOfflineAlerts());
    }
  }, [offline]);

  const criticalAlerts = alerts.filter(a => ['critical', 'high'].includes((a.severity || '').toLowerCase()));

  return (
    <div className="h-full overflow-y-auto hide-scrollbar">
      {/* Floating feature components — always mounted so they work globally */}
      <SOSButton onSOSTrigger={handleSOSTrigger} />
      <SafetyTimer onSOSTrigger={handleSOSTrigger} />
      <GeoFence />
      <FakeCall />
      <CrashDetection onSOSTrigger={handleSOSTrigger} />

      <div className="max-w-2xl mx-auto px-6 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(255,77,109,0.15)', border: '1px solid rgba(255,77,109,0.4)' }}>
            <Shield size={18} color="#FF4D6D" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Safety Hub</h1>
            <p className="text-xs text-slate-500">Your personal safety command centre</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold"
            style={{
              background: offline ? 'rgba(255,183,3,0.1)' : 'rgba(0,245,212,0.1)',
              border: `1px solid ${offline ? 'rgba(255,183,3,0.35)' : 'rgba(0,245,212,0.3)'}`,
              color: offline ? '#FFB703' : '#00F5D4',
            }}>
            {offline ? <WifiOff size={10} /> : <Wifi size={10} />}
            {offline ? 'Offline' : 'Live'}
          </div>
        </div>

        <OfflineBanner offline={offline} />

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard icon={<Bell size={16} />} label="Active Alerts" value={alerts.length} color="#FFB703"
            sublabel={`${criticalAlerts.length} critical`} />
          <StatCard icon={<AlertTriangle size={16} />} label="SOS Sent" value={sosLog.length} color="#FF4D6D"
            sublabel="this session" />
          <StatCard icon={<Shield size={16} />} label="Offline Queue" value={offlineAlerts.length} color="#00F5D4"
            sublabel="stored locally" />
        </div>

        {/* Quick action grid */}
        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <ActionTile emoji="🚨" label="Emergency SOS"
            sublabel="Tap the SOS button (bottom-right) or press S×3"
            color="#FF4D6D" pulse={sosLog.length > 0} />
          <ActionTile emoji="⏱️" label="Safety Timer"
            sublabel="Auto-SOS if you don't check in on time"
            color="#00F5D4"
            onClick={() => setActiveFeature(activeFeature === 'timer' ? null : 'timer')} />
          <ActionTile emoji="📍" label="Safe Zones"
            sublabel="Mark home, college, work with geofence alerts"
            color="#7B61FF"
            onClick={() => setActiveFeature(activeFeature === 'geofence' ? null : 'geofence')} />
          <ActionTile emoji="📞" label="Fake Call"
            sublabel="Trigger a fake incoming call to escape a situation"
            color="#7B61FF" />
          <ActionTile emoji="💥" label="Crash Detection"
            sublabel="Simulated sudden impact → auto SOS if no response"
            color="#FFB703" />
          <ActionTile emoji="👤" label="My Profile"
            sublabel="Emergency contacts, blood group, medical notes"
            color="#00F5D4"
            onClick={() => window.location.href = '/profile'} />
        </div>

        {/* How to use */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(5,5,16,0.8)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="px-4 py-3 flex items-center gap-2"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,245,212,0.04)' }}>
            <span className="text-xs font-bold text-white uppercase tracking-wider">🛡️ Safety Controls</span>
          </div>
          <div className="p-4 grid gap-2">
            {[
              { icon: '🔴', title: 'SOS Button', desc: 'Floating red button · bottom-right of map. Tap = alert popup. Hold 2s = silent SOS. Press S×3 = keyboard trigger.' },
              { icon: '⏱️', title: 'Safety Timer', desc: 'Clock icon · Set arrival time. If you don\'t press "I\'m Safe", SOS sends automatically.' },
              { icon: '📍', title: 'Geofence', desc: 'Pin icon · Add safe zones. Get notified when entering or leaving.' },
              { icon: '📞', title: 'Fake Call', desc: 'Phone icon · Choose caller. Call rings in 3–5 seconds. Use to leave unsafe situations.' },
              { icon: '💥', title: 'Crash Detection', desc: 'Triangle icon · Simulates impact. 10s countdown — if no response, SOS is auto-sent.' },
            ].map(item => (
              <div key={item.title} className="flex gap-3 items-start">
                <span className="text-base mt-0.5 flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-xs font-bold text-white">{item.title}</p>
                  <p className="text-[10px] text-slate-500 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent SOS log */}
        {sosLog.length > 0 && (
          <div className="mt-4 rounded-2xl overflow-hidden"
            style={{ background: 'rgba(5,5,16,0.8)', border: '1px solid rgba(255,77,109,0.15)' }}>
            <div className="px-4 py-3 flex items-center gap-2"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(255,77,109,0.05)' }}>
              <span className="text-xs font-bold text-[#FF4D6D] uppercase tracking-wider">🚨 SOS Log (this session)</span>
            </div>
            <div className="p-3 flex flex-col gap-2 max-h-[200px] overflow-y-auto hide-scrollbar">
              {sosLog.map(entry => (
                <div key={entry.id} className="flex items-start gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(255,77,109,0.06)', border: '1px solid rgba(255,77,109,0.15)' }}>
                  <span className="text-base flex-shrink-0">🚨</span>
                  <div>
                    <p className="text-xs font-bold text-white capitalize">{entry.type?.replace(/_/g, ' ') || 'Manual SOS'}</p>
                    <p className="text-[9px] text-slate-500 font-mono">{entry.street || 'Unknown location'} · {new Date(entry.timestamp).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
