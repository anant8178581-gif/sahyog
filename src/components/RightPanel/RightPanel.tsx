import React, { useState } from 'react';
import {
  MoreVertical,
  Battery,
  BatteryCharging,
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  Radio,
  WifiOff,
  Plus,
  Send,
  Paperclip,
  Phone,
  Crosshair,
  User,
  ShieldAlert,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext';
import type { TeamMember, MemberCondition } from '../../types';

interface RightPanelProps {
  onOpenTeamModal?: () => void;
  onOpenEmergencyModal?: () => void;
  onOpenChatModal?: () => void;
}

export const RightPanel: React.FC<RightPanelProps> = ({
  onOpenTeamModal,
  onOpenEmergencyModal,
  onOpenChatModal,
}) => {
  const {
    teamCode,
    currentUser,
    members,
    messages,
    sendMessage,
    emergencies,
    startVoiceCall,
    setMapCenter,
    triggerEmergency,
    simulateTeammateMovement,
  } = useTeam();

  const [chatInput, setChatInput] = useState<string>('');
  const [activeMenuMemberId, setActiveMenuMemberId] = useState<string | null>(null);
  const [unitTab, setUnitTab] = useState<'ALL' | 'SOLDIERS' | 'MEDICS'>('ALL');

  // Filtered members list
  const filteredList = members.filter((m) => {
    if (unitTab === 'SOLDIERS') return m.role !== 'Medic';
    if (unitTab === 'MEDICS') return m.role === 'Medic';
    return true;
  });

  // Status Counts
  const allClearCount = members.filter((m) => m.condition === 'ALL_CLEAR').length;
  const cautionCount = members.filter((m) => m.condition === 'CAUTION').length;
  const emergencyCount = members.filter(
    (m) => m.condition === 'MEDICAL_EMERGENCY' || m.condition === 'NEED_ASSISTANCE'
  ).length;
  const offlineCount = members.filter((m) => m.condition === 'OFFLINE').length;

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatInput.trim()) {
      sendMessage(chatInput.trim());
      setChatInput('');
    }
  };

  return (
    <aside className="w-80 lg:w-96 bg-white border-l border-slate-200 flex flex-col justify-between shrink-0 select-none overflow-y-auto divide-y divide-slate-100 p-4 space-y-4">
      {/* 1. Team Members Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">
            Field Units ({members.length})
          </h3>
          <button
            onClick={onOpenTeamModal}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            View All
          </button>
        </div>

        {/* Soldiers vs Medicine Team Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-[11px] font-bold text-slate-600">
          <button
            onClick={() => setUnitTab('ALL')}
            className={`flex-1 py-1 rounded-lg transition ${
              unitTab === 'ALL' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
            }`}
          >
            All ({members.length})
          </button>
          <button
            onClick={() => setUnitTab('SOLDIERS')}
            className={`flex-1 py-1 rounded-lg transition ${
              unitTab === 'SOLDIERS' ? 'bg-white text-blue-700 shadow-2xs' : 'hover:text-slate-900'
            }`}
          >
            Soldiers
          </button>
          <button
            onClick={() => setUnitTab('MEDICS')}
            className={`flex-1 py-1 rounded-lg flex items-center justify-center gap-1 transition ${
              unitTab === 'MEDICS' ? 'bg-white text-red-600 shadow-2xs' : 'hover:text-slate-900'
            }`}
          >
            <HeartPulse className="w-3 h-3 text-red-500" />
            Medics
          </button>
        </div>

        <div className="space-y-2">
          {filteredList.map((member) => {
            let avatarBg = 'bg-blue-600';
            if (member.condition === 'CAUTION') avatarBg = 'bg-amber-600';
            if (member.condition === 'MEDICAL_EMERGENCY') avatarBg = 'bg-red-600';
            if (!member.isCurrent && member.condition === 'ALL_CLEAR')
              avatarBg = 'bg-emerald-600';

            return (
              <div
                key={member.id}
                className="relative flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-100"
              >
                <div className="flex items-center gap-3">
                  {/* 3D Character Avatar with status indicator */}
                  <div className="relative">
                    <div className="w-10 h-11 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shadow-2xs p-0.5">
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
                      className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${
                        member.condition === 'ALL_CLEAR'
                          ? 'bg-emerald-500'
                          : member.condition === 'CAUTION'
                          ? 'bg-amber-500'
                          : member.condition === 'MEDICAL_EMERGENCY'
                          ? 'bg-red-500'
                          : 'bg-slate-400'
                      }`}
                    />
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-800">
                        {member.name}
                      </span>
                      {member.isCurrent && (
                        <span className="text-[10px] text-blue-600 font-medium">
                          (You)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 font-medium">
                      <span>{member.role}</span>
                      <span>·</span>
                      <span className="flex items-center gap-0.5">
                        {member.isCharging ? (
                          <BatteryCharging className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Battery className="w-3 h-3 text-slate-400" />
                        )}
                        {member.batteryLevel !== null ? `${member.batteryLevel}%` : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                      member.condition === 'ALL_CLEAR'
                        ? 'bg-emerald-50 text-emerald-700'
                        : member.condition === 'CAUTION'
                        ? 'bg-amber-50 text-amber-700'
                        : member.condition === 'MEDICAL_EMERGENCY'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {member.statusLabel}
                  </span>

                  <button
                    onClick={() =>
                      setActiveMenuMemberId(
                        activeMenuMemberId === member.id ? null : member.id
                      )
                    }
                    className="p-1 text-slate-400 hover:text-slate-600 rounded"
                  >
                    <MoreVertical className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Dropdown Menu for Member Actions */}
                {activeMenuMemberId === member.id && (
                  <div className="absolute right-2 top-10 w-44 bg-white rounded-xl shadow-xl border border-slate-200 p-1.5 z-40 text-xs">
                    <button
                      onClick={() => {
                        setMapCenter(member.location);
                        setActiveMenuMemberId(null);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700"
                    >
                      <Crosshair className="w-3.5 h-3.5 text-blue-600" />
                      Center on Map
                    </button>
                    {!member.isCurrent && (
                      <button
                        onClick={() => {
                          startVoiceCall(member.id);
                          setActiveMenuMemberId(null);
                        }}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-slate-700"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        Call Teammate
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {members.length === 1 && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex flex-col gap-1.5 mt-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5 text-[11px]">
                  <Radio className="w-3.5 h-3.5 text-emerald-600 animate-pulse" /> Live Team: {teamCode}
                </span>
                <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  Cloud Live
                </span>
              </div>
              <p className="text-[10px] text-slate-500 leading-snug">
                Real multi-user telemetry active! Open this app on another tab or phone to see live tracking.
              </p>
              <button
                onClick={() => simulateTeammateMovement()}
                className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium text-[10px] border border-blue-200 transition"
              >
                <Sparkles className="w-3 h-3 text-blue-600" />
                <span>Test Marker Animation (Add Demo Teammate)</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Team Status Grid (Matches Screenshot) */}
      <div className="pt-4 space-y-2">
        <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
          Team Status
        </h3>

        <div className="grid grid-cols-4 gap-2">
          {/* All Clear */}
          <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100 text-center">
            <ShieldCheck className="w-4 h-4 text-emerald-600 mx-auto" />
            <div className="text-sm font-bold text-slate-800 mt-1">{allClearCount}</div>
            <div className="text-[10px] font-semibold text-emerald-700">All Clear</div>
          </div>

          {/* Caution */}
          <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100 text-center">
            <AlertTriangle className="w-4 h-4 text-amber-600 mx-auto" />
            <div className="text-sm font-bold text-slate-800 mt-1">{cautionCount}</div>
            <div className="text-[10px] font-semibold text-amber-700">Caution</div>
          </div>

          {/* Emergency */}
          <div className="p-2.5 rounded-xl bg-red-50 border border-red-100 text-center">
            <HeartPulse className="w-4 h-4 text-red-600 mx-auto" />
            <div className="text-sm font-bold text-slate-800 mt-1">{emergencyCount}</div>
            <div className="text-[10px] font-semibold text-red-700">Emergency</div>
          </div>

          {/* Offline */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-center">
            <WifiOff className="w-4 h-4 text-slate-500 mx-auto" />
            <div className="text-sm font-bold text-slate-800 mt-1">{offlineCount}</div>
            <div className="text-[10px] font-semibold text-slate-500">Offline</div>
          </div>
        </div>
      </div>

      {/* 3. Emergency Assist Card (Matches Screenshot) */}
      <div className="pt-4 space-y-2">
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 shadow-2xs">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
                <Plus className="w-6 h-6 stroke-[3.5]" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900 leading-tight">
                  Emergency Assist
                </h4>
                <p className="text-[10px] text-slate-500 leading-tight mt-0.5">
                  Alert your team instantly
                </p>
              </div>
            </div>

            <button
              onClick={onOpenEmergencyModal}
              className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition active:scale-95 whitespace-nowrap"
            >
              Tap to Alert
            </button>
          </div>

          {/* 3 Quick Trigger Options */}
          <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2.5 border-t border-red-100">
            <button
              onClick={() =>
                triggerEmergency('MEDICAL_EMERGENCY', 'URGENT', 'Immediate medical assistance requested.')
              }
              className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-center border border-red-100 transition"
            >
              <HeartPulse className="w-3.5 h-3.5 text-red-600 mx-auto" />
              <span className="block text-[9px] font-bold text-slate-700 mt-0.5">
                Medical
              </span>
            </button>

            <button
              onClick={() =>
                triggerEmergency('DISTRESS_SIGNAL', 'URGENT', 'Distress beacon activated. Immediate rally required.')
              }
              className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-center border border-red-100 transition"
            >
              <Radio className="w-3.5 h-3.5 text-rose-600 mx-auto" />
              <span className="block text-[9px] font-bold text-slate-700 mt-0.5">
                Distress
              </span>
            </button>

            <button
              onClick={() =>
                triggerEmergency('THREAT_ALERT', 'NEED_ASSISTANCE', 'Unverified threat detected in local sector.')
              }
              className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-center border border-red-100 transition"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 mx-auto" />
              <span className="block text-[9px] font-bold text-slate-700 mt-0.5">
                Threat
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Team Chat Feed (Matches Screenshot) */}
      <div className="pt-4 flex-1 flex flex-col min-h-[220px]">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">
            Team Chat
          </h3>
          <button
            onClick={onOpenChatModal}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700"
          >
            All Messages
          </button>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 max-h-48 text-xs">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400">
              <MessageSquare className="w-6 h-6 mb-1 text-slate-300 stroke-[1.5]" />
              <p className="text-[11px] font-semibold text-slate-700">Real-Time Team Channel</p>
              <p className="text-[10px] text-slate-400 max-w-[200px] mt-0.5">
                No messages yet. Send a message below to broadcast to all teammates via Firestore in real time.
              </p>
            </div>
          ) : (
            messages.slice(-10).map((msg) => (
              <div key={msg.id} className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-slate-800 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  {msg.senderName.charAt(msg.senderName.length - 1)}
                </div>
                <div className="flex-1 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-slate-800 text-[11px]">
                      {msg.senderName}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {new Date(msg.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-slate-600 leading-snug">{msg.text}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="mt-3 flex items-center gap-1.5">
          <div className="relative flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus-within:border-blue-500 focus-within:bg-white transition">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Type a message..."
              className="w-full bg-transparent text-xs text-slate-800 outline-none placeholder-slate-400"
            />
            <button
              type="button"
              title="Attach Location Pin"
              onClick={() => {
                setChatInput(
                  `📍 Current location: ${currentUser.location.lat.toFixed(4)}° N, ${currentUser.location.lng.toFixed(4)}° E`
                );
              }}
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <Paperclip className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            type="submit"
            className="w-8 h-8 rounded-xl bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </aside>
  );
};
