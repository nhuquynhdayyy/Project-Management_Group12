import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MaintenanceTask } from '../api/maintenance';
import type { Tree } from '../api/trees';

export type OfflineActionType = 'health_update' | 'physical_update' | 'task_complete';

export interface OfflineAction {
  id: string;
  type: OfflineActionType;
  treeId: number;
  taskId?: number;
  data: Record<string, unknown>;
  offlineTimestamp: string;
}

const OFFLINE_ACTIONS_KEY = 'offline_actions';
const TREE_DETAILS_KEY_PREFIX = 'tree_details_';
const TASK_DETAILS_KEY_PREFIX = 'task_details_';

export async function saveOfflineAction(
  action: Omit<OfflineAction, 'id' | 'offlineTimestamp'> & Partial<Pick<OfflineAction, 'id' | 'offlineTimestamp'>>
): Promise<OfflineAction> {
  const actions = await getOfflineActions();
  const offlineAction: OfflineAction = {
    ...action,
    id: action.id ?? `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    offlineTimestamp: action.offlineTimestamp ?? new Date().toISOString(),
  };

  await AsyncStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify([...actions, offlineAction]));
  return offlineAction;
}

export async function getOfflineActions(): Promise<OfflineAction[]> {
  const stored = await AsyncStorage.getItem(OFFLINE_ACTIONS_KEY);
  if (!stored) {
    return [];
  }

  try {
    const parsed = JSON.parse(stored) as OfflineAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function clearSyncedActions(ids: string[]): Promise<void> {
  if (ids.length === 0) {
    return;
  }

  const actions = await getOfflineActions();
  const remaining = actions.filter((action) => !ids.includes(action.id));
  await AsyncStorage.setItem(OFFLINE_ACTIONS_KEY, JSON.stringify(remaining));
}

export async function saveCachedTreeDetails(tree: Tree): Promise<void> {
  await AsyncStorage.setItem(`${TREE_DETAILS_KEY_PREFIX}${tree.id}`, JSON.stringify(tree));
}

export async function getCachedTreeDetails(treeId: number): Promise<Tree | null> {
  const stored = await AsyncStorage.getItem(`${TREE_DETAILS_KEY_PREFIX}${treeId}`);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as Tree;
  } catch {
    return null;
  }
}

export async function saveCachedTaskDetails(task: MaintenanceTask): Promise<void> {
  await AsyncStorage.setItem(`${TASK_DETAILS_KEY_PREFIX}${task.id}`, JSON.stringify(task));
}

export async function getCachedTaskDetails(taskId: number): Promise<MaintenanceTask | null> {
  const stored = await AsyncStorage.getItem(`${TASK_DETAILS_KEY_PREFIX}${taskId}`);
  if (!stored) {
    return null;
  }

  try {
    return JSON.parse(stored) as MaintenanceTask;
  } catch {
    return null;
  }
}
