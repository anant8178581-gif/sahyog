import React, { useState, useRef, useEffect } from 'react';
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Database,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  X,
  Radio,
  Signal,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext';

export const NetworkStatusBadge: React.FC = () => {
  const {
    isOnline,
    isSimulatedOffline,
    toggleOfflineSimulation,
    pendingQueueCount,
    replayOfflineQueue,
    networkState,
  } = useTeam();

  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleManualSync = async () => {
    if (!isOnline) return;
    setIsSyncing(true);
    try {
      const count = await replayOfflineQueue();
      setSyncFeedback(count > 0 ? `Synced ${count} pending item(s)` : 'All records synced');
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch {
      setSyncFeedback('Sync encountered error');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* AppHeader Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${
          isOnline
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            : 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100 ring-2 ring-red-400/40'
        }`}
        title={
          isOnline
            ? 'Network Online & Synced. Click to inspect offline resilience & connection quality.'
            : 'Offline Mode Active. Mutations stored safely in Dexie.js IndexedDB.'
        }
        aria-label="Network Connectivity Status"
      >
        {isOnline ? (
          <>
            <div className="relative flex items-center justify-center">
              <Wifi className="w-3.5 h-3.5 text-emerald-600" />
              <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div className="text-left hidden sm:block">
              <div className="leading-none font-bold text-emerald-900 flex items-center gap-1">
                <span>Online</span>
                {networkState?.rttMs && (
                  <span className="text-[10px] font-mono text-emerald-600 font-normal">
                    {networkState.rttMs}ms
                  </span>
                )}
              </div>
              <div className="text-[9px] text-emerald-600 font-medium leading-none mt-0.5">
                Cloud Synced
              </div>
            </div>
            <span className="sm:hidden font-bold">Online</span>
          </>
        ) : (
          <>
            <div className="relative flex items-center justify-center">
              <WifiOff className="w-3.5 h-3.5 text-red-600 animate-pulse" />
            </div>
            <div className="text-left">
              <div className="leading-none font-bold text-red-900 flex items-center gap-1">
                <span>Offline</span>
                {pendingQueueCount > 0 && (
                  <span className="text-[10px] bg-red-600 text-white font-mono px-1.5 py-0.2 rounded-full leading-none">
                    {pendingQueueCount}
                  </span>
                )}
              </div>
              <div className="text-[9px] text-red-600 font-medium leading-none mt-0.5 hidden sm:block">
                {pendingQueueCount > 0
                  ? `${pendingQueueCount} in offline queue`
                  : 'Zero-loss IndexedDB'}
              </div>
            </div>
          </>
        )}

        <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {/* Interactive Popover */}
      {isOpen && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 text-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}
              >
                {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Network Connectivity & Sync
                </h4>
                <p className="text-[10px] text-slate-400">
                  {isOnline
                    ? isSimulatedOffline
                      ? 'Simulated Offline Override Active'
                      : 'Real-time WebSocket & Cloud Firestore Active'
                    : 'Tactical Offline Isolation Mode Active'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Offline-First Architecture Banner */}
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">
                  Dexie.js IndexedDB Engine
                </span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                PWA Local Cache
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1.5 leading-snug">
              Every coordinate ping, team message, checkpoint, and medical distress event is
              persisted instantly to local IndexedDB before transmitting. In radio blackouts, 0% of
              field data is lost.
            </p>
          </div>

          {/* Connection Quality Telemetry */}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] uppercase font-bold text-slate-400">Network Type</div>
              <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                <Signal className="w-3.5 h-3.5 text-blue-500" />
                <span>{networkState?.effectiveType ? networkState.effectiveType.toUpperCase() : 'Wi-Fi / Tactical'}</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] uppercase font-bold text-slate-400">Queue Backlog</div>
              <div className="font-semibold text-slate-800 mt-0.5 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    pendingQueueCount > 0 ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                  }`}
                />
                <span>{pendingQueueCount} Pending Ops</span>
              </div>
            </div>
          </div>

          {/* Interactive Drill Simulation Toggle */}
          <div className="mt-3 p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-amber-950">Simulate Offline Mode</div>
              <div className="text-[10px] text-amber-700 leading-tight">
                Evaluate offline caching, queuing, and reconnect sync without disconnecting device Wi-Fi.
              </div>
            </div>
            <button
              onClick={() => {
                toggleOfflineSimulation();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-2xs ${
                isSimulatedOffline
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-white border border-amber-300 text-amber-900 hover:bg-amber-100'
              }`}
            >
              {isSimulatedOffline ? 'Reconnect' : 'Disconnect'}
            </button>
          </div>

          {/* Manual Force Sync Button */}
          {isOnline && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Synchronizing Records...' : 'Flush & Sync Queue Now'}</span>
              </button>
            </div>
          )}

          {syncFeedback && (
            <div className="mt-2 text-center text-xs font-bold text-emerald-600 animate-in fade-in">
              ✓ {syncFeedback}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
