import React, { useState, useRef, useEffect } from 'react';
import {
  Navigation,
  Compass,
  Crosshair,
  LocateFixed,
  Radio,
  Footprints,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  X,
  MapPin,
  TrendingUp,
  Activity,
  Layers,
  Shield,
  Gauge,
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext';
import { formatCoordinates, calculateHaversineDistance, formatDistance } from '../../utils/geo';

export const LiveGpsWidget: React.FC = () => {
  const {
    currentUser,
    requestRealGeolocation,
    isFollowMeActive,
    toggleFollowMe,
    geolocationStatusMessage,
    gpsAccuracy,
    gpsSpeed,
    gpsAltitude,
    gpsHeading,
    compassHeading,
    gpsTrail,
    isRecordingTrail,
    toggleRecordTrail,
    clearGpsTrail,
    setMapCenter,
    setMapZoom,
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

  const loc = currentUser.location;
  const accuracy = gpsAccuracy ?? loc.accuracy ?? 6;
  const speed = gpsSpeed ?? loc.speed ?? 0;
  const altitude = gpsAltitude ?? loc.altitude ?? 218;
  const heading = compassHeading ?? gpsHeading ?? loc.heading ?? 0;

  // Calculate total trail distance in meters
  const totalTrailDistanceMeters = React.useMemo(() => {
    if (!gpsTrail || gpsTrail.length < 2) return 0;
    let dist = 0;
    for (let i = 1; i < gpsTrail.length; i++) {
      dist += calculateHaversineDistance(gpsTrail[i - 1], gpsTrail[i]);
    }
    return Math.round(dist);
  }, [gpsTrail]);

  // Cardinal direction from heading
  const getCardinalDirection = (deg: number) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8;
    return directions[index];
  };

  const cardinal = getCardinalDirection(heading);

  const handleRecenter = () => {
    if (loc) {
      setMapCenter({ lat: loc.lat, lng: loc.lng });
      setMapZoom(16);
      requestRealGeolocation();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* AppHeader Pill Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 sm:px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-all shadow-xs"
        title="Live GPS Positioning, Satellite Fix & Breadcrumb Trail Telemetry"
        aria-label="Live GPS Tracking Widget"
      >
        <div className="relative flex items-center justify-center">
          <Navigation
            className="w-3.5 h-3.5 text-blue-600 transition-transform duration-300"
            style={{ transform: `rotate(${heading}deg)` }}
          />
          <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
        </div>

        <div className="text-left hidden lg:block">
          <div className="leading-none font-bold text-slate-900 flex items-center gap-1.5 font-mono text-[11px]">
            <span>{loc ? formatCoordinates(loc.lat, loc.lng) : 'Acquiring GPS...'}</span>
          </div>
          <div className="text-[9px] text-slate-500 font-medium leading-none mt-0.5 flex items-center gap-1.5">
            <span className="text-emerald-600 font-bold">±{accuracy}m</span>
            <span>·</span>
            <span>{cardinal} {Math.round(heading)}°</span>
            {isRecordingTrail && (
              <>
                <span>·</span>
                <span className="text-red-600 font-bold animate-pulse flex items-center gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> REC
                </span>
              </>
            )}
          </div>
        </div>

        <span className="lg:hidden font-mono text-xs font-bold text-slate-800">
          ±{accuracy}m
        </span>

        <ChevronDown className="w-3 h-3 opacity-60 ml-0.5" />
      </button>

      {/* Interactive Telemetry Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2 text-slate-800">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <LocateFixed className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs uppercase tracking-wider text-slate-900">
                  Live GPS Tracking & Telemetry
                </h4>
                <p className="text-[10px] text-slate-400">
                  Continuous GNSS Sensor Telemetry Active
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

          {/* Compass & Precision Banner */}
          <div className="mt-3 p-3.5 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-xl shadow-inner">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Current Coordinates
                </div>
                <div className="font-mono text-sm font-bold text-white mt-0.5">
                  {loc.lat.toFixed(6)}° N, {loc.lng.toFixed(6)}° E
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>3D High Precision Fix (Accuracy: ±{accuracy}m)</span>
                </div>
              </div>

              {/* Digital Compass Wheel */}
              <div className="relative w-12 h-12 rounded-full border-2 border-slate-600 bg-slate-950/70 flex items-center justify-center shadow-md">
                <div
                  className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
                  style={{ transform: `rotate(${heading}deg)` }}
                >
                  <Navigation className="w-5 h-5 text-red-400 fill-red-400" />
                </div>
                <span className="absolute bottom-0 text-[8px] font-bold text-slate-400 font-mono">
                  {cardinal}
                </span>
              </div>
            </div>
          </div>

          {/* Real-time Telemetry Metrics Grid */}
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] uppercase font-bold text-slate-400">Bearing</div>
              <div className="font-mono font-bold text-xs text-slate-900 mt-0.5">
                {Math.round(heading)}° {cardinal}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] uppercase font-bold text-slate-400">Ground Speed</div>
              <div className="font-mono font-bold text-xs text-slate-900 mt-0.5">
                {speed.toFixed(1)} km/h
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
              <div className="text-[10px] uppercase font-bold text-slate-400">Altitude</div>
              <div className="font-mono font-bold text-xs text-slate-900 mt-0.5">
                {altitude} m ASL
              </div>
            </div>
          </div>

          {/* Breadcrumb Trail Recording System */}
          <div className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900">
                  Patrol Breadcrumb Trail
                </span>
              </div>
              <button
                onClick={toggleRecordTrail}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition shadow-2xs ${
                  isRecordingTrail
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    isRecordingTrail ? 'bg-white animate-pulse' : 'bg-red-500'
                  }`}
                />
                <span>{isRecordingTrail ? 'Recording...' : 'Start Trail'}</span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
              <span>{gpsTrail.length} recorded waypoints</span>
              <span className="font-mono font-semibold text-slate-700">
                {formatDistance(totalTrailDistanceMeters)} traversed
              </span>
            </div>

            {gpsTrail.length > 0 && (
              <div className="flex items-center justify-end gap-2 mt-2 pt-2 border-t border-slate-200/60">
                <button
                  onClick={clearGpsTrail}
                  className="text-[10px] text-slate-500 hover:text-red-600 font-semibold flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" /> Clear Trail
                </button>
              </div>
            )}
          </div>

          {/* Quick Positioning Actions */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              onClick={handleRecenter}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Center on Me</span>
            </button>

            <button
              onClick={toggleFollowMe}
              className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition ${
                isFollowMeActive
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>{isFollowMeActive ? 'Follow Active' : 'Lock Follow'}</span>
            </button>
          </div>

          <div className="mt-2 text-[10px] text-slate-400 text-center truncate">
            {geolocationStatusMessage}
          </div>
        </div>
      )}
    </div>
  );
};
