import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  getNotifications,
  markNotificationRead,
  NotificationItem,
} from '../api/notifications';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Notifications'>;

export default function NotificationsScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const data = await getNotifications();
      setItems(Array.isArray(data) ? data : []);
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể tải thông báo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  async function handleMarkRead(item: NotificationItem) {
    if (item.read_at) return;

    try {
      const updated = await markNotificationRead(item.notification_id);
      setItems((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, read_at: updated.read_at ?? new Date().toISOString() } : entry,
        ),
      );
    } catch (error: any) {
      Alert.alert('Lỗi', error.message || 'Không thể đánh dấu đã đọc');
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Quay lai</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Thông báo hệ thống</Text>
      </View>

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#16a34a" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadNotifications();
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Chưa có thông báo nào</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.read_at && styles.unreadCard]}
              onPress={() => handleMarkRead(item)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.notification.title}</Text>
                {!item.read_at && <View style={styles.unreadDot} />}
              </View>
              <Text style={styles.content}>{item.notification.content}</Text>
              <Text style={styles.date}>
                {new Date(item.notification.created_at).toLocaleString('vi-VN')}
              </Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backText: { color: '#16a34a', fontSize: 16, marginBottom: 8 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 12 },
  card: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  unreadCard: { borderColor: '#22c55e' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  cardTitle: { color: '#fff', flex: 1, fontSize: 16, fontWeight: '700' },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e' },
  content: { color: '#cbd5e1', fontSize: 14, lineHeight: 20 },
  date: { color: '#64748b', fontSize: 12, marginTop: 12 },
  empty: { alignItems: 'center', paddingVertical: 80 },
  emptyText: { color: '#94a3b8', fontSize: 16 },
});
