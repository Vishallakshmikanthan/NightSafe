import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Heart, Phone, FileText, Save, Edit3, ShieldCheck, X } from 'lucide-react';

const PROFILE_KEY = 'nightsafe_safety_profile';

const BLOOD_GROUPS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−', 'Unknown'];

function loadProfile() {
  try {
    const data = localStorage.getItem(PROFILE_KEY);
    if (data) return JSON.parse(data);
  } catch (_) {}
  return {
    name: '',
    bloodGroup: 'Unknown',
    emergencyContact: '',
    emergencyContactName: '',
    medicalNotes: '',
    allergies: '',
  };
}

function saveProfile(profile) {
  try {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (_) {}
}

export default function Profile() {
  const [profile, setProfile] = useState(loadProfile);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(profile);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setProfile(draft);
    saveProfile(draft);
    setIsEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleCancel = () => {
    setDraft(profile);
    setIsEditing(false);
  };

  const update = (key, value) => setDraft(prev => ({ ...prev, [key]: value }));

  const isEmpty = !profile.name && !profile.emergencyContact;

  return (
    <div className="h-full overflow-y-auto hide-scrollbar px-6 py-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Safety Profile</h1>
          <p className="text-xs text-slate-500 mt-1">Emergency information visible to first responders</p>
        </div>
        {isEditing ? (
          <div className="flex gap-2">
            <button onClick={handleCancel} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
              <X size={11} /> Cancel
            </button>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-black"
              style={{ background: 'linear-gradient(135deg, #00F5D4, #00C4AA)', boxShadow: '0 0 16px rgba(0,245,212,0.35)' }}>
              <Save size={11} /> Save
            </motion.button>
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => { setDraft(profile); setIsEditing(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
            style={{
              background: 'rgba(0,245,212,0.12)',
              border: '1px solid rgba(0,245,212,0.35)',
              color: '#00F5D4',
            }}
          >
            <Edit3 size={12} /> Edit
          </motion.button>
        )}
      </div>

      {/* Save confirmation */}
      <AnimatePresence>
        {saved && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="mb-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm"
            style={{ background: 'rgba(0,245,212,0.08)', border: '1px solid rgba(0,245,212,0.3)', color: '#00F5D4' }}>
            <ShieldCheck size={14} /> Profile saved securely on this device
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state nudge */}
      {isEmpty && !isEditing && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="mb-5 px-4 py-3.5 rounded-xl text-xs text-slate-400"
          style={{ background: 'rgba(255,183,3,0.07)', border: '1px solid rgba(255,183,3,0.2)' }}>
          ⚠️ Your profile is empty. Tap <strong className="text-white">Edit</strong> to add emergency information — it could save your life.
        </motion.div>
      )}

      <div className="grid gap-4">
        {/* Personal Info Card */}
        <ProfileCard
          title="Personal Information"
          icon={<User size={14} color="#00F5D4" />}
          color="#00F5D4"
        >
          <Field label="Full Name" icon="👤">
            {isEditing
              ? <input value={draft.name} onChange={e => update('name', e.target.value)} placeholder="Your name" maxLength={80} className={inputClass} />
              : <Value>{profile.name || '—'}</Value>}
          </Field>
        </ProfileCard>

        {/* Medical Info Card */}
        <ProfileCard
          title="Medical Information"
          icon={<Heart size={14} color="#FF4D6D" />}
          color="#FF4D6D"
        >
          <Field label="Blood Group" icon="🩸">
            {isEditing
              ? (
                <select value={draft.bloodGroup} onChange={e => update('bloodGroup', e.target.value)} className={inputClass}>
                  {BLOOD_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              )
              : <Value accent="#FF4D6D">{profile.bloodGroup || 'Unknown'}</Value>}
          </Field>
          <Field label="Allergies / Conditions" icon="⚕️">
            {isEditing
              ? <input value={draft.allergies} onChange={e => update('allergies', e.target.value)} placeholder="e.g. Penicillin, Peanuts" maxLength={120} className={inputClass} />
              : <Value>{profile.allergies || '—'}</Value>}
          </Field>
          <Field label="Medical Notes" icon="📋">
            {isEditing
              ? (
                <textarea value={draft.medicalNotes} onChange={e => update('medicalNotes', e.target.value)}
                  placeholder="Medications, conditions, doctor info..." maxLength={300} rows={3}
                  className={`${inputClass} resize-none`} />
              )
              : <Value>{profile.medicalNotes || '—'}</Value>}
          </Field>
        </ProfileCard>

        {/* Emergency Contact Card */}
        <ProfileCard
          title="Emergency Contact"
          icon={<Phone size={14} color="#FFB703" />}
          color="#FFB703"
        >
          <Field label="Contact Name" icon="👥">
            {isEditing
              ? <input value={draft.emergencyContactName} onChange={e => update('emergencyContactName', e.target.value)} placeholder="Contact person's name" maxLength={80} className={inputClass} />
              : <Value>{profile.emergencyContactName || '—'}</Value>}
          </Field>
          <Field label="Phone Number" icon="📞">
            {isEditing
              ? <input value={draft.emergencyContact} onChange={e => update('emergencyContact', e.target.value)} placeholder="+91 98765 43210" maxLength={20} type="tel" className={inputClass} />
              : <Value accent="#FFB703">{profile.emergencyContact || '—'}</Value>}
          </Field>
        </ProfileCard>

        {/* Emergency Card preview */}
        {!isEditing && (profile.name || profile.emergencyContact) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(255,77,109,0.12) 0%, rgba(255,77,109,0.05) 100%)',
              border: '1px solid rgba(255,77,109,0.3)',
              boxShadow: '0 0 30px rgba(255,77,109,0.08)',
            }}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">🆘</span>
              <span className="text-xs font-black text-white uppercase tracking-wider">Emergency Info Card</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <InfoItem label="Name" value={profile.name || '—'} />
              <InfoItem label="Blood" value={profile.bloodGroup} accent="#FF4D6D" />
              <InfoItem label="Emergency Contact" value={profile.emergencyContactName || '—'} />
              <InfoItem label="Phone" value={profile.emergencyContact || '—'} accent="#FFB703" />
              {profile.allergies && <InfoItem label="Allergies" value={profile.allergies} accent="#FF4D6D" colSpan />}
              {profile.medicalNotes && <InfoItem label="Notes" value={profile.medicalNotes} colSpan />}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const inputClass = "w-full bg-transparent rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 outline-none border border-white/10 focus:border-[#00F5D4]/50 transition-colors";

function ProfileCard({ title, icon, color, children }) {
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{
        background: 'rgba(5,5,16,0.8)',
        border: `1px solid ${color}20`,
        boxShadow: `0 0 20px ${color}08`,
      }}>
      <div className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: `${color}08` }}>
        {icon}
        <span className="text-xs font-bold text-white uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4 flex flex-col gap-3">{children}</div>
    </div>
  );
}

function Field({ label, icon, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold flex items-center gap-1.5">
        <span>{icon}</span>{label}
      </label>
      {children}
    </div>
  );
}

function Value({ children, accent }) {
  return (
    <span className="text-sm font-medium" style={{ color: accent || 'rgba(255,255,255,0.85)' }}>
      {children}
    </span>
  );
}

function InfoItem({ label, value, accent, colSpan }) {
  return (
    <div className={colSpan ? 'col-span-2' : ''}>
      <p className="text-[9px] text-slate-600 uppercase tracking-wider font-bold mb-0.5">{label}</p>
      <p className="text-xs font-bold truncate" style={{ color: accent || 'rgba(255,255,255,0.8)' }}>{value}</p>
    </div>
  );
}
