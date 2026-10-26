import React, { useState, useEffect } from 'react';
import {
  Shield,
  Wifi,
  WifiOff,
  Sun,
  Bell,
  ChevronDown,
  Download,
  Play,
  RotateCcw,
  Radio,
  UserCheck,
  CheckCircle2,
  X,
  Volume2,
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { BatteryMonitor } from './BatteryMonitor';
import { NetworkStatusBadge } from './NetworkStatusBadge';
import { LiveGpsWidget } from './LiveGpsWidget';

interface AppHeaderProps {
  onOpenNotifications?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenEmergencyModal?: () => void;
  onOpenAuthModal?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onOpenNotifications,
  onOpenProfile,
  onOpenSettings,
  onOpenAuthModal,
}) => {
  const {
    currentUser,
    isOnline,
    isSimulatedOffline,
    toggleOfflineSimulation,
    pendingQueueCount,
    isDemoMode,
    toggleDemoMode,
    simulateTeammateMovement,
    simulateEmergency,
    resetDemo,
    activityLog,
    emergencies,
    teamCode,
    authUser,
  } = useTeam();

  const { isInstallable, install } = usePWAInstall();

  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showDemoToolbar, setShowDemoToolbar] = useState<boolean>(false);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
      setCurrentDate(
        now.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeEmergenciesCount = emergencies.filter((e) => e.status !== 'RESOLVED').length;

  return (
    <header className="relative bg-white border-b border-slate-200 px-4 lg:px-6 py-2.5 z-40 select-none shadow-xs">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Brand Identity & Flag */}
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="flex items-center gap-3">
            {/* Winged shield logo */}
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#14243b] to-[#0f172a] text-white flex items-center justify-center shadow-md p-1.5">
              <img src="/icon.svg" alt="SAHYOG" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-extrabold tracking-tight text-slate-900 leading-none">
                  SAHYOG
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {teamCode}
                </span>
              </div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 leading-none mt-1">
                Field Team Coordination
              </p>
            </div>
          </div>

          <div className="hidden md:block h-7 w-[1px] bg-slate-200" />

          {/* Indian Flag Accent & Mission Tagline */}
          <div className="hidden md:flex items-center gap-2.5">
            <span className="text-xl leading-none">🇮🇳</span>
            <div>
              <div className="text-[11px] font-bold text-slate-800 tracking-wide leading-none">
                STRONGER TOGETHER
              </div>
              <div className="text-[10px] font-semibold text-slate-400 tracking-wider leading-none mt-0.5">
                CONNECT · COORDINATE · STAY SAFE
              </div>
            </div>
          </div>
        </div>

        {/* Right: Operational Status Widgets */}
        <div className="flex items-center gap-2.5 sm:gap-4">
          {/* Live GPS Telemetry Widget */}
          <LiveGpsWidget />

          {/* Network Connectivity & Offline-First Sync Badge */}
          <NetworkStatusBadge />

          {/* Battery Level Telemetry & Power Management Monitor */}
          <BatteryMonitor />

          {/* Weather Widget */}
          <div className="hidden lg:flex items-center gap-2 bg-amber-50/70 border border-amber-200/80 px-3 py-1.5 rounded-xl text-xs text-amber-900">
            <Sun className="w-4 h-4 text-amber-500 fill-amber-500" />
            <div className="leading-tight">
              <span className="font-bold">24°C</span>
              <span className="text-[10px] text-amber-700 ml-1 font-medium">Clear</span>
            </div>
          </div>

          {/* Clock Widget */}
          <div className="hidden sm:flex flex-col text-right leading-none">
            <span className="text-xs font-bold text-slate-800 font-mono">{currentTime}</span>
            <span className="text-[10px] text-slate-400 mt-0.5">{currentDate}</span>
          </div>

          {/* Demo Controls Toggle */}
          <button
            onClick={() => setShowDemoToolbar(!showDemoToolbar)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition ${
              showDemoToolbar
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
            title="Toggle Defense Hackathon Demo Tools"
          >
            <Play className="w-3 h-3 fill-current" />
            <span className="hidden md:inline">Demo Drills</span>
          </button>

          {/* PWA Install Button */}
          {isInstallable && (
            <button
              onClick={install}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
              title="Install SAHYOG PWA to desktop/home screen"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {activeEmergenciesCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                  {activeEmergenciesCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 text-slate-900">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <h4 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                    Operational Alerts ({activityLog.length})
                  </h4>
                  <button
                    onClick={() => setShowNotifications(false)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 mt-2 space-y-1">
                  {activityLog.slice(0, 6).map((log) => (
                    <div key={log.id} className="py-2 text-xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span
                          className={
                            log.severity === 'emergency'
                              ? 'text-red-600'
                              : log.severity === 'warning'
                              ? 'text-amber-600'
                              : 'text-slate-800'
                          }
                        >
                          {log.actor}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {new Date(log.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5 leading-snug">
                        {log.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-1 pl-1.5 pr-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition bg-white"
            >
              <div className="w-7 h-7 rounded-lg bg-[#14243b] text-white flex items-center justify-center text-xs font-bold">
                {currentUser.name.charAt(0)}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-slate-800 leading-none">
                  {currentUser.name}
                </div>
                <div className="text-[10px] text-slate-400 leading-none mt-0.5">
                  {currentUser.role}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <div className="absolute right-0 top-12 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in text-xs space-y-1 text-slate-800">
                <div className="px-3 py-2 bg-slate-50 rounded-xl mb-2">
                  <div className="font-bold text-slate-900">{currentUser.name}</div>
                  <div className="text-slate-500 text-[11px]">Role: {currentUser.role}</div>
                  <div className="text-blue-600 text-[10px] font-mono mt-1">
                    Sector: {teamCode}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-medium mt-0.5 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>{authUser?.isAnonymous ? 'Anonymous Session' : authUser?.email || 'Authenticated'}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onOpenProfile?.();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 font-medium"
                >
                  Edit Profile & Role
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onOpenAuthModal?.();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-blue-700 font-bold flex items-center justify-between"
                >
                  <span>Firebase Credentials</span>
                  <span className="text-[10px] bg-blue-100 px-1.5 py-0.5 rounded font-mono">Auth</span>
                </button>
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onOpenSettings?.();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 font-medium"
                >
                  Team Settings
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Demo Drills Toolbar (for Hackathon evaluation) */}
      {showDemoToolbar && (
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs bg-slate-50/90 -mx-4 -mb-2.5 px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="font-bold text-blue-700 uppercase tracking-wider text-[10px]">
              Defense Hackathon Drill Simulation:
            </span>
            <span className="text-slate-500 text-[11px]">
              Simulate dynamic events across authorized field units.
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={simulateTeammateMovement}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 font-medium text-slate-700 shadow-2xs"
            >
              Simulate Movement
            </button>
            <button
              onClick={simulateEmergency}
              className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium shadow-2xs"
            >
              Trigger Medical Drill
            </button>
            <button
              onClick={resetDemo}
              className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 font-medium text-slate-700 shadow-2xs flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset State
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
