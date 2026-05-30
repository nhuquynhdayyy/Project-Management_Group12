import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useOffline } from '../context/OfflineContext';

export default function NetworkStatusIndicator() {
  const { isOnline, pendingCount } = useOffline();

  return (
    <View style={styles.container}>
      <Text style={[styles.status, { color: isOnline ? '#22c55e' : '#ef4444' }]}>
        {isOnline ? '🟢 Online' : '🔴 Offline'}
      </Text>
      {pendingCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pendingCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  status: {
    fontSize: 12,
    fontWeight: '700',
  },
  badge: {
    alignItems: 'center',
    backgroundColor: '#f59e0b',
    borderRadius: 10,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#111827',
    fontSize: 11,
    fontWeight: '800',
  },
});
