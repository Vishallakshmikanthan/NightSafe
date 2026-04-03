import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Map from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import DeckGL from '@deck.gl/react';
import { FlyToInterpolator } from '@deck.gl/core';
import { ScatterplotLayer, PathLayer } from '@deck.gl/layers';
import { PathStyleExtension } from '@deck.gl/extensions';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchStreets } from '../services/api_fixed';
import StartupOverlay from './StartupOverlay';

// --- STYLES (INJECTED) ---
const INJECTED_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Inter:wght@400;500;600&display=swap');

  .font-space { font-family: 'Space Grotesk', sans-serif; }
  .font-inter { font-family: 'Inter', sans-serif; }

  .glass-card {
    background: rgba(10, 10, 30, 0.7);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 12px 60px rgba(0, 0, 0, 0.6);
  }

  .ctrl-btn {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    color: rgba(255, 255, 255, 0.7);
  }
  .ctrl-btn:hover {
    border-color: rgba(0, 245, 212, 0.4);
    background: rgba(0, 245, 212, 0.05);
    color: #fff;
    transform: translateY(-2px);
    box-shadow: 0 5px 20px rgba(0, 245, 212, 0.15);
  }

  .time-slider {
    -webkit-appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.05);
    outline: none;
    cursor: pointer;
  }
  .time-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: #00F5D4;
    box-shadow: 0 0 15px rgba(0, 245, 212, 0.6);
    border: 2px solid #fff;
    cursor: grab;
  }
