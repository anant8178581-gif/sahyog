import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import type {
  TeamMember,
  ChatMessage,
  MedicalEmergency,
  Checkpoint,
  LocationCoordinates,
  MemberCondition,
} from '../types';

export const app: FirebaseApp =
  getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);

// CRITICAL: Connect to configured database instance
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Notice: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Validate Connection to Firestore on startup
 */
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore offline notice: Local offline-first caching active.');
    }
    return false;
  }
}

// 1. Join / Register in Team Scoped Collection
export async function registerTeamMemberInFirestore(
  teamId: string,
  member: TeamMember
): Promise<void> {
  const path = `teams/${teamId}/members/${member.id}`;
  try {
    // Ensure parent team document exists
    await setDoc(
      doc(db, 'teams', teamId),
      {
        id: teamId,
        code: teamId,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );

    // Register member in team-scoped roster
    await setDoc(
      doc(db, 'teams', teamId, 'members', member.id),
      {
        userId: member.id,
        nickname: member.name,
        role: member.role,
        condition: member.condition,
        statusLabel: member.statusLabel,
        conditionNote: member.conditionNote || '',
        isSimulated: member.isSimulated ?? false,
        joinedAt: new Date().toISOString(),
        lastSeen: Date.now(),
        sharingEnabled: true,
        batteryLevel: member.batteryLevel ?? null,
        isCharging: member.isCharging ?? null,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 2. Publish Location Telemetry (Scoped to Team)
export async function publishMemberLocation(
  teamId: string,
  userId: string,
  location: LocationCoordinates
): Promise<void> {
  const path = `teams/${teamId}/locations/${userId}`;
  try {
    await setDoc(
      doc(db, 'teams', teamId, 'locations', userId),
      {
        userId,
        lat: Number(location.lat.toFixed(6)),
        lng: Number(location.lng.toFixed(6)),
        accuracy: location.accuracy || 10,
        heading: location.heading || 0,
        speed: location.speed || 0,
        updatedAt: Date.now(),
        sharingEnabled: true,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 3. Publish Member Readiness & Medical Status
export async function publishMemberStatus(
  teamId: string,
  userId: string,
  condition: MemberCondition,
  statusLabel: string,
  note?: string
): Promise<void> {
  const path = `teams/${teamId}/statuses/${userId}`;
  try {
    await setDoc(
      doc(db, 'teams', teamId, 'statuses', userId),
      {
        userId,
        condition,
        statusLabel,
        note: note || '',
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// 4. Send Real-time Chat Message (Scoped to Team)
export async function sendChatMessageToFirestore(
  teamId: string,
  message: ChatMessage
): Promise<void> {
  const path = `teams/${teamId}/messages/${message.id}`;
  try {
    await setDoc(doc(db, 'teams', teamId, 'messages', message.id), {
      id: message.id,
      senderId: message.senderId,
      senderName: message.senderName,
      senderRole: message.senderRole,
      text: message.text,
      timestamp: message.timestamp,
      isBroadcast: message.isBroadcast ?? false,
      status: 'synced',
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// 5. Publish Emergency / Medical Request (Scoped to Team)
export async function publishMedicalRequest(
  teamId: string,
  emergency: MedicalEmergency
): Promise<void> {
  const path = `teams/${teamId}/medicalRequests/${emergency.id}`;
  try {
    await setDoc(doc(db, 'teams', teamId, 'medicalRequests', emergency.id), {
      id: emergency.id,
      reportedBy: emergency.reportedBy,
      reporterName: emergency.reporterName,
      reporterRole: emergency.reporterRole,
      type: emergency.type,
      severity: emergency.severity,
      status: emergency.status,
      message: emergency.message,
      timestamp: emergency.timestamp,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// 6. Update Medical Request Status (Restricted to Authorized Roles in Security Rules)
export async function updateMedicalRequestStatus(
  teamId: string,
  requestId: string,
  updates: Partial<MedicalEmergency>
): Promise<void> {
  const path = `teams/${teamId}/medicalRequests/${requestId}`;
  try {
    await updateDoc(doc(db, 'teams', teamId, 'medicalRequests', requestId), updates);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// 7. Save Checkpoint (Scoped to Team)
export async function saveCheckpointToFirestore(
  teamId: string,
  checkpoint: Checkpoint
): Promise<void> {
  const path = `teams/${teamId}/checkpoints/${checkpoint.id}`;
  try {
    await setDoc(doc(db, 'teams', teamId, 'checkpoints', checkpoint.id), {
      id: checkpoint.id,
      name: checkpoint.name,
      description: checkpoint.description || '',
      type: checkpoint.type,
      isPrimaryAssembly: checkpoint.isPrimaryAssembly ?? false,
      meetingTime: checkpoint.meetingTime || '',
      createdBy: checkpoint.createdBy,
      createdAt: checkpoint.createdAt,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// 8. Delete Checkpoint (Scoped to Team)
export async function deleteCheckpointFromFirestore(
  teamId: string,
  checkpointId: string
): Promise<void> {
  const path = `teams/${teamId}/checkpoints/${checkpointId}`;
  try {
    await deleteDoc(doc(db, 'teams', teamId, 'checkpoints', checkpointId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// 9. Subscribe to Team Roster
export function subscribeToFirestoreMembers(
  teamId: string,
  callback: (members: TeamMember[]) => void
): Unsubscribe {
  const path = `teams/${teamId}/members`;
  return onSnapshot(
    collection(db, 'teams', teamId, 'members'),
    (snapshot) => {
      const items: TeamMember[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        items.push({
          id: data.userId || docSnap.id,
          name: data.nickname || 'Operative',
          role: data.role || 'Operator',
          isCurrent: auth.currentUser?.uid === docSnap.id,
          condition: data.condition || 'ALL_CLEAR',
          statusLabel: data.statusLabel || 'All Clear',
          conditionNote: data.conditionNote,
          location: { lat: 28.6139, lng: 77.209 },
          lastSeen: data.lastSeen || Date.now(),
          isSimulated: data.isSimulated ?? false,
          batteryLevel: data.batteryLevel ?? null,
          isCharging: data.isCharging ?? null,
          batteryAvailable: data.batteryLevel !== null,
        });
      });
      callback(items);
    },
    (err) => {
      console.warn(`Roster sync notice for ${path}:`, err.message);
    }
  );
}

// 10. Subscribe to Locations
export function subscribeToFirestoreLocations(
  teamId: string,
  callback: (locations: Record<string, LocationCoordinates & { lastSeen: number }>) => void
): Unsubscribe {
  const path = `teams/${teamId}/locations`;
  return onSnapshot(
    collection(db, 'teams', teamId, 'locations'),
    (snapshot) => {
      const locMap: Record<string, LocationCoordinates & { lastSeen: number }> = {};
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        if (typeof d.lat === 'number' && typeof d.lng === 'number') {
          locMap[docSnap.id] = {
            lat: d.lat,
            lng: d.lng,
            accuracy: d.accuracy,
            heading: d.heading,
            speed: d.speed,
            lastSeen: d.updatedAt || Date.now(),
          };
        }
      });
      callback(locMap);
    },
    (err) => console.warn(`Location listener notice for ${path}:`, err.message)
  );
}

// 11. Subscribe to Messages
export function subscribeToFirestoreMessages(
  teamId: string,
  callback: (messages: ChatMessage[]) => void
): Unsubscribe {
  const path = `teams/${teamId}/messages`;
  const q = query(
    collection(db, 'teams', teamId, 'messages'),
    orderBy('timestamp', 'asc'),
    limit(100)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: ChatMessage[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        msgs.push({
          id: data.id || d.id,
          senderId: data.senderId,
          senderName: data.senderName,
          senderRole: data.senderRole,
          text: data.text,
          timestamp: data.timestamp,
          isBroadcast: data.isBroadcast,
          status: 'synced',
        });
      });
      callback(msgs);
    },
    (err) => console.warn(`Chat listener notice for ${path}:`, err.message)
  );
}

// 12. Subscribe to Emergencies
export function subscribeToFirestoreEmergencies(
  teamId: string,
  callback: (emergencies: MedicalEmergency[]) => void
): Unsubscribe {
  const path = `teams/${teamId}/medicalRequests`;
  return onSnapshot(
    collection(db, 'teams', teamId, 'medicalRequests'),
    (snapshot) => {
      const emgs: MedicalEmergency[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        emgs.push({
          id: data.id || d.id,
          reportedBy: data.reportedBy,
          reporterName: data.reporterName || 'Operative',
          reporterRole: data.reporterRole || 'Field Operator',
          type: data.type || 'MEDICAL_EMERGENCY',
          severity: data.severity || 'URGENT',
          message: data.message || '',
          location: data.location || { lat: 28.6139, lng: 77.209 },
          timestamp: data.timestamp || Date.now(),
          status: data.status || 'ACTIVE',
          acknowledgedBy: data.acknowledgedBy || [],
          acknowledgedAt: data.acknowledgedAt,
          resolvedBy: data.resolvedBy,
          resolvedAt: data.resolvedAt,
        });
      });
      callback(emgs);
    },
    (err) => console.warn(`Emergency listener notice for ${path}:`, err.message)
  );
}

// 13. Subscribe to Checkpoints
export function subscribeToFirestoreCheckpoints(
  teamId: string,
  callback: (checkpoints: Checkpoint[]) => void
): Unsubscribe {
  const path = `teams/${teamId}/checkpoints`;
  return onSnapshot(
    collection(db, 'teams', teamId, 'checkpoints'),
    (snapshot) => {
      const chks: Checkpoint[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        chks.push({
          id: data.id || d.id,
          name: data.name,
          description: data.description,
          location: data.location || { lat: 28.6139, lng: 77.209 },
          type: data.type || 'RALLY_POINT',
          isPrimaryAssembly: data.isPrimaryAssembly || false,
          meetingTime: data.meetingTime,
          createdBy: data.createdBy || 'Commander',
          createdAt: data.createdAt || Date.now(),
        });
      });
      callback(chks);
    },
    (err) => console.warn(`Checkpoints listener notice for ${path}:`, err.message)
  );
}
