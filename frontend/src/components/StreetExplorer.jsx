import React, { useState, useEffect, useRef } from 'react';
import { fetchStreetNames, fetchSafetyScore } from '../services/api';
import { Search, MapPin, ShieldAlert, ArrowUpRight, ArrowDownRight, Activity, Clock, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StreetExplorer({ currentHour = 22, onStreetSelect }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allStreets, setAllStreets] = useState([]);
  const [selectedStreet, setSelectedStreet] = useState(null);
  const [safetyDetails, setSafetyDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [displayList, setDisplayList] = useState([]);
  
  const wrapperRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem('nightsafe_recent_searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored).slice(0, 5));
      } catch (e) {
        setRecentSearches([]);
      }
    }
  }, []);

  useEffect(() => {
    const loadStreets = async () => {
      try {
        const data = await fetchStreetNames();
        if (Array.isArray(data)) {
          setAllStreets(data);
        }
      } catch (err) {
        console.error('Failed to load street names:', err);
      }
    };
    loadStreets();
  }, []);

  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      setDisplayList(allStreets.slice(0, 50));
      return;
    }
    const lowerQuery = query.toLowerCase();
    const filtered = allStreets.filter(s => {
      const streetName = s.street_name || s.name || (typeof s === 'string' ? s : '');
      return streetName.toLowerCase().includes(lowerQuery);
    }).slice(0, 8);
    setSuggestions(filtered);
    setDisplayList(filtered);
  }, [query, allStreets]);

  useEffect(() => {
    if (allStreets.length > 0 && displayList.length === 0) {
      setDisplayList(allStreets.slice(0, 50));
    }
  }, [allStreets]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = async (street) => {
    const streetName = street.street_name || street.name || (typeof street === 'string' ? street : '');
    const streetId = street.street_id || street.id || (typeof street === 'string' ? street : '');
    
    const newRecent = [
      { street_id: streetId, street_name: streetName },
      ...recentSearches.filter(r => r.street_id !== streetId)
    ].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem('nightsafe_recent_searches', JSON.stringify(newRecent));
    
    setQuery(streetName);
    setSelectedStreet(street);
    setShowDropdown(false);
    setIsLoading(true);

    try {
      const details = await fetchSafetyScore(streetId, currentHour);
      setSafetyDetails(details);
      if (onStreetSelect) {
        onStreetSelect({ ...street, safetyDetails: details });
      }
    } catch (err) {
      console.error('Failed to fetch safety details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const getRiskBadge = (score) => {
    if (score >= 70) return { label: 'SAFE', color: 'bg-[var(--accent-teal)]/20 text-[var(--accent-teal)] border-[var(--accent-teal)]/40 hover:bg-[var(--accent-teal)]/30' };
    if (score >= 40) return { label: 'MODERATE', color: 'bg-[var(--accent-amber)]/20 text-[var(--accent-amber)] border-[var(--accent-amber)]/40 hover:bg-[var(--accent-amber)]/30' };
    return { label: 'DANGER', color: 'bg-[var(--accent-coral)]/20 text-[var(--accent-coral)] border-[var(--accent-coral)]/40 hover:bg-[var(--accent-coral)]/30' };
  };

  const getColorClass = (score) => {
    if (score >= 70) return 'text-[var(--accent-teal)]';
    if (score >= 40) return 'text-[var(--accent-amber)]';
    return 'text-[var(--accent-coral)]';
  };

  return (
    <div className="absolute top-4 left-4 w-[290px] max-h-[calc(100vh-96px)] z-[90] pointer-events-auto flex flex-col gap-3" ref={wrapperRef}>
      <motion.div 
        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
        className="pro-glass rounded-2xl p-5 flex flex-col gap-4 relative overflow-hidden"
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[var(--accent-teal)] via-[var(--accent-indigo)] to-[var(--accent-teal)] opacity-50"></div>
        <div className="flex items-center gap-3 z-10">
          <div className="w-8 h-8 rounded-full bg-[var(--accent-teal)]/10 flex items-center justify-center border border-[var(--accent-teal)]/30 pro-glow-teal">
            <MapPin className="text-[var(--accent-teal)]" size={16} />
          </div>
          <h2 className="text-white font-heading font-semibold text-[18px] tracking-wide">City Explorer</h2>
        </div>

        <div className="relative group z-10">
          <div className="flex items-center bg-[var(--bg-secondary)]/50 border border-white/10 rounded-xl px-3 py-3 focus-within:border-[var(--accent-teal)] focus-within:shadow-[0_0_15px_rgba(0,245,212,0.15)] transition-all duration-300">
            <Search className="text-[var(--text-secondary)] group-focus-within:text-[var(--accent-teal)] transition-colors mr-2.5" size={18} />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search a street code..."
              className="bg-transparent border-none outline-none text-white w-full placeholder:text-[var(--text-secondary)] text-[14px] font-sans"
            />
          </div>

          <AnimatePresence>
            {showDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="absolute top-[calc(100%+8px)] left-0 right-0 pro-glass rounded-xl overflow-hidden shadow-2xl max-h-64 overflow-y-auto hide-scrollbar z-50 border-white/10"
              >
                {suggestions.length > 0 ? (
                  suggestions.map((s, idx) => {
                    const streetName = s.street_name || s.name || (typeof s === 'string' ? s : '');
                    const streetId = s.street_id || s.id || '';
                    return (
                      <motion.div
                        whileHover={{ x: 4, backgroundColor: 'rgba(0,245,212,0.05)' }}
                        whileTap={{ scale: 0.98 }}
                        key={idx}
                        onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                        className="px-4 py-3 cursor-pointer text-slate-300 text-[13px] border-b border-white/5 last:border-0 transition-all flex items-center justify-between border-l-2 border-l-transparent hover:border-l-[var(--accent-teal)]"
                      >
                        <span className="font-medium text-white">{streetName}</span>
                        {streetId && <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-[var(--accent-teal)] font-mono">{streetId}</span>}
                      </motion.div>
                    )
                  })
                ) : query ? (
                  <div className="px-4 py-8 text-center flex flex-col items-center gap-3">
                    <Activity className="text-[var(--accent-teal)] animate-pulse" size={24} />
                    <span className="text-[13px] font-medium text-[var(--text-secondary)] font-sans">📡 Scanning city signals...</span>
                  </div>
                ) : allStreets.length > 0 ? (
                  allStreets.slice(0, 8).map((s, idx) => {
                    const streetName = s.street_name || s.name || (typeof s === 'string' ? s : '');
                    const streetId = s.street_id || s.id || '';
                    return (
                      <motion.div
                        whileHover={{ x: 4, backgroundColor: 'rgba(0,245,212,0.05)' }}
                        whileTap={{ scale: 0.98 }}
                        key={idx}
                        onMouseDown={(e) => { e.preventDefault(); handleSelect(s); }}
                        className="px-4 py-3 cursor-pointer text-slate-300 text-[13px] border-b border-white/5 last:border-0 transition-all flex items-center justify-between border-l-2 border-l-transparent hover:border-l-[var(--accent-teal)]"
                      >
                        <span className="font-medium text-white">{streetName}</span>
                        {streetId && <span className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded text-[var(--accent-teal)] font-mono">{streetId}</span>}
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="px-4 py-6 text-center text-[var(--text-secondary)] text-sm">Loading streets…</div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {!query && recentSearches.length > 0 && (
          <div className="pt-3 border-t border-white/10 z-10 w-full">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={12} className="text-[var(--accent-amber)]" />
              <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-bold">Recent Signals</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {recentSearches.map((recent, idx) => (
                <motion.button
                  whileHover={{ scale: 1.05, borderColor: 'var(--accent-teal)', color: 'var(--accent-teal)' }}
                  whileTap={{ scale: 0.95 }}
                  key={idx}
                  onClick={() => handleSelect(recent)}
                  className="bg-[var(--bg-secondary)]/50 border border-white/10 text-[var(--text-secondary)] px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors"
                >
                  {recent.street_name || recent.street_id}
                </motion.button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Safety Details Panel */}
      <AnimatePresence>
        {selectedStreet && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -20 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -20 }}
            className="pro-glass rounded-2xl flex flex-col overflow-hidden relative"
          >
            {isLoading ? (
              <div className="p-8 flex flex-col items-center justify-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 border-[3px] border-t-[var(--accent-teal)] border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin w-12 h-12"></div>
                  <div className="border-[3px] border-white/10 rounded-full w-12 h-12"></div>
                </div>
                <span className="text-[13px] font-medium text-[var(--text-secondary)] animate-pulse">Awaiting real-time inputs...</span>
              </div>
            ) : (safetyDetails && selectedStreet) ? (
              <div className="p-5 flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-[var(--accent-teal)] blur-[60px] opacity-20 rounded-full"></div>
                <div className="flex justify-between items-start z-10">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-[0.2em] font-bold mb-1 font-heading">Active Zone</span>
                    <h3 className="text-white font-heading font-semibold text-lg max-w-[200px] leading-tight">{selectedStreet.street_name || selectedStreet.street_id}</h3>
                  </div>
                  <motion.div 
                    whileHover={{ scale: 1.05 }} 
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1.5 transition-colors cursor-default ${getRiskBadge(safetyDetails.safety_score).color}`}
                  >
                    <ShieldAlert size={12} />
                    {getRiskBadge(safetyDetails?.safety_score ?? 100).label}
                  </motion.div>
                </div>

                <div className="flex items-end gap-3 mt-2 z-10">
                  <div className={`text-6xl font-black font-heading tracking-tighter ${getColorClass(safetyDetails?.safety_score ?? 100)} drop-shadow-md`}>
                    {Math.round(safetyDetails?.safety_score ?? 100)}
                  </div>
                  <div className="flex flex-col pb-2">
                    <span className="text-white font-bold text-base">/ 100</span>
                    <span className="text-[10px] text-[var(--text-secondary)] uppercase tracking-[0.1em] font-medium">Safety Index</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 z-10 mt-2">
                  <motion.div whileHover={{ y: -2 }} className="bg-[var(--bg-secondary)]/60 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-colors">
                    <span className="text-[9px] text-[var(--text-secondary)] uppercase font-bold tracking-[0.15em] block mb-1.5">Hour</span>
                    <div className="flex items-center gap-1.5">
                      <Clock size={14} className="text-[var(--accent-indigo)]" />
                      <span className="text-white font-semibold text-sm">{currentHour}:00</span>
                    </div>
                  </motion.div>
                  <motion.div whileHover={{ y: -2 }} className="bg-[var(--bg-secondary)]/60 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-colors">
                    <span className="text-[9px] text-[var(--text-secondary)] uppercase font-bold tracking-[0.15em] block mb-1.5">Trend</span>
                    <div className="flex items-center gap-1.5">
                      {safetyDetails.safety_score > 60 ? (
                        <ArrowUpRight size={14} className="text-[var(--accent-teal)]" />
                      ) : (
                        <ArrowDownRight size={14} className="text-[var(--accent-coral)]" />
                      )}
                      <span className="text-white font-semibold text-sm">
                        {safetyDetails.safety_score > 60 ? 'Improving' : 'Declining'}
                      </span>
                    </div>
                  </motion.div>
                </div>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      {/* All Streets List */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}
        className="pro-glass rounded-2xl flex flex-col flex-1 overflow-hidden"
      >
        <div className="p-3.5 border-b border-white/10 flex items-center justify-between bg-[var(--bg-secondary)]/40">
          <div className="flex items-center gap-2">
            <Shield className="text-[var(--accent-indigo)]" size={14} />
            <h3 className="text-white font-heading font-semibold text-[13px]">Popular Streets</h3>
          </div>
          <span className="bg-white/5 border border-white/10 text-[var(--text-secondary)] text-[10px] font-bold px-2.5 py-0.5 rounded-full">
            {displayList.length}
          </span>
        </div>
        
        <div className="flex-1 overflow-y-auto hide-scrollbar p-2 relative">
          <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-[var(--glass-bg)] to-transparent z-10 pointer-events-none"></div>
          {displayList.map((street, idx) => (
            <motion.div
              whileHover={{ x: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' }}
              whileTap={{ scale: 0.98 }}
              key={idx}
              onClick={() => handleSelect(street)}
              className="group px-3 py-2 m-0.5 rounded-xl cursor-pointer transition-all border border-transparent flex items-center justify-between"
            >
              <div className="flex flex-col">
                <span className="text-white font-medium text-[13px]">{street.street_name || street.name}</span>
                <span className="text-[9px] text-[var(--text-secondary)] font-mono mt-0.5 opacity-60 uppercase">{street.street_id || street.id}</span>
              </div>
              <div className="w-6 h-6 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center border border-white/5 opacity-0 group-hover:opacity-100 transition-opacity">
                <ArrowUpRight size={12} className="text-[var(--accent-teal)]" />
              </div>
            </motion.div>
          ))}
          <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-[var(--glass-bg)] to-transparent z-10 pointer-events-none"></div>
        </div>
      </motion.div>
    </div>
  );
}
