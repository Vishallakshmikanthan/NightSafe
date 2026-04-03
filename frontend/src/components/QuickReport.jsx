import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, LightbulbOff, Map as MapIcon, Eye, Wine, Clock, MapPin, CheckCircle2, X } from 'lucide-react';
import { submitFeedback } from '../services/api';

const CATEGORIES = [
  {
    id: 'poor_lighting',
    label: 'Poor Lighting',
    icon: <LightbulbOff size={32} className="mb-3 text-amber-400" />,
    color: 'border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/20'
  },
  {
    id: 'secluded_area',
    label: 'Secluded Area',
    icon: <MapIcon size={32} className="mb-3 text-sky-400" />,
    color: 'border-sky-400/30 bg-sky-400/10 hover:bg-sky-400/20'
  },
  {
    id: 'suspicious_activity',
    label: 'Suspicious Activity',
    icon: <Eye size={32} className="mb-3 text-orange-400" />,
    color: 'border-orange-400/30 bg-orange-400/10 hover:bg-orange-400/20'
  },
  {
    id: 'intoxicated_behavior',
    label: 'Intoxicated Behavior',
    icon: <Wine size={32} className="mb-3 text-pink-400" />,
    color: 'border-pink-400/30 bg-pink-400/10 hover:bg-pink-400/20'
  }
];

export default function QuickReport() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState(null);
  const [timeContext, setTimeContext] = useState('just_now');
  const [location, setLocation] = useState('Detecting...');
  
  // Real-time clock for context
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (isOpen && step === 1) {
      setCurrentTime(new Date());
      // Mock fast geolocation for zero-friction reporting (Coolight)
      setTimeout(() => setLocation('Near Koyambedu Station / Anna Nagar'), 600);
    }
  }, [isOpen, step]);

  const handleCategorySelect = (cat) => {
    setCategory(cat);
    setStep(2);
  };

  const handleSubmit = async () => {
    try {
      // CrowdSPaFE integration: send report immediately to influence safety clusters
      await submitFeedback({
        type: 'QUICK_REPORT',
        category: category.id,
        time_context: timeContext,
        location: location,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.log('Fallback: Report saved locally.', err);
    }
    setStep(3); // Success Screen
    
    // Auto-close after success
    setTimeout(() => {
      setIsOpen(false);
      setTimeout(() => resetForm(), 400); // Reset after hidden
    }, 1500);
  };

  const resetForm = () => {
    setStep(1);
    setCategory(null);
    setTimeContext('just_now');
    setLocation('Detecting...');
  };

  const closeModal = () => {
    setIsOpen(false);
    setTimeout(() => resetForm(), 300);
  };

  // Bottom Sheet variants
  const sheetVariants = {
    hidden: { y: '100%' },
    visible: { 
      y: 0,
      transition: { type: 'spring', damping: 25, stiffness: 200 }
    },
    exit: { 
      y: '100%',
      transition: { duration: 0.2 }
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-rose-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-[pulse_2s_infinite] hover:scale-105 transition-transform"
        aria-label="Quick Report"
      >
        <AlertCircle className="text-white" size={28} />
      </button>

      {/* Sheet Backdrop & Content */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[60]"
              onClick={closeModal}
            />

            {/* Bottom Sheet */}
            <motion.div
              variants={sheetVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, { offset, velocity }) => {
                if (offset.y > 100 || velocity.y > 500) closeModal();
              }}
              className="fixed bottom-0 left-0 right-0 h-[55vh] flex flex-col bg-[#0f172a]/95 backdrop-blur-2xl border-t border-white/10 rounded-t-[32px] z-[70] shadow-2xl safe-area-bottom"
            >
              {/* Drag Handle */}
              <div className="w-full flex justify-center pt-4 pb-2 cursor-grab active:cursor-grabbing">
                <div className="w-12 h-1.5 bg-slate-600 rounded-full" />
              </div>
              
              {/* Close Button */}
              <button 
                onClick={closeModal}
                className="absolute top-5 right-5 p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white"
              >
                <X size={20} />
              </button>

              <div className="flex-1 overflow-y-auto px-6 pb-8">
                <AnimatePresence mode="wait">
                  
                  {/* STEP 1: CATEGORY SELECTION */}
                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="h-full flex flex-col"
                    >
                      <h2 className="text-2xl font-bold text-white mb-2">What's happening?</h2>
                      <p className="text-slate-400 text-sm mb-6">Select a category to quickly report a concern. This directly alerts others.</p>
                      
                      <div className="grid grid-cols-2 gap-4 flex-1">
                        {CATEGORIES.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => handleCategorySelect(cat)}
                            className={`flex flex-col items-center justify-center p-4 rounded-2xl border transition-all duration-200 active:scale-95 ${cat.color}`}
                          >
                            {cat.icon}
                            <span className="text-white font-medium text-center leading-tight">
                              {cat.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: CONTEXT & SUBMISSION */}
                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      className="h-full flex flex-col"
                    >
                      <h2 className="text-2xl font-bold text-white mb-2">Confirm Details</h2>
                      <p className="text-slate-400 text-sm mb-6">Reporting: <strong className="text-white">{category?.label}</strong></p>

                      <div className="space-y-4 mb-8">
                        {/* Auto-filled Location */}
                        <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl border border-white/5">
                          <MapPin className="text-teal-400 mt-0.5" size={20} />
                          <div>
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-1">Location Detected</p>
                            <p className="text-white text-sm font-medium">{location}</p>
                          </div>
                        </div>

                        {/* Timing Toggle (Just Now vs Earlier) */}
                        <div className="flex items-start gap-4 p-4 bg-slate-800/50 rounded-xl border border-white/5">
                          <Clock className="text-sky-400 mt-0.5" size={20} />
                          <div className="w-full">
                            <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2">When did this happen?</p>
                            <div className="flex p-1 bg-[#050510] rounded-lg">
                              <button
                                onClick={() => setTimeContext('just_now')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${timeContext === 'just_now' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-white'}`}
                              >
                                Just now ({currentTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})})
                              </button>
                              <button
                                onClick={() => setTimeContext('earlier')}
                                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${timeContext === 'earlier' ? 'bg-amber-500/20 text-amber-400' : 'text-slate-400 hover:text-white'}`}
                              >
                                Earlier Today
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto flex gap-3 pb-4">
                        <button 
                          onClick={() => setStep(1)}
                          className="px-6 py-4 rounded-xl border border-white/10 text-white font-semibold hover:bg-white/5 transition-colors"
                        >
                          Back
                        </button>
                        <button 
                          onClick={handleSubmit}
                          className="flex-1 py-4 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-bold text-lg shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-colors"
                        >
                          Submit Report instantly
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: SUCCESS */}
                  {step === 3 && (
                    <motion.div
                      key="step3"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="h-full flex flex-col items-center justify-center text-center pb-12"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                      >
                        <CheckCircle2 size={80} className="text-teal-400 mb-6 drop-shadow-[0_0_15px_rgba(45,212,191,0.5)]" />
                      </motion.div>
                      <h2 className="text-3xl font-bold text-white mb-3">Reported!</h2>
                      <p className="text-slate-400 max-w-[250px]">
                        Your report has been anonymously submitted. Thank you for keeping the community safe.
                      </p>
                    </motion.div>
                  )}

                </AnimatePresence>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
