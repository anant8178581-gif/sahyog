import React, { useState } from 'react';
import {
  X,
  Shield,
  UserCheck,
  Mail,
  Lock,
  User,
  Radio,
  ArrowRight,
  LogOut,
  CheckCircle2,
  AlertCircle,
  HeartPulse,
} from 'lucide-react';
import { useTeam } from '../../context/TeamContext';
import type { MemberRole } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    teamCode,
    joinTeam,
    currentUser,
    authUser,
    signInAnonymous,
    signInWithEmail,
    signUpWithEmail,
    signOutSession,
    isAuthorizedForEmergency,
  } = useTeam();

  const [mode, setMode] = useState<'anonymous' | 'email_login' | 'email_signup'>('anonymous');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [callsign, setCallsign] = useState<string>(currentUser.name || 'Alpha-1');
  const [role, setRole] = useState<MemberRole>(currentUser.role || 'Team Leader');
  const [code, setCode] = useState<string>(teamCode || 'SHY-782');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const isRoleAuthorizedForEmergency = role === 'Team Leader' || role === 'Medic';

  // 1. Anonymous Quick Join
  const handleAnonymousAuth = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await signInAnonymous();
      joinTeam(code.trim().toUpperCase() || 'SHY-782', callsign.trim() || 'Operative', role);
      setSuccessMsg(`Joined sector team ${code.toUpperCase()} via anonymous field credentials.`);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Anonymous authorization failed.');
    } finally {
      setLoading(false);
    }
  };

  // 2. Email Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const user = await signInWithEmail(email, password);
      joinTeam(code.trim().toUpperCase() || 'SHY-782', user.displayName || callsign, role);
      setSuccessMsg(`Authenticated as ${user.email}. Joined sector ${code.toUpperCase()}.`);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  };

  // 3. Email Sign Up
  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      await signUpWithEmail(email, password, callsign);
      joinTeam(code.trim().toUpperCase() || 'SHY-782', callsign, role);
      setSuccessMsg(`Registered field credentials for ${email}. Joined sector.`);
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOutSession();
    setSuccessMsg('Session credentials revoked. New anonymous session assigned.');
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-in fade-in">
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-slate-900"
      >
        {/* Header */}
        <div className="bg-[#14243b] px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="font-extrabold text-base leading-tight">Firebase Authentication</h3>
              <p className="text-slate-400 text-xs leading-tight">
                Anonymous sign-in & team-scoped session management
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-xl text-slate-400 hover:text-white transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Active Session Status */}
          {authUser && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-800 block text-xs">
                  {authUser.isAnonymous ? 'Anonymous Field Session' : authUser.email}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  UID: {authUser.uid.substring(0, 14)}...
                </span>
              </div>

              <button
                onClick={handleSignOut}
                className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 font-bold flex items-center gap-1 transition"
                title="Revoke session credentials"
              >
                <LogOut className="w-3 h-3" />
                <span>Revoke</span>
              </button>
            </div>
          )}

          {/* Feedback Banners */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-700 border border-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Mode Switcher */}
          <div className="flex bg-slate-100 p-1 rounded-xl font-bold text-slate-600">
            <button
              onClick={() => setMode('anonymous')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                mode === 'anonymous' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              Anonymous Fast-Track
            </button>
            <button
              onClick={() => setMode('email_login')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                mode === 'email_login' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              Email Login
            </button>
            <button
              onClick={() => setMode('email_signup')}
              className={`flex-1 py-1.5 rounded-lg transition ${
                mode === 'email_signup' ? 'bg-white text-slate-900 shadow-2xs' : 'hover:text-slate-900'
              }`}
            >
              Register
            </button>
          </div>

          {/* Common Fields: Sector Code, Callsign, Role */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-slate-500 font-bold mb-1">Team Room Code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="SHY-782"
                maxLength={8}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-mono font-bold uppercase"
              />
            </div>
            <div>
              <label className="block text-slate-500 font-bold mb-1">Callsign / Nickname</label>
              <input
                type="text"
                value={callsign}
                onChange={(e) => setCallsign(e.target.value)}
                placeholder="Alpha-1"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-600 font-semibold"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-slate-500 font-bold">Operational Role</label>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                  isRoleAuthorizedForEmergency
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                <HeartPulse className="w-3 h-3 text-red-500" />
                {isRoleAuthorizedForEmergency
                  ? 'Authorized for Emergency Actions'
                  : 'Report-Only Access'}
              </span>
            </div>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-600 bg-white"
            >
              <option value="Team Leader">Team Leader (Authorized: Triage & Emergency Actions)</option>
              <option value="Medic">Medic (Authorized: Triage & Emergency Actions)</option>
              <option value="Recon">Recon (Standard Field Unit)</option>
              <option value="Support">Support (Standard Field Unit)</option>
              <option value="Operator">Operator (Standard Field Unit)</option>
            </select>
          </div>

          {/* Mode 1: Anonymous Fast Track */}
          {mode === 'anonymous' && (
            <div className="space-y-3 pt-2">
              <p className="text-slate-500 leading-relaxed text-[11px]">
                Anonymous sign-in allows immediate mission deployment without credentials. The encrypted session UID is preserved locally and authorized within team sector <span className="font-mono font-bold">{code}</span>.
              </p>
              <button
                type="button"
                disabled={loading}
                onClick={handleAnonymousAuth}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <Radio className="w-4 h-4" />
                <span>{loading ? 'Authorizing...' : 'Authorize Anonymously & Join Team'}</span>
              </button>
            </div>
          )}

          {/* Mode 2: Email Sign In */}
          {mode === 'email_login' && (
            <form onSubmit={handleEmailSignIn} className="space-y-3 pt-1">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operative@defense.gov.in"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">Security Key / Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                <span>{loading ? 'Authenticating...' : 'Sign In with Firebase Credentials'}</span>
              </button>
            </form>
          )}

          {/* Mode 3: Email Sign Up */}
          {mode === 'email_signup' && (
            <form onSubmit={handleEmailSignUp} className="space-y-3 pt-1">
              <div>
                <label className="block text-slate-500 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operative@defense.gov.in"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                />
              </div>
              <div>
                <label className="block text-slate-500 font-bold mb-1">Create Password (min 6 chars)</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:border-blue-600"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-2"
              >
                <UserCheck className="w-4 h-4" />
                <span>{loading ? 'Creating...' : 'Create Credentials & Join Sector'}</span>
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
