import React, { useState } from 'react';
import {
  Radio,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Plus,
  MapPin,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext';
import type { ThreatZone } from '../../types';

interface IntelAlertsViewProps {
  onBackToMap: () => void;
}

export const IntelAlertsView: React.FC<IntelAlertsViewProps> = ({ onBackToMap }) => {
  const { threatZones, currentUser, setMapCenter } = useTeam();
  const [zones, setZones] = useState<ThreatZone[]>(threatZones);
  const [isReporting, setIsReporting] = useState<boolean>(false);
  const [name, setName] = useState<string>('');
  const [desc, setDesc] = useState<string>('');
  const [riskLevel, setRiskLevel] = useState<ThreatZone['riskLevel']>('HIGH_RISK');
  const [radius, setRadius] = useState<number>(450);

  const handleAddReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      const newZone: ThreatZone = {
        id: `threat_${Date.now()}`,
        name: name.trim(),
        riskLevel,
        center: { ...currentUser.location },
        radiusMeters: radius,
        description: desc.trim() || 'Field hazard reported by unit.',
        reportedAt: Date.now(),
        isVerified: false,
      };
      setZones([newZone, ...zones]);
      setIsReporting(false);
      setName('');
      setDesc('');
    }
  };

  const verifyZone = (id: string) => {
    setZones((prev) =>
      prev.map((z) => (z.id === id ? { ...z, isVerified: true } : z))
    );
  };

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto space-y-6 select-none animate-in fade-in">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Radio className="w-6 h-6 text-red-600" />
            Sector Intel & Hazard Reports
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Hazard perimeters, unverified reports, safe corridors and environmental risks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsReporting(!isReporting)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Submit Hazard Report</span>
          </button>
          <button
            onClick={onBackToMap}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            Back to Map
          </button>
        </div>
      </div>

      {isReporting && (
        <form
          onSubmit={handleAddReport}
          className="bg-slate-50 p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 text-xs animate-in fade-in"
        >
          <h3 className="font-bold text-sm text-slate-800">File Environmental Hazard Report</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Hazard Title</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Unstable Rockfall Hazard"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-red-600"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Risk Severity</label>
              <select
                value={riskLevel}
                onChange={(e) => setRiskLevel(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-red-600"
              >
                <option value="HIGH_RISK">High Risk (Restricted Ingress)</option>
                <option value="MODERATE">Moderate Risk</option>
                <option value="CAUTION">Caution Advised</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Hazard Radius (Meters)</label>
              <input
                type="number"
                min={50}
                max={2000}
                step={50}
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-red-600 font-mono"
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-500 font-bold mb-1">Hazard Description</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="Provide field details, visual indicators, or alternate route advice..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-red-600 min-h-[60px]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsReporting(false)}
              className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-200 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold shadow-xs"
            >
              Publish Hazard Notice
            </button>
          </div>
        </form>
      )}

      {/* Reports List */}
      <div className="space-y-3">
        {zones.map((zone) => (
          <div
            key={zone.id}
            className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:border-slate-300 transition"
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    zone.riskLevel === 'HIGH_RISK'
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : zone.riskLevel === 'MODERATE'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                  }`}
                >
                  {zone.riskLevel.replace('_', ' ')}
                </span>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                    zone.isVerified
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {zone.isVerified ? 'Verified by Team' : 'Unverified Field Report'}
                </span>

                <span className="text-slate-400 text-xs">·</span>
                <span className="text-xs text-slate-500 font-mono">
                  Radius: {zone.radiusMeters}m
                </span>
              </div>

              <h4 className="font-bold text-sm text-slate-900">{zone.name}</h4>
              <p className="text-xs text-slate-600">{zone.description}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {!zone.isVerified && (
                <button
                  onClick={() => verifyZone(zone.id)}
                  className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold transition"
                >
                  Verify Notice
                </button>
              )}
              <button
                onClick={() => {
                  setMapCenter(zone.center);
                  onBackToMap();
                }}
                className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition"
              >
                View on Map
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
