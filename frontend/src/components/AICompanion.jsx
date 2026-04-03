import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchAlerts, fetchDangerZones, fetchSafetyScore } from '../services/api';

// ─── Constants ────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'nightsafe_companion_history';
const MAX_HISTORY = 5;

const SAFE_HOUR_RANGES = [
  { start: 6, end: 10, label: 'Early morning (6–10 AM)' },
  { start: 10, end: 18, label: 'Daytime (10 AM–6 PM)' },
];

const QUICK_ACTIONS = [
  { label: '🛡️ Is this route safe?', key: 'route_safety' },
  { label: '⚠️ Why is this area unsafe?', key: 'area_unsafe' },
  { label: '🕐 Best time to travel?', key: 'best_time' },
  { label: '🗺️ Find safest route', key: 'find_route' },
];

// ─── Rule-based response engine ───────────────────────────────────────────────
function buildResponse(input, ctx) {
  const q = (input || '').toLowerCase().trim();
  const { selectedStreet, routeData, currentHour, dangerCount } = ctx;

  // Route safety
  if (q.includes('route') && (q.includes('safe') || q.includes('unsafe') || q.includes('is') || q.includes('how'))) {
    if (!routeData) {
      return "No route is currently selected. Use the Route Planner on the right to calculate a safe path first, then ask me about it!";
    }
    const score = routeData?.safety_score ?? routeData?.safetyScore ?? routeData?.score ?? null;
    if (score !== null && score !== undefined) {
      const pct = Math.round(score * 100);
      if (pct >= 75) return `✅ Your selected route has a safety score of **${pct}%** — it looks good for travel right now. Stay aware of your surroundings and keep your phone charged.`;
      if (pct >= 50) return `⚠️ Your route has a moderate safety score of **${pct}%**. Some segments may have elevated risk. I recommend travelling during daylight hours if possible.`;
      return `🔴 Your route has a low safety score of **${pct}%**. Consider using the Route Planner to find a safer alternative, especially at night.`;
    }
    return "Your route is loaded. I don't have a precise score for it right now, but I recommend checking the Predictive Insights panel for segment-by-segment details.";
  }

  // Area / street unsafe
  if (q.includes('area') || q.includes('street') || q.includes('unsafe') || q.includes('why') || q.includes('danger')) {
    if (!selectedStreet) {
      return "No street is selected yet. Click any street on the map and I'll explain what makes it risky — including lighting, historical incidents, and time-of-day patterns.";
    }
    const name = selectedStreet?.name || selectedStreet?.street_name || selectedStreet?.id || 'this street';
    const score = selectedStreet?.safety_score ?? selectedStreet?.safetyScore ?? null;
    const factors = [];
    if (selectedStreet?.lighting_score !== undefined && selectedStreet.lighting_score < 0.5) factors.push('poor street lighting');
    if (selectedStreet?.crime_score !== undefined && selectedStreet.crime_score > 0.5) factors.push('elevated crime history');
    if (selectedStreet?.foot_traffic !== undefined && selectedStreet.foot_traffic < 0.3) factors.push('low foot traffic');
    if (score !== null) {
      const pct = Math.round((score <= 1 ? score * 100 : score));
      const riskLabel = pct < 40 ? 'high-risk' : pct < 65 ? 'moderate-risk' : 'relatively safe';
      const factorStr = factors.length > 0 ? ` Key factors include ${factors.join(', ')}.` : '';
      return `📍 **${name}** is currently **${riskLabel}** with a safety score of ${pct}%.${factorStr} Consider this when planning travel through this area.`;
    }
    const factorStr = factors.length > 0 ? `Known concerns: ${factors.join(', ')}.` : 'The area has limited lighting and activity data.';
    return `📍 I'm analysing **${name}**. ${factorStr} Check the Street Explorer panel for full details.`;
  }

  // Best time to travel
  if (q.includes('time') || q.includes('when') || q.includes('best') || q.includes('travel')) {
    const hour = currentHour ?? new Date().getHours();
    const isNighttime = hour < 6 || hour >= 22;
    if (isNighttime) {
      return "🌙 It's currently late night. Safety risk is highest between 10 PM–5 AM. If you must travel, stick to well-lit main roads and share your trip using the Share Trip feature. Best travel windows are **6–10 AM** or **10 AM–6 PM**.";
    }
    const safe = SAFE_HOUR_RANGES.find(r => hour >= r.start && hour < r.end);
    if (safe) {
      return `☀️ You're in a good window — **${safe.label}** is one of the safest periods to travel in Chennai. Incident rates are significantly lower now. Plan your trip using the Route Planner for the optimal path.`;
    }
    return `🕐 At **${hour}:00**, risk is moderate. Evening hours (after 8 PM) see higher incident rates. I recommend completing travel before 9 PM when possible.`;
  }

  // Find safest route
  if (q.includes('find') || q.includes('safest') || q.includes('planner') || q.includes('navigate')) {
    return "🗺️ To find the safest route, open the **Route Planner** panel on the right side. Enter your start and destination — the AI engine will calculate the path with the highest safety score across all road segments.";
  }

  // Alerts / danger zones
  if (q.includes('alert') || q.includes('risk') || q.includes('zone') || q.includes('warn')) {
    if (dangerCount > 5) {
      return `🚨 Currently tracking **${dangerCount} danger zones** active at this hour. The Live Alerts panel shows real-time activity. I recommend avoiding flagged areas and using the safe route planner.`;
    }
    if (dangerCount > 0) {
      return `⚠️ There are **${dangerCount} active danger zones** right now. Check the threat indicators on the map — red hexagons show the highest risk clusters.`;
    }
    return "✅ No major danger zones are flagged at this hour. The city appears relatively calm. Still, remain vigilant in isolated areas.";
  }

  // Greetings
  if (q.match(/^(hi|hello|hey|yo|good morning|good evening|good night)$/)) {
    const hour = currentHour ?? new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    return `${greeting}! 👋 I'm your NightSafe AI Companion. I can help you understand safety scores, find safe routes, and warn you about risks. What would you like to know?`;
  }

  // Help
  if (q.includes('help') || q.includes('what can you') || q.includes('how do') || q.includes('capabilities')) {
    return "Here's what I can do:\n• Analyse the safety of any route or street\n• Explain why certain areas are risky\n• Recommend the best travel times\n• Warn you about active danger zones\n\nTry clicking one of the quick-action chips below, or type your question!";
  }

  // Share trip
  if (q.includes('share') || q.includes('share trip') || q.includes('location')) {
    return "📡 Use the **Share Trip** button in the Route Planner to send a live tracking link to a trusted contact. They can follow your progress in real-time until you arrive safely.";
  }

  // Score
  if (q.includes('score') || q.includes('rating') || q.includes('index')) {
    return "Safety scores (0–100%) are calculated using a multi-factor model:\n• 🏮 Street lighting density\n• 🚨 Historical crime data\n• 👥 Foot traffic levels\n• 🕐 Time-of-day multipliers\n\nHigher score = safer street.";
  }

  // Fallback
  const fallbacks = [
    "I'm analysing Chennai's city data to help you stay safe. Try asking about a specific route, street, or the best time to travel.",
    "Interesting question! For now I can help with route safety, area risk analysis, and travel time recommendations. What would you like to explore?",
    "I'm still learning from the city's data streams. Ask me about a selected street or route and I'll give you a detailed safety assessment.",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// ─── Typing dots animation ────────────────────────────────────────────────────
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-4 py-3">
      {[0, 1, 2].map(i => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-[var(--accent-teal)]"
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
        />
      ))}
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────
function MessageBubble({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
    >
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-[var(--accent-teal)]/15 border border-[var(--accent-teal)]/40 flex items-center justify-center text-sm shrink-0 mr-2 mt-0.5">
          🤖
        </div>
      )}
      <div
        className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
          isUser
            ? 'bg-[var(--accent-teal)]/20 border border-[var(--accent-teal)]/40 text-white rounded-br-sm'
            : 'bg-white/5 border border-white/10 text-slate-200 rounded-bl-sm'
        }`}
        style={isUser ? { boxShadow: '0 0 12px rgba(0,245,212,0.12)' } : {}}
      >
        {msg.text}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-sm shrink-0 ml-2 mt-0.5">
          👤
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function AICompanion({ selectedStreet, routeData, currentHour, alerts }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (_) { /* ignore */ }
    return [
      {
        id: 'welcome',
        role: 'ai',
        text: "👋 Hi! I'm your NightSafe AI Companion. I'm here to help you navigate Chennai safely. Ask me about routes, street safety, or the best time to travel!",
      },
    ];
  });
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [dangerCount, setDangerCount] = useState(0);
  const chatEndRef = useRef(null);
  const inputRef = useRef(null);
  const alertSentRef = useRef(false);

  // Persist last MAX_HISTORY messages to localStorage
  useEffect(() => {
    try {
      const toStore = messages.slice(-MAX_HISTORY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch (_) { /* ignore quota errors */ }
  }, [messages]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping, isOpen]);

  // Load danger zone count
  useEffect(() => {
    const load = async () => {
      try {
        const dz = await fetchDangerZones(currentHour ?? 22);
        setDangerCount(Array.isArray(dz) ? dz.length : 0);
      } catch (_) {
        setDangerCount(0);
      }
    };
    load();
  }, [currentHour]);

  // Alert integration — auto-message when danger detected
  useEffect(() => {
    const alertArr = Array.isArray(alerts) ? alerts : [];
    const criticalAlert = alertArr.find(a =>
      (a.severity || '').toLowerCase() === 'critical' ||
      (a.severity || '').toLowerCase() === 'high'
    );
    if (criticalAlert && isOpen && !alertSentRef.current) {
      alertSentRef.current = true;
      const alertMsg = {
        id: `auto_alert_${Date.now()}`,
        role: 'ai',
        text: `⚠️ **Alert detected:** ${criticalAlert.message || criticalAlert.description || 'You are entering a high-risk zone. Consider rerouting.'} Stay safe and check the Live Alerts panel for details.`,
      };
      setMessages(prev => [...prev, alertMsg]);
    }
    if (!criticalAlert) alertSentRef.current = false;
  }, [alerts, isOpen]);

  const addMessage = useCallback((role, text) => {
    setMessages(prev => [
      ...prev,
      { id: `${role}_${Date.now()}`, role, text },
    ]);
  }, []);

  const handleSend = useCallback(async (overrideText) => {
    const text = (overrideText ?? input).trim();
    if (!text || isTyping) return;

    setInput('');
    addMessage('user', text);
    setIsTyping(true);

    // Simulate thinking delay (600–1200 ms)
    const delay = 600 + Math.random() * 600;

    try {
      await new Promise(r => setTimeout(r, delay));
      const ctx = {
        selectedStreet: selectedStreet ?? null,
        routeData: routeData ?? null,
        currentHour: currentHour ?? new Date().getHours(),
        dangerCount,
      };
      const response = buildResponse(text, ctx);
      addMessage('ai', response);
    } catch (err) {
      addMessage('ai', "I'm having trouble accessing city data right now. Please try again in a moment.");
    } finally {
      setIsTyping(false);
    }
  }, [input, isTyping, addMessage, selectedStreet, routeData, currentHour, dangerCount]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.93 }}
            onClick={handleOpen}
            aria-label="Open AI Companion"
            className="fixed bottom-6 left-6 z-[9999] w-14 h-14 rounded-full flex items-center justify-center cursor-pointer select-none"
            style={{
              background: 'linear-gradient(135deg, rgba(0,245,212,0.2) 0%, rgba(0,245,212,0.05) 100%)',
              border: '1.5px solid rgba(0,245,212,0.55)',
              boxShadow: '0 0 24px rgba(0,245,212,0.45), 0 0 8px rgba(0,245,212,0.25), inset 0 1px 0 rgba(255,255,255,0.08)',
              backdropFilter: 'blur(16px)',
            }}
          >
            {/* Pulse ring */}
            <motion.span
              className="absolute inset-0 rounded-full"
              animate={{ scale: [1, 1.4], opacity: [0.3, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
              style={{ border: '1px solid rgba(0,245,212,0.5)' }}
            />
            <span className="text-2xl leading-none relative z-10">🤖</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 280, damping: 26 }}
            className="fixed bottom-6 left-6 z-[9999] w-[340px] flex flex-col rounded-2xl overflow-hidden"
            style={{
              height: '480px',
              background: 'rgba(5,5,16,0.88)',
              border: '1px solid rgba(0,245,212,0.22)',
              boxShadow: '0 0 40px rgba(0,245,212,0.12), 0 20px 60px rgba(0,0,0,0.6)',
              backdropFilter: 'blur(24px)',
            }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-4 py-3 shrink-0"
              style={{
                background: 'linear-gradient(90deg, rgba(0,245,212,0.12) 0%, rgba(0,245,212,0.04) 100%)',
                borderBottom: '1px solid rgba(0,245,212,0.18)',
              }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
                  style={{
                    background: 'rgba(0,245,212,0.15)',
                    border: '1px solid rgba(0,245,212,0.4)',
                  }}
                >
                  🤖
                </div>
                <div>
                  <p className="text-xs font-bold text-white tracking-wide">NightSafe AI</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full bg-[var(--accent-teal)]"
                      style={{ boxShadow: '0 0 4px rgba(0,245,212,0.8)' }}
                    />
                    <p className="text-[10px] text-[var(--accent-teal)] font-medium tracking-wider uppercase">
                      {isTyping ? 'Thinking...' : 'Online'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Context pill */}
              <div className="flex items-center gap-2">
                {selectedStreet && (
                  <div
                    className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full truncate max-w-[90px]"
                    style={{
                      background: 'rgba(0,245,212,0.12)',
                      border: '1px solid rgba(0,245,212,0.3)',
                      color: 'var(--accent-teal)',
                    }}
                    title={selectedStreet?.name || selectedStreet?.street_name || ''}
                  >
                    {(selectedStreet?.name || selectedStreet?.street_name || 'Street').slice(0, 10)}
                  </div>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Context bar */}
            {(routeData || currentHour !== undefined) && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 shrink-0"
                style={{ background: 'rgba(255,183,3,0.05)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                {currentHour !== undefined && (
                  <span className="text-[10px] text-slate-400">
                    🕐 {String(currentHour).padStart(2, '0')}:00
                  </span>
                )}
                {routeData && (
                  <span className="text-[10px] text-[var(--accent-teal)]">
                    • Route loaded
                  </span>
                )}
                {dangerCount > 0 && (
                  <span className="text-[10px] text-[var(--accent-coral)]">
                    • {dangerCount} danger zones
                  </span>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 pt-3 hide-scrollbar">
              {messages.map(msg => (
                <MessageBubble key={msg.id} msg={msg} />
              ))}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start mb-2"
                >
                  <div
                    className="rounded-2xl rounded-bl-sm"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <TypingIndicator />
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick actions */}
            <div
              className="px-3 py-2 shrink-0 flex gap-1.5 overflow-x-auto hide-scrollbar"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              {QUICK_ACTIONS.map(action => (
                <button
                  key={action.key}
                  onClick={() => handleSend(action.label.replace(/^[^\s]+\s/, ''))}
                  disabled={isTyping}
                  className="shrink-0 text-[10px] font-medium px-2.5 py-1.5 rounded-full whitespace-nowrap transition-all duration-200 disabled:opacity-40"
                  style={{
                    background: 'rgba(0,245,212,0.08)',
                    border: '1px solid rgba(0,245,212,0.25)',
                    color: 'rgba(0,245,212,0.9)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(0,245,212,0.18)';
                    e.currentTarget.style.borderColor = 'rgba(0,245,212,0.5)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(0,245,212,0.08)';
                    e.currentTarget.style.borderColor = 'rgba(0,245,212,0.25)';
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>

            {/* Input bar */}
            <div
              className="px-3 pb-3 pt-2 shrink-0"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about safety, routes, risk..."
                  disabled={isTyping}
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none disabled:opacity-50"
                  maxLength={300}
                />
                <motion.button
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isTyping}
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-200 disabled:opacity-30"
                  style={{
                    background: input.trim() && !isTyping
                      ? 'rgba(0,245,212,0.25)'
                      : 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(0,245,212,0.4)',
                  }}
                  aria-label="Send"
                >
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M1 11L11 1M11 1H4M11 1V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      style={{ color: input.trim() && !isTyping ? 'var(--accent-teal)' : '#666' }}
                    />
                  </svg>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
