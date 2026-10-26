import React, { useState } from 'react';
import {
  Target,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext';
import type { MissionItem } from '../../types';

interface MissionsViewProps {
  onBackToMap: () => void;
}

const DEFAULT_MISSIONS: MissionItem[] = [
  {
    id: 'msn_1',
    title: 'Establish High Ridge Vantage Point',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    assignedTo: 'Alpha-2 (Recon)',
    targetArea: 'Sector Charlie - Elevation 1,420m',
    deadline: '14:00',
    notes: 'Secure visual line of sight along the river valley corridor. Report unusual movement.',
  },
  {
    id: 'msn_2',
    title: 'Trauma Evacuation Escort',
    priority: 'CRITICAL',
    status: 'ACTIVE',
    assignedTo: 'Alpha-4 (Medic)',
    targetArea: 'Coordinates 34.1210° N, 74.8300° E',
    deadline: '13:15',
    notes: 'Provide medical stabilization and extraction escort toward Rally Point Alpha.',
  },
  {
    id: 'msn_3',
    title: 'Rally Point Alpha Perimeter Check',
    priority: 'ROUTINE',
    status: 'COMPLETED',
    assignedTo: 'Alpha-1 (Team Leader)',
    targetArea: 'Rally Point Alpha',
    deadline: '12:00',
    notes: 'Check for safe ingress/egress routes and confirm clear satellite reception.',
  },
];

export const MissionsView: React.FC<MissionsViewProps> = ({ onBackToMap }) => {
  const { members } = useTeam();
  const [missions, setMissions] = useState<MissionItem[]>(DEFAULT_MISSIONS);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newPriority, setNewPriority] = useState<MissionItem['priority']>('HIGH');
  const [newAssignee, setNewAssignee] = useState<string>('Alpha-1 (Team Leader)');
  const [newArea, setNewArea] = useState<string>('');
  const [newNotes, setNewNotes] = useState<string>('');

  const handleAddMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTitle.trim()) {
      const item: MissionItem = {
        id: `msn_${Date.now()}`,
        title: newTitle.trim(),
        priority: newPriority,
        status: 'ACTIVE',
        assignedTo: newAssignee,
        targetArea: newArea.trim() || 'Designated Field Sector',
        deadline: '15:00',
        notes: newNotes.trim() || 'Field objective registered by operator.',
      };
      setMissions([item, ...missions]);
      setIsAdding(false);
      setNewTitle('');
      setNewArea('');
      setNewNotes('');
    }
  };

  const toggleStatus = (id: string) => {
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const nextStatus =
          m.status === 'ACTIVE'
            ? 'IN_PROGRESS'
            : m.status === 'IN_PROGRESS'
            ? 'COMPLETED'
            : 'ACTIVE';
        return { ...m, status: nextStatus };
      })
    );
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6 select-none animate-in fade-in">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Target className="w-6 h-6 text-blue-600" />
            Field Operational Missions
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Tactical objectives, assignments, priority status and sector coordination.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Mission</span>
          </button>
          <button
            onClick={onBackToMap}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            Back to Map
          </button>
        </div>
      </div>

      {isAdding && (
        <form
          onSubmit={handleAddMission}
          className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs animate-in fade-in"
        >
          <h3 className="font-bold text-sm text-slate-800">Dispatch New Field Task</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Mission Title</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. River Crossing Security Check"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Assigned Personnel</label>
              <select
                value={newAssignee}
                onChange={(e) => setNewAssignee(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600"
              >
                {members.map((m) => (
                  <option key={m.id} value={`${m.name} (${m.role})`}>
                    {m.name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Priority</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600"
              >
                <option value="CRITICAL">Critical (Emergency Priority)</option>
                <option value="HIGH">High (Immediate Action)</option>
                <option value="ROUTINE">Routine Patrol</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Target Sector / Area</label>
              <input
                type="text"
                value={newArea}
                onChange={(e) => setNewArea(e.target.value)}
                placeholder="e.g. Ridge 34.1350° N, 74.8150° E"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-500 font-bold mb-1">Operational Brief</label>
            <textarea
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Specific orders, equipment notes, or rendezvous times..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-blue-600 min-h-[60px]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-xs"
            >
              Publish Task
            </button>
          </div>
        </form>
      )}

      {/* Missions List */}
      <div className="space-y-3">
        {missions.map((mission) => (
          <div
            key={mission.id}
            className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition"
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    mission.priority === 'CRITICAL'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : mission.priority === 'HIGH'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {mission.priority}
                </span>

                <span className="text-slate-400 text-xs">·</span>
                <span className="text-xs text-slate-500 font-medium">
                  Assigned to <span className="font-bold text-slate-800">{mission.assignedTo}</span>
                </span>
                <span className="text-slate-400 text-xs">·</span>
                <span className="text-xs text-slate-500">Target: {mission.targetArea}</span>
              </div>

              <h4 className="font-bold text-sm text-slate-900">{mission.title}</h4>
              <p className="text-xs text-slate-600">{mission.notes}</p>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => toggleStatus(mission.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                  mission.status === 'COMPLETED'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : mission.status === 'IN_PROGRESS'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {mission.status === 'COMPLETED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                {mission.status === 'IN_PROGRESS' && <Clock className="w-3.5 h-3.5" />}
                {mission.status === 'ACTIVE' && <AlertCircle className="w-3.5 h-3.5" />}
                <span>{mission.status.replace('_', ' ')}</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
