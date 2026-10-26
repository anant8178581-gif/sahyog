import React, { useEffect, useState, useRef } from 'react';
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Radio,
  Wifi,
  WifiOff,
  Shield,
  Activity,
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext';

export const VoiceCallModal: React.FC = () => {
  const {
    activeCall,
    acceptVoiceCall,
    declineVoiceCall,
    endVoiceCall,
    toggleMute,
    currentUser,
    isOnline,
  } = useTeam();

  const [simulatedVolume, setSimulatedVolume] = useState<number[]>(new Array(16).fill(15));
  const animRef = useRef<any>(null);

  // Audio waveform animation
  useEffect(() => {
    if (activeCall && activeCall.status === 'connected' && !activeCall.isMuted) {
      const interval = setInterval(() => {
        setSimulatedVolume(
          new Array(16).fill(0).map(() => Math.floor(Math.random() * 65) + 15)
        );
      }, 100);
      return () => clearInterval(interval);
    } else {
      setSimulatedVolume(new Array(16).fill(8));
    }
  }, [activeCall?.status, activeCall?.isMuted]);

  if (!activeCall) return null;

  const isIncoming = activeCall.status === 'incoming';
  const isConnected = activeCall.status === 'connected';
  const isCalling = activeCall.status === 'calling';

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm bg-[#14243b] text-white rounded-3xl shadow-2xl border border-slate-700/80 overflow-hidden p-6 text-center"
      >
        {/* Top Status */}
        <div className="flex items-center justify-between text-xs text-slate-400 mb-6">
          <div className="flex items-center gap-1.5 font-mono">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>SAHYOG WebRTC Encrypted Voice</span>
          </div>
          <div className="flex items-center gap-1">
            {isOnline ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
            )}
            <span className="text-[10px]">{isOnline ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        {/* Teammate Identity */}
        <div className="my-6">
          <div className="relative inline-block mb-3">
            <div className="w-24 h-24 rounded-full bg-blue-600 border-4 border-slate-700 text-white flex items-center justify-center text-3xl font-bold shadow-xl mx-auto">
              {isIncoming ? activeCall.callerName.charAt(0) : activeCall.receiverName.charAt(0)}
            </div>
            {isConnected && (
              <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-[#14243b]" />
            )}
          </div>

          <h3 className="text-xl font-bold tracking-tight">
            {isIncoming ? activeCall.callerName : activeCall.receiverName}
          </h3>
          <p className="text-slate-400 text-xs mt-0.5">
            {isIncoming ? activeCall.callerRole : 'Field Team Unit'}
          </p>

          <div className="mt-3">
            {isCalling && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 animate-pulse">
                Calling field unit...
              </span>
            )}
            {isIncoming && (
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 animate-pulse">
                Incoming secure field call...
              </span>
            )}
            {isConnected && (
              <div className="inline-block bg-slate-800/80 px-3 py-1 rounded-full text-xs font-mono text-emerald-400 font-bold border border-slate-700">
                {formatTimer(activeCall.duration)}
              </div>
            )}
          </div>
        </div>

        {/* Live Audio Visualizer Bars */}
        {isConnected && (
          <div className="h-12 flex items-center justify-center gap-1.5 my-4 px-4 bg-slate-900/60 rounded-2xl border border-slate-800">
            {simulatedVolume.map((vol, idx) => (
              <div
                key={idx}
                className="w-1.5 rounded-full transition-all duration-100"
                style={{
                  height: `${vol}%`,
                  backgroundColor: activeCall.isMuted ? '#64748B' : '#38BDF8',
                }}
              />
            ))}
          </div>
        )}

        {/* Controls */}
        <div className="mt-8 flex items-center justify-center gap-4">
          {isIncoming ? (
            <>
              {/* Decline */}
              <button
                onClick={declineVoiceCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition active:scale-95"
                title="Decline Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>

              {/* Accept */}
              <button
                onClick={acceptVoiceCall}
                className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg transition active:scale-95 animate-pulse"
                title="Accept Voice Call"
              >
                <Phone className="w-6 h-6" />
              </button>
            </>
          ) : (
            <>
              {/* Mute Toggle */}
              {isConnected && (
                <button
                  onClick={toggleMute}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
                    activeCall.isMuted
                      ? 'bg-amber-600 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                  title={activeCall.isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {activeCall.isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
              )}

              {/* End Call Button */}
              <button
                onClick={endVoiceCall}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-lg transition active:scale-95"
                title="End Call"
              >
                <PhoneOff className="w-6 h-6" />
              </button>
            </>
          )}
        </div>

        <p className="text-[10px] text-slate-400 mt-6 leading-tight">
          WebRTC direct peer audio channel with stun.l.google.com signaling. Requires network connectivity.
        </p>
      </div>
    </div>
  );
};