`;

const MAP_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json';

// Street coordinate mapping from SafetyMap.jsx for consistency
const STREET_COORDS = {
  "CHN-001": [80.2496, 13.0604],
  "CHN-002": [80.2785, 13.0878],
  "CHN-003": [80.2849, 13.1067],
  "CHN-004": [80.2370, 13.0674],
  "CHN-005": [80.2121, 13.0500],
  "CHN-006": [80.2262, 13.0172],
  "CHN-007": [80.2912, 13.1150],
  "CHN-008": [80.2609, 13.0327],
  "CHN-009": [80.2339, 13.0438],
  "CHN-010": [80.2144, 13.1250],
  "CHN-011": [80.2656, 13.0985],
  "CHN-012": [80.2618, 13.0764],
  "CHN-013": [80.2920, 13.1097],
  "CHN-014": [80.2700, 13.0483],
  "CHN-015": [80.2760, 13.0595],
  "CHN-016": [80.2427, 13.0890],
  "CHN-017": [80.2300, 13.1044],
  "CHN-018": [80.2256, 13.1338],
  "CHN-019": [80.2938, 13.0713],
  "CHN-020": [80.2799, 13.0997],
  "CHN-021": [80.2610, 13.1072],
  "CHN-022": [80.2534, 13.1210],
  "CHN-023": [80.2690, 13.1330],
  "CHN-024": [80.2475, 13.1490],
  "CHN-025": [80.2876, 13.0637],
  "CHN-026": [80.2877, 13.0556],
  "CHN-027": [80.2370, 13.1110],
  "CHN-028": [80.2463, 13.0363],
  "CHN-029": [80.2200, 13.0106],
  "CHN-030": [80.2825, 13.1462],
  "CHN-031": [80.2636, 13.1587],
  "CHN-032": [80.2776, 13.1740],
  "CHN-033": [80.3012, 13.1289],
  "CHN-034": [80.2970, 13.1380],
  "CHN-035": [80.2927, 13.0916],
  "CHN-036": [80.2574, 13.0235],
  "CHN-037": [80.2566, 13.0008],
  "CHN-038": [80.2767, 13.0400],
  "CHN-039": [80.3016, 13.1570],
  "CHN-040": [80.2966, 13.1700],
  "CHN-041": [80.2370, 13.0826],
  "CHN-042": [80.2073, 13.0267],
  "CHN-043": [80.2210, 13.0550],
  "CHN-044": [80.2133, 13.1395],
  "CHN-045": [80.2310, 13.1520],
  "CHN-046": [80.2112, 13.0780],
  "CHN-047": [80.2380, 13.0320],
  "CHN-048": [80.2040, 13.0680],
  "CHN-049": [80.2470, 13.0160],
  "CHN-050": [80.2210, 13.1205],
  "CHN-051": [80.1920, 13.0840],  // Mogappair Main Road
  "CHN-052": [80.1450, 13.1100],  // Ambattur OT Road
  "CHN-053": [80.1100, 13.1150],  // Avadi Main Road
  "CHN-054": [80.2080, 13.1320],  // Kolathur High Road
  "CHN-055": [80.2850, 13.1180]   // Tondiarpet High Road
};

export default function NightSafeMap() {
  const [startup, setStartup] = useState(true);
  const [viewState, setViewState] = useState({
    longitude: 80.2707,
    latitude: 13.0827,
    zoom: 10,
    pitch: 0,
    bearing: 0,
    transitionDuration: 3000,
  });

  const [streets, setStreets] = useState([]);
  const [hour, setHour] = useState(20);
  const [loading, setLoading] = useState(false);
  const [is3D, setIs3D] = useState(true);
  const [autoRotate, setAutoRotate] = useState(false);
  const [selectedSector, setSelectedSector] = useState(null);
  const [hoverInfo, setHoverInfo] = useState(null);
  const [pulse, setPulse] = useState(40);

  // Load real data from backend
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const data = await fetchStreets();
        setStreets(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Failed to load streets:', err);
      } finally {
        setLoading(false);
      }
    };
    if (!startup) loadData();
  }, [startup]);

  // Animation ticks
  useEffect(() => {
    let frame;
    const animate = () => {
      setPulse(40 + 20 * Math.sin(Date.now() / 600));
      if (autoRotate) {
        setViewState(v => ({ ...v, bearing: v.bearing + 0.1, transitionDuration: 0 }));
      }
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [autoRotate]);

  // Compute points based on current hour
  const mapData = useMemo(() => {
    return streets
      .filter(s => s.hour === hour)
      .map(s => ({
        position: STREET_COORDS[s.street_id] || [80.2 + (Math.random() - 0.5) * 0.1, 13.0 + (Math.random() - 0.5) * 0.1],
        score: s.safety_score,
        name: s.street_name,
        details: s
      }));
  }, [streets, hour]);

  const stats = useMemo(() => {
    const danger = mapData.filter(d => d.score < 40).length;
    const caution = mapData.filter(d => d.score >= 40 && d.score < 70).length;
    const safe = mapData.filter(d => d.score >= 70).length;
    return { danger, caution, safe };
  }, [mapData]);

  // Initial fly-in
  const handleStartupComplete = () => {
    setStartup(false);
    setViewState(v => ({
      ...v,
      zoom: 12.5,
      pitch: 45,
      bearing: -15,
      transitionDuration: 3000,
      transitionInterpolator: new FlyToInterpolator()
    }));
  };

  const layers = [
    new ScatterplotLayer({
      id: 'safety-points',
      data: mapData,
      pickable: true,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 6,
      radiusMinPixels: 4,
      radiusMaxPixels: 30,
      lineWidthMinPixels: 1,
      getPosition: d => d.position,
      getFillColor: d => {
        if (d.score < 40) return [255, 77, 109, 200];  // DANGER
        if (d.score < 70) return [255, 183, 3, 200];    // CAUTION
        return [0, 245, 212, 200];                       // SAFE
      },
      getLineColor: [255, 255, 255, 100],
      getRadius: d => (100 - d.score) * 2, // Larger circles for riskier areas
      onHover: info => setHoverInfo(info),
      onClick: info => setSelectedSector(info.object)
    }),
    ...mapData.filter(d => d.score < 40).map((d, i) => new ScatterplotLayer({
      id: `danger-alert-${i}`,
      data: [d],
      getPosition: p => p.position,
      getRadius: pulse,
      getFillColor: [255, 77, 109, 60],
      updateTriggers: { getRadius: [pulse] }
    }))
  ];

  const formatTime = (h) => {
    if (h === 24 || h === 0) return '12:00 AM';
    if (h === 12) return '12:00 PM';
    return h > 12 ? (h - 12) + ':00 PM' : h + ':00 AM';
  };

  return (
    <div className="w-full h-screen bg-[#050510] text-white font-inter overflow-hidden relative">
      <style>{INJECTED_STYLES}</style>
      
      <AnimatePresence>
        {startup && <StartupOverlay onComplete={handleStartupComplete} />}
      </AnimatePresence>

      {/* --- MAP ENGINE --- */}
      <div className="absolute inset-0">
        <DeckGL
          layers={layers}
          viewState={viewState}
          onViewStateChange={({ viewState }) => setViewState(viewState)}
          controller={true}
        >
          <Map mapStyle={MAP_STYLE} />
        </DeckGL>
      </div>

      {/* --- OVERLAYS --- */}
      {!startup && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
          
          {/* Header Panel */}
          <div className="absolute top-6 left-6 z-10 space-y-4">
            <div className="glass-card rounded-2xl p-6 w-[300px]">
              <div className="flex items-center justify-between mb-6">
                <h1 className="font-space font-bold text-xl tracking-tight flex items-center gap-2">
                  <span className="text-[#FF4D6D] drop-shadow-[0_0_8px_rgba(255,77,109,0.5)]">â—</span> 
                  NightSafe
                </h1>
                <div className="text-[10px] font-bold py-1 px-2 rounded-full border border-white/10 bg-white/5 uppercase tracking-widest text-slate-400">
                  CHENNAI_CORE
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#FF4D6D]/5 border border-[#FF4D6D]/10">
                  <span className="text-[11px] font-bold text-[#FF4D6D]/80 uppercase tracking-wider">Critical Sectors</span>
                  <span className="font-space font-bold text-xl">{stats.danger}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#FFB703]/5 border border-[#FFB703]/10 text-[#FFB703]">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Warning Zones</span>
                  <span className="font-space font-bold text-xl">{stats.caution}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#00F5D4]/5 border border-[#00F5D4]/10 text-[#00F5D4]">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Safe Pathways</span>
                  <span className="font-space font-bold text-xl">{stats.safe}</span>
                </div>
              </div>
            </div>

            {/* Dashboard Legend Overlay */}
            <div className="glass-card rounded-2xl p-4 w-[300px] border-indigo-500/10">
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mb-4">Risk Prediction Gradient</p>
              <div className="h-1.5 w-full bg-gradient-to-r from-[#00F5D4] via-[#FFB703] to-[#FF4D6D] rounded-full mb-3" />
              <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                <span>0.00 SAFE</span>
                <span>0.50 CAUTION</span>
                <span>1.00 DANGER</span>
              </div>
            </div>
          </div>

          {/* Map Controls */}
          <div className="absolute top-6 right-6 z-10 flex flex-col gap-4">
            <div className="group relative">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => { setIs3D(!is3D); setViewState(v => ({ ...v, pitch: is3D ? 0 : 45 })); }}
                className={`w-12 h-12 rounded-full pro-glass flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/10 ${is3D ? 'text-[var(--accent-teal)] shadow-[0_0_15px_rgba(0,245,212,0.2)]' : 'text-slate-400 hover:text-white'}`}
              >
                {is3D ? '3D' : '2D'}
              </motion.button>
              <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-lg text-[10px] uppercase font-bold font-mono text-[var(--accent-teal)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-[var(--accent-teal)]/30 pointer-events-none">
                Toggle View
              </div>
            </div>

            <div className="group relative">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setAutoRotate(!autoRotate)}
                className={`w-12 h-12 rounded-full pro-glass flex items-center justify-center transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/10 ${autoRotate ? 'text-[var(--accent-teal)] shadow-[0_0_15px_rgba(0,245,212,0.2)] animate-spin-slow' : 'text-slate-400 hover:text-white'}`}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M2.13 15.57a9 9 0 1 0 3.12-11.2l5.75 5.63M2.5 22v-6h6"/></svg>
              </motion.button>
              <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-lg text-[10px] uppercase font-bold font-mono text-[var(--accent-teal)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-[var(--accent-teal)]/30 pointer-events-none">
                Auto Rotate
              </div>
            </div>

            <div className="group relative">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setViewState(v => ({ ...v, pitch: 45, bearing: -15, zoom: 12.5, transitionDuration: 1500, transitionInterpolator: new FlyToInterpolator() }))}
                className="w-12 h-12 rounded-full pro-glass flex items-center justify-center transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/10 text-slate-400 hover:text-[var(--accent-teal)] hover:shadow-[0_0_15px_rgba(0,245,212,0.2)]"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg>
              </motion.button>
              <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-black/80 backdrop-blur-md rounded-lg text-[10px] uppercase font-bold font-mono text-[var(--accent-teal)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-[var(--accent-teal)]/30 pointer-events-none">
                Recenter
              </div>
            </div>
          </div>

          {/* Right Detailed Panel */}
          <AnimatePresence>
            {selectedSector && (
              <motion.div 
                initial={{ x: 400, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 400, opacity: 0 }}
                className="absolute top-24 right-6 bottom-32 w-[340px] glass-card rounded-3xl p-8 z-10 flex flex-col"
              >
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h3 className="font-space font-bold text-2xl tracking-tight mb-1">Sector Analysis</h3>
                    <p className="text-xs text-slate-500 font-mono">ID: CHN_{Math.floor(Math.random()*1000)} // LIVE_FEED</p>
                  </div>
                  <button onClick={() => setSelectedSector(null)} className="text-slate-400 hover:text-white text-xl">âœ•</button>
                </div>

                <div className="flex-1 space-y-8">
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl">
                      {selectedSector.elevationValue > 60 ? 'âš ï¸' : 'ðŸ›¡ï¸'}
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Threat Level</p>
                      <p className="font-space font-bold text-3xl" style={{ color: selectedSector.elevationValue > 60 ? '#FF4D6D' : '#00F5D4' }}>
                        {selectedSector.elevationValue > 60 ? 'CRITICAL' : 'STABLE'}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Risk Factors</p>
                    <div className="grid grid-cols-2 gap-3 text-white">
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[9px] text-slate-400 mb-1">Lighting</p>
                        <p className="font-bold text-sm">FAILED</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                        <p className="text-[9px] text-slate-400 mb-1">Footfall</p>
                        <p className="font-bold text-sm">MINIMAL</p>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/10 border border-white/20 col-span-2">
                        <p className="text-[9px] text-slate-400 mb-1">AI Recommendation</p>
                        <p className="font-bold text-xs uppercase text-[#FF4D6D]">Use bypass via Anna Nagar High Rd</p>
                      </div>
                    </div>
                  </div>
                </div>

                <button className="w-full mt-auto py-4 rounded-2xl bg-[#00F5D4] text-[#050510] font-bold text-sm tracking-wider uppercase shadow-[0_10px_30px_rgba(0,245,212,0.3)]">
                  Request Safe Escort
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Bottom Timeline Control */}
          <div className="absolute bottom-8 left-8 right-8 h-24 glass-card rounded-[2rem] flex items-center px-12 gap-12 z-10">
            <div className="flex flex-col items-center gap-1 min-w-[80px]">
              <span className="text-3xl font-space font-bold tracking-tighter" style={{ color: hour > 21 ? '#FF4D6D' : '#00F5D4' }}>
                {formatTime(hour).split(':00')[0]}
              </span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">{formatTime(hour).split(' ')[1]}</span>
            </div>

            <div className="flex-1 relative pt-2">
              <input 
                type="range" min="20" max="24" step="1" 
                value={hour > 23 ? 24 : hour} 
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  setHour(v === 24 ? 0 : v);
                }} 
                className="time-slider" 
              />
              <div className="flex justify-between mt-4 px-2">
                {[20, 21, 22, 23, '00'].map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className={`w-1 h-1 rounded-full ${hour === (h === '00' ? 0 : h) ? 'bg-[#00F5D4] h-2 scale-x-150' : 'bg-slate-700'}`} />
                    <span className={`text-[10px] font-bold ${hour === (h === '00' ? 0 : h) ? 'text-white' : 'text-slate-600'}`}>{h}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <button className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 font-bold text-[11px] uppercase tracking-widest hover:bg-white/10 transition-colors uppercase">
                Alert History
              </button>
              <div className="w-12 h-12 rounded-2xl bg-[#FF4D6D]/10 border border-[#FF4D6D]/30 flex items-center justify-center text-xl cursor-help" title="High Prediction Confidence">
                ðŸ¤–
              </div>
            </div>
          </div>

        </motion.div>
      )}

      {/* TOOLTIP */}
      {hoverInfo && hoverInfo.object && (
        <div 
          className="absolute z-[2000] pointer-events-none glass-card rounded-xl p-4 text-white border-white/20"
          style={{ left: hoverInfo.x + 20, top: hoverInfo.y + 20 }}
        >
          <div className="flex items-center gap-3 mb-2">
             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: hoverInfo.object.score < 40 ? '#FF4D6D' : '#00F5D4' }} />
             <p className="font-space font-bold text-sm tracking-tight">{hoverInfo.object.name || 'Active Segment'}</p>
          </div>
          <p className="text-[10px] text-slate-400 font-mono mb-2">COORD: {hoverInfo.object.position[0].toFixed(4)}, {hoverInfo.object.position[1].toFixed(4)}</p>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-space font-bold" style={{ color: hoverInfo.object.score < 40 ? '#FF4D6D' : hoverInfo.object.score < 70 ? '#FFB703' : '#00F5D4' }}>
              {Math.round(hoverInfo.object.score)}%
            </span>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Safety Index</span>
          </div>
        </div>
      )}
    </div>
  );
}

