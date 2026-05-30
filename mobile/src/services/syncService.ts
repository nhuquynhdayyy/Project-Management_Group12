import NetInfo from '@react-native-community/netinfo';
import apiClient from '../api/client';
import { clearSyncedActions, getOfflineActions, OfflineAction } from './offlineStorage';

export interface SyncResponse {
  synced: Array<Pick<OfflineAction, 'id' | 'type' | 'treeId' | 'taskId'>>;
  skipped: Array<Pick<OfflineAction, 'id' | 'type' | 'treeId' | 'taskId'>>;
  errors: Array<Pick<OfflineAction, 'id' | 'type' | 'treeId' | 'taskId'> & { message: string }>;
}

export interface SyncSummary {
  syncedCount: number;
  skippedCount: number;
  errorCount: number;
  pendingCount: number;
}

type SyncListener = (summary: SyncSummary) => void;
type PendingListener = (pendingCount: number) => void;

const syncListeners = new Set<SyncListener>();
const pendingListeners = new Set<PendingListener>();
let isSyncing = false;
let unsubscribeNetInfo: (() => void) | null = null;

export async function syncWhenOnline(): Promise<SyncSummary> {
  if (isSyncing) {
    const pending = await getOfflineActions();
    return { syncedCount: 0, skippedCount: 0, errorCount: 0, pendingCount: pending.length };
  }

  const netState = await NetInfo.fetch();
  const isOnline = Boolean(netState.isConnected && netState.isInternetReachable !== false);
  const actions = await getOfflineActions();

  if (!isOnline || actions.length === 0) {
    return { syncedCount: 0, skippedCount: 0, errorCount: 0, pendingCount: actions.length };
  }

  isSyncing = true;
  try {
    const response = await apiClient.post<SyncResponse>('/trees/sync', actions);
    const completedIds = [...response.data.synced, ...response.data.skipped]
      .map((item) => item.id)
      .filter((id): id is string => Boolean(id));

    await clearSyncedActions(completedIds);

    const pending = await getOfflineActions();
    const summary: SyncSummary = {
      syncedCount: response.data.synced.length,
      skippedCount: response.data.skipped.length,
      errorCount: response.data.errors.length,
      pendingCount: pending.length,
    };

    notifyPending(summary.pendingCount);
    notifySync(summary);
    return summary;
  } finally {
    isSyncing = false;
  }
}

export function startAutoSync(): () => void {
  if (unsubscribeNetInfo) {
    return unsubscribeNetInfo;
  }

  unsubscribeNetInfo = NetInfo.addEventListener((state) => {
    const isOnline = Boolean(state.isConnected && state.isInternetReachable !== false);
    if (isOnline) {
      void syncWhenOnline();
    }
  });

  return () => {
    unsubscribeNetInfo?.();
    unsubscribeNetInfo = null;
  };
}

export function subscribeSync(listener: SyncListener): () => void {
  syncListeners.add(listener);
  return () => syncListeners.delete(listener);
}

export function subscribePending(listener: PendingListener): () => void {
  pendingListeners.add(listener);
  return () => pendingListeners.delete(listener);
}

export async function refreshPendingCount(): Promise<number> {
  const pending = await getOfflineActions();
  notifyPending(pending.length);
  return pending.length;
}

function notifySync(summary: SyncSummary): void {
  syncListeners.forEach((listener) => listener(summary));
}

function notifyPending(pendingCount: number): void {
  pendingListeners.forEach((listener) => listener(pendingCount));
}
