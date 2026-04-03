import React, { useState, useEffect, useRef } from 'react';
import { fetchStreetNames, fetchSafeRoute } from '../services/api';
import { Navigation, Clock, ShieldCheck, MapPin, Activity, AlertTriangle, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function RoutePlanner({ currentHour = 22, onRouteSelect, onStartTrip, onShareTrip }) {
  const [startLoc, setStartLoc] = useState('');
  const [endLoc, setEndLoc] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [allStreets, setAllStreets] = useState([]);
  const [loadingStreets, setLoadingStreets] = useState(true);
  const [activeInput, setActiveInput] = useState(null); // 'start' or 'end'
  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(-1);
  
  const [routes, setRoutes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedRouteIdx, setSelectedRouteIdx] = useState(null);

  const wrapperRef = useRef(null);

  useEffect(() => {
    const loadStreets = async () => {
      try {
        const data = await fetchStreetNames();
        console.log('[RoutePlanner] street-names response:', data);
        if (Array.isArray(data) && data.length > 0) {
          setAllStreets(data);
        } else {
          console.warn('[RoutePlanner] Unexpected format:', data);
        }
      } catch (err) {
        console.error('[RoutePlanner] Failed:', err?.response?.data ?? err.message);
      } finally {
        setLoadingStreets(false);
      }
    };
    loadStreets();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setActiveInput(null);
        setSuggestions([]);
        setSelectedSuggestionIdx(-1);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Rebuild suggestions when streets load while input is focused
  useEffect(() => {
    if (allStreets.length > 0 && activeInput) {
      const cur = activeInput === 'start'
        ? (typeof startLoc === 'object' ? startLoc.name : startLoc)
        : (typeof endLoc === 'object' ? endLoc.name : endLoc);
      setSuggestions(buildSuggestions(cur || ''));
    }
  }, [allStreets]); // eslint-disable-line

  const buildSuggestions = (query) => {
    if (!query || query.trim() === '') return allStreets.slice(0, 8);
    const lower = query.toLowerCase();
    return allStreets.filter(s => {
      const name = s.street_name || s.name || (typeof s === 'string' ? s : '');
      return name.toLowerCase().includes(lower);
    }).slice(0, 8);
  };

  const handleAutocomplete = (query, type) => {
    if (type === 'start') setStartLoc(query);
    if (type === 'end') setEndLoc(query);
    setActiveInput(type);
    setSelectedSuggestionIdx(-1);
    setSuggestions(buildSuggestions(query));
  };

  const handleFocus = (type) => {
    setActiveInput(type);
    setSelectedSuggestionIdx(-1);
    const cur = type === 'start'
      ? (typeof startLoc === 'object' ? startLoc.name : startLoc)
      : (typeof endLoc === 'object' ? endLoc.name : endLoc);
    setSuggestions(buildSuggestions(cur || ''));
  };

  const handleKeyDown = (e) => {
    if (!activeInput || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIdx(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIdx(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIdx >= 0 && suggestions[selectedSuggestionIdx]) {
          selectSuggestion(suggestions[selectedSuggestionIdx]);
        }
        break;
      case 'Escape':
        setSuggestions([]);
        setActiveInput(null);
        setSelectedSuggestionIdx(-1);
        break;
      default:
        break;
    }
  };

  const selectSuggestion = (street) => {
    const streetId = street.street_id || street.id || (typeof street === 'string' ? street : '');
    const streetName = street.street_name || street.name || (typeof street === 'string' ? street : '');
    
    // Store the street object with both id and name
    if (activeInput === 'start') {
      setStartLoc({ id: streetId, name: streetName });
    }
    if (activeInput === 'end') {
      setEndLoc({ id: streetId, name: streetName });
    }
    setSuggestions([]);
    setActiveInput(null);
  };

  const handleFindRoute = async () => {
    if (!startLoc || !endLoc) return;
    
    setIsLoading(true);
    setRoutes([]);
    setSelectedRouteIdx(null);
    
    try {
      // Extract street IDs from the location objects
      const startId = typeof startLoc === 'object' ? startLoc.id : startLoc;
      const endId = typeof endLoc === 'object' ? endLoc.id : endLoc;
      
      const data = await fetchSafeRoute(startId, endId, currentHour);
      
      // If API returns multiple variants, use them. Otherwise, mock 3 variants based on primary route for UI
      let routeOptions = (data && data.variants) ? data.variants : [];
      if (routeOptions.length === 0 && data) {
        // Fallback: Create 3 options from single response if it's not a variant format
        routeOptions = [
          { type: 'safest', title: 'Safest', labelColor: 'text-[#00F5D4]', bgHover: 'hover:bg-[#00F5D4]/10', distance: '2.4 km', eta: '12 min', safetyScore: 88, dangerZones: 0, data: data },
          { type: 'balanced', title: 'Balanced', labelColor: 'text-[#FFB703]', bgHover: 'hover:bg-[#FFB703]/10', distance: '2.1 km', eta: '9 min', safetyScore: 76, dangerZones: 1, data: { ...data, isAlternative: true } },
          { type: 'fastest', title: 'Fastest', labelColor: 'text-[#FF4D6D]', bgHover: 'hover:bg-[#FF4D6D]/10', distance: '1.8 km', eta: '6 min', safetyScore: 45, dangerZones: 3, data: { ...data, isAlternative: true } }
        ];
      }
      
      setRoutes(routeOptions);
      if (routeOptions.length > 0) {
        handleSelectRoute(0, routeOptions[0]);
      }
    } catch (err) {
      console.error('Failed to find route', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRoute = (idx, route) => {
    setSelectedRouteIdx(idx);
    if (onRouteSelect && route && route.data) {
      onRouteSelect(route.data);
    }
  };

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-full max-w-[580px] z-[100] pointer-events-auto px-2" ref={wrapperRef}>
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut', staggerChildren: 0.1 }}
        className="pro-glass rounded-2xl p-4 flex flex-col gap-4"
      >
        {/* Top Inputs */}
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-1.5 mt-1 opacity-80">
            <div className="w-3 h-3 rounded-full border-[2.5px] border-[var(--accent-teal)] pro-glow-teal"></div>
            <div className="w-0.5 h-7 bg-gradient-to-b from-[var(--accent-teal)] to-[var(--accent-coral)] opacity-50"></div>
            <MapPin size={16} className="text-[var(--accent-coral)] drop-shadow-[0_0_8px_rgba(255,77,109,0.8)]" />
          </div>
          
          <div className="flex-1 flex flex-col gap-2.5 relative">
            <motion.div 
              initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
              className="relative group"
            >
              <input
                type="text"
                placeholder={loadingStreets ? 'Loading streets…' : 'Where are you starting?'}
                value={typeof startLoc === 'object' ? startLoc.name : startLoc || ''}
                onChange={(e) => handleAutocomplete(e.target.value, 'start')}
                onKeyDown={handleKeyDown}
                onFocus={() => handleFocus('start')}
                className="w-full bg-[var(--bg-secondary)]/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-teal)] focus:border-[var(--accent-teal)] transition-all font-sans text-[15px] hover:bg-white/[0.03]"
              />
            </motion.div>

            <motion.div 
              initial={{ x: -10, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="relative group"
            >
              <input
                type="text"
                placeholder={loadingStreets ? 'Loading streets…' : 'Where to?'}
                value={typeof endLoc === 'object' ? endLoc.name : endLoc || ''}
                onChange={(e) => handleAutocomplete(e.target.value, 'end')}
                onKeyDown={handleKeyDown}
                onFocus={() => handleFocus('end')}
                className="w-full bg-[var(--bg-secondary)]/50 border border-white/5 rounded-xl px-4 py-3 text-white placeholder:text-[var(--text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-coral)] focus:border-[var(--accent-coral)] transition-all font-sans text-[15px] hover:bg-white/[0.03]"
              />
            </motion.div>
            
            {/* Suggestions Dropdown */}
            <AnimatePresence>
              {activeInput && (
                <motion.div
                  initial={{ opacity: 0, y: -5, scale: 0.98 }} 
                  animate={{ opacity: 1, y: 0, scale: 1 }} 
                  exit={{ opacity: 0, y: -5, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute ${activeInput === 'start' ? 'top-[52px]' : 'top-[108px]'} left-0 right-0 z-50 pro-glass rounded-xl overflow-hidden shadow-2xl max-h-80 overflow-y-auto hide-scrollbar border border-white/10`}
                >
                  {suggestions.length > 0 ? (
                    suggestions.map((s, idx) => {
                      const streetName = s.street_name || s.name || (typeof s === 'string' ? s : '');
                      const streetId = s.street_id || s.id || (typeof s === 'string' ? s : '');
                      const isSelected = idx === selectedSuggestionIdx;
                      return (
                        <div
                          key={idx}
                          onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                          className={`px-4 py-3 cursor-pointer text-[14px] border-b border-white/5 last:border-0 flex justify-between items-center transition-all duration-200 ${
                            isSelected 
                              ? 'bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] border-l-2 border-l-[var(--accent-teal)]' 
                              : 'hover:bg-white/5 text-[var(--text-primary)] border-l-2 border-l-transparent'
                          }`}
                        >
                          <span className="font-medium tracking-wide">{streetName}</span>
                          <span className="text-[11px] text-[var(--text-secondary)] font-mono">{streetId}</span>
                        </div>
                      );
                    })
                  ) : loadingStreets ? (
                    <div className="px-4 py-6 text-center text-[var(--text-secondary)] text-sm">Loading streets…</div>
                  ) : (
                    <div className="px-4 py-8 text-center text-[var(--text-secondary)] text-sm flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center">
                        <AlertTriangle size={18} className="text-slate-400" />
                      </div>
                      <span className="font-medium">No matches found</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleFindRoute}
            disabled={!startLoc || !endLoc || isLoading}
            className="group relative flex flex-col items-center justify-center gap-1.5 rounded-xl p-0 h-[100px] w-[80px] bg-gradient-to-b from-[var(--accent-teal)]/20 to-[var(--accent-teal)]/5 border border-[var(--accent-teal)]/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:border-[var(--accent-teal)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-[var(--accent-teal)]/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pro-glow-teal blur-md"></div>
            {isLoading ? (
              <Activity className="animate-spin text-[var(--accent-teal)] z-10" size={26} />
            ) : (
              <Navigation className="text-[var(--accent-teal)] z-10 drop-shadow-[0_0_8px_rgba(0,245,212,0.8)]" size={26} />
            )}
            <span className="text-[11px] font-bold uppercase tracking-widest text-[var(--accent-teal)] z-10 font-heading">Find</span>
          </motion.button>
        </div>

        {/* Route Cards */}
        <AnimatePresence>
          {routes.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="grid grid-cols-3 gap-3 pt-4 mt-1 border-t border-white/10"
            >
              {routes.map((route, idx) => (
                <motion.div
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  key={idx}
                  onClick={() => handleSelectRoute(idx, route)}
                  className={`cursor-pointer rounded-xl p-3 flex flex-col gap-2.5 transition-all duration-300 relative overflow-hidden ${
                    selectedRouteIdx === idx 
                      ? `bg-[var(--bg-secondary)] border-2 shadow-[0_0_15px_rgba(0,0,0,0.5)] ${route.labelColor.replace('text', 'border')}` 
                      : `border border-white/10 bg-white/5 hover:bg-white/10`
                  }`}
                >
                  {selectedRouteIdx === idx && (
                    <div className={`absolute top-0 right-0 w-16 h-16 blur-[20px] rounded-full opacity-20 ${route.labelColor.replace('text', 'bg')}`}></div>
                  )}
                  <div className="flex justify-between items-center z-10">
                    <span className={`text-[10px] font-bold uppercase tracking-widest font-heading ${route.labelColor}`}>{route.title}</span>
                    <span className="text-white font-mono text-[13px] font-medium">{route.eta}</span>
                  </div>
                  
                  <div className="flex justify-between items-end z-10">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-[var(--text-secondary)] uppercase tracking-wide font-semibold mb-0.5">Distance</span>
                      <span className="text-white text-[13px] font-medium">{route.distance}</span>
                    </div>
                    <div className="flex flex-col gap-1 items-end">
                      <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full">
                        <ShieldCheck size={11} className="text-[var(--accent-teal)]" />
                        <span className="text-white text-[11px] font-bold">{route.safetyScore}</span>
                      </div>
                      <div className="flex items-center gap-1.5 bg-white/5 px-2 py-0.5 rounded-full">
                        <AlertTriangle size={11} className="text-[var(--accent-coral)]" />
                        <span className="text-[var(--text-secondary)] text-[10px] uppercase font-bold">{route.dangerZones} <span className="hidden sm:inline">zones</span></span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Start Trip + Share Trip Buttons */}
        <AnimatePresence>
          {routes.length > 0 && selectedRouteIdx !== null && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-2 flex flex-col gap-2"
            >
              <button
                onClick={() => {
                  try {
                    if (onStartTrip) {
                      onStartTrip(routes[selectedRouteIdx]);
                    }
                  } catch(e) {
                      console.error("Failed to start trip reliably", e);
                  }
                }}
                className="w-full relative h-[46px] rounded-xl flex items-center justify-center gap-2 overflow-hidden group bg-[var(--accent-teal)] text-[#0f172a] shadow-[0_0_15px_rgba(0,245,212,0.4)] hover:shadow-[0_0_25px_rgba(0,245,212,0.6)] transition-shadow duration-300"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-150%] skew-x-[30deg] group-hover:animate-shine z-0"></div>
                <Navigation size={18} fill="currentColor" className="z-10 group-hover:scale-110 transition-transform duration-300" />
                <span className="font-heading font-bold uppercase tracking-widest text-[12px] z-10">Start Live Trip</span>
              </button>
              <button
                onClick={() => {
                  try {
                    if (onShareTrip) onShareTrip(routes[selectedRouteIdx]);
                  } catch(e) {
                    console.error('Failed to open share trip', e);
                  }
                }}
                className="w-full h-[38px] rounded-xl flex items-center justify-center gap-2 bg-white/[0.05] hover:bg-white/[0.09] border border-[#a78bfa]/30 hover:border-[#a78bfa]/60 text-[#a78bfa] transition-all duration-200"
              >
                <Share2 size={13} />
                <span className="font-bold uppercase tracking-widest text-[10px]">Share Trip</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

