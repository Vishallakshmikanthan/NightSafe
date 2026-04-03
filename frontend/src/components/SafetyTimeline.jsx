import React from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Clock } from 'lucide-react';

const mockTimelineData = [
  { time: '18:00', score: 85 },
  { time: '19:00', score: 82 },
  { time: '20:00', score: 75 },
  { time: '21:00', score: 68 },
  { time: '22:00', score: 55 },
  { time: '23:00', score: 45 },
  { time: '24:00', score: 38 }
];

export default function SafetyTimeline() {
  const currentHour = new Date().getHours() || 22;
  const timeCurrent = `${currentHour}:00`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-5 shadow-2xl mt-4 z-40 text-slate-100"
    >
      <div className="flex items-center gap-2 mb-4">
        <Clock className="text-emerald-400" size={20} />
        <h3 className="font-semibold">Safety Forecast</h3>
      </div>
      
      <p className="text-xs text-emerald-400 mb-4 font-medium flex items-center gap-1">
        Best time to travel: 18:30
      </p>
      
      <div className="h-32 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={mockTimelineData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
            <YAxis domain={[0, 100]} hide={true} />
            <Tooltip
              contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px', color: '#fff' }}
              itemStyle={{ color: '#00F5D4' }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <ReferenceLine x={timeCurrent} stroke="#FF4D6D" strokeDasharray="3 3">
              {/* Highlight current time */}
            </ReferenceLine>
            <Line
              type="monotone"
              dataKey="score"
              stroke="#00F5D4"
              strokeWidth={3}
              dot={{ r: 4, strokeWidth: 2, fill: '#0f172a' }}
              activeDot={{ r: 6, fill: '#00F5D4', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <p className="text-xs text-rose-400 font-medium tracking-wide flex items-center justify-between mt-2">
        <span>Risk increases sharply after 22:00</span>
      </p>
    </motion.div>
  );
}