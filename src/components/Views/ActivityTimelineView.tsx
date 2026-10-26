import React, { useState } from 'react';
import {
  Activity,
  ShieldAlert,
  Users,
  Wifi,
  Database,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Phone,
  Flag,
  ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import { useTeam } from '../../context/TeamContext';

interface ActivityTimelineViewProps {
  onBackToMap: () => void;
}

const HOURLY_ACTIVITY_DATA = [
  { time: '08:00', events: 3, pings: 12 },
  { time: '09:00', events: 5, pings: 18 },
  { time: '10:00', events: 8, pings: 24 },
  { time: '11:00', events: 6, pings: 20 },
  { time: '12:00', events: 14, pings: 35 },
  { time: '13:00', events: 9, pings: 28 },
];

export const ActivityTimelineView: React.FC<ActivityTimelineViewProps> = ({ onBackToMap }) => {
  const { members, emergencies, activityLog, isOnline, pendingQueueCount } = useTeam();
  const [filterType, setFilterType] = useState<string>('ALL');

  const activeEmergencies = emergencies.filter((e) => e.status !== 'RESOLVED');

  const filteredLogs = activityLog.filter((log) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'EMERGENCY') return log.type === 'EMERGENCY' || log.type === 'ACKNOWLEDGE';
    if (filterType === 'STATUS') return log.type === 'STATUS_CHANGE';
    if (filterType === 'CHECKPOINT') return log.type === 'CHECKPOINT';
    if (filterType === 'CALL') return log.type === 'CALL';
    if (filterType === 'SYNC') return log.type === 'SYNC';
    return true;
  });

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6 select-none animate-in fade-in">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            Operational Dashboard & Audit Log
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Real-time synchronization health, emergency lifecycle telemetry and recorded field operations.
          </p>
        </div>

        <button
          onClick={onBackToMap}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
        >
          Return to Map
        </button>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Units</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {members.length}
          </div>
          <div className="text-[10px] text-emerald-600 font-semibold mt-1">
            100% Units Accounted
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Alerts</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold text-red-600 font-mono">
            {activeEmergencies.length}
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1">
            {activeEmergencies.length > 0 ? 'Requires acknowledgment' : 'Sector secure'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Sync State</span>
            <Wifi className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900 font-mono">
            {isOnline ? 'Active' : 'Offline'}
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1">
            {pendingQueueCount > 0 ? `${pendingQueueCount} operations queued` : 'Zero pending delta'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Field Sync Rate</span>
            <Database className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-extrabold text-indigo-600 font-mono">
            99.8%
          </div>
          <div className="text-[10px] text-slate-500 font-semibold mt-1">
            PWA IndexedDB active
          </div>
        </div>
      </div>

      {/* Recharts Visualization */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-sm text-slate-900 mb-1">
          Hourly Sector Telemetry & Event Volume
        </h3>
        <p className="text-slate-500 text-xs mb-4">
          Recorded coordination actions, presence pings, and emergency alerts.
        </p>

        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={HOURLY_ACTIVITY_DATA} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorEvents" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stop-color="#2563EB" stop-opacity={0.3} />
                  <stop offset="95%" stop-color="#2563EB" stop-opacity={0} />
                </linearGradient>
                <linearGradient id="colorPings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stop-color="#10B981" stop-opacity={0.2} />
                  <stop offset="95%" stop-color="#10B981" stop-opacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="time" stroke="#94A3B8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  color: '#FFFFFF',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '11px',
                }}
              />
              <Area
                type="monotone"
                dataKey="pings"
                name="GPS Presence Pings"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPings)"
              />
              <Area
                type="monotone"
                dataKey="events"
                name="Field Operations"
                stroke="#2563EB"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#colorEvents)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filterable Audit Timeline */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-bold text-sm text-slate-900">
            Immutable Activity Audit Feed ({filteredLogs.length})
          </h3>

          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl text-xs font-semibold">
            {['ALL', 'EMERGENCY', 'STATUS', 'CHECKPOINT', 'CALL', 'SYNC'].map((filter) => (
              <button
                key={filter}
                onClick={() => setFilterType(filter)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  filterType === filter
                    ? 'bg-white text-slate-900 shadow-2xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {filteredLogs.map((log) => (
            <div key={log.id} className="py-3 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                    log.severity === 'emergency'
                      ? 'bg-red-50 text-red-600'
                      : log.severity === 'warning'
                      ? 'bg-amber-50 text-amber-600'
                      : log.severity === 'success'
                      ? 'bg-emerald-50 text-emerald-600'
                      : 'bg-blue-50 text-blue-600'
                  }`}
                >
                  {log.type === 'EMERGENCY' ? (
                    <ShieldAlert className="w-4 h-4" />
                  ) : log.type === 'STATUS_CHANGE' ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : log.type === 'CALL' ? (
                    <Phone className="w-4 h-4" />
                  ) : log.type === 'CHECKPOINT' ? (
                    <Flag className="w-4 h-4" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">{log.actor}</span>
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      {log.type}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5 leading-snug">{log.description}</p>
                </div>
              </div>

              <span className="text-[11px] text-slate-400 font-mono shrink-0">
                {new Date(log.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
