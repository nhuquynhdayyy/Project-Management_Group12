import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { completeTask, getTaskById } from '../api/maintenance';
import type { MaintenanceTask } from '../api/maintenance';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;
type TaskDetailRouteProp = RouteProp<RootStackParamList, 'TaskDetail'>;

export default function TaskDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TaskDetailRouteProp>();

  const [task, setTask] = useState<MaintenanceTask>(route.params.task);
  const [fetchingTask, setFetchingTask] = useState(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Fetch fresh task data on mount to get latest evidence_image_url
  useEffect(() => {
    getTaskById(route.params.task.id)
      .then(setTask)
      .catch(() => {
        // Fall back to route params if fetch fails
      })
      .finally(() => setFetchingTask(false));
  }, [route.params.task.id]);

  async function handleTakePhoto() {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập camera để chụp ảnh');
        return;
      }

      Alert.alert(
        'Chọn ảnh bằng chứng',
        'Bạn muốn chụp ảnh mới hay chọn từ thư viện?',
        [
          {
            text: 'Chụp ảnh',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });
              if (!result.canceled) {
                setImageUri(result.assets[0].uri);
              }
            },
          },
          {
            text: 'Chọn từ thư viện',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
              });
              if (!result.canceled) {
                setImageUri(result.assets[0].uri);
              }
            },
          },
          { text: 'Hủy', style: 'cancel' },
        ]
      );
    } catch {
      Alert.alert('Lỗi', 'Không thể mở camera');
    }
  }

  function handleRemoveImage() {
    Alert.alert('Xác nhận', 'Bạn có muốn xóa ảnh này?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: () => setImageUri(null) },
    ]);
  }

  async function handleComplete() {
    if (task.status === 'Completed') {
      Alert.alert('Thông báo', 'Công việc này đã hoàn thành');
      return;
    }

    setLoading(true);
    try {
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert('Lỗi', 'Cần cấp quyền truy cập vị trí để hoàn thành công việc');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const completed = await completeTask(task.id, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        notes: notes || undefined,
        imageUri: imageUri || undefined,
      });

      // Update local task state with the completed task returned from API
      setTask(completed);

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
      case 'Pending': return '#f59e0b';
      case 'In_Progress': return '#3b82f6';
      case 'Completed': return '#10b981';
      default: return '#6b7280';
    }
  }

  function getStatusText(status: string) {
    switch (status) {
      case 'Pending': return 'Chờ xử lý';
      case 'In_Progress': return 'Đang thực hiện';
      case 'Completed': return 'Hoàn thành';
      default: return status;
    }
  }

  if (fetchingTask) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
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
        {/* Task info card */}
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
                  {task.tree.location.coordinates[1].toFixed(6)},{' '}
                  {task.tree.location.coordinates[0].toFixed(6)}
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

        {/* Evidence image card — shown for all statuses */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Ảnh bằng chứng</Text>
          {task.evidence_image_url ? (
            <Image
              source={{ uri: task.evidence_image_url }}
              style={styles.evidenceImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.noImageText}>Chưa có ảnh bằng chứng</Text>
          )}
        </View>

        {/* Complete task card — only shown when not yet completed */}
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

            <TouchableOpacity style={styles.cameraButton} onPress={handleTakePhoto}>
              <Text style={styles.cameraButtonText}>📷 Chụp ảnh bằng chứng (tùy chọn)</Text>
            </TouchableOpacity>

            {imageUri && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeImageButton} onPress={handleRemoveImage}>
                  <Text style={styles.removeImageText}>✕</Text>
                </TouchableOpacity>
              </View>
            )}

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
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
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
  // Evidence image
  evidenceImage: {
    width: '100%',
    height: 220,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  noImageText: {
    fontSize: 14,
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 24,
  },
  // Complete task form
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
  cameraButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: '#0f172a',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
