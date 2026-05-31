import NetInfo from '@react-native-community/netinfo';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Alert, Platform, ToastAndroid } from 'react-native';
import {
  refreshPendingCount,
  startAutoSync,
  subscribePending,
  subscribeSync,
  syncWhenOnline,
} from '../services/syncService';

interface OfflineContextValue {
  isOnline: boolean;
  pendingCount: number;
  refreshPending: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const OfflineContext = createContext<OfflineContextValue | undefined>(undefined);

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    void refreshPendingCount().then(setPendingCount);

    const stopAutoSync = startAutoSync();
    const unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    const unsubscribePending = subscribePending(setPendingCount);
    const unsubscribeSync = subscribeSync((summary) => {
      if (summary.syncedCount > 0) {
        showToast(`Đã đồng bộ ${summary.syncedCount} thay đổi`);
      }
      if (summary.errorCount > 0) {
        showToast(`${summary.errorCount} thay đổi không đồng bộ được`, true);
      }
    });

    void NetInfo.fetch().then((state) => {
      setIsOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });

    return () => {
      unsubscribeNetInfo();
      unsubscribePending();
      unsubscribeSync();
      stopAutoSync();
    };
  }, []);

  const value = useMemo<OfflineContextValue>(
    () => ({
      isOnline,
      pendingCount,
      refreshPending: async () => {
        setPendingCount(await refreshPendingCount());
      },
      syncNow: async () => {
        const summary = await syncWhenOnline();
        setPendingCount(summary.pendingCount);
      },
    }),
    [isOnline, pendingCount]
  );

  return <OfflineContext.Provider value={value}>{children}</OfflineContext.Provider>;
}

export function useOffline() {
  const value = useContext(OfflineContext);
  if (!value) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return value;
}

function showToast(message: string, warning = false): void {
  const text = warning ? `⚠️ ${message}` : `✅ ${message}`;
  if (Platform.OS === 'android') {
    ToastAndroid.show(text, ToastAndroid.SHORT);
    return;
  }

  Alert.alert(warning ? 'Đồng bộ lỗi' : 'Đồng bộ', text);
}
