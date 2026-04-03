import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Share2, UserPlus, X, Check, Phone, User, Wifi } from 'lucide-react';
import LiveTrackingPanel from './LiveTrackingPanel';

const LS_KEY = 'nightsafe_contacts';

function loadContacts() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveContacts(list) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(list));
  } catch { /* localStorage unavailable */ }
}

function parseRouteCoords(routeData) {
  try {
    if (!routeData) return [];
    const data = routeData.data ?? routeData;
    let extracted = [];

    if (Array.isArray(data?.route)) {
      extracted = data.route.map(r => ({
        lat: Number(r.lat) || 0,
        lng: Number(r.lng) || 0,
        name: r.street_name || 'Segment',
        zone: r.zone || 'SAFE',
        score: Number(r.safety_score) || 100,
      }));
    } else if (data?.waypoints && data?.segments) {
      const wpMap = new Map((data.waypoints || []).map(w => [w.street_id, w]));
      extracted = (data.segments || []).map(seg => {
        const w = wpMap.get(seg.from) || {};
        return {
          lat: Number(w.lat) || 0,
          lng: Number(w.lng) || 0,
          name: seg.from_name || 'Route Segment',
          zone: seg.zone || 'SAFE',
          score: 100,
        };
      });
    }

    extracted = extracted.filter(c => c.lat !== 0 && c.lng !== 0);

    if (extracted.length === 0) {
      // Fallback demo route through Chennai
      extracted = [
        { lat: 13.0827, lng: 80.2707, name: 'Anna Nagar', zone: 'SAFE', score: 88 },
        { lat: 13.0835, lng: 80.2719, name: 'Kilpauk Road', zone: 'CAUTION', score: 61 },
        { lat: 13.0849, lng: 80.2736, name: 'Poonamallee High Rd', zone: 'DANGER', score: 34 },
        { lat: 13.0859, lng: 80.2750, name: 'Koyambedu Junction', zone: 'SAFE', score: 82 },
        { lat: 13.0865, lng: 80.2762, name: 'Destination', zone: 'SAFE', score: 91 },
      ];
    }

    return extracted;
  } catch (err) {
    console.error('[ShareTrip] parseRouteCoords error:', err);
    return [];
  }
}

