import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useOffline } from '../context/OfflineContext';

export default function OfflineBanner() {
  const { isOnline } = useOffline();

  if (isOnline) {
    return null;
  }

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>📡 Offline — Dữ liệu sẽ đồng bộ khi có mạng</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  text: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
