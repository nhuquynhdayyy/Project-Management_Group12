import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { completeTask } from '../api/maintenance';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;
type TaskDetailRouteProp = RouteProp<RootStackParamList, 'TaskDetail'>;

export default function TaskDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TaskDetailRouteProp>();
  const task = route.params.task;

  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    if (task.status === 'Completed') {
      Alert.alert('Thông báo', 'Công việc này đã hoàn thành');
      return;
    }

    setLoading(true);
    try {
      // Request location permission
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập vị trí để hoàn thành công việc');
        setLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      // Complete task
      await completeTask(task.id, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        notes: notes || undefined,
      });

      Alert.alert('Thành công', 'Đã hoàn thành công việc', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      const message = error.response?.data?.message || 'Không thể hoàn thành công việc';
      Alert.alert('Lỗi', message);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'Pending':
        return '#f59e0b';
      case 'In_Progress':
        return '#3b82f6';
      case 'Completed':
        return '#10b981';
      default:
        return '#6b7280';
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'Pending':
        return 'Chờ xử lý';
      case 'In_Progress':
        return 'Đang thực hiện';
      case 'Completed':
        return 'Hoàn thành';
      default:
        return status;
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết công việc</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.label}>Loại công việc:</Text>
            <Text style={styles.value}>{task.task_type}</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Trạng thái:</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
              <Text style={styles.statusText}>{getStatusText(task.status)}</Text>
            </View>
          </View>

          {task.tree && (
            <>
              <View style={styles.row}>
                <Text style={styles.label}>Mã cây:</Text>
                <Text style={styles.value}>{task.tree.tree_code}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Loài cây:</Text>
                <Text style={styles.value}>{task.tree.species.common_name}</Text>
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Vị trí:</Text>
                <Text style={styles.value}>
                  {task.tree.location.coordinates[1].toFixed(6)}, {task.tree.location.coordinates[0].toFixed(6)}
                </Text>
              </View>
            </>
          )}

          <View style={styles.row}>
            <Text style={styles.label}>Ngày hẹn:</Text>
            <Text style={styles.value}>
              {new Date(task.scheduled_date).toLocaleDateString('vi-VN')}
            </Text>
          </View>

          {task.completed_at && (
            <View style={styles.row}>
              <Text style={styles.label}>Hoàn thành lúc:</Text>
              <Text style={styles.value}>
                {new Date(task.completed_at).toLocaleString('vi-VN')}
              </Text>
            </View>
          )}
        </View>

        {task.status !== 'Completed' && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Hoàn thành công việc</Text>
            <Text style={styles.hint}>
              ⚠️ Bạn phải ở trong bán kính 10m từ cây để hoàn thành công việc
            </Text>

            <TextInput
              style={styles.textArea}
              placeholder="Ghi chú (tùy chọn)"
              placeholderTextColor="#64748b"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.completeButton, loading && styles.buttonDisabled]}
              onPress={handleComplete}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.completeButtonText}>✓ Hoàn thành công việc</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backButton: {
    marginBottom: 8,
  },
  backText: {
    color: '#16a34a',
    fontSize: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#94a3b8',
  },
  value: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  hint: {
    fontSize: 13,
    color: '#f59e0b',
    marginBottom: 16,
    lineHeight: 18,
  },
  textArea: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  completeButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
