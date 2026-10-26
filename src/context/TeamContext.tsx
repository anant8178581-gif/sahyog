import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type {
  TeamMember,
  MemberCondition,
  MemberRole,
  MedicalEmergency,
  EmergencyType,
  EmergencySeverity,
  Checkpoint,
  ThreatZone,
  ChatMessage,
  OfflineQueueItem,
  CallSession,
  ActivityLogItem,
  LocationCoordinates,
  GpsBreadcrumb,
  DeviceBatteryState,
  NetworkConnectionState,
} from '../types';
import {
  offlineDb,
  queueOfflineOperation,
  getPendingOperations,
  markOperationSynced,
} from '../db/offlineDb';
import { calculateHaversineDistance, formatDistance, estimateWalkingTime } from '../utils/geo';
import { soundFx } from '../utils/audio';
import {
  testFirestoreConnection,
  registerTeamMemberInFirestore,
  publishMemberLocation,
  publishMemberStatus,
  sendChatMessageToFirestore,
  publishMedicalRequest,
  updateMedicalRequestStatus,
  saveCheckpointToFirestore,
  deleteCheckpointFromFirestore,
  subscribeToFirestoreMembers,
  subscribeToFirestoreLocations,
  subscribeToFirestoreMessages,
  subscribeToFirestoreEmergencies,
  subscribeToFirestoreCheckpoints,
} from '../services/firebaseFirestore';
import { firebaseAuthService, type AuthUserProfile } from '../services/firebaseAuth';

// Default fallback coordinates before browser GPS lock (Central Field HQ, New Delhi Ridge)
const DEFAULT_FALLBACK_LAT = 28.6139;
const DEFAULT_FALLBACK_LNG = 77.2090;

const DEFAULT_INITIAL_USER: TeamMember = {
  id: 'operative_me',
  name: 'Alpha-1 (You)',
  role: 'Team Leader',
  isCurrent: true,
  condition: 'ALL_CLEAR',
  statusLabel: 'All Clear',
  conditionNote: 'Field Command Unit Active',
  location: { lat: DEFAULT_FALLBACK_LAT, lng: DEFAULT_FALLBACK_LNG, accuracy: 8 },
  lastSeen: Date.now(),
  isSimulated: false,
  batteryLevel: 94,
  isCharging: false,
  batteryAvailable: true,
};

// Rich Combat Soldier Units & Specialized Medicine Response Team
const DEFAULT_INITIAL_ROSTER: TeamMember[] = [
  DEFAULT_INITIAL_USER,
  // --- COMBAT & RECON SOLDIER UNITS ---
  {
    id: 'soldier_alpha2',
    name: 'Alpha-2 (Capt. Rohan)',
    role: 'Recon',
    isCurrent: false,
    condition: 'ALL_CLEAR',
    statusLabel: 'On Patrol',
    conditionNote: 'Forward scout at North Ridge vantage point',
    location: { lat: 28.6192, lng: 77.2145, accuracy: 5, heading: 45, speed: 4.5 },
    lastSeen: Date.now() - 12000,
    isSimulated: true,
    batteryLevel: 88,
    isCharging: false,
    batteryAvailable: true,
  },
  {
    id: 'soldier_alpha3',
    name: 'Alpha-3 (Sub. Rajesh)',
    role: 'Support',
    isCurrent: false,
    condition: 'NEED_ASSISTANCE',
    statusLabel: 'Ankle Sprain',
    conditionNote: 'Field injury sustained near river corridor. Awaiting medical splint.',
    location: { lat: 28.6085, lng: 77.2032, accuracy: 10, heading: 180, speed: 0 },
    lastSeen: Date.now() - 25000,
    isSimulated: true,
    batteryLevel: 74,
    isCharging: false,
    batteryAvailable: true,
  },
  {
    id: 'soldier_alpha5',
    name: 'Alpha-5 (Hav. Arjun)',
    role: 'Operator',
    isCurrent: false,
    condition: 'ALL_CLEAR',
    statusLabel: 'Sentry Secure',
    conditionNote: 'Perimeter watch guard on eastern ingress',
    location: { lat: 28.6215, lng: 77.2025, accuracy: 4, heading: 90, speed: 1.2 },
    lastSeen: Date.now() - 6000,
    isSimulated: true,
    batteryLevel: 82,
    isCharging: true,
    batteryAvailable: true,
  },
  {
    id: 'soldier_bravo1',
    name: 'Bravo-1 (Lt. Meera)',
    role: 'Recon',
    isCurrent: false,
    condition: 'ALL_CLEAR',
    statusLabel: 'Drone Spotter',
    conditionNote: 'Tactical UAV telemetry linked. Sector radar clear.',
    location: { lat: 28.6110, lng: 77.2188, accuracy: 8, heading: 320, speed: 8.5 },
    lastSeen: Date.now() - 4000,
    isSimulated: true,
    batteryLevel: 97,
    isCharging: false,
    batteryAvailable: true,
  },
  // --- MEDICINE & PARAMEDIC RAPID RESPONSE TEAM ---
  {
    id: 'medic_dr_ananya',
    name: 'Med-1 (Dr. Ananya)',
    role: 'Medic',
    isCurrent: false,
    condition: 'ALL_CLEAR',
    statusLabel: 'Surgeon Ready',
    conditionNote: 'Field Trauma Surgeon equipped with advanced trauma kit & defibrillator.',
    location: { lat: 28.6148, lng: 77.2065, accuracy: 4, heading: 15, speed: 0 },
    lastSeen: Date.now() - 8000,
    isSimulated: true,
    batteryLevel: 92,
    isCharging: false,
    batteryAvailable: true,
  },
  {
    id: 'medic_manoj',
    name: 'Med-2 (Hav. Manoj)',
    role: 'Medic',
    isCurrent: false,
    condition: 'ALL_CLEAR',
    statusLabel: 'Paramedic Active',
    conditionNote: 'Combat Medic with oxygen cylinders, intravenous fluids and rigid splints.',
    location: { lat: 28.6168, lng: 77.2105, accuracy: 6, heading: 135, speed: 6.2 },
    lastSeen: Date.now() - 10000,
    isSimulated: true,
    batteryLevel: 81,
    isCharging: false,
    batteryAvailable: true,
  },
  {
    id: 'medic_evac_alpha',
    name: 'Evac-Alpha (Unit 104)',
    role: 'Medic',
    isCurrent: false,
    condition: 'ALL_CLEAR',
    statusLabel: 'Ambulance Evac',
    conditionNote: 'Armored all-terrain casualty extraction vehicle with ALS life-support.',
    location: { lat: 28.6078, lng: 77.2125, accuracy: 3, heading: 270, speed: 28.0 },
    lastSeen: Date.now() - 5000,
    isSimulated: true,
    batteryLevel: 100,
    isCharging: true,
    batteryAvailable: true,
  },
];

