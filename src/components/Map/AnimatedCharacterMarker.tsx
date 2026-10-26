import React, { useState, useEffect, useRef } from 'react';
import {
  HeartPulse,
  Battery,
  BatteryCharging,
  Plus,
  ShieldAlert,
  Phone,
  Navigation,
  MessageSquare,
  Crosshair,
  AlertTriangle,
} from 'lucide-react';
import type { TeamMember, LocationCoordinates } from '../../types';
import { calculateHaversineDistance, formatDistance, isLocationStale } from '../../utils/geo';

interface AnimatedCharacterMarkerProps {
  member: TeamMember;
  screenPos: { x: number; y: number };
  currentCoords: LocationCoordinates;
  currentUserCoords: LocationCoordinates;
  isEmergencyReported: boolean;
  onSelect: (member: TeamMember) => void;
  onCall: (memberId: string) => void;
  onRoute: (coords: LocationCoordinates, name: string) => void;
}

export const AnimatedCharacterMarker: React.FC<AnimatedCharacterMarkerProps> = ({
  member,
  screenPos,
  currentCoords,
  currentUserCoords,
  isEmergencyReported,
  onSelect,
  onCall,
  onRoute,
}) => {
  // Smooth position interpolation (Uber/Ola marker style)
  const [animatedPos, setAnimatedPos] = useState<{ x: number; y: number }>(screenPos);
  const [facingDirection, setFacingDirection] = useState<'right' | 'left'>('right');
  const [imageError, setImageError] = useState<boolean>(false);
  const prevPosRef = useRef<{ x: number; y: number }>(screenPos);
  const animFrameRef = useRef<number | null>(null);

  // Determine character image:
  // Medic uses the 3D nurse image (/assets/aistudio/image_ba22c148.png)
  // Soldier / Leader / Recon / Support uses the camo soldier image (/assets/aistudio/image_da532834.png)
  const isMedic = member.role === 'Medic';
  const characterSrc = isMedic
    ? '/assets/aistudio/image_ba22c148.png'
    : '/assets/aistudio/image_da532834.png';

  // Smooth position lerp with requestAnimationFrame
  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setAnimatedPos(screenPos);
      return;
    }

    const startX = prevPosRef.current.x;
    const startY = prevPosRef.current.y;
    const targetX = screenPos.x;
    const targetY = screenPos.y;

    // Detect direction of movement for character facing
    if (Math.abs(targetX - startX) > 1) {
      setFacingDirection(targetX > startX ? 'right' : 'left');
    }

    const duration = 900; // 900ms smooth gliding interpolation
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Smooth cubic ease out
      const ease = 1 - Math.pow(1 - progress, 3);

      const nextX = startX + (targetX - startX) * ease;
      const nextY = startY + (targetY - startY) * ease;

      setAnimatedPos({ x: nextX, y: nextY });

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        prevPosRef.current = { x: targetX, y: targetY };
      }
    };

    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [screenPos.x, screenPos.y]);

  const isStale = isLocationStale(member.lastSeen);

  // Condition color dot
  let conditionColor = 'bg-emerald-500';
  let conditionBorder = 'border-emerald-500';
  let conditionBg = 'bg-emerald-50 text-emerald-700';

  if (member.condition === 'CAUTION') {
    conditionColor = 'bg-amber-500';
    conditionBorder = 'border-amber-500';
    conditionBg = 'bg-amber-50 text-amber-700';
  } else if (member.condition === 'MEDICAL_EMERGENCY' || isEmergencyReported) {
    conditionColor = 'bg-red-500';
    conditionBorder = 'border-red-500';
    conditionBg = 'bg-red-50 text-red-700';
  } else if (member.condition === 'OFFLINE') {
    conditionColor = 'bg-slate-400';
    conditionBorder = 'border-slate-400';
    conditionBg = 'bg-slate-100 text-slate-600';
  }

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect(member);
      }}
      style={{
        left: `${animatedPos.x}px`,
        top: `${animatedPos.y}px`,
      }}
      className="absolute -translate-x-1/2 -translate-y-[85%] pointer-events-auto cursor-pointer interactive-control z-20 group transition-transform duration-150 hover:scale-105 select-none"
    >
      {/* 1. Floating Sleek Name Tag (Uber/Ola style above head) */}
      <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900/90 backdrop-blur-md text-white shadow-lg border border-slate-700/80 text-[11px] font-semibold whitespace-nowrap transition group-hover:scale-105">
        <span
          className={`w-2 h-2 rounded-full ${conditionColor} shrink-0 ${
            !isStale ? 'animate-pulse' : ''
          }`}
        />
        <span className="font-bold text-slate-100">{member.name}</span>
        {member.isCurrent && <span className="text-[9px] text-blue-400 font-normal">(You)</span>}
        <span className="text-slate-500 text-[10px]">·</span>
        {isStale ? (
          <span className="text-[9px] text-amber-300 font-bold bg-amber-950/70 px-1.5 py-0.5 rounded border border-amber-500/50">
            Last Known
          </span>
        ) : (
          <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
            Live
          </span>
        )}
        {member.batteryAvailable && member.batteryLevel !== null && (
          <>
            <span className="text-slate-500 text-[10px]">·</span>
            <span className="text-[10px] text-slate-300 font-mono">
              {member.batteryLevel}%
            </span>
          </>
        )}
      </div>

      {/* 2. Medical Emergency Pulsing Radar Ring & Cross Flag */}
      {(member.condition === 'MEDICAL_EMERGENCY' || isEmergencyReported) && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute w-20 h-20 rounded-full bg-red-600/30 animate-radar" />
          <div className="absolute w-12 h-12 rounded-full bg-red-600/40 animate-ping opacity-75" />
          {/* Floating red medical cross badge above character head */}
          <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
            <Plus className="w-4 h-4 stroke-[4]" />
          </div>
        </div>
      )}

      {/* 3. 3D Character Illustration (Uber/Ola style miniature 3D avatar) */}
      <div className="relative flex flex-col items-center">
        {/* Character Image */}
        {!imageError ? (
          <img
            src={characterSrc}
            alt={member.name}
            onError={() => setImageError(true)}
            className="w-14 h-16 object-contain drop-shadow-md select-none pointer-events-none transition-transform duration-200"
            style={{
              transform: facingDirection === 'left' ? 'scaleX(-1)' : 'scaleX(1)',
            }}
          />
        ) : (
          /* High-Fidelity SVG Fallback if image asset fails to load */
          <div className="w-12 h-14 flex items-center justify-center">
            {isMedic ? (
              <div className="w-10 h-10 rounded-full bg-red-100 border-2 border-red-500 flex items-center justify-center text-red-600 shadow-md">
                <Plus className="w-6 h-6 stroke-[3]" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center text-emerald-700 shadow-md">
                <Crosshair className="w-5 h-5" />
              </div>
            )}
          </div>
        )}

        {/* 4. Ground Contact Shadow Ellipse (Gives genuine 3D spatial presence on the terrain) */}
        <div
          className="w-10 h-3 rounded-full bg-black/40 blur-[2px] -mt-1 pointer-events-none"
          style={{
            transform: 'scaleY(0.6)',
          }}
        />
      </div>
    </div>
  );
};
