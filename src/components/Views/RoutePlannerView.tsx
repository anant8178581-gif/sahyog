import React, { useState } from 'react';
import {
  Route,
  Navigation,
  MapPin,
  Clock,
  Flag,
  Users,
  Compass,
  ArrowRight,
  X,
  AlertCircle,
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext';
import {
  calculateHaversineDistance,
  formatDistance,
  estimateWalkingTime,
} from '../../utils/geo';

interface RoutePlannerViewProps {
  onBackToMap: () => void;
}

export const RoutePlannerView: React.FC<RoutePlannerViewProps> = ({ onBackToMap }) => {
  const {
    currentUser,
    members,
    checkpoints,
    emergencies,
    activeRoute,
    planRouteTo,
    clearRoute,
    setMapCenter,
  } = useTeam();

  const otherMembers = members.filter((m) => !m.isCurrent);
  const activeEmergencies = emergencies.filter((e) => e.status !== 'RESOLVED');

  const [selectedTargetId, setSelectedTargetId] = useState<string>('');

  const handleSelect = (target: { name: string; location: any }) => {
    planRouteTo(target.location, target.name);
    setMapCenter(target.location);
    onBackToMap();
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6 select-none animate-in fade-in">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Route className="w-6 h-6 text-blue-600" />
            Field Route Planning & Extraction Corridors
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Calculate walking distance, travel time, and assembly routes across difficult terrain.
          </p>
        </div>

        {activeRoute && (
          <button
            onClick={clearRoute}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 text-xs font-semibold border border-red-200 transition"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Active Route</span>
          </button>
        )}
      </div>

      {/* Active Route Status Card */}
      {activeRoute ? (
        <div className="bg-blue-600 text-white p-6 rounded-3xl shadow-md space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase font-extrabold tracking-wider bg-white/20 px-3 py-1 rounded-full">
              Active Navigational Vector
            </span>
            <span className="text-xs font-mono">
              Dest: {activeRoute.destination.lat.toFixed(4)}° N, {activeRoute.destination.lng.toFixed(4)}° E
            </span>
          </div>

          <h3 className="text-2xl font-black">{activeRoute.name}</h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
            <div className="bg-white/10 p-3 rounded-2xl">
              <div className="text-blue-200 text-xs font-medium">Straight-Line Distance</div>
              <div className="text-xl font-bold font-mono mt-0.5">
                {activeRoute.formattedDistance}
              </div>
            </div>

            <div className="bg-white/10 p-3 rounded-2xl">
              <div className="text-blue-200 text-xs font-medium">Estimated Field Walk Time</div>
              <div className="text-xl font-bold font-mono mt-0.5">
                {activeRoute.estimatedTime}
              </div>
            </div>

            <div className="bg-white/10 p-3 rounded-2xl col-span-2 sm:col-span-1">
              <div className="text-blue-200 text-xs font-medium">Pacing Standard</div>
              <div className="text-xl font-bold mt-0.5">4.5 km/h</div>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={onBackToMap}
              className="px-5 py-2.5 rounded-xl bg-white text-blue-900 font-bold text-xs shadow hover:bg-blue-50 transition"
            >
              View Route Vector on Map
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border-2 border-dashed border-slate-200 p-8 rounded-3xl text-center">
          <Route className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="font-bold text-sm text-slate-700">No Active Route Currently Plotted</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Select a target teammate, checkpoint, or emergency incident below to calculate navigation distance and ETA.
          </p>
        </div>
      )}

      {/* Destination Choices */}
      <div className="space-y-4">
        {/* Active Emergencies */}
        {activeEmergencies.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-red-600 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" />
              Emergency Extraction Incidents
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {activeEmergencies.map((emg) => {
                const dist = calculateHaversineDistance(currentUser.location, emg.location);
                return (
                  <div
                    key={emg.id}
                    onClick={() =>
                      handleSelect({
                        name: `Emergency Incident (${emg.reporterName})`,
                        location: emg.location,
                      })
                    }
                    className="p-4 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-xs text-red-900">
                        {emg.reporterName} ({emg.reporterRole})
                      </div>
                      <div className="text-[11px] text-red-700 mt-0.5">{emg.message}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-xs text-red-900">
                        {formatDistance(dist)}
                      </div>
                      <div className="text-[10px] text-red-600">{estimateWalkingTime(dist)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Checkpoints */}
        <div className="space-y-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Flag className="w-4 h-4 text-blue-600" />
            Checkpoints & Meeting Points
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {checkpoints.map((chk) => {
              const dist = calculateHaversineDistance(currentUser.location, chk.location);
              return (
                <div
                  key={chk.id}
                  onClick={() => handleSelect({ name: chk.name, location: chk.location })}
                  className="p-4 rounded-2xl bg-white hover:bg-blue-50/50 border border-slate-200 hover:border-blue-200 cursor-pointer transition flex items-center justify-between shadow-2xs"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900">{chk.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {chk.type.replace('_', ' ')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-xs text-slate-900">
                      {formatDistance(dist)}
                    </div>
                    <div className="text-[10px] text-slate-400">{estimateWalkingTime(dist)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Teammates */}
        <div className="space-y-2">
          <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Users className="w-4 h-4 text-slate-600" />
            Teammate Field Locations
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {otherMembers.map((m) => {
              const dist = calculateHaversineDistance(currentUser.location, m.location);
              return (
                <div
                  key={m.id}
                  onClick={() => handleSelect({ name: m.name, location: m.location })}
                  className="p-4 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 cursor-pointer transition flex items-center justify-between shadow-2xs"
                >
                  <div>
                    <div className="font-bold text-xs text-slate-900">{m.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{m.role} · {m.statusLabel}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono font-bold text-xs text-slate-900">
                      {formatDistance(dist)}
                    </div>
                    <div className="text-[10px] text-slate-400">{estimateWalkingTime(dist)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-800 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <p>
          Routing Notice: Distances and field ETAs are computed via Haversine great-circle geodesic formula. In rugged mountain terrain, always evaluate physical contours, river crossings, and environmental obstacles on the ground.
        </p>
      </div>
    </div>
  );
};
