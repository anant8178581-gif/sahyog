import Dexie, { type Table } from 'dexie';
import type {
  TeamMember,
  ChatMessage,
  Checkpoint,
  MedicalEmergency,
  OfflineQueueItem,
  ActivityLogItem,
  ThreatZone,
} from '../types';

export class SahyogOfflineDatabase extends Dexie {
  teamMembers!: Table<TeamMember, string>;
  messages!: Table<ChatMessage, string>;
  checkpoints!: Table<Checkpoint, string>;
  emergencies!: Table<MedicalEmergency, string>;
  syncQueue!: Table<OfflineQueueItem, string>;
  activityLog!: Table<ActivityLogItem, string>;
  threatZones!: Table<ThreatZone, string>;

  constructor() {
    super('SahyogOfflineDB');
    this.version(1).stores({
      teamMembers: 'id, name, condition, lastSeen',
      messages: 'id, timestamp, senderId, status',
      checkpoints: 'id, createdAt, type, isPrimaryAssembly',
      emergencies: 'id, timestamp, status, severity, reportedBy',
      syncQueue: 'id, timestamp, status, type',
      activityLog: 'id, timestamp, type, severity',
      threatZones: 'id, riskLevel, reportedAt',
    });
  }
}

export const offlineDb = new SahyogOfflineDatabase();

/**
 * Queue an operation when offline or for local-first optimism
 */
export async function queueOfflineOperation(
  type: OfflineQueueItem['type'],
  payload: any
): Promise<OfflineQueueItem> {
  const item: OfflineQueueItem = {
    id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    payload,
    timestamp: Date.now(),
    retries: 0,
    status: 'pending',
  };
  await offlineDb.syncQueue.put(item);
  return item;
}

/**
 * Retrieve pending operations that need to be replayed to the server
 */
export async function getPendingOperations(): Promise<OfflineQueueItem[]> {
  return await offlineDb.syncQueue
    .where('status')
    .equals('pending')
    .sortBy('timestamp');
}

/**
 * Mark an operation as synced
 */
export async function markOperationSynced(id: string): Promise<void> {
  await offlineDb.syncQueue.update(id, { status: 'synced' });
}

/**
 * Increment retries or mark failed
 */
export async function markOperationFailed(id: string): Promise<void> {
  const op = await offlineDb.syncQueue.get(id);
  if (op) {
    const nextRetries = op.retries + 1;
    await offlineDb.syncQueue.update(id, {
      retries: nextRetries,
      status: nextRetries >= 5 ? 'failed' : 'pending',
    });
  }
}
