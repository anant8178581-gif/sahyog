import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Share2,
  Copy,
  Check,
  Phone,
  Crosshair,
  LogOut,
  Battery,
  BatteryCharging,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext';
import type { MemberRole } from '../../types';

interface TeamViewProps {
  onBackToMap: () => void;
}

export const TeamView: React.FC<TeamViewProps> = ({ onBackToMap }) => {
  const {
    teamCode,
    currentUser,
    members,
    joinTeam,
    leaveTeam,
    startVoiceCall,
    setMapCenter,
    setSelectedMemberId,
  } = useTeam();

  const [inputCode, setInputCode] = useState<string>('');
  const [nickname, setNickname] = useState<string>('');
  const [role, setRole] = useState<MemberRole>('Operator');
  const [copied, setCopied] = useState<boolean>(false);
  const [isJoinOpen, setIsJoinOpen] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'SOLDIERS' | 'MEDICS'>('ALL');

  const filteredMembers = members.filter((m) => {
    if (categoryFilter === 'SOLDIERS') return m.role !== 'Medic';
    if (categoryFilter === 'MEDICS') return m.role === 'Medic';
    return true;
  });

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(teamCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCode.trim()) {
      joinTeam(inputCode.trim(), nickname.trim() || currentUser.name, role);
      setIsJoinOpen(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6 select-none animate-in fade-in">
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              Field Team Roster
            </h2>
            <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1 rounded-xl text-xs font-mono font-bold border border-blue-200">
              <span>Code: {teamCode}</span>
              <button
                onClick={handleCopyCode}
                className="p-1 hover:text-blue-900 transition"
                title="Copy Room Invitation Code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Share code <span className="font-bold text-slate-700">{teamCode}</span> with field personnel to synchronize location, emergencies, and voice calling.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsJoinOpen(!isJoinOpen)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>Join or Switch Team</span>
          </button>
          <button
            onClick={onBackToMap}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
          >
            Return to Map
          </button>
        </div>
      </div>

      {/* Join/Create Form Drawer */}
      {isJoinOpen && (
        <form
          onSubmit={handleJoin}
          className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 animate-in fade-in text-xs"
        >
          <h3 className="font-bold text-sm text-slate-800">
            Connect to New Field Sector / Team Code
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-500 font-bold mb-1">6-Character Team Code</label>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="e.g. DEF-409"
                maxLength={8}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 uppercase font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Your Callsign / Nickname</label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="e.g. Bravo-1"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Field Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600"
              >
                <option value="Team Leader">Team Leader</option>
                <option value="Recon">Recon</option>
                <option value="Support">Support</option>
                <option value="Medic">Medic</option>
                <option value="Operator">Operator</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsJoinOpen(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
            >
              Connect Team
            </button>
          </div>
        </form>
      )}

      {/* Category Tabs: All Units, Combat Soldiers, Medicine Team */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center bg-white p-1 rounded-2xl shadow-xs border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setCategoryFilter('ALL')}
            className={`px-4 py-2 rounded-xl transition ${
              categoryFilter === 'ALL'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Operational Units ({members.length})
          </button>
          <button
            onClick={() => setCategoryFilter('SOLDIERS')}
            className={`px-4 py-2 rounded-xl transition ${
              categoryFilter === 'SOLDIERS'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Combat & Recon Soldiers ({members.filter((m) => m.role !== 'Medic').length})
          </button>
          <button
            onClick={() => setCategoryFilter('MEDICS')}
            className={`px-4 py-2 rounded-xl transition flex items-center gap-1.5 ${
              categoryFilter === 'MEDICS'
                ? 'bg-red-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            Medicine & Evac Team ({members.filter((m) => m.role === 'Medic').length})
          </button>
        </div>

        <span className="text-xs font-mono text-slate-500">
          Showing {filteredMembers.length} unit(s)
        </span>
      </div>

      {/* Members Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {filteredMembers.map((member) => (
          <div
            key={member.id}
            className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-14 h-16 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shadow-inner shrink-0 p-1">
                  <img
                    src={
                      member.role === 'Medic'
                        ? '/assets/aistudio/image_ba22c148.png'
                        : '/assets/aistudio/image_da532834.png'
                    }
                    alt={member.name}
                    className="w-full h-full object-contain"
                  />
                </div>
                <span
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                    member.condition === 'ALL_CLEAR'
                      ? 'bg-emerald-50 text-emerald-700'
                      : member.condition === 'CAUTION'
                      ? 'bg-amber-50 text-amber-700'
                      : 'bg-red-50 text-red-700'
                  }`}
                >
                  {member.statusLabel}
                </span>
              </div>

              <h4 className="font-extrabold text-base text-slate-900">
                {member.name}{' '}
                {member.isCurrent && <span className="text-blue-600 text-xs font-normal">(You)</span>}
              </h4>
              <p className="text-slate-500 text-xs">{member.role}</p>

              {member.conditionNote && (
                <p className="mt-2 text-xs italic text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                  "{member.conditionNote}"
                </p>
              )}
            </div>

            <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex items-center justify-between text-slate-500">
                <span>Battery Level:</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 font-mono">
                  {member.isCharging ? (
                    <BatteryCharging className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Battery className="w-3.5 h-3.5 text-slate-400" />
                  )}
                  {member.batteryLevel !== null ? `${member.batteryLevel}%` : 'Unavailable'}
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-500">
                <span>Coordinates:</span>
                <span className="font-mono text-[11px] text-slate-700 font-medium">
                  {member.location.lat.toFixed(4)}°, {member.location.lng.toFixed(4)}°
                </span>
              </div>

              <div className="flex items-center justify-between text-slate-500">
                <span>Last Telemetry:</span>
                <span className="text-slate-700 font-medium">
                  {new Date(member.lastSeen).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setMapCenter(member.location);
                    setSelectedMemberId(member.id);
                    onBackToMap();
                  }}
                  className="flex-1 flex items-center justify-center gap-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-semibold transition"
                >
                  <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                  Locate
                </button>
                {!member.isCurrent && (
                  <button
                    onClick={() => startVoiceCall(member.id)}
                    className="flex-1 flex items-center justify-center gap-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    Call Voice
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