export default function ShareTrip({ routeData, onClose, onSharePositionUpdate }) {
  const [contacts, setContacts] = useState(loadContacts);
  const [selected, setSelected] = useState(new Set());
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  // Tracking simulation state
  const [coordsList, setCoordsList] = useState([]);
  const [stepIndex, setStepIndex] = useState(0);
  const [currentStreet, setCurrentStreet] = useState('');
  const [currentScore, setCurrentScore] = useState(100);
  const [trackStatus, setTrackStatus] = useState('safe');

  const intervalRef = useRef(null);

  // Parse route once
  useEffect(() => {
    setCoordsList(parseRouteCoords(routeData));
  }, [routeData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const deriveStatus = (coord) => {
    if (!coord) return 'safe';
    if (coord.score < 40 || coord.zone === 'DANGER') return 'danger';
    if (coord.score < 70 || coord.zone === 'CAUTION') return 'caution';
    return 'safe';
  };

  const addContact = () => {
    if (!addName.trim()) return;
    const newC = { id: Date.now(), name: addName.trim(), phone: addPhone.trim() };
    const updated = [...contacts, newC];
    setContacts(updated);
    saveContacts(updated);
    setAddName('');
    setAddPhone('');
    setShowAdd(false);
    setSelected(prev => new Set([...prev, newC.id]));
  };

  const toggleContact = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const startSharing = () => {
    if (coordsList.length === 0) return;

    const first = coordsList[0];
    setStepIndex(0);
    setCurrentStreet(first.name);
    setCurrentScore(first.score);
    setTrackStatus(deriveStatus(first));
    setIsSharing(true);

    if (typeof onSharePositionUpdate === 'function') {
      onSharePositionUpdate({ lat: first.lat, lng: first.lng, score: first.score });
    }

    intervalRef.current = setInterval(() => {
      setStepIndex(prev => {
        const next = prev + 1;
        if (next >= coordsList.length) {
          clearInterval(intervalRef.current);
          setTrackStatus('arrived');
          if (typeof onSharePositionUpdate === 'function') onSharePositionUpdate(null);
          return prev;
        }
        const curr = coordsList[next];
        setCurrentStreet(curr.name);
        setCurrentScore(curr.score);
        setTrackStatus(deriveStatus(curr));
        if (typeof onSharePositionUpdate === 'function') {
          onSharePositionUpdate({ lat: curr.lat, lng: curr.lng, score: curr.score });
        }
        return next;
      });
    }, 2000);
  };

  const stopSharing = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (typeof onSharePositionUpdate === 'function') onSharePositionUpdate(null);
    if (typeof onClose === 'function') onClose();
  };

  // ── Tracking mode ──────────────────────────────────────────────
  if (isSharing) {
    return (
      <LiveTrackingPanel
        contacts={contacts.filter(c => selected.has(c.id))}
        currentStreet={currentStreet}
        safetyScore={currentScore}
        stepsRemaining={Math.max(0, coordsList.length - 1 - stepIndex)}
        status={trackStatus}
        onStop={stopSharing}
        totalSteps={coordsList.length}
        currentStep={stepIndex}
      />
    );
  }

  // ── Modal mode ────────────────────────────────────────────────
  return (
    <motion.div
      key="share-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="w-[380px] max-h-[90vh] bg-[#0d1b2a]/98 backdrop-blur-xl border border-white/10 rounded-[24px] shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[var(--accent-teal)]/15 border border-[var(--accent-teal)]/30 flex items-center justify-center">
              <Share2 size={15} className="text-[var(--accent-teal)]" />
            </div>
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.15em] text-[var(--accent-teal)]">Share Trip</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Contacts see your live position</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/12 flex items-center justify-center transition-colors"
          >
            <X size={13} className="text-slate-400" />
          </button>
        </div>

        <div className="px-5 pt-4 pb-3 overflow-y-auto flex-1 space-y-4">
          {/* Contact list */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-2">Select Contacts</p>
            <div className="space-y-2">
              {contacts.length === 0 && !showAdd && (
                <p className="text-xs text-slate-500 text-center py-4">No contacts yet — add one below.</p>
              )}
              {contacts.map(c => (
                <button
                  key={c.id}
                  onClick={() => toggleContact(c.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all text-left ${
                    selected.has(c.id)
                      ? 'bg-[var(--accent-teal)]/10 border-[var(--accent-teal)]/40'
                      : 'bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.06]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
                    selected.has(c.id) ? 'bg-[var(--accent-teal)] text-[#0d1b2a]' : 'bg-white/10 text-slate-300'
                  }`}>
                    {selected.has(c.id) ? <Check size={13} /> : c.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-white truncate">{c.name}</p>
                    {c.phone && <p className="text-[10px] text-slate-400 mt-0.5">{c.phone}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Add contact inline */}
          <AnimatePresence mode="wait">
            {showAdd ? (
              <motion.div
                key="add-form"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="space-y-2 p-3.5 bg-white/[0.03] rounded-xl border border-white/8">
                  <div className="flex items-center gap-2">
                    <User size={12} className="text-slate-400 shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      placeholder="Contact name *"
                      value={addName}
                      onChange={e => setAddName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addContact()}
                      className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500 outline-none"
                    />
                  </div>
                  <div className="h-px bg-white/5" />
                  <div className="flex items-center gap-2">
                    <Phone size={12} className="text-slate-400 shrink-0" />
                    <input
                      type="text"
                      placeholder="Phone (optional)"
                      value={addPhone}
                      onChange={e => setAddPhone(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addContact()}
                      className="flex-1 bg-transparent text-white text-sm placeholder:text-slate-500 outline-none"
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setShowAdd(false)}
                      className="flex-1 py-1.5 rounded-lg bg-white/5 text-slate-400 text-xs font-semibold hover:bg-white/10 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addContact}
                      disabled={!addName.trim()}
                      className="flex-1 py-1.5 rounded-lg bg-[var(--accent-teal)] text-[#0d1b2a] text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-40"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="add-btn"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => setShowAdd(true)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/15 text-slate-400 hover:text-white hover:border-white/30 text-xs font-semibold transition-colors"
              >
                <UserPlus size={13} />
                Add Contact
              </motion.button>
            )}
          </AnimatePresence>

          <p className="text-[10px] text-slate-500 text-center leading-relaxed">
            🔒 Sharing is local only — no data leaves your device
          </p>
        </div>

        {/* Footer CTA */}
        <div className="px-5 py-4 border-t border-white/8">
          <button
            onClick={startSharing}
            disabled={coordsList.length === 0}
            className="w-full py-3 rounded-xl bg-[var(--accent-teal)] text-[#0d1b2a] text-[12px] font-bold uppercase tracking-widest flex items-center justify-center gap-2.5 hover:opacity-90 transition-opacity disabled:opacity-40 shadow-[0_0_20px_rgba(0,245,212,0.25)]"
          >
            <Wifi size={14} />
            {selected.size > 0
              ? `Start Sharing with ${selected.size} contact${selected.size > 1 ? 's' : ''}`
              : 'Start Sharing'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
