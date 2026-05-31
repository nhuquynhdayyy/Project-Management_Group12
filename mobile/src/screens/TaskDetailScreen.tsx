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
import { getTreeById, updateTreeHealth, updatePhysicalMeasurements } from '../api/trees';
import type { Tree } from '../api/trees';
import NetworkStatusIndicator from '../components/NetworkStatusIndicator';
import OfflineBanner from '../components/OfflineBanner';
import { useOffline } from '../context/OfflineContext';
import {
  getCachedTaskDetails,
  getCachedTreeDetails,
  saveCachedTaskDetails,
  saveCachedTreeDetails,
  saveOfflineAction,
} from '../services/offlineStorage';
import { RootStackParamList } from '../types/navigation';
import { openDirections } from '../utils/directions';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TaskDetail'>;
type TaskDetailRouteProp = RouteProp<RootStackParamList, 'TaskDetail'>;

export default function TaskDetailScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TaskDetailRouteProp>();
  const { isOnline, refreshPending } = useOffline();

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
  const [savingHealth, setSavingHealth] = useState(false);
  const healthOptions: Tree['health_status'][] = ['Tốt', 'Yếu', 'Sâu bệnh', 'Chết'];

  useEffect(() => {
    let cancelled = false;

    async function loadTask() {
      setFetchingTask(true);
      try {
        const cachedTask = await getCachedTaskDetails(route.params.task.id);
        if (!cancelled && cachedTask) {
          setTask(cachedTask);
        }

        if (!isOnline) {
          return;
        }

        const freshTask = await getTaskById(route.params.task.id);
        if (!cancelled) {
          setTask(freshTask);
          await saveCachedTaskDetails(freshTask);
        }
      } catch {
// Keep route params or cached data when network is unavailable.
      } finally {
        if (!cancelled) {
          setFetchingTask(false);
        }
      }
    }

    void loadTask();

    return () => {
      cancelled = true;
    };
  }, [isOnline, route.params.task.id]);

  useEffect(() => {
    let cancelled = false;

    async function loadTreeDetails() {
      if (!task.tree_id) {
        setFetchingTree(false);
        return;
      }

      setFetchingTree(true);
      try {
        const cachedTree = await getCachedTreeDetails(task.tree_id);
        if (!cancelled && cachedTree) {
          setTreeDetails(cachedTree);
        }

        if (!isOnline) {
          return;
        }

        const freshTree = await getTreeById(task.tree_id);
        if (!cancelled) {
          setTreeDetails(freshTree);
          await saveCachedTreeDetails(freshTree);
        }
      } catch {
        // Offline detail view can still use cached tree or route task fallback.
      } finally {
        if (!cancelled) {
          setFetchingTree(false);
        }
      }
    }

    void loadTreeDetails();

    return () => {
      cancelled = true;
    };
  }, [isOnline, task.tree_id]);

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

    // Kiểm tra xem có ảnh bằng chứng không (tùy chọn nhưng khuyến khích)
    if (!imageUri && !task.evidence_image_url) {
      Alert.alert(
        'Xác nhận',
        'Bạn chưa chụp ảnh bằng chứng. Bạn có muốn tiếp tục không?',
        [
          { text: 'Hủy', style: 'cancel' },
          { text: 'Tiếp tục', onPress: () => performComplete() },
        ]
      );
      return;
    }

    performComplete();
  }

  async function performComplete() {
    setLoading(true);
    try {
      // Yêu cầu quyền truy cập vị trí
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        Alert.alert(
          'Cần quyền truy cập vị trí',
          'Ứng dụng cần quyền truy cập vị trí để xác minh bạn đang ở gần cây. Vui lòng cấp quyền trong cài đặt.'
        );
        setLoading(false);
        return;
      }

      // Lấy vị trí hiện tại
      Alert.alert('Đang lấy vị trí', 'Vui lòng đợi trong giây lát...');
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      if (!isOnline) {
        await saveOfflineAction({
          type: 'task_complete',
          treeId: task.tree_id,
          taskId: task.id,
          data: {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            notes: notes || undefined,
            imageUri: imageUri || undefined,
          },
        });
        await refreshPending();
        const offlineTask: MaintenanceTask = {
          ...task,
          status: 'Completed',
          completed_at: new Date().toISOString(),
          notes: notes ? `${task.notes ? `${task.notes}\n\n` : ''}Completion notes: ${notes}` : task.notes,
        };
        setTask(offlineTask);
        await saveCachedTaskDetails(offlineTask);
        Alert.alert('Đã lưu ngoại tuyến', 'Công việc sẽ đồng bộ khi có mạng', [
          { text: 'OK', onPress: () => navigation.goBack() },
        ]);
        return;
      }

      // Gọi API hoàn thành task
      const completed = await completeTask(task.id, {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        notes: notes || undefined,
        imageUri: imageUri || undefined,
      });

      // Update local task state with the completed task returned from API
      setTask(completed);
      await saveCachedTaskDetails(completed);

      Alert.alert(
        '✅ Thành công',
        'Đã hoàn thành công việc thành công!',
        [
          {
            text: 'OK',
            onPress: () => {
              // Quay lại màn hình danh sách task
              navigation.goBack();
            },
          },
        ]
      );
    } catch (error: any) {
      console.error('Error completing task:', error);
      
      // Xử lý các lỗi cụ thể
      let errorMessage = 'Không thể hoàn thành công việc';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }

      // Kiểm tra lỗi geofencing
      if (errorMessage.includes('geofence') || errorMessage.includes('bán kính') || errorMessage.includes('xa')) {
        Alert.alert(
          '📍 Ngoài phạm vi cho phép',
          'Bạn đang ở quá xa cây (>10m). Vui lòng di chuyển đến gần cây hơn để hoàn thành công việc.',
          [{ text: 'Đã hiểu' }]
        );
      } else if (errorMessage.includes('permission') || errorMessage.includes('quyền')) {
        Alert.alert(
          '⚠️ Lỗi quyền truy cập',
          'Không thể truy cập vị trí hoặc camera. Vui lòng kiểm tra cài đặt quyền của ứng dụng.',
          [{ text: 'Đã hiểu' }]
        );
      } else {
        Alert.alert('❌ Lỗi', errorMessage, [{ text: 'Đã hiểu' }]);
      }
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

      if (!isOnline) {
        await saveOfflineAction({
          type: 'physical_update',
          treeId: treeDetails.id,
          data: payload,
        });
        await refreshPending();
        const offlineTree = { ...treeDetails, ...payload };
        setTreeDetails(offlineTree);
        await saveCachedTreeDetails(offlineTree);
        setHeightM('');
        setTrunkDiameterCm('');
        setCanopyDiameterM('');
        setTiltDegree('');
        setPhysicalNotes('');
        Alert.alert('Đã lưu ngoại tuyến', 'Chỉ số sẽ đồng bộ khi có mạng');
        return;
      }

      await updatePhysicalMeasurements(treeDetails.id, payload);

      // Refresh tree details
      const updatedTree = await getTreeById(treeDetails.id);
      setTreeDetails(updatedTree);
      await saveCachedTreeDetails(updatedTree);

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

  async function handleUpdateHealth(healthStatus: Tree['health_status']) {
    if (!treeDetails || treeDetails.health_status === healthStatus) {
      return;
    }

    setSavingHealth(true);
    try {
      if (!isOnline) {
        await saveOfflineAction({
          type: 'health_update',
          treeId: treeDetails.id,
          data: { health_status: healthStatus },
        });
        await refreshPending();
        const offlineTree = { ...treeDetails, health_status: healthStatus };
        setTreeDetails(offlineTree);
        await saveCachedTreeDetails(offlineTree);
        Alert.alert('Đã lưu ngoại tuyến', 'Tình trạng cây sẽ đồng bộ khi có mạng');
        return;
      }

      const updatedTree = await updateTreeHealth(treeDetails.id, healthStatus);
      setTreeDetails(updatedTree);
      await saveCachedTreeDetails(updatedTree);
      Alert.alert('Thành công', 'Đã cập nhật tình trạng cây');
    } catch (error: any) {
      const message = error.response?.data?.message || 'Không thể cập nhật tình trạng cây';
      Alert.alert('Lỗi', message);
    } finally {
      setSavingHealth(false);
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

  function handleOpenDirections() {
    const coordinates = treeDetails?.location?.coordinates ?? task.tree?.location?.coordinates;

    if (!coordinates) {
      Alert.alert('Lỗi', 'Không có thông tin vị trí cây');
      return;
    }

    const [longitude, latitude] = coordinates;
    const treeCode = treeDetails?.tree_code ?? task.tree?.tree_code ?? task.tree_id;
    openDirections(latitude, longitude, `Cay ${treeCode}`);
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
        <View style={styles.headerTitleRow}>
          <Text style={styles.headerTitle}>Chi tiết công việc</Text>
          <NetworkStatusIndicator />
        </View>
      </View>
      <OfflineBanner />

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

            <View style={styles.healthActions}>
              {healthOptions.map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[
                    styles.healthButton,
                    treeDetails.health_status === status && {
                      backgroundColor: getHealthStatusColor(status),
                      borderColor: getHealthStatusColor(status),
                    },
                  ]}
                  onPress={() => handleUpdateHealth(status)}
                  disabled={savingHealth}
                >
                  <Text style={styles.healthButtonText}>{status}</Text>
                </TouchableOpacity>
              ))}
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

            <TouchableOpacity style={styles.directionsButton} onPress={handleOpenDirections}>
              <Text style={styles.directionsButtonText}>Chỉ đường đến cây</Text>
            </TouchableOpacity>

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

            <TouchableOpacity style={styles.directionsButton} onPress={handleOpenDirections}>
              <Text style={styles.directionsButtonText}>Chỉ đường đến cây</Text>
            </TouchableOpacity>
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
            <View style={styles.hint}>
              <Text style={{ color: '#fb923c', fontSize: 14, fontWeight: '600' }}>
                ⚠️ Lưu ý quan trọng:{'\n'}
                • Bạn phải ở trong bán kính 10m từ cây{'\n'}
                • Nên chụp ảnh bằng chứng để xác nhận công việc{'\n'}
                • Kiểm tra GPS đã được bật
              </Text>
            </View>

            <Text style={{ color: '#cbd5e1', fontSize: 14, marginBottom: 8, fontWeight: '600' }}>
              Ghi chú công việc:
            </Text>
            <TextInput
              style={styles.textArea}
              placeholder="Nhập ghi chú về công việc đã thực hiện (tùy chọn)"
              placeholderTextColor="#64748b"
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity style={styles.cameraButton} onPress={handleTakePhoto}>
              <Text style={styles.cameraButtonText}>
                📷 {imageUri ? 'Thay đổi ảnh bằng chứng' : 'Chụp ảnh bằng chứng'}
              </Text>
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
                <ActivityIndicator color="#fff" size="large" />
              ) : (
                <Text style={styles.completeButtonText}>✓ XÁC NHẬN HOÀN THÀNH</Text>
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
  headerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  healthActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  healthButton: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  healthButtonText: {
    color: '#fff',
    fontSize: 13,
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
  directionsButton: {
    backgroundColor: '#0ea5e9',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  directionsButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
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
    fontSize: 14,
    color: '#fb923c',
    marginBottom: 16,
    lineHeight: 20,
    fontWeight: '600',
    backgroundColor: 'rgba(251, 146, 60, 0.1)',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#fb923c',
  },
  textArea: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#fff',
    borderWidth: 2,
    borderColor: '#334155',
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  cameraButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#60a5fa',
    minHeight: 56,
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cameraButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    backgroundColor: '#0f172a',
  },
  removeImageButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: 'rgba(239, 68, 68, 0.95)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  removeImageText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  completeButton: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
    minHeight: 60,
    justifyContent: 'center',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#4ade80',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  completeButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
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
