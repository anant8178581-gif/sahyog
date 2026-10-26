import React, { useState } from 'react';
import {
  Flag,
  Users,
  MapPin,
  Route,
  ShieldCheck,
  AlertTriangle,
  LifeBuoy,
  Plus,
  Send,
  CheckCircle2,
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext';
import { calculateHaversineDistance, formatDistance } from '../../utils/geo';
import type { MemberCondition } from '../../types';

interface BottomActionsProps {
  onOpenCheckpointModal?: () => void;
  onOpenRouteModal?: () => void;
}

export const BottomActions: React.FC<BottomActionsProps> = ({
  onOpenCheckpointModal,
  onOpenRouteModal,
}) => {
  const {
    currentUser,
    members,
    updateCurrentCondition,
    sendMessage,
    planRouteTo,
    setMapCenter,
    setSelectedMemberId,
    requestRealGeolocation,
  } = useTeam();

  const [conditionNote, setConditionNote] = useState<string>('');
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  // 1. Find Nearest Teammate
  const handleFindNearestTeammate = () => {
    const others = members.filter((m) => !m.isCurrent);
    if (others.length === 0) {
      showFeedback('No other teammates detected in local sector.');
      return;
    }

    let nearest = others[0];
    let shortestDist = calculateHaversineDistance(currentUser.location, nearest.location);

    for (const m of others) {
      const dist = calculateHaversineDistance(currentUser.location, m.location);
      if (dist < shortestDist) {
        shortestDist = dist;
        nearest = m;
      }
    }

    setMapCenter(nearest.location);
    setSelectedMemberId(nearest.id);
    planRouteTo(nearest.location, nearest.name);
    showFeedback(
      `Nearest: ${nearest.name} (${nearest.role}) at ${formatDistance(shortestDist)}. Route planned.`
    );
  };

  // 2. Share My Location
  const handleShareLocation = () => {
    requestRealGeolocation();
    sendMessage(
      `📍 My current GPS coordinates: ${currentUser.location.lat.toFixed(4)}° N, ${currentUser.location.lng.toFixed(4)}° E (Status: ${currentUser.statusLabel})`
    );
    showFeedback('Live coordinates broadcasted to team channel.');
  };

  // 3. Condition Change
  const handleSelectCondition = (cond: MemberCondition) => {
    updateCurrentCondition(cond, conditionNote.trim() || undefined);
    showFeedback(`Condition updated to ${cond.replace('_', ' ')}.`);
  };

  const handleNoteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (conditionNote.trim()) {
      updateCurrentCondition(currentUser.condition, conditionNote.trim());
      showFeedback(`Note updated: "${conditionNote.trim()}"`);
      setConditionNote('');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 select-none">
      {/* Toast Feedback */}
      {feedbackMsg && (
        <div className="lg:col-span-12 bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
          <span>{feedbackMsg}</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        </div>
      )}

      {/* Quick Actions (Matches Screenshot) */}
      <div className="lg:col-span-5 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-3">
          Quick Actions
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* 1. Set Checkpoint */}
          <button
            onClick={onOpenCheckpointModal}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-100 transition group active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-white shadow-2xs flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <Flag className="w-4 h-4 text-blue-600 fill-blue-600" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
              Set Checkpoint
            </span>
          </button>

          {/* 2. Find Nearest Teammate */}
          <button
            onClick={handleFindNearestTeammate}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-100 transition group active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-white shadow-2xs flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <Users className="w-4 h-4 text-sky-600" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
              Find Nearest
            </span>
          </button>

          {/* 3. Share My Location */}
          <button
            onClick={handleShareLocation}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100 transition group active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-white shadow-2xs flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <MapPin className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
              Share Location
            </span>
          </button>

          {/* 4. Plan Route */}
          <button
            onClick={onOpenRouteModal}
            className="flex flex-col items-center justify-center p-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-100 transition group active:scale-95"
          >
            <div className="w-9 h-9 rounded-xl bg-white shadow-2xs flex items-center justify-center mb-1.5 group-hover:scale-105 transition">
              <Route className="w-4 h-4 text-indigo-600" />
            </div>
            <span className="text-[11px] font-bold text-slate-800 text-center leading-tight">
              Plan Route
            </span>
          </button>
        </div>
      </div>

      {/* Current Conditions (You) (Matches Screenshot) */}
      <div className="lg:col-span-7 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
            Current Conditions <span className="text-slate-600 font-semibold">(You)</span>
          </h3>
          <span className="text-xs font-semibold text-blue-600 cursor-pointer hover:underline">
            Edit
          </span>
        </div>

        {/* 4 Condition Selection Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {/* All Clear */}
          <button
            onClick={() => handleSelectCondition('ALL_CLEAR')}
            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
              currentUser.condition === 'ALL_CLEAR'
                ? 'bg-emerald-100 border-emerald-400 text-emerald-900 ring-2 ring-emerald-300'
                : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/70 text-emerald-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
            <span className="text-xs font-bold leading-tight">All Clear</span>
          </button>

          {/* Caution */}
          <button
            onClick={() => handleSelectCondition('CAUTION')}
            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
              currentUser.condition === 'CAUTION'
                ? 'bg-amber-100 border-amber-400 text-amber-900 ring-2 ring-amber-300'
                : 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/70 text-amber-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-600 mx-auto mb-1" />
            <span className="text-xs font-bold leading-tight">Caution</span>
          </button>

          {/* Need Assistance */}
          <button
            onClick={() => handleSelectCondition('NEED_ASSISTANCE')}
            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
              currentUser.condition === 'NEED_ASSISTANCE'
                ? 'bg-orange-100 border-orange-400 text-orange-900 ring-2 ring-orange-300'
                : 'bg-orange-50/70 border-orange-200 hover:bg-orange-100/70 text-orange-800'
            }`}
          >
            <LifeBuoy className="w-4 h-4 text-orange-600 mx-auto mb-1" />
            <span className="text-xs font-bold leading-tight">Need Assist</span>
          </button>

          {/* Medical Emergency */}
          <button
            onClick={() => handleSelectCondition('MEDICAL_EMERGENCY')}
            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
              currentUser.condition === 'MEDICAL_EMERGENCY'
                ? 'bg-red-100 border-red-400 text-red-900 ring-2 ring-red-300 animate-pulse'
                : 'bg-red-50/70 border-red-200 hover:bg-red-100/70 text-red-800'
            }`}
          >
            <Plus className="w-4 h-4 text-red-600 stroke-[3] mx-auto mb-1" />
            <span className="text-xs font-bold leading-tight">Medical</span>
          </button>
        </div>

        {/* Note input with paper airplane button */}
        <form onSubmit={handleNoteSubmit} className="relative flex items-center">
          <input
            type="text"
            value={conditionNote}
            onChange={(e) => setConditionNote(e.target.value)}
            placeholder={
              currentUser.conditionNote
                ? `Current: "${currentUser.conditionNote}"`
                : 'Add a quick note...'
            }
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition pr-10"
          />
          <button
            type="submit"
            className="absolute right-1.5 p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