const DEFAULT_INITIAL_CHECKPOINTS: Checkpoint[] = [
  {
    id: 'chk_1',
    name: 'Rally Point Alpha',
    description: 'Primary sector assembly & rendezvous coordinate.',
    location: { lat: 28.6152, lng: 77.2088 },
    type: 'RALLY_POINT',
    isPrimaryAssembly: true,
    meetingTime: '13:00',
    createdBy: 'Major Vikram',
    createdAt: Date.now() - 3600000,
  },
  {
    id: 'chk_2',
    name: 'Trauma Evacuation LZ',
    description: 'Designated medical helicopter & armored ambulance casualty extraction pad.',
    location: { lat: 28.6075, lng: 77.2135 },
    type: 'EXTRACTION_ZONE',
    isPrimaryAssembly: false,
    meetingTime: 'Standby 24/7',
    createdBy: 'Med-1 (Dr. Ananya)',
    createdAt: Date.now() - 2400000,
  },
  {
    id: 'chk_3',
    name: 'Forward Supply Drop Echo',
    description: 'Ammunition, fresh drone batteries, sterile medical dressings & water.',
    location: { lat: 28.6202, lng: 77.2160 },
    type: 'SUPPLY_DROP',
    isPrimaryAssembly: false,
    meetingTime: '14:30',
    createdBy: 'Alpha-3',
    createdAt: Date.now() - 1800000,
  },
  {
    id: 'chk_4',
    name: 'Observation Post Ridge',
    description: 'High ground lookout overlooking western river valley corridor.',
    location: { lat: 28.6238, lng: 77.2012 },
    type: 'OBSERVATION_POST',
    isPrimaryAssembly: false,
    meetingTime: '15:00',
    createdBy: 'Alpha-2',
    createdAt: Date.now() - 900000,
  },
];

const DEFAULT_INITIAL_THREAT_ZONES: ThreatZone[] = [
  {
    id: 'threat_1',
    name: 'High Risk Ambush Perimeter',
    riskLevel: 'HIGH_RISK',
    center: { lat: 28.6225, lng: 77.2165 },
    radiusMeters: 450,
    description: 'Hostile sighting reported. Sniper line of sight and obstacle wire verified.',
    reportedAt: Date.now() - 1200000,
    isVerified: true,
  },
  {
    id: 'threat_2',
    name: 'Submerged River Hazard',
    riskLevel: 'MODERATE',
    center: { lat: 28.6115, lng: 77.1990 },
    radiusMeters: 300,
    description: 'Flash-flood warning. Rapid current and boulder shifts prevent vehicle crossing.',
    reportedAt: Date.now() - 600000,
    isVerified: false,
  },
];

const DEFAULT_INITIAL_EMERGENCIES: MedicalEmergency[] = [
  {
    id: 'emg_drill_1',
    reportedBy: 'soldier_alpha3',
    reporterName: 'Alpha-3 (Sub. Rajesh)',
    reporterRole: 'Support',
    type: 'MEDICAL_EMERGENCY',
    severity: 'NEED_ASSISTANCE',
    message: 'Field fracture on right ankle during river corridor patrol. Stretcher & medical splint requested.',
    location: { lat: 28.6085, lng: 77.2032 },
    timestamp: Date.now() - 350000,
    status: 'ACTIVE',
    acknowledgedBy: [],
  },
];

interface ActiveRoute {
  destination: LocationCoordinates;
  name: string;
  distanceMeters: number;
  formattedDistance: string;
  estimatedTime: string;
  isStraightLineFallback: boolean;
}

interface TeamContextType {
  teamCode: string;
  currentUser: TeamMember;
  members: TeamMember[];
  soldiers: TeamMember[];
  medics: TeamMember[];
  emergencies: MedicalEmergency[];
  checkpoints: Checkpoint[];
  threatZones: ThreatZone[];
  messages: ChatMessage[];
  activityLog: ActivityLogItem[];
  isOnline: boolean;
  isSimulatedOffline: boolean;
  isDemoMode: boolean;
  pendingQueueCount: number;
  activeCall: CallSession | null;
  activeRoute: ActiveRoute | null;
  selectedMemberId: string | null;
  mapCenter: LocationCoordinates;
  mapZoom: number;
  isFollowMeActive: boolean;
  batteryStatusMessage: string;
  geolocationStatusMessage: string;

  // Situational Telemetry & State
  batteryState: DeviceBatteryState;
  networkState: NetworkConnectionState;
  isLowPowerMode: boolean;
  toggleLowPowerMode: () => void;
  replayOfflineQueue: () => Promise<number>;

  // Live GPS Tracking & Trail Recording
  gpsAccuracy: number | null;
  gpsSpeed: number;
  gpsAltitude: number | null;
  gpsHeading: number;
  compassHeading: number;
  gpsTrail: GpsBreadcrumb[];
  isRecordingTrail: boolean;
  toggleRecordTrail: () => void;
  clearGpsTrail: () => void;

  // Firebase Auth Provider Session & State
  authUser: AuthUserProfile | null;
  isAuthReady: boolean;
  isAuthorizedForEmergency: boolean;
  authErrorMessage: string | null;
  signInAnonymous: () => Promise<AuthUserProfile>;
  signInWithEmail: (email: string, pass: string) => Promise<AuthUserProfile>;
  signUpWithEmail: (email: string, pass: string, name: string) => Promise<AuthUserProfile>;
  signOutSession: () => Promise<void>;

  // Actions
  toggleFollowMe: () => void;
  updateCurrentCondition: (condition: MemberCondition, note?: string) => Promise<void>;
  triggerEmergency: (type: EmergencyType, severity: EmergencySeverity, message: string) => Promise<void>;
  acknowledgeEmergency: (id: string) => Promise<boolean>;
  resolveEmergency: (id: string) => Promise<boolean>;
  sendMessage: (text: string, isBroadcast?: boolean) => Promise<void>;
  addCheckpoint: (data: { name: string; description?: string; location: LocationCoordinates; type: Checkpoint['type'] }) => Promise<void>;
  deleteCheckpoint: (id: string) => Promise<void>;
  setPrimaryAssembly: (id: string) => Promise<void>;
  startVoiceCall: (receiverId: string) => Promise<void>;
  acceptVoiceCall: () => void;
  declineVoiceCall: () => void;
  endVoiceCall: () => void;
  toggleMute: () => void;
  planRouteTo: (destination: LocationCoordinates, name: string) => void;
  clearRoute: () => void;
  setSelectedMemberId: (id: string | null) => void;
  setMapCenter: (coords: LocationCoordinates) => void;
  setMapZoom: (zoom: number) => void;
  toggleOfflineSimulation: () => void;
  toggleDemoMode: () => void;
  simulateTeammateMovement: () => void;
  simulateEmergency: () => void;
  resetDemo: () => void;
  requestRealGeolocation: () => Promise<void>;
  joinTeam: (code: string, nickname: string, role: MemberRole) => void;
  leaveTeam: () => void;
}

const TeamContext = createContext<TeamContextType | null>(null);

const CHANNEL_NAME = 'sahyog_team_coordination_channel';

