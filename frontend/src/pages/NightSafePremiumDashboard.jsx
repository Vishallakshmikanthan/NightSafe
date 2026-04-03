import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Shield, Map as MapIcon, AlertTriangle, BarChart2, Settings, 
  Search, Bell, Navigation, TrendingUp, Clock, Activity, Flag, Watch
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine, ResponsiveContainer 
} from 'recharts';

// --- INJECTED STYLES FOR CUSTOM FONTS & ANIMATIONS ---
const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;700&family=Inter:wght@400;500;600&display=swap');

  :root {
    --electric-coral: #FF4D6D;
    --cyber-teal: #00F5D4;
    --neon-amber: #FFB703;
    --soft-indigo: #7B61FF;
  }

  .font-space { font-family: 'Space Grotesk', sans-serif; }
  .font-inter { font-family: 'Inter', sans-serif; }
  .font-space-mono { font-family: 'Space Grotesk', monospace; font-variant-numeric: tabular-nums; }

  .bg-radial-glow {
    background: radial-gradient(circle at 20% 30%, rgba(26, 5, 51, 0.8) 0%, transparent 50%),
                radial-gradient(circle at 80% 70%, rgba(0, 26, 26, 0.6) 0%, transparent 50%),
                #050510;
  }

  .glass-panel {
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  }

  .glass-panel:hover {
    border-color: rgba(123, 97, 255, 0.3);
    box-shadow: 0 0 40px rgba(123, 97, 255, 0.08);
  }

  .glow-safe { box-shadow: 0 0 20px rgba(0, 245, 212, 0.15); }
  .glow-danger { box-shadow: 0 0 20px rgba(255, 77, 109, 0.2); }

  @keyframes radar-sweep {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .animate-radar {
    animation: radar-sweep 6s linear infinite;
    transform-origin: center;
  }

  @keyframes pulse-danger {
    0%, 100% { opacity: 0.6; box-shadow: 0 0 10px rgba(255, 77, 109, 0.4); }
    50% { opacity: 1; box-shadow: 0 0 25px rgba(255, 77, 109, 0.8); }
  }

  .animate-danger-pulse {
    animation: pulse-danger 2s ease-in-out infinite;
  }

  @keyframes slide-in-top {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
  
  .animate-slide-in {
    animation: slide-in-top 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }

  @keyframes fade-in {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  .animate-fade-in {
    animation: fade-in 0.6s ease-out forwards;
  }

  /* Custom Scrollbar */
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: rgba(0,0,0,0.1); }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
  ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
`;

// --- HELPER COMPONENTS ---

// Animated Counter
const CountUp = ({ end, duration = 2000, suffix = "" }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp = null;
    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(ease * end));
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return <span className="font-space-mono">{count.toLocaleString()}{suffix}</span>;
};

// SVG Map Component
const MapPanel = ({ time }) => {
  // Generate random street grid for visual effect
  const streets = useMemo(() => {
    const s = [];
    for(let i=0; i<30; i++) {
      // Horizontal
      s.push({ id: `h-${i}`, x1: 0, y1: i*20, x2: 800, y2: i*20, type: 'h' });
    }
    for(let j=0; j<40; j++) {
      // Vertical
      s.push({ id: `v-${j}`, x1: j*20, y1: 0, x2: j*20, y2: 600, type: 'v' });
    }
    return s;
  }, []);

  // Hotspots based on time
  const isLate = time >= 21.5; // 21:30+
  
  return (
    <div className="relative w-full h-[500px] rounded-2xl overflow-hidden glass-panel group">
      {/* Map SVG */}
      <svg viewBox="0 0 800 600" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <rect width="100%" height="100%" fill="#0a0a16" />
        
        {/* Base Grid */}
        <g stroke="rgba(255,255,255,0.05)" strokeWidth="1">
          {streets.map(st => (
            <line key={st.id} x1={st.x1} y1={st.y1} x2={st.x2} y2={st.y2} />
          ))}
        </g>

        {/* Highlighted Safe Route */}
        <path d="M 100 500 L 100 300 L 300 300 L 300 100 L 600 100" 
              fill="none" stroke="#00F5D4" strokeWidth="4" 
              className="drop-shadow-[0_0_8px_rgba(0,245,212,0.8)]" />
        
        {/* Danger Zones (Animate based on time) */}
        {isLate && (
          <>
            <circle cx="500" cy="400" r="60" fill="url(#dangerGrad)" className="animate-danger-pulse" />
            <circle cx="200" cy="200" r="45" fill="url(#dangerGrad)" className="animate-danger-pulse" style={{animationDelay: '1s'}} />
          </>
        )}

        {/* Labels */}
        <text x="120" y="520" fill="white" fontSize="14" className="font-space font-bold drop-shadow-md">Koyambedu</text>
        <text x="620" y="90" fill="white" fontSize="14" className="font-space font-bold drop-shadow-md">Velachery</text>

        {/* Gradients */}
        <defs>
          <radialGradient id="dangerGrad">
            <stop offset="0%" stopColor="#FF4D6D" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#FF4D6D" stopOpacity="0" />
          </radialGradient>
          <conicGradient id="radarSweep" cx="50%" cy="50%" angle="0deg">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="90%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0, 245, 212, 0.4)" />
          </conicGradient>
        </defs>

        {/* Radar Effect */}
        <circle cx="400" cy="300" r="600" fill="url(#radarSweep)" className="animate-radar mix-blend-screen pointer-events-none" />
        <circle cx="400" cy="300" r="2" fill="#00F5D4" className="glow-safe" />
      </svg>
      
      {/* Map Overlay Badges */}
      <div className="absolute top-4 left-4 flex gap-2">
        <div className="bg-[#00F5D4]/20 text-[#00F5D4] border border-[#00F5D4]/30 px-3 py-1 rounded-full text-xs font-space font-bold flex items-center gap-1 backdrop-blur-md">
          <div className="w-2 h-2 rounded-full bg-[#00F5D4] animate-pulse"></div> AI ROUTING ACTIVE
        </div>
      </div>
      <div className="absolute top-4 right-4">
        <button className="bg-white/5 border border-white/10 p-2 rounded-lg hover:bg-white/10 transition-colors backdrop-blur-md">
          <MapIcon size={18} className="text-white" />
        </button>
      </div>

      {/* Time Slider Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#050510] to-transparent">
        <div className="glass-panel rounded-xl p-4 flex items-center gap-4">
          <span className="text-[#00F5D4] font-space-mono text-sm font-bold">18:00</span>
          <div className="relative flex-1 h-2 bg-gradient-to-r from-[#00F5D4] via-[#FFB703] to-[#FF4D6D] rounded-full">
            {/* Markers */}
            <div className="absolute top-0 bottom-0 left-[50%] w-0.5 bg-white/50"></div>
            <div className="absolute top-0 bottom-0 left-[75%] w-0.5 bg-white/50"></div>
            {/* Thumb - simulated at 22:30 */}
            <div className="absolute -top-1.5 w-5 h-5 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.8)] border-2 border-[#050510] cursor-pointer" 
                 style={{ left: `${((time - 18) / 6) * 100}%` }}></div>
          </div>
          <span className="text-[#FF4D6D] font-space-mono text-sm font-bold">24:00</span>
        </div>
      </div>
    </div>
  );
};

// Main Export Component
export default function NightSafePremiumDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sliderTime, setSliderTime] = useState(22.5); // 22:30
  
  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Mock Chart Data
  const chartData = [
    { time: '18:00', score: 82 },
    { time: '19:00', score: 75 },
    { time: '20:00', score: 68 },
    { time: '21:00', score: 51 },
    { time: '21:30', score: 34 },
    { time: '22:00', score: 19 },
    { time: '22:30', score: 23 },
  ];

  const initFeed = [
    { id: 1, type: 'alert', title: 'Alert Sent', detail: '847 users notified of alternate route', time: '2m ago', color: '#00F5D4' },
    { id: 2, type: 'danger', title: 'Lighting Failure', detail: 'GCC pole #CH-4421 non-functional', time: '8m ago', color: '#FF4D6D' },
    { id: 3, type: 'warning', title: 'Score Update', detail: 'Velachery Lake Road: 68 → 34', time: '12m ago', color: '#FFB703' },
    { id: 4, type: 'info', title: 'Patrol Deployed', detail: 'Koyambedu zone, Beat Officer 7 notified', time: '15m ago', color: '#7B61FF' },
  ];
  const [feed, setFeed] = useState(initFeed);

  const initAlerts = [
    { id: 1, street: 'Koyambedu Back Lane', score: 19, level: 'CRITICAL', triggers: ['Lighting Failure', 'Liquor Closure Surge'], time: '10 mins ago', color: '#FF4D6D' },
    { id: 2, street: 'Velachery Lake Road', score: 34, level: 'DANGER', triggers: ['Footfall Drop', 'Crime History'], time: '22 mins ago', color: '#FF4D6D' },
    { id: 3, street: 'Perambur Station Road', score: 41, level: 'CAUTION', triggers: ['Street Light Malfunction'], time: '45 mins ago', color: '#FFB703' },
  ];

  return (
    <>
      <style>{styles}</style>
      <div className="min-h-screen bg-radial-glow font-inter text-slate-200 overflow-hidden flex">
        
        {/* --- SIDEBAR --- */}
        <aside className="w-[72px] lg:w-[240px] border-r border-white/10 glass-panel flex flex-col justify-between hidden md:flex z-20">
          <div>
            <div className="h-20 flex items-center justify-center lg:justify-start lg:px-6 border-b border-white/5">
              <Shield className="text-[#00F5D4] drop-shadow-[0_0_8px_rgba(0,245,212,0.8)]" size={28} />
              <span className="ml-3 font-space font-bold text-xl text-white tracking-tight hidden lg:block">NightSafe</span>
            </div>
            <nav className="p-4 space-y-2">
              <a href="#" className="flex items-center gap-4 px-3 py-3 rounded-xl bg-white/5 border-l-2 border-[#FF4D6D] text-white transition-all">
                <Activity size={20} className="text-[#FF4D6D]" />
                <span className="font-medium hidden lg:block">Live Dashboard</span>
              </a>
              <a href="#" className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                <MapIcon size={20} />
                <span className="font-medium hidden lg:block">City Map</span>
              </a>
              <a href="#" className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                <AlertTriangle size={20} />
                <span className="font-medium hidden lg:block">Alert Hub</span>
              </a>
              <a href="#" className="flex items-center gap-4 px-3 py-3 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-all">
                <BarChart2 size={20} />
                <span className="font-medium hidden lg:block">Analytics</span>
              </a>
            </nav>
          </div>
          <div className="p-6 border-t border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-3 h-3 rounded-full bg-[#00F5D4]"></div>
                <div className="absolute top-0 w-3 h-3 rounded-full bg-[#00F5D4] animate-ping opacity-75"></div>
              </div>
              <span className="text-xs font-space font-bold tracking-widest text-[#00F5D4] hidden lg:block">SYSTEM LIVE</span>
            </div>
          </div>
        </aside>

        {/* --- MAIN CONTENT --- */}
        <div className="flex-1 flex flex-col h-screen overflow-y-auto">
          
          {/* HEADER */}
          <header className="h-20 border-b border-white/5 glass-panel flex items-center justify-between px-8 z-10 sticky top-0">
            <div className="flex items-center gap-6">
              <div>
                <h1 className="font-space font-bold text-2xl text-white tracking-tight">Intelligence Dashboard</h1>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                  <span>Operations</span>
                  <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                  <span className="text-white">Chennai Command Center</span>
                </div>
              </div>
              <div className="hidden md:flex ml-8 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 items-center gap-2 cursor-pointer hover:bg-white/10 transition-colors">
                <span className="w-2 h-2 rounded-full bg-[#00F5D4]"></span>
                <span className="text-sm font-medium">Chennai, TN</span>
                <span className="text-slate-500 ml-1">▾</span>
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="hidden lg:flex items-center gap-4 text-xs font-space-mono font-medium">
                <div className="bg-[#7B61FF]/10 text-[#7B61FF] border border-[#7B61FF]/20 px-3 py-1 rounded-full">
                  47 STREETS MONITORED
                </div>
                <div className="bg-[#FF4D6D]/10 text-[#FF4D6D] border border-[#FF4D6D]/20 px-3 py-1 rounded-full animate-danger-pulse">
                  3 ALERTS ACTIVE
                </div>
              </div>
              <div className="flex items-center gap-2 bg-black/40 border border-white/10 rounded-lg px-4 py-2 font-space-mono text-[#00F5D4]">
                <Clock size={16} />
                {currentTime.toLocaleTimeString('en-IN', { hour12: false })}
              </div>
              <button className="relative p-2 rounded-full hover:bg-white/10 transition-colors">
                <Bell size={20} className="text-slate-300" />
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#FF4D6D] rounded-full border-2 border-[#050510]"></span>
              </button>
            </div>
          </header>

          {/* BENTO GRID DASHBOARD */}
          <main className="p-8 pb-32 grid grid-cols-12 gap-6 max-w-[1600px] mx-auto w-full animate-fade-in">
            
            {/* COLUMN 1: WIDE (Map + Chart) */}
            <div className="col-span-12 xl:col-span-7 space-y-6">
              <MapPanel time={sliderTime} />

              {/* Safety Score Chart */}
              <div className="glass-panel rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-space font-bold flex items-center gap-2 text-lg">
                    <TrendingUp className="text-[#00F5D4]" size={20} />
                    Predictive Safety Trend <span className="text-slate-500 text-sm font-normal ml-2">| Koyambedu Sector</span>
                  </h3>
                  <div className="flex gap-2">
                    <span className="text-xs bg-white/5 px-2 py-1 rounded text-slate-300 border border-white/5">Auto-updating</span>
                  </div>
                </div>
                <div className="h-[220px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#FF4D6D" stopOpacity={0.4}/>
                          <stop offset="95%" stopColor="#FF4D6D" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="time" stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="rgba(255,255,255,0.2)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#050510', borderColor: 'rgba(255,255,255,0.1)', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#00F5D4', fontFamily: 'Space Grotesk' }}
                      />
                      <ReferenceLine y={40} stroke="#FF4D6D" strokeDasharray="3 3" label={{ position: 'insideTopLeft', value: 'DANGER THRESHOLD', fill: '#FF4D6D', fontSize: 10, fontFamily: 'Space Grotesk' }} />
                      <Area type="monotone" dataKey="score" stroke="#FF4D6D" strokeWidth={3} fillOpacity={1} fill="url(#colorScore)" animationDuration={2000} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* COLUMN 2: MEDIUM (Stats + Active Alerts) */}
            <div className="col-span-12 md:col-span-7 xl:col-span-3 space-y-6">
              
              {/* Stat Cards 2x2 Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="glass-panel p-4 rounded-2xl hover:-translate-y-1 transition-transform">
                  <div className="flex justify-between items-start mb-2">
                    <MapIcon size={18} className="text-[#00F5D4]" />
                  </div>
                  <div className="text-3xl font-space-mono font-bold text-white mb-1"><CountUp end={47} /></div>
                  <div className="text-xs text-slate-400">Streets Monitored</div>
                  <div className="mt-3 text-[10px] text-[#00F5D4] font-medium tracking-wide border-t border-white/5 pt-2">REAL-TIME | CHENNAI</div>
                </div>

                <div className="glass-panel p-4 rounded-2xl hover:-translate-y-1 transition-transform glow-danger border-white/20">
                  <div className="flex justify-between items-start mb-2">
                    <AlertTriangle size={18} className="text-[#FF4D6D] animate-pulse" />
                  </div>
                  <div className="text-3xl font-space-mono font-bold text-[#FF4D6D] mb-1"><CountUp end={3} /></div>
                  <div className="text-xs text-slate-400">Active Alerts</div>
                  <div className="mt-3 text-[10px] text-[#FF4D6D] font-medium tracking-wide border-t border-white/5 pt-2">↑ 2 NEW IN 30M</div>
                </div>

                <div className="glass-panel p-4 rounded-2xl hover:-translate-y-1 transition-transform">
                  <div className="flex justify-between items-start mb-2">
                    <Navigation size={18} className="text-[#00F5D4]" />
                  </div>
                  <div className="text-2xl font-space-mono font-bold text-[#00F5D4] mb-1"><CountUp end={1247} /></div>
                  <div className="text-xs text-slate-400">Safe Routes Gen.</div>
                  <div className="mt-3 text-[10px] text-[#00F5D4] font-medium tracking-wide border-t border-white/5 pt-2">↑ 23% VS YESTERDAY</div>
                </div>

                <div className="glass-panel p-4 rounded-2xl hover:-translate-y-1 transition-transform">
                  <div className="flex justify-between items-start mb-2">
                    <TrendingUp size={18} className="text-[#FFB703]" />
                  </div>
                  <div className="text-2xl font-space-mono font-bold text-white mb-1"><CountUp end={89} suffix="%" /></div>
                  <div className="text-xs text-slate-400">Inv. Priority Score</div>
                  <div className="mt-2 text-[10px] text-[#FFB703] font-medium tracking-wide">₹500Cr REALLOCATION</div>
                </div>
              </div>

              {/* Danger Alert Panel */}
              <div className="glass-panel rounded-2xl p-0 overflow-hidden flex flex-col h-[calc(100%-250px)] min-h-[400px]">
                <div className="p-5 border-b border-white/10 bg-gradient-to-r from-[#FF4D6D]/10 to-transparent flex justify-between items-center">
                  <h3 className="font-space font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#FF4D6D] animate-ping"></span>
                    Live Danger Transitions
                  </h3>
                </div>
                <div className="p-4 space-y-3 flex-1 overflow-y-auto">
                  {initAlerts.map((alert, i) => (
                    <div key={alert.id} className="glass-panel border-white/10 rounded-xl p-4 flex gap-4 animate-slide-in relative group" style={{ animationDelay: `${i * 150}ms` }}>
                      {/* Left color bar */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${alert.level === 'CRITICAL' || alert.level === 'DANGER' ? 'bg-[#FF4D6D]' : 'bg-[#FFB703]'}`}></div>
                      
                      <div className="flex-1 pl-2">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-space font-bold text-white text-sm truncate pr-2">{alert.street}</h4>
                          <span className={`text-xs font-space-mono px-2 py-0.5 rounded flex-shrink-0 ${alert.level === 'CRITICAL' || alert.level === 'DANGER' ? 'bg-[#FF4D6D]/20 text-[#FF4D6D]' : 'bg-[#FFB703]/20 text-[#FFB703]'}`}>
                            {alert.score}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {alert.triggers.map((trigger, j) => (
                            <span key={j} className="text-[10px] uppercase tracking-wide bg-white/5 border border-white/10 text-slate-300 px-1.5 py-0.5 rounded">
                              {trigger}
                            </span>
                          ))}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-[10px] text-slate-500">{alert.time}</span>
                          <button className="text-[10px] font-bold text-white bg-white/5 hover:bg-[#FF4D6D] hover:shadow-[0_0_15px_rgba(255,77,109,0.5)] px-3 py-1.5 rounded transition-all tracking-wider">
                            VIEW
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* COLUMN 3: NARROW (Activity Feed) */}
            <div className="col-span-12 md:col-span-5 xl:col-span-2 space-y-6">
              <div className="glass-panel rounded-2xl p-0 h-full max-h-[750px] overflow-hidden flex flex-col">
                <div className="p-5 border-b border-white/10 bg-white/5">
                  <h3 className="font-space font-bold flex items-center gap-2 text-sm">
                    <Activity className="text-[#7B61FF]" size={16} />
                    Live Intel Feed
                  </h3>
                </div>
                <div className="p-5 flex-1 overflow-hidden relative">
                  {/* Timeline line */}
                  <div className="absolute left-[31px] top-6 bottom-6 w-[2px] bg-gradient-to-b from-white/10 via-white/5 to-transparent"></div>
                  
                  <div className="space-y-6 h-full overflow-y-auto pr-2 pb-10">
                    {feed.map((item, idx) => (
                      <div key={item.id} className="relative flex items-start gap-4 animate-slide-in" style={{ animationDelay: `${idx * 200}ms` }}>
                        <div className="relative z-10 w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: item.color, boxShadow: `0 0 10px ${item.color}` }}></div>
                        <div>
                          <p className="text-sm font-bold text-slate-100">{item.title}</p>
                          <p className="text-xs text-slate-400 mt-0.5 leading-snug">{item.detail}</p>
                          <p className="text-[10px] text-slate-500 mt-1.5 font-space-mono">{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {/* Gradient to fade out bottom */}
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#050510] to-transparent pointer-events-none"></div>
                </div>
              </div>
            </div>
            
          </main>

          {/* FOOTER STATUS BAR */}
          <footer className="fixed bottom-0 left-0 right-0 h-12 glass-panel border-t border-white/10 z-50 flex items-center justify-between px-6 bg-[#050510]/80">
            <div className="flex gap-4 text-[10px] font-space-mono font-bold tracking-widest uppercase">
              <div className="flex items-center gap-1.5 text-[#00F5D4]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F5D4]"></span> AGENT PIPELINE: ACTIVE
              </div>
              <div className="flex items-center gap-1.5 text-[#00F5D4] hidden md:flex">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00F5D4]"></span> GCC LIGHT API: CONNECTED
              </div>
              <div className="flex items-center gap-1.5 text-[#FFB703] hidden lg:flex">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FFB703]"></span> CRIME DATA: 2H DELAY
              </div>
            </div>
            
            <div className="absolute left-1/2 transform -translate-x-1/2 text-[10px] text-slate-400 font-medium hidden sm:block">
              NightSafe Intelligence Platform v1.0 | Protecting Chennai's Streets
            </div>
            
            <div className="text-[10px] font-bold text-white uppercase tracking-wider bg-gradient-to-r from-[#7B61FF] to-[#FF4D6D] bg-clip-text text-transparent">
              Built for FASTATHON 2026 | SDG 5 & 11
            </div>
          </footer>
        </div>
      </div>
    </>
  );
}
