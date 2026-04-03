import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Plus, Trash2, X, ShieldCheck } from 'lucide-react';

const GEO_KEY = 'nightsafe_geofences';

const ZONE_PRESETS = [
  { label: '🏠 Home', color: '#00F5D4', lat: 13.0827, lng: 80.2707 },
  { label: '🎓 College', color: '#7B61FF', lat: 13.0350, lng: 80.2335 },
  { label: '🏢 Work', color: '#FFB703', lat: 13.0674, lng: 80.2376 },
];

function loadZones() {
  try {
    const data = localStorage.getItem(GEO_KEY);
    if (data) return JSON.parse(data);
  } catch (_) {}
  return [];
}

function saveZones(zones) {
  try {
    localStorage.setItem(GEO_KEY, JSON.stringify(zones));
  } catch (_) {}
}

const RADIUS_LABELS = { 100: '100m', 200: '200m', 300: '300m', 500: '500m' };

export default function GeoFence({ onZonesChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [zones, setZones] = useState(loadZones);
  const [newLabel, setNewLabel] = useState('');
  const [newRadius, setNewRadius] = useState(200);
  const [notification, setNotification] = useState(null);
  const simulateTimer = useRef(null);

  // Notify parent of zones
  useEffect(() => {
    if (typeof onZonesChange === 'function') onZonesChange(zones);
  }, [zones, onZonesChange]);

  const addZone = useCallback((preset = null) => {
    const label = preset ? preset.label : (newLabel.trim() || 'Custom Zone');
    const zone = {
      id: `zone_${Date.now()}`,
      label,
      lat: preset ? preset.lat : 13.0827 + (Math.random() - 0.5) * 0.02,
      lng: preset ? preset.lng : 80.2707 + (Math.random() - 0.5) * 0.02,
      radius: newRadius,
      color: preset ? preset.color : '#00F5D4',
      active: true,
    };
    setZones(prev => {
      const updated = [...prev, zone];
      saveZones(updated);
      return updated;
    });
    setNewLabel('');
  }, [newLabel, newRadius]);

  const removeZone = useCallback((id) => {
    setZones(prev => {
      const updated = prev.filter(z => z.id !== id);
      saveZones(updated);
      return updated;
    });
  }, []);

  const toggleZone = useCallback((id) => {
    setZones(prev => {
      const updated = prev.map(z => z.id === id ? { ...z, active: !z.active } : z);
      saveZones(updated);
      return updated;
    });
  }, []);

  // Simulate zone entry/exit notifications (demo)
  const simulateEvent = useCallback(() => {
    if (zones.length === 0) return;
    const zone = zones[Math.floor(Math.random() * zones.length)];
    if (!zone.active) return;
    const type = Math.random() > 0.5 ? 'entered' : 'exited';
    setNotification({ zone, type, id: Date.now() });
    setTimeout(() => setNotification(null), 4000);
  }, [zones]);

  useEffect(() => {
    if (zones.length === 0) return;
    simulateTimer.current = setInterval(simulateEvent, 30000);
    return () => clearInterval(simulateTimer.current);
  }, [zones, simulateEvent]);

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.93 }}
        onClick={() => setIsOpen(v => !v)}
        className="fixed bottom-[184px] right-[22px] z-[9997] w-11 h-11 rounded-full flex items-center justify-center"
        style={{
          background: 'rgba(0,245,212,0.1)',
          border: '1.5px solid rgba(0,245,212,0.35)',
          boxShadow: `0 0 18px rgba(0,245,212,0.25)`,
          backdropFilter: 'blur(12px)',
        }}
        aria-label="Geofence Zones"
        title="Safe Zone Manager"
      >
        <MapPin size={16} style={{ color: '#00F5D4' }} />
        {zones.filter(z => z.active).length > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center"
            style={{ background: '#00F5D4', color: '#050510' }}>
            {zones.filter(z => z.active).length}
          </span>
        )}
      </motion.button>

      {/* Zone notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 30 }}
            className="fixed top-20 right-6 z-[10000] flex items-center gap-3 px-4 py-3 rounded-xl"
            style={{
              background: notification.type === 'entered' ? 'rgba(0,245,212,0.12)' : 'rgba(255,183,3,0.12)',
              border: `1px solid ${notification.type === 'entered' ? 'rgba(0,245,212,0.4)' : 'rgba(255,183,3,0.4)'}`,
              backdropFilter: 'blur(16px)',
              boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
            }}
          >
            <ShieldCheck size={16} color={notification.type === 'entered' ? '#00F5D4' : '#FFB703'} />
            <div>
              <p className="text-white text-xs font-bold">
                {notification.type === 'entered' ? '✅ Entered' : '⚠️ Exited'} {notification.zone.label}
              </p>
              <p className="text-slate-400 text-[10px]">{new Date().toLocaleTimeString()}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="geofence-panel"
            initial={{ opacity: 0, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed bottom-16 right-[76px] z-[9997] w-[280px] max-h-[420px] flex flex-col rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(5,5,16,0.95)',
              border: '1px solid rgba(0,245,212,0.2)',
              boxShadow: '0 0 40px rgba(0,245,212,0.1), 0 16px 40px rgba(0,0,0,0.5)',
              backdropFilter: 'blur(20px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'rgba(0,245,212,0.06)' }}>
              <div className="flex items-center gap-2">
                <MapPin size={13} color="#00F5D4" />
                <span className="text-xs font-bold text-white tracking-wider uppercase">Safe Zones</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={14} />
              </button>
            </div>

            {/* Preset quick-adds */}
            <div className="px-3 pt-3 shrink-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Quick Add</p>
              <div className="flex gap-2 flex-wrap">
                {ZONE_PRESETS.map(p => (
                  <button
                    key={p.label}
                    onClick={() => addZone(p)}
                    className="text-[10px] px-2.5 py-1.5 rounded-full font-bold transition-all"
                    style={{
                      background: `${p.color}15`,
                      border: `1px solid ${p.color}40`,
                      color: p.color,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = `${p.color}25`; }}
                    onMouseLeave={e => { e.currentTarget.style.background = `${p.color}15`; }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom zone input */}
            <div className="px-3 pt-3 shrink-0">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-2">Custom Zone</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addZone()}
                  placeholder="Zone name..."
                  maxLength={30}
                  className="flex-1 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <button onClick={() => addZone()}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: 'rgba(0,245,212,0.2)', border: '1px solid rgba(0,245,212,0.4)' }}>
                  <Plus size={13} color="#00F5D4" />
                </button>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="range" min={100} max={500} step={100} value={newRadius}
                  onChange={e => setNewRadius(Number(e.target.value))}
                  className="flex-1 accent-[#00F5D4]" />
                <span className="text-[10px] text-slate-400 w-12 text-right font-mono">
                  {RADIUS_LABELS[newRadius] || `${newRadius}m`}
                </span>
              </div>
            </div>

            {/* Zones list */}
            <div className="flex-1 overflow-y-auto px-3 py-3 hide-scrollbar space-y-2">
              {zones.length === 0 && (
                <p className="text-[11px] text-slate-500 text-center py-4">No zones yet. Add your home, college, or work above.</p>
              )}
              {zones.map(zone => (
                <motion.div
                  key={zone.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
                  style={{
                    background: zone.active ? `${zone.color}08` : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${zone.active ? zone.color + '30' : 'rgba(255,255,255,0.07)'}`,
                  }}
                >
                  <button onClick={() => toggleZone(zone.id)}
                    className="w-4 h-4 rounded-full flex-shrink-0 border-2 transition-all"
                    style={{
                      background: zone.active ? zone.color : 'transparent',
                      borderColor: zone.color,
                    }}
                    title={zone.active ? 'Disable zone' : 'Enable zone'}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${zone.active ? 'text-white' : 'text-slate-500'}`}>
                      {zone.label}
                    </p>
                    <p className="text-[9px] text-slate-600 font-mono">
                      {zone.lat.toFixed(4)}, {zone.lng.toFixed(4)} · {zone.radius}m
                    </p>
                  </div>
                  <button onClick={() => removeZone(zone.id)}
                    className="text-slate-600 hover:text-red-400 transition-colors p-1">
                    <Trash2 size={11} />
                  </button>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
