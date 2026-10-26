import React, { useState, useRef, useEffect } from 'react';
import {
  Battery,
  BatteryCharging,
  BatteryWarning,
  Zap,
  Shield,
  Clock,
  Sparkles,
  ChevronDown,
  X,
  Radio,
  Sliders,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext';

export const BatteryMonitor: React.FC = () => {
  const {
    batteryState,
    isLowPowerMode,
    toggleLowPowerMode,
    members,
    currentUser,
  } = useTeam();

  const [isOpen, setIsOpen] = useState<boolean>(false);
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

  const level = batteryState?.level ?? currentUser.batteryLevel ?? 90;
  const isCharging = batteryState?.charging ?? currentUser.isCharging ?? false;

  // Determine battery health color styling
  const isCritical = level <= 20;
  const isLow = level > 20 && level <= 45;
  const isGood = level > 45;

  const colorClasses = isCritical
    ? 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100'
    : isLow
    ? 'text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100'
    : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100';

  const barColor = isCritical
    ? 'bg-red-500'
    : isLow
    ? 'bg-amber-500'
    : 'bg-emerald-500';

  // Format estimated time
  const formatTime = (seconds: number | null) => {
    if (!seconds || seconds === Infinity || isNaN(seconds)) return null;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const estimatedTimeStr = isCharging
    ? formatTime(batteryState?.chargingTime)
    : formatTime(batteryState?.dischargingTime);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* AppHeader Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all shadow-xs ${colorClasses} ${
          isCritical && !isCharging ? 'animate-pulse' : ''
        }`}
        title={`Device Battery: ${level}% ${isCharging ? '(Charging)' : ''}. Click for telemetry & power saver.`}
        aria-label="Battery Status Telemetry"
      >
        <div className="relative flex items-center justify-center">
          {isCharging ? (
            <BatteryCharging className="w-4 h-4 text-emerald-600" />
          ) : isCritical ? (
            <BatteryWarning className="w-4 h-4 text-red-600" />
          ) : (
            <Battery className="w-4 h-4" />
          )}
          {isCharging && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          )}
        </div>

        <span className="font-mono text-xs font-bold leading-none">{level}%</span>

        {isCharging && (
          <Zap className="w-3 h-3 text-amber-500 fill-amber-500 hidden sm:inline" />
        )}

        {isLowPowerMode && (
          <span className="text-[9px] px-1 py-0.2 rounded bg-amber-200/80 text-amber-900 font-bold uppercase hidden md:inline">
            ECO
          </span>
        )}

        <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {/* Interactive Telemetry Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 text-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                  isCritical ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
                }`}
              >
                {isCharging ? (
                  <BatteryCharging className="w-4 h-4" />
                ) : (
                  <Battery className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Field Power Telemetry
                </h4>
                <p className="text-[10px] text-slate-400">
                  {batteryState?.isHardwareApi
                    ? 'Hardware Device Battery API Linked'
                    : 'Tactical Unit Telemetry Linked'}
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

          {/* Current Level Gauge Card */}
          <div className="mt-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-600">Unit Charge Level</span>
              <div className="flex items-center gap-1.5">
                {isCharging && (
                  <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <Zap className="w-2.5 h-2.5 fill-current" /> Charging
                  </span>
                )}
                <span className="font-mono text-base font-extrabold text-slate-900">
                  {level}%
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                style={{ width: `${Math.min(100, Math.max(5, level))}%` }}
              />
            </div>

            <div className="flex items-center justify-between mt-2.5 text-[11px] text-slate-500">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>
                  {isCharging
                    ? estimatedTimeStr
                      ? `Full in ~${estimatedTimeStr}`
                      : 'Connected to external power'
                    : estimatedTimeStr
                    ? `~${estimatedTimeStr} remaining`
                    : level > 50
                    ? 'Normal patrol consumption'
                    : 'Recommend solar battery bank'}
                </span>
              </div>
              <span className="font-semibold text-slate-700">
                {level > 70 ? 'Optimal' : level > 30 ? 'Adequate' : 'Action Required'}
              </span>
            </div>
          </div>

          {/* Low Power Mode Toggle */}
          <div className="mt-3 p-3 bg-blue-50/70 rounded-xl border border-blue-100 flex items-center justify-between">
            <div className="flex items-start gap-2.5">
              <div className="p-1.5 rounded-lg bg-blue-100 text-blue-700 mt-0.5">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">Tactical Low Power Mode</div>
                <div className="text-[10px] text-slate-500 leading-tight">
                  Throttles continuous high-accuracy GPS polling and visual rendering to extend field battery life.
                </div>
              </div>
            </div>

            <button
              onClick={toggleLowPowerMode}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                isLowPowerMode ? 'bg-blue-600' : 'bg-slate-300'
              }`}
              role="switch"
              aria-checked={isLowPowerMode}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  isLowPowerMode ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Team Power Grid Overview */}
          <div className="mt-3.5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide">
                Squad Battery Telemetry
              </span>
              <span className="text-[10px] text-slate-400">{members.length} Units Online</span>
            </div>

            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {members.map((member) => {
                const mLevel = member.isCurrent ? level : (member.batteryLevel ?? 80);
                const mCharging = member.isCurrent ? isCharging : (member.isCharging ?? false);
                const mCritical = mLevel <= 20;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-xs transition"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-md bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800 text-[11px] leading-tight">
                          {member.name} {member.isCurrent && '(You)'}
                        </div>
                        <div className="text-[9px] text-slate-400 leading-tight">
                          {member.role}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {mCharging && (
                        <Zap className="w-3 h-3 text-emerald-500 fill-emerald-500" />
                      )}
                      <span
                        className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                          mCritical
                            ? 'bg-red-100 text-red-700'
                            : mLevel <= 50
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {mLevel}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
