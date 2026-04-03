import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export default function TimeSlider({ currentHour = 22, onChange }) {
  const [localHour, setLocalHour] = useState(currentHour);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    setLocalHour(currentHour);
  }, [currentHour]);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => {
        setLocalHour((prev) => {
          const next = prev >= 24 ? 18 : prev + 0.5;
          return next;
        });
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (onChange && localHour !== currentHour) {
        onChange(localHour);
      }
    }, 300);
    return () => clearTimeout(handler);
  }, [localHour, currentHour, onChange]);

  const formatTime = (hourNum) => {
    const h = Math.floor(hourNum);
    const m = (hourNum % 1) * 60;
    const ampm = h >= 12 && h < 24 ? 'PM' : 'AM';
    const displayH = h > 12 ? h - 12 : (h === 24 ? 12 : h);
    const displayM = m === 0 ? '00' : m.toString();
    return `${displayH}:${displayM} ${ampm}`;
  };

  const handleReset = () => {
    setIsPlaying(false);
    setLocalHour(22);
  };

  const getPercentage = () => {
    return ((localHour - 18) / (24 - 18)) * 100;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full mx-auto pro-glass rounded-[24px] p-6 shadow-2xl text-white relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--accent-teal)] to-transparent opacity-[0.03] animate-sweep pointer-events-none"></div>

      <div className="flex items-start justify-between mb-8 relative z-10">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-[var(--accent-teal)]" />
            <span className="text-[10px] text-[var(--accent-teal)] uppercase tracking-[0.2em] font-bold font-heading">Temporal Engine</span>
          </div>
          
          <div className="flex items-baseline gap-4">
            <div className="text-[44px] font-heading font-bold tracking-tighter text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] leading-none">
              {formatTime(localHour)}
            </div>
            
            <div className="flex items-center bg-[var(--bg-secondary)] rounded-full p-1 border border-white/10 shadow-inner">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsPlaying(!isPlaying)}
                className={`p-2.5 rounded-full transition-all duration-300 ${isPlaying ? 'bg-[var(--accent-amber)]/20 text-[var(--accent-amber)] shadow-[0_0_10px_rgba(255,183,3,0.3)]' : 'hover:bg-white/10 text-[var(--accent-teal)]'}`}
              >
                {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
              </motion.button>
              <div className="w-[1px] h-6 bg-white/10 mx-1"></div>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleReset}
                className="p-2.5 rounded-full hover:bg-white/10 text-slate-400 transition-colors"
                title="Reset to 10:00 PM"
              >
                <RotateCcw size={16} />
              </motion.button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative w-full h-12 pt-2 z-10 group">
        
        <div className="absolute top-4 left-0 right-0 h-4 rounded-full bg-[var(--bg-secondary)] border border-white/5 overflow-hidden shadow-inner flex">
          <div className="h-full bg-gradient-to-r from-[var(--accent-teal)] via-[var(--accent-amber)] to-[var(--accent-coral)]" style={{ width: `${getPercentage()}%`, transition: 'width 0.3s ease-out' }}></div>
        </div>
        
        <style dangerouslySetInnerHTML={{__html: `
          .pro-slider::-webkit-slider-thumb {
            appearance: none;
            width: 28px;
            height: 28px;
            background: #fff;
            border-radius: 50%;
            cursor: pointer;
            border: 4px solid var(--bg-primary);
            box-shadow: 0 0 20px rgba(0, 245, 212, 0.6), inset 0 0 4px rgba(0,0,0,0.3);
            transition: transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          .pro-slider::-webkit-slider-thumb:hover {
            transform: scale(1.2);
            box-shadow: 0 0 25px rgba(0, 245, 212, 0.8), inset 0 0 4px rgba(0,0,0,0.3);
          }
        `}} />
        <input
          type="range"
          min="18"
          max="24"
          step="0.5"
          value={localHour}
          onChange={(e) => setLocalHour(parseFloat(e.target.value))}
          className="pro-slider absolute top-[12px] left-0 w-full appearance-none bg-transparent cursor-pointer z-20 outline-none"
        />

        <div 
          className="absolute -top-8 -translate-x-1/2 bg-white text-[var(--bg-primary)] px-3 py-1 rounded-lg text-[11px] font-bold font-mono opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-[0_0_15px_rgba(255,255,255,0.4)]"
          style={{ left: `${getPercentage()}%`, transition: 'left 0.1s linear' }}
        >
          {formatTime(localHour)}
          <div className="absolute bottom-[-4px] left-1/2 -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-white"></div>
        </div>

        <div className="absolute top-10 left-0 right-0 pointer-events-none mt-2 font-mono">
          <div className="absolute flex flex-col items-center" style={{ left: '0%', transform: 'translateX(0%)' }}>
            <span className="text-[10px] text-slate-500 font-bold">18:00</span>
          </div>
          
          <div className="absolute flex flex-col items-center" style={{ left: '50%', transform: 'translateX(-50%)' }}>
            <span className="text-[10px] text-[var(--accent-amber)] font-bold drop-shadow-[0_0_5px_rgba(255,183,3,0.5)]">21:00</span>
          </div>

          <div className="absolute flex flex-col items-center" style={{ left: '75%', transform: 'translateX(-50%)' }}>
            <span className="text-[10px] text-[var(--accent-coral)] font-bold drop-shadow-[0_0_5px_rgba(255,77,109,0.5)]">22:30</span>
          </div>

          <div className="absolute flex flex-col items-center" style={{ left: '100%', transform: 'translateX(-100%)' }}>
            <span className="text-[10px] text-slate-500 font-bold">00:00</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
