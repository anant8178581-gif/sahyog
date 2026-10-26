import React, { useState } from 'react';
import {
  Settings,
  Database,
  Battery,
  MapPin,
  Radio,
  Download,
  RotateCcw,
  CheckCircle2,
  Trash2,
  Shield,
  HelpCircle,
  FileText,
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { offlineDb } from '../../db/offlineDb';

interface SettingsViewProps {
  onBackToMap: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onBackToMap }) => {
  const {
    teamCode,
    currentUser,
    isOnline,
    pendingQueueCount,
    batteryStatusMessage,
    geolocationStatusMessage,
    activityLog,
    resetDemo,
  } = useTeam();

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [exportSuccess, setExportSuccess] = useState<boolean>(false);
  const [clearedSuccess, setClearedSuccess] = useState<boolean>(false);

  // Export JSON Report
  const handleExportJSON = () => {
    const reportData = {
      project: 'SAHYOG Field Team Coordination',
      teamCode,
      exportedAt: new Date().toISOString(),
      currentUser,
      activityLog,
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sahyog_telemetry_report_${teamCode}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  // Clear Offline Cache
  const handleClearCache = async () => {
    try {
      await offlineDb.syncQueue.clear();
      setClearedSuccess(true);
      setTimeout(() => setClearedSuccess(false), 3000);
    } catch {
      // Ignored
    }
  };

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-6 select-none animate-in fade-in">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-6 h-6 text-slate-700" />
            System Architecture & Settings
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            Offline-first client state, device telemetry sensors, cryptographic channels and audit records.
          </p>
        </div>

        <button
          onClick={onBackToMap}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
        >
          Return to Map
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        {/* 1. Device Hardware Sensors */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Battery className="w-4 h-4 text-blue-600" />
            <h4>Device Sensor Integration</h4>
          </div>

          <div className="space-y-2 text-slate-600">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="font-bold text-slate-700 block mb-0.5">Battery Status API</span>
              <p>{batteryStatusMessage}</p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="font-bold text-slate-700 block mb-0.5">Browser Geolocation API</span>
              <p>{geolocationStatusMessage}</p>
            </div>
          </div>
        </div>

        {/* 2. Offline IndexedDB & Sync Engine */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Database className="w-4 h-4 text-indigo-600" />
            <h4>Offline Dexie IndexedDB</h4>
          </div>

          <div className="space-y-2 text-slate-600">
            <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-700 block">Pending Offline Queue</span>
                <span className="text-[11px] text-slate-400">Operations waiting for network</span>
              </div>
              <span className="font-mono font-bold text-sm text-slate-800">
                {pendingQueueCount} ops
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleClearCache}
                className="flex-1 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold flex items-center justify-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{clearedSuccess ? 'Queue Cleared!' : 'Clear Pending Queue'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* 3. PWA Installation & Service Worker */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <Download className="w-4 h-4 text-emerald-600" />
            <h4>Progressive Web App (PWA)</h4>
          </div>

          <p className="text-slate-600">
            SAHYOG includes Web App Manifest and Service Worker caching for seamless offline usage in the field.
          </p>

          {isInstalled ? (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl flex items-center gap-2 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Running as Installed Standalone Application</span>
            </div>
          ) : isInstallable ? (
            <button
              onClick={install}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center justify-center gap-2 shadow-xs transition"
            >
              <Download className="w-4 h-4" />
              <span>Install to Home Screen / Desktop</span>
            </button>
          ) : isIOS ? (
            <div className="p-3 bg-blue-50 text-blue-900 rounded-xl">
              <span className="font-bold block mb-1">Install on iPhone / iPad:</span>
              <p className="text-[11px]">Tap Safari Share button, then tap "Add to Home Screen".</p>
            </div>
          ) : (
            <div className="p-3 bg-slate-50 text-slate-600 rounded-xl text-[11px]">
              PWA installation ready. Run from Chrome/Edge or installable browser.
            </div>
          )}
        </div>

        {/* 4. Export & Hackathon Audit Tools */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <FileText className="w-4 h-4 text-amber-600" />
            <h4>Telemetry Audit & Demonstration</h4>
          </div>

          <p className="text-slate-600">
            Export the complete session telemetry log or reset the deterministic drill state for evaluation.
          </p>

          <div className="flex gap-2">
            <button
              onClick={handleExportJSON}
              className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center gap-1.5 shadow-xs transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exportSuccess ? 'Exported JSON!' : 'Export Telemetry Log'}</span>
            </button>
            <button
              onClick={resetDemo}
              className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold flex items-center justify-center gap-1 transition"
              title="Reset Drill State"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