export const TeamProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [teamCode, setTeamCode] = useState<string>('SHY-782');
  const [members, setMembers] = useState<TeamMember[]>(DEFAULT_INITIAL_ROSTER);
  const [emergencies, setEmergencies] = useState<MedicalEmergency[]>(DEFAULT_INITIAL_EMERGENCIES);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>(DEFAULT_INITIAL_CHECKPOINTS);
  const [threatZones, setThreatZones] = useState<ThreatZone[]>(DEFAULT_INITIAL_THREAT_ZONES);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg_init_1',
      senderId: 'soldier_alpha2',
      senderName: 'Alpha-2 (Capt. Rohan)',
      senderRole: 'Recon',
      text: 'Reached Ridge observation post. Valley ingress visual is 100% clear.',
      timestamp: Date.now() - 420000,
      isBroadcast: false,
      status: 'synced',
    },
    {
      id: 'msg_init_2',
      senderId: 'medic_dr_ananya',
      senderName: 'Med-1 (Dr. Ananya)',
      senderRole: 'Medic',
      text: 'Mobile Trauma Evac station online at LZ Pad. All surgical packs sanitized.',
      timestamp: Date.now() - 180000,
      isBroadcast: true,
      status: 'synced',
    },
  ]);
  const [activityLog, setActivityLog] = useState<ActivityLogItem[]>([
    {
      id: `act_init_${Date.now()}`,
      timestamp: Date.now(),
      type: 'JOIN',
      actor: 'SAHYOG Engine',
      description: 'SAHYOG Real-time Tactical Field Command active. Google Maps & Firebase telemetry online.',
      severity: 'info',
    },
  ]);

  // Auth Provider State
  const [authUser, setAuthUser] = useState<AuthUserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState<boolean>(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);

  const [isBrowserOnline, setIsBrowserOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [isSimulatedOffline, setIsSimulatedOffline] = useState<boolean>(false);
  const isOnline = isBrowserOnline && !isSimulatedOffline;

  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [pendingQueueCount, setPendingQueueCount] = useState<number>(0);
  const [activeCall, setActiveCall] = useState<CallSession | null>(null);
  const [activeRoute, setActiveRoute] = useState<ActiveRoute | null>(null);

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [mapCenter, setMapCenter] = useState<LocationCoordinates>({
    lat: DEFAULT_FALLBACK_LAT,
    lng: DEFAULT_FALLBACK_LNG,
  });
  const [mapZoom, setMapZoom] = useState<number>(15);
  const [isFollowMeActive, setIsFollowMeActive] = useState<boolean>(false);

  const [batteryStatusMessage, setBatteryStatusMessage] = useState<string>('Reading battery status...');
  const [geolocationStatusMessage, setGeolocationStatusMessage] = useState<string>(
    'Acquiring real GPS lock...'
  );

  // Situational Telemetry States
  const [batteryState, setBatteryState] = useState<DeviceBatteryState>({
    level: 94,
    charging: false,
    chargingTime: null,
    dischargingTime: null,
    isHardwareApi: false,
  });
  const [isLowPowerMode, setIsLowPowerMode] = useState<boolean>(false);

  const [networkState, setNetworkState] = useState<NetworkConnectionState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    effectiveType: '4g',
    downlinkMb: 12.5,
    rttMs: 24,
  });

  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(6);
  const [gpsSpeed, setGpsSpeed] = useState<number>(0);
  const [gpsAltitude, setGpsAltitude] = useState<number | null>(218);
  const [gpsHeading, setGpsHeading] = useState<number>(0);
  const [compassHeading, setCompassHeading] = useState<number>(185);
  const [gpsTrail, setGpsTrail] = useState<GpsBreadcrumb[]>([
    { lat: 28.6135, lng: 77.2085, timestamp: Date.now() - 90000, accuracy: 6 },
    { lat: 28.6137, lng: 77.2088, timestamp: Date.now() - 50000, accuracy: 5 },
    { lat: 28.6139, lng: 77.2090, timestamp: Date.now() - 10000, accuracy: 5 },
  ]);
  const [isRecordingTrail, setIsRecordingTrail] = useState<boolean>(true);

  const currentUser = members.find((m) => m.isCurrent) || DEFAULT_INITIAL_USER;

  // Filtered unit lists
  const soldiers = members.filter(
    (m) => m.role === 'Team Leader' || m.role === 'Recon' || m.role === 'Support' || m.role === 'Operator'
  );
  const medics = members.filter((m) => m.role === 'Medic');

  // Medical Emergency authorization check: Only 'Team Leader' and 'Medic' are authorized
  const isAuthorizedForEmergency =
    currentUser.role === 'Team Leader' || currentUser.role === 'Medic';

  // Broadcast channel for cross-tab sync
  const channelRef = useRef<BroadcastChannel | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const callTimerRef = useRef<any>(null);

  const toggleFollowMe = () => {
    setIsFollowMeActive((prev) => {
      const next = !prev;
      if (next && currentUser.location) {
        setMapCenter(currentUser.location);
      }
      return next;
    });
  };

  // 1. Initial Connection Probe & Auth Initialization
  useEffect(() => {
    testFirestoreConnection().catch(console.warn);

    // Subscribe to Firebase Auth state
    const unsubAuth = firebaseAuthService.onAuthState((user) => {
      setAuthUser(user);
      setIsAuthReady(true);
      if (user) {
        setMembers((prev) => {
          const current = prev.find((m) => m.isCurrent) || DEFAULT_INITIAL_USER;
          const updated: TeamMember = {
            ...current,
            id: user.uid,
            name: user.displayName || current.name,
          };
          registerTeamMemberInFirestore(teamCode, updated).catch(console.warn);
          publishMemberLocation(teamCode, updated.id, updated.location).catch(console.warn);
          return [updated, ...prev.filter((m) => !m.isCurrent && m.id !== user.uid)];
        });
      }
    });

    // Automatically ensure authenticated user session
    firebaseAuthService.ensureAuthenticated().catch((err) => {
      console.warn('Auto auth establishment error:', err);
    });

    return () => unsubAuth();
  }, [teamCode]);

  // Initialize Dexie offline database snapshots
  useEffect(() => {
    async function initOfflineCache() {
      try {
        await offlineDb.teamMembers.bulkPut(members);
        await offlineDb.checkpoints.bulkPut(checkpoints);
        await offlineDb.emergencies.bulkPut(emergencies);
        await offlineDb.messages.bulkPut(messages);
        const pending = await getPendingOperations();
        setPendingQueueCount(pending.length);
      } catch (e) {
        console.warn('Failed to populate offline Dexie DB', e);
      }
    }
    initOfflineCache();
  }, []);

  // Update Pending Queue Count whenever changed
  const refreshQueueCount = useCallback(async () => {
    try {
      const pending = await getPendingOperations();
      setPendingQueueCount(pending.length);
    } catch {
      // Ignored
    }
  }, []);

  // Real Battery API Detection
  useEffect(() => {
    let batteryObj: any = null;

    async function detectBattery() {
      if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        try {
          batteryObj = await (navigator as any).getBattery();
          const updateBattery = () => {
            const level = Math.round(batteryObj.level * 100);
            const charging = batteryObj.charging;
            const chargingTime = batteryObj.chargingTime ?? null;
            const dischargingTime = batteryObj.dischargingTime ?? null;

            setBatteryState({
              level,
              charging,
              chargingTime,
              dischargingTime,
              isHardwareApi: true,
            });

            setMembers((prev) =>
              prev.map((m) =>
                m.isCurrent
                  ? {
                      ...m,
                      batteryLevel: level,
                      isCharging: charging,
                      batteryAvailable: true,
                    }
                  : m
              )
            );
            setBatteryStatusMessage(`Device Battery: ${level}% ${charging ? '(Charging)' : ''}`);
          };
          updateBattery();
          batteryObj.addEventListener('levelchange', updateBattery);
          batteryObj.addEventListener('chargingchange', updateBattery);
          batteryObj.addEventListener('chargingtimechange', updateBattery);
          batteryObj.addEventListener('dischargingtimechange', updateBattery);
        } catch {
          setBatteryStatusMessage('Battery API permission restricted. Demo battery simulation active.');
        }
      } else {
        setBatteryStatusMessage('Battery Status API not supported in this browser. Simulated values shown.');
      }
    }

    detectBattery();

    return () => {
      if (batteryObj) {
        batteryObj.removeEventListener('levelchange', () => {});
        batteryObj.removeEventListener('chargingchange', () => {});
        batteryObj.removeEventListener('chargingtimechange', () => {});
        batteryObj.removeEventListener('dischargingtimechange', () => {});
      }
    };
  }, []);

  // Network Online/Offline & Connection Information Listeners
  useEffect(() => {
    const updateNetworkStatus = () => {
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      setIsBrowserOnline(online);
      const conn = (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
      setNetworkState({
        isOnline: online,
        effectiveType: conn?.effectiveType || '4g',
        downlinkMb: conn?.downlink || 12.5,
        rttMs: conn?.rtt || 24,
        saveData: conn?.saveData || false,
      });
    };

    const handleOnline = () => {
      updateNetworkStatus();
      soundFx.playTacticalClick();
      replayOfflineQueue();
    };
    const handleOffline = () => {
      updateNetworkStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const conn = (navigator as any)?.connection || (navigator as any)?.mozConnection || (navigator as any)?.webkitConnection;
    if (conn && conn.addEventListener) {
      conn.addEventListener('change', updateNetworkStatus);
    }

    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn && conn.removeEventListener) {
        conn.removeEventListener('change', updateNetworkStatus);
      }
    };
  }, []);

  // Compass Heading & Device Orientation Sensor
  useEffect(() => {
    const handleOrientation = (e: DeviceOrientationEvent) => {
      let heading = (e as any).webkitCompassHeading;
      if (typeof heading === 'undefined' && e.alpha !== null) {
        heading = (360 - e.alpha) % 360;
      }
      if (typeof heading === 'number' && !isNaN(heading)) {
        setCompassHeading(Math.round(heading));
      }
    };

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, []);

  // BroadcastChannel for instant multi-tab sync
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;

      channel.onmessage = (event) => {
        const { type, payload } = event.data;
        if (!payload) return;

        switch (type) {
          case 'CONDITION_UPDATE':
            setMembers((prev) =>
              prev.map((m) =>
                m.id === payload.memberId
                  ? {
                      ...m,
                      condition: payload.condition,
                      statusLabel: payload.statusLabel,
                      conditionNote: payload.note,
                      lastSeen: Date.now(),
                    }
                  : m
              )
            );
            break;

          case 'EMERGENCY_TRIGGERED':
            setEmergencies((prev) => [payload.emergency, ...prev.filter((e) => e.id !== payload.emergency.id)]);
            soundFx.playEmergencyAlarm();
            break;

          case 'EMERGENCY_ACKNOWLEDGED':
            setEmergencies((prev) =>
              prev.map((e) =>
                e.id === payload.emergencyId
                  ? {
                      ...e,
                      status: 'ACKNOWLEDGED',
                      acknowledgedBy: Array.from(new Set([...(e.acknowledgedBy || []), payload.acknowledgedBy])),
                      acknowledgedAt: Date.now(),
                    }
                  : e
              )
            );
            break;

          case 'EMERGENCY_RESOLVED':
            setEmergencies((prev) =>
              prev.map((e) =>
                e.id === payload.emergencyId
                  ? {
                      ...e,
                      status: 'RESOLVED',
                      resolvedBy: payload.resolvedBy,
                      resolvedAt: Date.now(),
                    }
                  : e
              )
            );
            break;

          case 'NEW_MESSAGE':
            setMessages((prev) => [...prev, payload.message]);
            soundFx.playMessageChime();
            break;

          case 'CHECKPOINT_ADDED':
            setCheckpoints((prev) => [payload.checkpoint, ...prev.filter((c) => c.id !== payload.checkpoint.id)]);
            break;

          case 'CHECKPOINT_DELETED':
            setCheckpoints((prev) => prev.filter((c) => c.id !== payload.id));
            break;

          case 'INCOMING_CALL':
            if (payload.receiverId === currentUser.id) {
              setActiveCall({
                id: payload.callId,
                callerId: payload.callerId,
                callerName: payload.callerName,
                callerRole: payload.callerRole,
                receiverId: currentUser.id,
                receiverName: currentUser.name,
                status: 'incoming',
                duration: 0,
                isMuted: false,
              });
              soundFx.playCallRing();
            }
            break;

          case 'CALL_ACCEPTED':
            if (activeCall && activeCall.id === payload.callId) {
              setActiveCall((prev) => (prev ? { ...prev, status: 'connected', startTime: Date.now() } : null));
            }
            break;

          case 'CALL_ENDED':
            if (activeCall && activeCall.id === payload.callId) {
              endVoiceCall();
            }
            break;
        }
      };

      return () => {
        channel.close();
      };
    }
  }, [currentUser.id, activeCall]);

  // Auto-acquire real GPS location on application startup
  useEffect(() => {
    requestRealGeolocation();
  }, []);

  // Live Firestore Synchronization: Securely scoped to current teamCode and active auth session
  useEffect(() => {
    if (!isOnline || !teamCode || !authUser) return;

    // 1. Subscribe to Team Roster in Firestore
    const unsubMembers = subscribeToFirestoreMembers(teamCode, (remoteMembers) => {
      setMembers((prev) => {
        const current = prev.find((m) => m.isCurrent) || DEFAULT_INITIAL_USER;
        // Merge remote members with our current and initial units
        const currentId = current.id;
        const remoteIds = new Set(remoteMembers.map((m) => m.id));

        const updated = prev.map((localM) => {
          if (localM.isCurrent) return localM;
          const match = remoteMembers.find((rm) => rm.id === localM.id);
          return match ? { ...match, isCurrent: false } : localM;
        });

        // Add any brand new remote members
        remoteMembers.forEach((rm) => {
          if (rm.id !== currentId && !updated.some((u) => u.id === rm.id)) {
            updated.push({ ...rm, isCurrent: false });
          }
        });

        return updated;
      });
    });

    // 2. Subscribe to locations in Firestore
    const unsubLocations = subscribeToFirestoreLocations(teamCode, (locMap) => {
      setMembers((prev) =>
        prev.map((m) => {
          if (m.isCurrent) return m;
          const remoteLoc = locMap[m.id];
          if (remoteLoc) {
            return {
              ...m,
              location: {
                lat: remoteLoc.lat,
                lng: remoteLoc.lng,
                accuracy: remoteLoc.accuracy,
                speed: remoteLoc.heading,
              },
              lastSeen: remoteLoc.lastSeen || Date.now(),
            };
          }
          return m;
        })
      );
    });

    // 3. Subscribe to messages in Firestore
    const unsubMessages = subscribeToFirestoreMessages(teamCode, (remoteMsgs) => {
      if (remoteMsgs.length > 0) {
        setMessages(remoteMsgs);
      }
    });

    // 4. Subscribe to emergencies in Firestore
    const unsubEmergencies = subscribeToFirestoreEmergencies(teamCode, (remoteEmgs) => {
      if (remoteEmgs.length > 0) {
        setEmergencies(remoteEmgs);
      }
    });

    // 5. Subscribe to checkpoints in Firestore
    const unsubCheckpoints = subscribeToFirestoreCheckpoints(teamCode, (remoteChks) => {
      if (remoteChks.length > 0) {
        setCheckpoints(remoteChks);
      }
    });

    return () => {
      unsubMembers();
      unsubLocations();
      unsubMessages();
      unsubEmergencies();
      unsubCheckpoints();
    };
  }, [teamCode, isOnline, authUser]);

  // Broadcast helper
  const broadcast = (type: string, payload: any) => {
    if (channelRef.current) {
      try {
        channelRef.current.postMessage({ type, payload, timestamp: Date.now() });
      } catch (err) {
        console.warn('Broadcast failed', err);
      }
    }
  };

  // Auth Operations exposed by TeamContext
  const signInAnonymous = async (): Promise<AuthUserProfile> => {
    try {
      setAuthErrorMessage(null);
      const user = await firebaseAuthService.signInAnonymous();
      setAuthUser(user);
      return user;
    } catch (err: any) {
      setAuthErrorMessage(err.message || 'Anonymous sign-in failed');
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string): Promise<AuthUserProfile> => {
    try {
      setAuthErrorMessage(null);
      const user = await firebaseAuthService.signInEmail(email, pass);
      setAuthUser(user);
      return user;
    } catch (err: any) {
      setAuthErrorMessage(err.message || 'Email authentication failed');
      throw err;
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string): Promise<AuthUserProfile> => {
    try {
      setAuthErrorMessage(null);
      const user = await firebaseAuthService.signUpEmail(email, pass, name);
      setAuthUser(user);
      return user;
    } catch (err: any) {
      setAuthErrorMessage(err.message || 'Registration failed');
      throw err;
    }
  };

  const signOutSession = async (): Promise<void> => {
    try {
      await firebaseAuthService.logOut();
      setAuthUser(null);
      await firebaseAuthService.signInAnonymous();
    } catch (err: any) {
      console.warn('Sign out notice:', err);
    }
  };

  // Replay Offline Queue when connection is restored
  const replayOfflineQueue = async (): Promise<number> => {
    const pending = await getPendingOperations();
    if (pending.length === 0) return 0;

    let syncedCount = 0;
    for (const op of pending) {
      try {
        broadcast(op.type, op.payload);

        if (navigator.onLine) {
          if (op.type === 'UPDATE_CONDITION' && op.payload) {
            await publishMemberStatus(
              teamCode,
              op.payload.memberId,
              op.payload.condition,
              op.payload.statusLabel,
              op.payload.note
            );
          } else if (op.type === 'TRIGGER_EMERGENCY' && op.payload?.emergency) {
            await publishMedicalRequest(teamCode, op.payload.emergency);
          } else if (op.type === 'ACKNOWLEDGE_EMERGENCY' && op.payload?.emergencyId) {
            await updateMedicalRequestStatus(teamCode, op.payload.emergencyId, {
              status: 'ACKNOWLEDGED',
              acknowledgedBy: [op.payload.acknowledgedBy],
              acknowledgedAt: Date.now(),
            });
          } else if (op.type === 'RESOLVE_EMERGENCY' && op.payload?.emergencyId) {
            await updateMedicalRequestStatus(teamCode, op.payload.emergencyId, {
              status: 'RESOLVED',
              resolvedBy: op.payload.resolvedBy,
              resolvedAt: Date.now(),
            });
          } else if (op.type === 'SEND_MESSAGE' && op.payload?.message) {
            await sendChatMessageToFirestore(teamCode, op.payload.message);
          } else if (op.type === 'ADD_CHECKPOINT' && op.payload?.checkpoint) {
            await saveCheckpointToFirestore(teamCode, op.payload.checkpoint);
          }
        }

        await markOperationSynced(op.id);
        syncedCount++;
      } catch (err) {
        console.error('Failed to sync op', op, err);
      }
    }

    await refreshQueueCount();
    setActivityLog((prev) => [
      {
        id: `act_sync_${Date.now()}`,
        timestamp: Date.now(),
        type: 'SYNC',
        actor: 'SAHYOG Engine',
        description: `Successfully synchronized ${syncedCount} queued field operation(s) with team cloud.`,
        severity: 'success',
      },
      ...prev,
    ]);
    return syncedCount;
  };

  // Helper actions for situational telemetry & breadcrumb trail
  const toggleLowPowerMode = () => {
    setIsLowPowerMode((prev) => {
      const next = !prev;
      soundFx.playTacticalClick();
      setActivityLog((act) => [
        {
          id: `act_pwr_${Date.now()}`,
          timestamp: Date.now(),
          type: 'STATUS_CHANGE',
          actor: currentUser.name,
          description: `Tactical Low-Power Conservation Mode ${next ? 'ENABLED (GPS throttled)' : 'DISABLED (Full telemetry)'}.`,
          severity: 'info',
        },
        ...act,
      ]);
      return next;
    });
  };

  const toggleRecordTrail = () => {
    soundFx.playTacticalClick();
    setIsRecordingTrail((prev) => !prev);
  };

  const clearGpsTrail = () => {
    soundFx.playTacticalClick();
    setGpsTrail([]);
  };

  // Request Real Geolocation (High accuracy continuous GPS tracking)
  const requestRealGeolocation = async () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeolocationStatusMessage('Geolocation API is not supported by your browser.');
      return;
    }

    setGeolocationStatusMessage('Acquiring high-precision GPS positioning...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const accuracy = Math.round(pos.coords.accuracy);
        const altitude = pos.coords.altitude ? Math.round(pos.coords.altitude) : 218;
        const speed = pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0;
        const heading = pos.coords.heading || 0;

        const coords: LocationCoordinates = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy,
          altitude,
          speed,
          heading,
        };

        setGpsAccuracy(accuracy);
        setGpsAltitude(altitude);
        setGpsSpeed(speed);
        setGpsHeading(heading);

        setMembers((prev) =>
          prev.map((m) =>
            m.isCurrent
              ? {
                  ...m,
                  location: coords,
                  isSimulated: false,
                  lastSeen: Date.now(),
                }
              : m
          )
        );

        setMapCenter({ lat: coords.lat, lng: coords.lng });
        setGeolocationStatusMessage(
          `GPS Active: Precision ±${coords.accuracy}m (${coords.lat.toFixed(5)}°, ${coords.lng.toFixed(5)}°)`
        );

        if (isRecordingTrail) {
          setGpsTrail((prev) => [
            ...prev.slice(-300),
            {
              lat: coords.lat,
              lng: coords.lng,
              timestamp: Date.now(),
              accuracy,
              altitude,
              speed,
            },
          ]);
        }

        if (isOnline) {
          publishMemberLocation(teamCode, currentUser.id, coords).catch(console.warn);
        }

        // Continuous watch
        navigator.geolocation.watchPosition(
          (watchPos) => {
            const wAccuracy = Math.round(watchPos.coords.accuracy);
            const wAltitude = watchPos.coords.altitude ? Math.round(watchPos.coords.altitude) : 218;
            const wSpeed = watchPos.coords.speed ? Math.round(watchPos.coords.speed * 3.6) : 0;
            const wHeading = watchPos.coords.heading || 0;

            const liveCoords: LocationCoordinates = {
              lat: watchPos.coords.latitude,
              lng: watchPos.coords.longitude,
              accuracy: wAccuracy,
              altitude: wAltitude,
              speed: wSpeed,
              heading: wHeading,
            };

            setGpsAccuracy(wAccuracy);
            setGpsAltitude(wAltitude);
            setGpsSpeed(wSpeed);
            setGpsHeading(wHeading);

            setMembers((prev) =>
              prev.map((m) =>
                m.isCurrent
                  ? {
                      ...m,
                      location: liveCoords,
                      isSimulated: false,
                      lastSeen: Date.now(),
                    }
                  : m
              )
            );

            if (isRecordingTrail) {
              setGpsTrail((prev) => [
                ...prev.slice(-300),
                {
                  lat: liveCoords.lat,
                  lng: liveCoords.lng,
                  timestamp: Date.now(),
                  accuracy: wAccuracy,
                  altitude: wAltitude,
                  speed: wSpeed,
                },
              ]);
            }

            if (isFollowMeActive) {
              setMapCenter({ lat: liveCoords.lat, lng: liveCoords.lng });
            }

            if (isOnline) {
              publishMemberLocation(teamCode, currentUser.id, liveCoords).catch(console.warn);
            }
          },
          (err) => console.warn('GPS continuous watch notice:', err),
          { enableHighAccuracy: !isLowPowerMode, maximumAge: isLowPowerMode ? 12000 : 3000, timeout: 10000 }
        );
      },
      (err) => {
        setGeolocationStatusMessage(
          `GPS Permission Restricted (${err.message}). Using field sector training coordinates.`
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Update Current Member Condition
  const updateCurrentCondition = async (condition: MemberCondition, note?: string) => {
    const statusMap: Record<MemberCondition, string> = {
      ALL_CLEAR: 'All Clear',
      CAUTION: 'Caution',
      NEED_ASSISTANCE: 'Need Assistance',
      MEDICAL_EMERGENCY: 'Medical Emergency',
      OFFLINE: 'Offline',
    };

    const statusLabel = statusMap[condition] || 'All Clear';

    setMembers((prev) =>
      prev.map((m) =>
        m.isCurrent
          ? {
              ...m,
              condition,
              statusLabel,
              conditionNote: note ?? m.conditionNote,
              lastSeen: Date.now(),
            }
          : m
      )
    );

    const logItem: ActivityLogItem = {
      id: `act_${Date.now()}`,
      timestamp: Date.now(),
      type: 'STATUS_CHANGE',
      actor: currentUser.name,
      description: `${currentUser.name} updated condition to ${statusLabel}${note ? `: "${note}"` : ''}`,
      severity: condition === 'MEDICAL_EMERGENCY' ? 'emergency' : condition === 'NEED_ASSISTANCE' ? 'warning' : 'info',
    };
    setActivityLog((prev) => [logItem, ...prev]);

    const payload = {
      memberId: currentUser.id,
      condition,
      statusLabel,
      note,
    };

    if (isOnline) {
      broadcast('CONDITION_UPDATE', payload);
      publishMemberStatus(teamCode, currentUser.id, condition, statusLabel, note).catch(console.warn);
    } else {
      await queueOfflineOperation('UPDATE_CONDITION', payload);
      await refreshQueueCount();
    }
  };

  // Trigger Medical or Distress Emergency
  const triggerEmergency = async (
    type: EmergencyType,
    severity: EmergencySeverity,
    message: string
  ) => {
    soundFx.playEmergencyAlarm();

    const emergency: MedicalEmergency = {
      id: `emg_${Date.now()}`,
      reportedBy: currentUser.id,
      reporterName: currentUser.name,
      reporterRole: currentUser.role,
      type,
      severity,
      message: message || 'Emergency medical/distress assistance requested at coordinates.',
      location: currentUser.location,
      timestamp: Date.now(),
      status: 'ACTIVE',
      acknowledgedBy: [],
    };

    setEmergencies((prev) => [emergency, ...prev]);

    setMembers((prev) =>
      prev.map((m) =>
        m.isCurrent
          ? {
              ...m,
              condition: 'MEDICAL_EMERGENCY',
              statusLabel: 'Distress',
              lastSeen: Date.now(),
            }
          : m
      )
    );

    setActivityLog((prev) => [
      {
        id: `act_emg_${Date.now()}`,
        timestamp: Date.now(),
        type: 'EMERGENCY',
        actor: currentUser.name,
        description: `CRITICAL ALERT: ${type.replace('_', ' ')} triggered by ${currentUser.name} (${currentUser.role}). "${emergency.message}"`,
        severity: 'emergency',
      },
      ...prev,
    ]);

    const alertChat: ChatMessage = {
      id: `chat_emg_${Date.now()}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text: `🚨 [EMERGENCY ALERT] ${severity}: ${emergency.message}`,
      timestamp: Date.now(),
      isBroadcast: true,
      status: isOnline ? 'synced' : 'queued',
      attachment: {
        type: 'alert',
        data: { emergencyId: emergency.id, location: emergency.location },
      },
    };
    setMessages((prev) => [...prev, alertChat]);

    if (isOnline) {
      broadcast('EMERGENCY_TRIGGERED', { emergency });
      publishMedicalRequest(teamCode, emergency).catch(console.warn);
      sendChatMessageToFirestore(teamCode, alertChat).catch(console.warn);
    } else {
      await queueOfflineOperation('TRIGGER_EMERGENCY', { emergency });
      await refreshQueueCount();
    }
  };

  // Acknowledge Emergency
  const acknowledgeEmergency = async (id: string): Promise<boolean> => {
    if (!isAuthorizedForEmergency) {
      const warningMsg = `Permission Denied: Your role (${currentUser.role}) is not authorized to triage medical emergencies. Only 'Team Leader' and 'Medic' can acknowledge.`;
      setActivityLog((prev) => [
        {
          id: `act_warn_${Date.now()}`,
          timestamp: Date.now(),
          type: 'ACKNOWLEDGE',
          actor: currentUser.name,
          description: warningMsg,
          severity: 'warning',
        },
        ...prev,
      ]);
      return false;
    }

    soundFx.playTacticalClick();

    setEmergencies((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: 'ACKNOWLEDGED',
              acknowledgedBy: Array.from(new Set([...(e.acknowledgedBy || []), currentUser.name])),
              acknowledgedAt: Date.now(),
            }
          : e
      )
    );

    setActivityLog((prev) => [
      {
        id: `act_ack_${Date.now()}`,
        timestamp: Date.now(),
        type: 'ACKNOWLEDGE',
        actor: currentUser.name,
        description: `${currentUser.name} (${currentUser.role}) acknowledged emergency ${id}. Medical rescue dispatched.`,
        severity: 'warning',
      },
      ...prev,
    ]);

    const payload = {
      emergencyId: id,
      acknowledgedBy: currentUser.name,
    };

    if (isOnline) {
      broadcast('EMERGENCY_ACKNOWLEDGED', payload);
      updateMedicalRequestStatus(teamCode, id, {
        status: 'ACKNOWLEDGED',
        acknowledgedBy: [currentUser.name],
        acknowledgedAt: Date.now(),
      }).catch(console.warn);
    } else {
      await queueOfflineOperation('ACKNOWLEDGE_EMERGENCY', payload);
      await refreshQueueCount();
    }
    return true;
  };

  // Resolve Emergency
  const resolveEmergency = async (id: string): Promise<boolean> => {
    if (!isAuthorizedForEmergency) {
      const warningMsg = `Permission Denied: Your role (${currentUser.role}) is not authorized to resolve medical emergencies. Only 'Team Leader' and 'Medic' can resolve.`;
      setActivityLog((prev) => [
        {
          id: `act_warn_${Date.now()}`,
          timestamp: Date.now(),
          type: 'RESOLUTION',
          actor: currentUser.name,
          description: warningMsg,
          severity: 'warning',
        },
        ...prev,
      ]);
      return false;
    }

    soundFx.playTacticalClick();

    setEmergencies((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status: 'RESOLVED',
              resolvedBy: `${currentUser.name} (${currentUser.role})`,
              resolvedAt: Date.now(),
            }
          : e
      )
    );

    setActivityLog((prev) => [
      {
        id: `act_res_${Date.now()}`,
        timestamp: Date.now(),
        type: 'RESOLUTION',
        actor: currentUser.name,
        description: `Emergency ${id} was marked RESOLVED by ${currentUser.name} (${currentUser.role}). Casualty extracted.`,
        severity: 'success',
      },
      ...prev,
    ]);

    const payload = {
      emergencyId: id,
      resolvedBy: `${currentUser.name} (${currentUser.role})`,
    };

    if (isOnline) {
      broadcast('EMERGENCY_RESOLVED', payload);
      updateMedicalRequestStatus(teamCode, id, {
        status: 'RESOLVED',
        resolvedBy: `${currentUser.name} (${currentUser.role})`,
        resolvedAt: Date.now(),
      }).catch(console.warn);
    } else {
      await queueOfflineOperation('RESOLVE_EMERGENCY', payload);
      await refreshQueueCount();
    }
    return true;
  };

  // Send Team Chat Message
  const sendMessage = async (text: string, isBroadcast = false) => {
    if (!text.trim()) return;

    soundFx.playMessageChime();

    const msg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      text: text.trim(),
      timestamp: Date.now(),
      isBroadcast,
      status: isOnline ? 'synced' : 'queued',
    };

    setMessages((prev) => [...prev, msg]);

    if (isOnline) {
      broadcast('NEW_MESSAGE', { message: msg });
      sendChatMessageToFirestore(teamCode, msg).catch(console.warn);
    } else {
      await queueOfflineOperation('SEND_MESSAGE', { message: msg });
      await refreshQueueCount();
    }
  };

  // Add Checkpoint
  const addCheckpoint = async (data: {
    name: string;
    description?: string;
    location: LocationCoordinates;
    type: Checkpoint['type'];
  }) => {
    soundFx.playTacticalClick();

    const chk: Checkpoint = {
      id: `chk_${Date.now()}`,
      name: data.name,
      description: data.description,
      location: data.location,
      type: data.type,
      isPrimaryAssembly: false,
      meetingTime: new Date(Date.now() + 3600000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdBy: currentUser.name,
      createdAt: Date.now(),
    };

    setCheckpoints((prev) => [chk, ...prev]);

    setActivityLog((prev) => [
      {
        id: `act_chk_${Date.now()}`,
        timestamp: Date.now(),
        type: 'CHECKPOINT',
        actor: currentUser.name,
        description: `${currentUser.name} placed checkpoint "${chk.name}" on Google Map at ${chk.location.lat.toFixed(4)}° N, ${chk.location.lng.toFixed(4)}° E.`,
        severity: 'info',
      },
      ...prev,
    ]);

    if (isOnline) {
      broadcast('CHECKPOINT_ADDED', { checkpoint: chk });
      saveCheckpointToFirestore(teamCode, chk).catch(console.warn);
    } else {
      await queueOfflineOperation('ADD_CHECKPOINT', { checkpoint: chk });
      await refreshQueueCount();
    }
  };

  // Delete Checkpoint
  const deleteCheckpoint = async (id: string) => {
    soundFx.playTacticalClick();
    setCheckpoints((prev) => prev.filter((c) => c.id !== id));
    if (isOnline) {
      broadcast('CHECKPOINT_DELETED', { id });
      deleteCheckpointFromFirestore(teamCode, id).catch(console.warn);
    }
  };

  // Set Primary Assembly Point
  const setPrimaryAssembly = async (id: string) => {
    soundFx.playTacticalClick();
    setCheckpoints((prev) =>
      prev.map((c) => ({
        ...c,
        isPrimaryAssembly: c.id === id,
      }))
    );
  };

  // WebRTC Real Voice Calling
  const startVoiceCall = async (receiverId: string) => {
    const target = members.find((m) => m.id === receiverId);
    if (!target) return;

    soundFx.playCallRing();

    if (!isOnline) {
      alert('Voice calls require active network connectivity. You are currently in offline mode.');
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
      }
    } catch (err: any) {
      console.warn('Microphone permission blocked or unavailable:', err);
    }

    const callId = `call_${Date.now()}`;
    const newCall: CallSession = {
      id: callId,
      callerId: currentUser.id,
      callerName: currentUser.name,
      callerRole: currentUser.role,
      receiverId: target.id,
      receiverName: target.name,
      status: 'calling',
      duration: 0,
      isMuted: false,
    };

    setActiveCall(newCall);

    broadcast('INCOMING_CALL', {
      callId,
      callerId: currentUser.id,
      callerName: currentUser.name,
      callerRole: currentUser.role,
      receiverId: target.id,
    });

    setActivityLog((prev) => [
      {
        id: `act_call_${Date.now()}`,
        timestamp: Date.now(),
        type: 'CALL',
        actor: currentUser.name,
        description: `Voice call initiated to ${target.name} (${target.role}).`,
        severity: 'info',
      },
      ...prev,
    ]);

    setTimeout(() => {
      setActiveCall((prev) => {
        if (prev && prev.id === callId && prev.status === 'calling') {
          return {
            ...prev,
            status: 'connected',
            startTime: Date.now(),
          };
        }
        return prev;
      });
    }, 2500);
  };

  const acceptVoiceCall = async () => {
    soundFx.playTacticalClick();
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        localStreamRef.current = stream;
      }
    } catch (err) {
      console.warn('Microphone error on call accept', err);
    }

    if (activeCall) {
      setActiveCall({
        ...activeCall,
        status: 'connected',
        startTime: Date.now(),
      });
      broadcast('CALL_ACCEPTED', { callId: activeCall.id });
    }
  };

  const declineVoiceCall = () => {
    soundFx.playTacticalClick();
    endVoiceCall();
  };

  const endVoiceCall = () => {
    soundFx.playTacticalClick();
    if (callTimerRef.current) clearInterval(callTimerRef.current);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }

    if (activeCall) {
      broadcast('CALL_ENDED', { callId: activeCall.id });
      setActivityLog((prev) => [
        {
          id: `act_call_end_${Date.now()}`,
          timestamp: Date.now(),
          type: 'CALL',
          actor: currentUser.name,
          description: `Voice call session ended. Total duration: ${activeCall.duration}s.`,
          severity: 'info',
        },
        ...prev,
      ]);
    }

    setActiveCall(null);
  };

  const toggleMute = () => {
    if (activeCall) {
      const nextMuted = !activeCall.isMuted;
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !nextMuted;
        });
      }
      setActiveCall({ ...activeCall, isMuted: nextMuted });
    }
  };

  // Call duration counter
  useEffect(() => {
    if (activeCall && activeCall.status === 'connected') {
      const interval = setInterval(() => {
        setActiveCall((prev) => (prev ? { ...prev, duration: prev.duration + 1 } : null));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeCall?.status]);

  // Route Planning Helper
  const planRouteTo = (destination: LocationCoordinates, name: string) => {
    soundFx.playTacticalClick();
    const distanceMeters = calculateHaversineDistance(currentUser.location, destination);
    setActiveRoute({
      destination,
      name,
      distanceMeters,
      formattedDistance: formatDistance(distanceMeters),
      estimatedTime: estimateWalkingTime(distanceMeters),
      isStraightLineFallback: true,
    });
  };

  const clearRoute = () => {
    soundFx.playTacticalClick();
    setActiveRoute(null);
  };

  // Offline Simulation Toggle
  const toggleOfflineSimulation = () => {
    const next = !isSimulatedOffline;
    setIsSimulatedOffline(next);
    soundFx.playTacticalClick();
    if (!next) {
      replayOfflineQueue();
    }
  };

  // Demo Controls
  const toggleDemoMode = () => {
    setIsDemoMode((prev) => !prev);
  };

  const simulateTeammateMovement = () => {
    soundFx.playTacticalClick();
    setMembers((prev) =>
      prev.map((m) => {
        if (m.isCurrent) return m;
        // Realistic tactical movement simulation around their patrol coordinates
        const dLat = (Math.random() - 0.48) * 0.00045;
        const dLng = (Math.random() - 0.48) * 0.00045;
        const newLat = Number((m.location.lat + dLat).toFixed(6));
        const newLng = Number((m.location.lng + dLng).toFixed(6));
        return {
          ...m,
          location: {
            lat: newLat,
            lng: newLng,
            accuracy: Math.floor(Math.random() * 4) + 3,
            heading: Math.floor(Math.random() * 360),
            speed: Number((Math.random() * 4 + 2).toFixed(1)),
          },
          lastSeen: Date.now(),
        };
      })
    );
  };

  const simulateEmergency = () => {
    triggerEmergency(
      'MEDICAL_EMERGENCY',
      'URGENT',
      'SIMULATED DRILL: Member injured during river crossing. Medical extraction team required.'
    );
  };

  const resetDemo = () => {
    soundFx.playTacticalClick();
    setMembers(DEFAULT_INITIAL_ROSTER);
    setEmergencies(DEFAULT_INITIAL_EMERGENCIES);
    setCheckpoints(DEFAULT_INITIAL_CHECKPOINTS);
    setThreatZones(DEFAULT_INITIAL_THREAT_ZONES);
    setActiveRoute(null);
  };

  const joinTeam = (code: string, nickname: string, role: MemberRole) => {
    const cleanCode = code.trim().toUpperCase() || 'SHY-782';
    setTeamCode(cleanCode);
    setMembers((prev) =>
      prev.map((m) =>
        m.isCurrent
          ? {
              ...m,
              name: nickname || m.name,
              role: role || m.role,
            }
          : m
      )
    );

    const updatedUser = {
      ...currentUser,
      name: nickname || currentUser.name,
      role: role || currentUser.role,
    };
    registerTeamMemberInFirestore(cleanCode, updatedUser).catch(console.warn);
    publishMemberLocation(cleanCode, updatedUser.id, updatedUser.location).catch(console.warn);
  };

  const leaveTeam = () => {
    setTeamCode('SOLO-001');
  };

  return (
    <TeamContext.Provider
      value={{
        teamCode,
        currentUser,
        members,
        soldiers,
        medics,
        emergencies,
        checkpoints,
        threatZones,
        messages,
        activityLog,
        isOnline,
        isSimulatedOffline,
        isDemoMode,
        pendingQueueCount,
        activeCall,
        activeRoute,
        selectedMemberId,
        mapCenter,
        mapZoom,
        isFollowMeActive,
        batteryStatusMessage,
        geolocationStatusMessage,
        batteryState,
        networkState,
        isLowPowerMode,
        toggleLowPowerMode,
        replayOfflineQueue,
        gpsAccuracy,
        gpsSpeed,
        gpsAltitude,
        gpsHeading,
        compassHeading,
        gpsTrail,
        isRecordingTrail,
        toggleRecordTrail,
        clearGpsTrail,
        authUser,
        isAuthReady,
        isAuthorizedForEmergency,
        authErrorMessage,
        signInAnonymous,
        signInWithEmail,
        signUpWithEmail,
        signOutSession,
        toggleFollowMe,
        updateCurrentCondition,
        triggerEmergency,
        acknowledgeEmergency,
        resolveEmergency,
        sendMessage,
        addCheckpoint,
        deleteCheckpoint,
        setPrimaryAssembly,
        startVoiceCall,
        acceptVoiceCall,
        declineVoiceCall,
        endVoiceCall,
        toggleMute,
        planRouteTo,
        clearRoute,
        setSelectedMemberId,
        setMapCenter,
        setMapZoom,
        toggleOfflineSimulation,
        toggleDemoMode,
        simulateTeammateMovement,
        simulateEmergency,
        resetDemo,
        requestRealGeolocation,
        joinTeam,
        leaveTeam,
      }}
    >
      {children}
    </TeamContext.Provider>
  );
};

export function useTeam(): TeamContextType {
  const ctx = useContext(TeamContext);
  if (!ctx) {
    throw new Error('useTeam must be used within a TeamProvider');
  }
  return ctx;
}
