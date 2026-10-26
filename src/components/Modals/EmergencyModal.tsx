import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  HeartPulse,
  Radio,
  ShieldAlert,
  Clock,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext';
import type { EmergencyType, EmergencySeverity } from '../../types';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, triggerEmergency } = useTeam();

  const [type, setType] = useState<EmergencyType>('MEDICAL_EMERGENCY');
  const [severity, setSeverity] = useState<EmergencySeverity>('URGENT');
  const [message, setMessage] = useState<string>('');
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);

  // Hold-to-activate 1.5s timer
  useEffect(() => {
    let interval: any = null;
    if (isHolding) {
      interval = setInterval(() => {
        setHoldProgress((p) => {
          if (p >= 100) {
            clearInterval(interval);
            handleActivate();
            return 100;
          }
          return p + 7;
        });
      }, 50);
    } else {
      setHoldProgress(0);
    }
    return () => clearInterval(interval);
  }, [isHolding]);

  if (!isOpen) return null;

  const handleActivate = () => {
    setIsHolding(false);
    setHoldProgress(0);
    triggerEmergency(type, severity, message.trim() || 'Immediate team assistance requested.');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-red-200 overflow-hidden text-slate-900"
      >
        {/* Header */}
        <div className="bg-red-600 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
              <ShieldAlert className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">
                Emergency Alert Dispatch
              </h3>
              <p className="text-red-100 text-xs leading-tight">
                Instant broadcast to all authorized team devices
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* 1. Emergency Category */}
          <div>
            <label className="block text-slate-500 font-bold uppercase tracking-wider mb-2">
              1. Emergency Category
            </label>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                type="button"
                onClick={() => setType('MEDICAL_EMERGENCY')}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                  type === 'MEDICAL_EMERGENCY'
                    ? 'bg-red-50 border-red-500 text-red-900 ring-2 ring-red-300 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <HeartPulse className="w-5 h-5 text-red-600 mb-1" />
                <span>Medical Injury</span>
              </button>

              <button
                type="button"
                onClick={() => setType('DISTRESS_SIGNAL')}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                  type === 'DISTRESS_SIGNAL'
                    ? 'bg-red-50 border-red-500 text-red-900 ring-2 ring-red-300 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Radio className="w-5 h-5 text-rose-600 mb-1" />
                <span>Distress Beacon</span>
              </button>

              <button
                type="button"
                onClick={() => setType('THREAT_ALERT')}
                className={`p-3 rounded-2xl border text-center transition flex flex-col items-center justify-center ${
                  type === 'THREAT_ALERT'
                    ? 'bg-amber-50 border-amber-500 text-amber-900 ring-2 ring-amber-300 font-bold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <AlertTriangle className="w-5 h-5 text-amber-600 mb-1" />
                <span>Hazard / Threat</span>
              </button>
            </div>
          </div>

          {/* 2. Severity */}
          <div>
            <label className="block text-slate-500 font-bold uppercase tracking-wider mb-2">
              2. Urgency Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setSeverity('URGENT')}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition ${
                  severity === 'URGENT'
                    ? 'bg-red-600 text-white border-red-600'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                Urgent (Immediate)
              </button>
              <button
                type="button"
                onClick={() => setSeverity('NEED_ASSISTANCE')}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition ${
                  severity === 'NEED_ASSISTANCE'
                    ? 'bg-amber-600 text-white border-amber-600'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                Assistance Needed
              </button>
              <button
                type="button"
                onClick={() => setSeverity('STABLE')}
                className={`py-2 px-3 rounded-xl border text-center font-bold transition ${
                  severity === 'STABLE'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}
              >
                Stable / Standby
              </button>
            </div>
          </div>

          {/* 3. Note */}
          <div>
            <label className="block text-slate-500 font-bold uppercase tracking-wider mb-1">
              3. Specific Situation or Needs (Optional)
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g. Field fracture on right leg. Splint and extraction needed near river bank."
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl outline-none focus:border-red-500 min-h-[70px] text-xs"
            />
          </div>

          {/* Coordinates Summary */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[11px] font-mono text-slate-600">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <span>
                Coordinates: {currentUser.location.lat.toFixed(4)}° N,{' '}
                {currentUser.location.lng.toFixed(4)}° E
              </span>
            </div>
            <span className="text-slate-400">Reporter: {currentUser.name}</span>
          </div>

          {/* Hold to Activate Button (Prevents Accidental Triggers) */}
          <div className="pt-2">
            <button
              type="button"
              onMouseDown={() => setIsHolding(true)}
              onMouseUp={() => setIsHolding(false)}
              onMouseLeave={() => setIsHolding(false)}
              onTouchStart={() => setIsHolding(true)}
              onTouchEnd={() => setIsHolding(false)}
              className="relative w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm shadow-lg overflow-hidden transition active:scale-[0.99]"
            >
              {/* Progress fill bar */}
              <div
                className="absolute inset-0 bg-red-800 transition-all duration-75 pointer-events-none"
                style={{ width: `${holdProgress}%` }}
              />

              <span className="relative z-10 flex items-center justify-center gap-2">
                <HeartPulse className="w-5 h-5 animate-pulse" />
                {isHolding
                  ? `HOLDING... ${Math.round(holdProgress)}%`
                  : 'PRESS & HOLD TO BROADCAST EMERGENCY (1.5s)'}
              </span>
            </button>

            <div className="text-center mt-2">
              <button
                type="button"
                onClick={handleActivate}
                className="text-[11px] text-red-600 hover:underline font-medium"
              >
                Or tap once to trigger immediately (Test Drill)
              </button>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 text-center leading-normal">
            Notice: SAHYOG coordinates authorized field units in your network. This does not contact public civil emergency services (112 / 911).
          </p>
        </div>
      </div>
    </div>
  );
};
