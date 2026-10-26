export type MemberCondition =
  | 'ALL_CLEAR'
  | 'CAUTION'
  | 'NEED_ASSISTANCE'
  | 'MEDICAL_EMERGENCY'
  | 'OFFLINE';

export type MemberRole =
  | 'Team Leader'
  | 'Recon'
  | 'Support'
  | 'Medic'
  | 'Operator';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  heading?: number;
}

export interface GpsBreadcrumb {
  lat: number;
  lng: number;
  timestamp: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
}

export interface DeviceBatteryState {
  level: number;
  charging: boolean;
  chargingTime: number | null;
  dischargingTime: number | null;
  isHardwareApi: boolean;
}

export interface NetworkConnectionState {
  isOnline: boolean;
  effectiveType?: string;
  downlinkMb?: number;
  rttMs?: number;
  saveData?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
  role: MemberRole;
  isCurrent: boolean;
  condition: MemberCondition;
  statusLabel: string;
  conditionNote?: string;
  location: LocationCoordinates;
  lastSeen: number;
  isSimulated: boolean;
  batteryLevel: number | null;
  isCharging: boolean | null;
  batteryAvailable: boolean;
}

export type EmergencyType = 'MEDICAL_EMERGENCY' | 'DISTRESS_SIGNAL' | 'THREAT_ALERT';
export type EmergencySeverity = 'URGENT' | 'NEED_ASSISTANCE' | 'STABLE';

export interface MedicalEmergency {
  id: string;
  reportedBy: string;
  reporterName: string;
  reporterRole: string;
  type: EmergencyType;
  severity: EmergencySeverity;
  message: string;
  location: LocationCoordinates;
  timestamp: number;
  status: 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED';
  acknowledgedBy?: string[];
  acknowledgedAt?: number;
  resolvedBy?: string;
  resolvedAt?: number;
  isAccidental?: boolean;
}

export type CheckpointType =
  | 'RALLY_POINT'
  | 'SUPPLY_DROP'
  | 'EXTRACTION_ZONE'
  | 'OBSERVATION_POST'
  | 'CUSTOM';

export interface Checkpoint {
  id: string;
  name: string;
  description?: string;
  location: LocationCoordinates;
  type: CheckpointType;
  isPrimaryAssembly: boolean;
  meetingTime?: string;
  createdBy: string;
  createdAt: number;
}

export interface ThreatZone {
  id: string;
  name: string;
  riskLevel: 'HIGH_RISK' | 'MODERATE' | 'CAUTION';
  center: LocationCoordinates;
  radiusMeters: number;
  description: string;
  reportedAt: number;
  isVerified: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  text: string;
  timestamp: number;
  isBroadcast?: boolean;
  status: 'sending' | 'sent' | 'synced' | 'queued';
  attachment?: {
    type: 'location' | 'alert' | 'checkpoint';
    data: any;
  };
}

export interface OfflineQueueItem {
  id: string;
  type:
    | 'UPDATE_CONDITION'
    | 'SEND_MESSAGE'
    | 'ADD_CHECKPOINT'
    | 'TRIGGER_EMERGENCY'
    | 'ACKNOWLEDGE_EMERGENCY'
    | 'RESOLVE_EMERGENCY'
    | 'UPDATE_LOCATION';
  payload: any;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'failed' | 'synced';
}

export interface CallSession {
  id: string;
  callerId: string;
  callerName: string;
  callerRole: string;
  receiverId: string;
  receiverName: string;
  status: 'idle' | 'calling' | 'incoming' | 'connected' | 'ended' | 'rejected' | 'failed';
  startTime?: number;
  duration: number;
  isMuted: boolean;
  error?: string;
}

export interface ActivityLogItem {
  id: string;
  timestamp: number;
  type:
    | 'JOIN'
    | 'STATUS_CHANGE'
    | 'EMERGENCY'
    | 'ACKNOWLEDGE'
    | 'RESOLUTION'
    | 'CHECKPOINT'
    | 'CALL'
    | 'SYNC';
  actor: string;
  description: string;
  severity: 'info' | 'warning' | 'emergency' | 'success';
}

export interface MissionItem {
  id: string;
  title: string;
  priority: 'CRITICAL' | 'HIGH' | 'ROUTINE';
  status: 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED';
  assignedTo: string;
  targetArea: string;
  deadline?: string;
  notes: string;
}
