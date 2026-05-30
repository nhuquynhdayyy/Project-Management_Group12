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
import { getTreeById, updatePhysicalMeasurements } from '../api/trees';
import type { Tree } from '../api/trees';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;
type TaskDetailRouteProp = RouteProp<RootStackParamList, 'TaskDetail'>;

export default function TaskDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TaskDetailRouteProp>();

  const [task, setTask] = useState<MaintenanceTask>(route.params.task);
  const [treeDetails, setTreeDetails] = useState<Tree | null>(null);
  const [fetchingTask, setFetchingTask] = useState(true);
  const [fetchingTree, setFetchingTree] = useState(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Physical measurements state
  const [heightM, setHeightM] = useState('');
  const [trunkDiameterCm, setTrunkDiameterCm] = useState('');
  const [canopyDiameterM, setCanopyDiameterM] = useState('');
  const [tiltDegree, setTiltDegree] = useState('');
  const [physicalNotes, setPhysicalNotes] = useState('');
  const [savingPhysical, setSavingPhysical] = useState(false);

  // Fetch fresh task data on mount to get latest evidence_image_url
  useEffect(() => {
    getTaskById(route.params.task.id)
      .then(setTask)
      .catch(() => {
        // Fall back to route params if fetch fails
      })
      .finally(() => setFetchingTask(false));
  }, [route.params.task.id]);

  // Fetch tree details
  useEffect(() => {
    if (task.tree_id) {
      getTreeById(task.tree_id)
        .then(setTreeDetails)
        .catch((error) => {
          console.error('Failed to fetch tree details:', error);
        })
        .finally(() => setFetchingTree(false));
    } else {
      setFetchingTree(false);
    }
  }, [task.tree_id]);

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

  async function handleSavePhysical() {
    if (!treeDetails) {
      Alert.alert('Lỗi', 'Không tìm thấy thông tin cây');
      return;
    }

    // Validate at least one field is filled
    if (!heightM && !trunkDiameterCm && !canopyDiameterM && !tiltDegree) {
      Alert.alert('Lỗi', 'Vui lòng nhập ít nhất một chỉ số');
      return;
    }

    // Validate numeric values
    const height = heightM ? parseFloat(heightM) : undefined;
    const trunkDiameter = trunkDiameterCm ? parseFloat(trunkDiameterCm) : undefined;
    const canopyDiameter = canopyDiameterM ? parseFloat(canopyDiameterM) : undefined;
    const tilt = tiltDegree ? parseInt(tiltDegree) : undefined;

    if (height !== undefined && (isNaN(height) || height <= 0)) {
      Alert.alert('Lỗi', 'Chiều cao phải là số dương');
      return;
    }
    if (trunkDiameter !== undefined && (isNaN(trunkDiameter) || trunkDiameter <= 0)) {
      Alert.alert('Lỗi', 'Đường kính thân phải là số dương');
      return;
    }
    if (canopyDiameter !== undefined && (isNaN(canopyDiameter) || canopyDiameter < 0)) {
      Alert.alert('Lỗi', 'Đường kính tán phải là số không âm');
      return;
    }
    if (tilt !== undefined && (isNaN(tilt) || tilt < 0 || tilt > 90)) {
      Alert.alert('Lỗi', 'Độ nghiêng phải từ 0 đến 90 độ');
      return;
    }

    setSavingPhysical(true);
    try {
      const payload: any = {};
      if (height !== undefined) payload.height_m = height;
      if (trunkDiameter !== undefined) payload.trunk_diameter_cm = trunkDiameter;
      if (canopyDiameter !== undefined) payload.canopy_diameter_m = canopyDiameter;
      if (tilt !== undefined) payload.tilt_degree = tilt;
      if (physicalNotes.trim()) payload.notes = physicalNotes.trim();

      await updatePhysicalMeasurements(treeDetails.id, payload);

      // Refresh tree details
      const updatedTree = await getTreeById(treeDetails.id);
      setTreeDetails(updatedTree);

      // Clear form
      setHeightM('');
      setTrunkDiameterCm('');
      setCanopyDiameterM('');
      setTiltDegree('');
      setPhysicalNotes('');

      Alert.alert('Thành công', '💾 Đã lưu chỉ số vật lý');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Không thể lưu chỉ số vật lý';
      Alert.alert('Lỗi', message);
    } finally {
      setSavingPhysical(false);
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

  function getHealthStatusColor(status: string) {
    switch (status) {
      case 'Tốt': return '#10b981';
      case 'Yếu': return '#f59e0b';
      case 'Sâu bệnh': return '#ef4444';
      case 'Chết': return '#6b7280';
      default: return '#6b7280';
    }
  }

  if (fetchingTask || fetchingTree) {
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
          <Text style={styles.cardTitle}>📋 Thông tin công việc</Text>
          
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

          {task.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.label}>Ghi chú:</Text>
              <Text style={styles.notesText}>{task.notes}</Text>
            </View>
          )}
        </View>

        {/* Tree details card */}
        {treeDetails && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🌳 Thông tin cây</Text>
            
            <View style={styles.row}>
              <Text style={styles.label}>Mã cây:</Text>
              <Text style={styles.value}>{treeDetails.tree_code}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Loài cây:</Text>
              <Text style={styles.value}>{treeDetails.species.common_name}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Tên khoa học:</Text>
              <Text style={[styles.value, styles.italicText]}>
                {treeDetails.species.scientific_name}
              </Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Khu vực:</Text>
              <Text style={styles.value}>{treeDetails.area.area_name}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Tình trạng sức khỏe:</Text>
              <View style={[styles.statusBadge, { backgroundColor: getHealthStatusColor(treeDetails.health_status) }]}>
                <Text style={styles.statusText}>{treeDetails.health_status}</Text>
              </View>
            </View>

            {treeDetails.height_m && (
              <View style={styles.row}>
                <Text style={styles.label}>Chiều cao:</Text>
                <Text style={styles.value}>{treeDetails.height_m} m</Text>
              </View>
            )}

            {treeDetails.trunk_diameter_cm && (
              <View style={styles.row}>
                <Text style={styles.label}>Đường kính thân:</Text>
                <Text style={styles.value}>{treeDetails.trunk_diameter_cm} cm</Text>
              </View>
            )}

            {treeDetails.planting_year && (
              <View style={styles.row}>
                <Text style={styles.label}>Năm trồng:</Text>
                <Text style={styles.value}>{treeDetails.planting_year}</Text>
              </View>
            )}

            {treeDetails.last_maintained_at && (
              <View style={styles.row}>
                <Text style={styles.label}>Bảo trì lần cuối:</Text>
                <Text style={styles.value}>
                  {new Date(treeDetails.last_maintained_at).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            )}

            <View style={styles.locationContainer}>
              <Text style={styles.label}>Vị trí:</Text>
              <Text style={styles.coordinatesText}>
                {treeDetails.location.coordinates[1].toFixed(6)}, {treeDetails.location.coordinates[0].toFixed(6)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.historyButton}
              onPress={() => navigation.navigate('TreeHistory', { 
                treeId: treeDetails.id, 
                treeCode: treeDetails.tree_code 
              })}
            >
              <Text style={styles.historyButtonText}>📋 Xem lịch sử bảo trì cây này</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Physical measurements update card */}
        {treeDetails && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📏 Cập nhật chỉ số vật lý</Text>
            <Text style={styles.hint}>
              Nhập các chỉ số đo đạc mới (chỉ cần nhập những chỉ số thay đổi)
            </Text>

            <View style={styles.physicalInputsContainer}>
              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Chiều cao (m)</Text>
                  <TextInput
                    style={styles.physicalInput}
                    placeholder={treeDetails.height_m?.toString() || '—'}
                    placeholderTextColor="#64748b"
                    value={heightM}
                    onChangeText={setHeightM}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Đ.kính thân (cm)</Text>
                  <TextInput
                    style={styles.physicalInput}
                    placeholder={treeDetails.trunk_diameter_cm?.toString() || '—'}
                    placeholderTextColor="#64748b"
                    value={trunkDiameterCm}
                    onChangeText={setTrunkDiameterCm}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              <View style={styles.inputRow}>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Đ.kính tán (m)</Text>
                  <TextInput
                    style={styles.physicalInput}
                    placeholder="—"
                    placeholderTextColor="#64748b"
                    value={canopyDiameterM}
                    onChangeText={setCanopyDiameterM}
                    keyboardType="decimal-pad"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Độ nghiêng (°)</Text>
                  <TextInput
                    style={styles.physicalInput}
                    placeholder="0-90"
                    placeholderTextColor="#64748b"
                    value={tiltDegree}
                    onChangeText={setTiltDegree}
                    keyboardType="number-pad"
                  />
                </View>
              </View>

              <View style={styles.fullWidthInputGroup}>
                <Text style={styles.inputLabel}>Ghi chú (tùy chọn)</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Ghi chú về đo đạc..."
                  placeholderTextColor="#64748b"
                  value={physicalNotes}
                  onChangeText={setPhysicalNotes}
                  multiline
                  numberOfLines={2}
                />
              </View>
            </View>

            <TouchableOpacity
              style={[styles.savePhysicalButton, savingPhysical && styles.buttonDisabled]}
              onPress={handleSavePhysical}
              disabled={savingPhysical}
            >
              {savingPhysical ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.savePhysicalButtonText}>💾 Lưu chỉ số</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Basic tree info from task (fallback if treeDetails not loaded) */}
        {!treeDetails && task.tree && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🌳 Thông tin cây</Text>
            
            <View style={styles.row}>
              <Text style={styles.label}>Mã cây:</Text>
              <Text style={styles.value}>{task.tree.tree_code}</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Loài cây:</Text>
              <Text style={styles.value}>{task.tree.species.common_name}</Text>
            </View>

            <View style={styles.locationContainer}>
              <Text style={styles.label}>Vị trí:</Text>
              <Text style={styles.coordinatesText}>
                {task.tree.location.coordinates[1].toFixed(6)}, {task.tree.location.coordinates[0].toFixed(6)}
              </Text>
            </View>
          </View>
        )}

        {/* Evidence image card — shown for all statuses */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📷 Ảnh bằng chứng</Text>
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
            <Text style={styles.cardTitle}>✅ Hoàn thành công việc</Text>
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
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  notesContainer: {
    marginTop: 4,
  },
  notesText: {
    fontSize: 14,
    color: '#e2e8f0',
    marginTop: 8,
    lineHeight: 20,
  },
  italicText: {
    fontStyle: 'italic',
    color: '#cbd5e1',
  },
  locationContainer: {
    marginTop: 4,
  },
  coordinatesText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  historyButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#60a5fa',
  },
  historyButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
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
  // Physical measurements styles
  physicalInputsContainer: {
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputGroup: {
    flex: 1,
  },
  fullWidthInputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    color: '#94a3b8',
    marginBottom: 6,
  },
  physicalInput: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  savePhysicalButton: {
    backgroundColor: '#16a34a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  savePhysicalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
