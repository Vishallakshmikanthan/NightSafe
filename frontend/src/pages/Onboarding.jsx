import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, LightbulbOff, Users, Map, AlertTriangle, ArrowRight, UserPlus, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Assuming react-router is used

const ONBOARDING_STEPS = [
  { id: 1, title: 'Concerns' },
  { id: 2, title: 'Preferences' },
  { id: 3, title: 'Emergency' }
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [preferences, setPreferences] = useState({
    concerns: {
      poor_lighting: false,
      low_footfall: false,
      unfamiliar_area: false,
      erratic_behavior: false
    },
    weights: {
      lighting: 50,
      footfall: 50,
      crime: 50,
      familiarity: 50
    },
    emergencyContact: ''
  });

  // Load existing if any
  useEffect(() => {
    const saved = localStorage.getItem('nightsafe_preferences');
    if (saved) {
      try {
        setPreferences(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse saved preferences');
      }
    }
  }, []);

  const handleConcernToggle = (key) => {
    setPreferences(prev => ({
      ...prev,
      concerns: {
        ...prev.concerns,
        [key]: !prev.concerns[key]
      }
    }));
  };

  const handleWeightChange = (key, value) => {
    setPreferences(prev => ({
      ...prev,
      weights: {
        ...prev.weights,
        [key]: parseInt(value, 10)
      }
    }));
  };

  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    } else {
      // Complete
      localStorage.setItem('nightsafe_preferences', JSON.stringify(preferences));
      navigate('/'); // Redirect to map or dashboard
    }
  };

  const skipToMap = () => {
    localStorage.setItem('nightsafe_preferences', JSON.stringify(preferences));
    navigate('/');
  };

  const slideVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 }
  };

  return (
    <div className="min-h-screen bg-[#050510] text-white flex flex-col items-center justify-center p-6 font-inter relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-rose-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 glass-card rounded-3xl p-8 backdrop-blur-xl bg-[#0f172a]/80 border border-white/10 shadow-2xl relative">
        
        {/* Header & Progress */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="text-teal-400" size={28} />
            <h1 className="text-2xl font-space font-bold">Personalize Safety</h1>
          </div>
          
          <div className="flex justify-between items-end mb-2">
            <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">Step {currentStep} of 3</span>
            <button onClick={skipToMap} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">Skip</button>
          </div>
          
          {/* Progress Bar */}
          <div className="flex gap-2 w-full">
            {ONBOARDING_STEPS.map((s) => (
              <div 
                key={s.id} 
                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${s.id <= currentStep ? 'bg-teal-400' : 'bg-slate-700'}`}
              />
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="min-h-[300px]">
          <AnimatePresence mode="wait">
            
            {/* STEP 1 */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="flex flex-col h-full"
              >
                <h2 className="text-xl font-semibold mb-2">What makes you feel unsafe?</h2>
                <p className="text-slate-400 text-sm mb-6">Select all that apply. Your route will adapt to avoid these factors.</p>
                
                <div className="space-y-3">
                  <button 
                    onClick={() => handleConcernToggle('poor_lighting')}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${preferences.concerns.poor_lighting ? 'bg-amber-400/20 border-amber-400/50 text-white' : 'bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-800'}`}
                  >
                    <LightbulbOff size={20} className={preferences.concerns.poor_lighting ? 'text-amber-400' : 'text-slate-500'} />
                    <span className="font-medium">Poor lighting</span>
                  </button>

                  <button 
                    onClick={() => handleConcernToggle('low_footfall')}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${preferences.concerns.low_footfall ? 'bg-sky-400/20 border-sky-400/50 text-white' : 'bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-800'}`}
                  >
                    <Users size={20} className={preferences.concerns.low_footfall ? 'text-sky-400' : 'text-slate-500'} />
                    <span className="font-medium">Low footfall</span>
                  </button>

                  <button 
                    onClick={() => handleConcernToggle('unfamiliar_area')}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${preferences.concerns.unfamiliar_area ? 'bg-teal-400/20 border-teal-400/50 text-white' : 'bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-800'}`}
                  >
                    <Map size={20} className={preferences.concerns.unfamiliar_area ? 'text-teal-400' : 'text-slate-500'} />
                    <span className="font-medium">Unfamiliar area</span>
                  </button>

                  <button 
                    onClick={() => handleConcernToggle('erratic_behavior')}
                    className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${preferences.concerns.erratic_behavior ? 'bg-rose-400/20 border-rose-400/50 text-white' : 'bg-slate-800/50 border-white/5 text-slate-300 hover:bg-slate-800'}`}
                  >
                    <AlertTriangle size={20} className={preferences.concerns.erratic_behavior ? 'text-rose-400' : 'text-slate-500'} />
                    <span className="font-medium">Erratic behavior</span>
                  </button>
                </div>
              </motion.div>
            )}

            {/* STEP 2 */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="flex flex-col h-full"
              >
                <h2 className="text-xl font-semibold mb-2">Adjust your routing weights</h2>
                <p className="text-slate-400 text-sm mb-6">Fine-tune how the algorithm calculates your safest path.</p>

                <div className="space-y-6">
                  {/* Lighting slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300 flex items-center gap-2"><LightbulbOff size={14}/> Lighting Importance</span>
                      <span className="text-teal-400 font-mono">{preferences.weights.lighting}%</span>
                    </div>
                    <input 
                      type="range" className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
                      min="0" max="100" value={preferences.weights.lighting} onChange={(e) => handleWeightChange('lighting', e.target.value)}
                    />
                  </div>

                  {/* Footfall slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300 flex items-center gap-2"><Users size={14}/> Crowd/Footfall Priority</span>
                      <span className="text-teal-400 font-mono">{preferences.weights.footfall}%</span>
                    </div>
                    <input 
                      type="range" className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
                      min="0" max="100" value={preferences.weights.footfall} onChange={(e) => handleWeightChange('footfall', e.target.value)}
                    />
                  </div>

                  {/* Crime slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300 flex items-center gap-2"><Shield size={14}/> Crime Avoidance</span>
                      <span className="text-teal-400 font-mono">{preferences.weights.crime}%</span>
                    </div>
                    <input 
                      type="range" className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
                      min="0" max="100" value={preferences.weights.crime} onChange={(e) => handleWeightChange('crime', e.target.value)}
                    />
                  </div>

                  {/* Familiarity slider */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-300 flex items-center gap-2"><Map size={14}/> Stick to Familiar Roads</span>
                      <span className="text-teal-400 font-mono">{preferences.weights.familiarity}%</span>
                    </div>
                    <input 
                      type="range" className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-teal-400"
                      min="0" max="100" value={preferences.weights.familiarity} onChange={(e) => handleWeightChange('familiarity', e.target.value)}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3 */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.3 }}
                className="flex flex-col h-full"
              >
                <div className="flex justify-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-rose-500/20 flex items-center justify-center">
                    <UserPlus className="text-rose-400" size={32} />
                  </div>
                </div>
                
                <h2 className="text-xl font-semibold mb-2 text-center">Emergency Contact</h2>
                <p className="text-slate-400 text-sm mb-6 text-center">
                  Stored <strong className="text-white">securely on this device only</strong>. We never upload your contacts.
                </p>

                <div className="space-y-4">
                  <div className="relative">
                    <input 
                      type="tel"
                      placeholder="Phone number"
                      value={preferences.emergencyContact}
                      onChange={(e) => setPreferences(prev => ({...prev, emergencyContact: e.target.value}))}
                      className="w-full bg-slate-800/80 border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-400 transition-all font-mono"
                    />
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 bg-slate-800/40 rounded-lg border border-slate-700/50">
                    <Shield size={16} className="text-teal-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-slate-400 leading-relaxed">
                      This information enables the one-tap SOS feature during navigation. Data never leaves your phone's local storage.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-8 pt-6 border-t border-white/10">
          <button 
            onClick={nextStep}
            className="w-full py-3.5 bg-teal-500 hover:bg-teal-400 text-slate-900 font-bold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-teal-500/20"
          >
            {currentStep === 3 ? (
              <>Complete Setup <CheckCircle size={18} /></>
            ) : (
              <>Continue <ArrowRight size={18} /></>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
