import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { findTreesNearby, NearbyTree, updateTreeHealth } from '../api/trees';
import { createTask } from '../api/maintenance';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'NearbyTrees'>;

const RADIUS_OPTIONS = [50, 100, 200, 500, 1000];

// Bộ lọc thông minh
type HealthFilter = 'all' | 'Sâu bệnh' | 'Yếu' | 'Tốt';
type DistanceFilter = 'all' | 'near' | 'medium' | 'far';

interface FilterState {
  health: HealthFilter;
  distance: DistanceFilter;
}

export default function NearbyTreesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const [trees, setTrees] = useState<NearbyTree[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRadius, setSelectedRadius] = useState(200);
  const [filters, setFilters] = useState<FilterState>({
    health: 'all',
    distance: 'all',
  });

  useEffect(() => {
    getCurrentLocation();
  }, []);

  async function getCurrentLocation() {
    setLocationLoading(true);
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Quyền truy cập vị trí',
          'Ứng dụng cần quyền truy cập vị trí để tìm cây xung quanh. Vui lòng bật GPS trong cài đặt.',
        );
        setLocationLoading(false);
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;
      setUserLocation({ lat: latitude, lng: longitude });

      // Auto search after getting location
      await searchNearbyTrees(latitude, longitude, selectedRadius);
    } catch (error: any) {
      console.error('Error getting location:', error);
      Alert.alert('Lỗi', 'Không thể lấy vị trí hiện tại. Vui lòng thử lại.');
    } finally {
      setLocationLoading(false);
    }
  }

  async function searchNearbyTrees(lat: number, lng: number, radius: number) {
    setLoading(true);
    try {
      const results = await findTreesNearby(lat, lng, radius);
      setTrees(results);
      if (results.length === 0) {
        Alert.alert('Thông báo', `Không tìm thấy cây nào trong bán kính ${radius}m`);
      }
    } catch (error: any) {
      console.error('Error searching trees:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách cây xung quanh');
    } finally {
      setLoading(false);
    }
  }

  function handleRadiusChange(radius: number) {
    setSelectedRadius(radius);
    if (userLocation) {
      searchNearbyTrees(userLocation.lat, userLocation.lng, radius);
    }
  }

  function handleRefreshLocation() {
    getCurrentLocation();
  }

  // Lọc và sắp xếp cây theo bộ lọc
  const filteredTrees = useMemo(() => {
    let result = [...trees];

    // Lọc theo sức khỏe
    if (filters.health !== 'all') {
      result = result.filter((tree) => tree.health_status === filters.health);
    }

    // Lọc theo khoảng cách
    if (filters.distance === 'near') {
      result = result.filter((tree) => tree.distance <= 50);
    } else if (filters.distance === 'medium') {
      result = result.filter((tree) => tree.distance > 50 && tree.distance <= 200);
    } else if (filters.distance === 'far') {
      result = result.filter((tree) => tree.distance > 200);
    }

    // Ưu tiên cây cần chú ý (Sâu bệnh, Yếu) lên đầu
    result.sort((a, b) => {
      const priorityOrder = { 'Sâu bệnh': 0, 'Yếu': 1, 'Tốt': 2, 'Chết': 3 };
      const aPriority = priorityOrder[a.health_status] ?? 4;
      const bPriority = priorityOrder[b.health_status] ?? 4;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Nếu cùng mức ưu tiên, sắp xếp theo khoảng cách
      return a.distance - b.distance;
    });

    return result;
  }, [trees, filters]);

  function getHealthStatusColor(status: string) {
    switch (status) {
      case 'Tốt':
        return '#22c55e'; // Tăng độ tương phản
      case 'Yếu':
        return '#fb923c'; // Tăng độ tương phản
      case 'Sâu bệnh':
        return '#f97316'; // Tăng độ tương phản
      case 'Chết':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  }

  function clearFilters() {
    setFilters({ health: 'all', distance: 'all' });
  }

  function toggleHealthFilter(health: HealthFilter) {
    setFilters((prev) => ({
      ...prev,
      health: prev.health === health ? 'all' : health,
    }));
  }

  function toggleDistanceFilter(distance: DistanceFilter) {
    setFilters((prev) => ({
      ...prev,
      distance: prev.distance === distance ? 'all' : distance,
    }));
  }

  async function handleCreateTask(tree: NearbyTree) {
    if (!user) {
      Alert.alert('Lỗi', 'Bạn cần đăng nhập để tạo task');
      return;
    }

    // Hiển thị dialog chọn loại task
    Alert.alert(
      'Tạo Task Bảo Trì',
      `Chọn loại công việc cho cây ${tree.tree_code}:`,
      [
        {
          text: '✂️ Cắt tỉa',
          onPress: () => createMaintenanceTask(tree, 'Cắt tỉa'),
        },
        {
          text: '🌱 Bón phân',
          onPress: () => createMaintenanceTask(tree, 'Bón phân'),
        },
        {
          text: '💧 Tưới nước',
          onPress: () => createMaintenanceTask(tree, 'Tưới nước'),
        },
        {
          text: '🔍 Kiểm tra',
          onPress: () => createMaintenanceTask(tree, 'Kiểm tra'),
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  }

  async function createMaintenanceTask(
    tree: NearbyTree,
    taskType: 'Cắt tỉa' | 'Bón phân' | 'Tưới nước' | 'Kiểm tra'
  ) {
    if (!user) return;

    try {
      setLoading(true);
      
      // Tạo task với ngày hôm nay
      const today = new Date().toISOString().split('T')[0];
      
      await createTask({
        tree_id: tree.id,
        assigned_to: user.id,
        task_type: taskType,
        scheduled_date: today,
        notes: `Task tạo từ mobile cho cây ${tree.tree_code}`,
      });

      Alert.alert(
        '✅ Thành công',
        `Đã tạo task "${taskType}" cho cây ${tree.tree_code}`,
        [
          {
            text: 'Xem danh sách task',
            onPress: () => navigation.navigate('TaskList'),
          },
          { text: 'OK' },
        ]
      );
    } catch (error: any) {
      console.error('Error creating task:', error);
      const message = error.response?.data?.message || 'Không thể tạo task';
      Alert.alert('❌ Lỗi', message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateHealth(tree: NearbyTree) {
    // Hiển thị dialog chọn trạng thái sức khỏe
    Alert.alert(
      'Cập Nhật Sức Khỏe',
      `Chọn trạng thái sức khỏe cho cây ${tree.tree_code}:`,
      [
        {
          text: '✅ Tốt',
          onPress: () => updateHealth(tree, 'Tốt'),
        },
        {
          text: '⚠️ Yếu',
          onPress: () => updateHealth(tree, 'Yếu'),
        },
        {
          text: '🚨 Sâu bệnh',
          onPress: () => updateHealth(tree, 'Sâu bệnh'),
        },
        {
          text: '💀 Chết',
          onPress: () => updateHealth(tree, 'Chết'),
        },
        { text: 'Hủy', style: 'cancel' },
      ]
    );
  }

  async function updateHealth(
    tree: NearbyTree,
    healthStatus: 'Tốt' | 'Yếu' | 'Sâu bệnh' | 'Chết'
  ) {
    try {
      setLoading(true);
      
      await updateTreeHealth(tree.id, healthStatus);

      // Cập nhật tree trong danh sách
      setTrees((prevTrees) =>
        prevTrees.map((t) =>
          t.id === tree.id ? { ...t, health_status: healthStatus } : t
        )
      );

      Alert.alert(
        '✅ Thành công',
        `Đã cập nhật sức khỏe cây ${tree.tree_code} thành "${healthStatus}"`
      );
    } catch (error: any) {
      console.error('Error updating health:', error);
      const message = error.response?.data?.message || 'Không thể cập nhật sức khỏe';
      Alert.alert('❌ Lỗi', message);
    } finally {
      setLoading(false);
    }
  }

  function renderTree({ item }: { item: NearbyTree }) {
    return (
      <View style={styles.treeCard}>
        {/* Thông tin chính - Compact */}
        <TouchableOpacity
          style={styles.treeMainInfo}
          onPress={() => navigation.navigate('TreeHistory', { treeId: item.id, treeCode: item.tree_code })}
          activeOpacity={0.7}
        >
          <View style={styles.treeHeader}>
            <View style={styles.treeInfo}>
              <Text style={styles.treeCode}>{item.tree_code}</Text>
              <Text style={styles.speciesName}>{item.species?.common_name || 'Không rõ loài'}</Text>
            </View>
            <View style={styles.distanceContainer}>
              <Text style={styles.distanceValue}>{item.distance}m</Text>
            </View>
          </View>

          <View style={styles.treeDetails}>
            <View style={[styles.healthBadge, { backgroundColor: getHealthStatusColor(item.health_status) }]}>
              <Text style={styles.healthText}>{item.health_status}</Text>
            </View>
            {item.area && (
              <Text style={styles.detailText} numberOfLines={1}>📍 {item.area.area_name}</Text>
            )}
          </View>
        </TouchableOpacity>

        {/* Nút hành động nhanh - Ở dưới để dễ bấm bằng ngón cái */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => handleCreateTask(item)}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>🔧 Tạo Task</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonSecondary]}
            onPress={() => handleUpdateHealth(item)}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>💚 Cập nhật</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tìm cây xung quanh</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Location Info */}
      <View style={styles.locationInfo}>
        {locationLoading ? (
          <Text style={styles.locationText}>Đang lấy vị trí...</Text>
        ) : userLocation ? (
          <Text style={styles.locationText}>
            📍 {userLocation.lat.toFixed(6)}, {userLocation.lng.toFixed(6)}
          </Text>
        ) : (
          <Text style={styles.locationText}>Chưa có vị trí</Text>
        )}
      </View>

      {/* Bộ lọc thông minh - Smart Filters */}
      <View style={styles.filtersSection}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Sức khỏe:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              onPress={() => toggleHealthFilter('Sâu bệnh')}
              style={[
                styles.filterChip,
                filters.health === 'Sâu bệnh' && styles.filterChipActive,
                filters.health === 'Sâu bệnh' && { backgroundColor: '#f97316' },
              ]}
            >
              <Text style={[styles.filterChipText, filters.health === 'Sâu bệnh' && styles.filterChipTextActive]}>
                🚨 Sâu bệnh
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleHealthFilter('Yếu')}
              style={[
                styles.filterChip,
                filters.health === 'Yếu' && styles.filterChipActive,
                filters.health === 'Yếu' && { backgroundColor: '#fb923c' },
              ]}
            >
              <Text style={[styles.filterChipText, filters.health === 'Yếu' && styles.filterChipTextActive]}>
                ⚠️ Yếu
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleHealthFilter('Tốt')}
              style={[
                styles.filterChip,
                filters.health === 'Tốt' && styles.filterChipActive,
                filters.health === 'Tốt' && { backgroundColor: '#22c55e' },
              ]}
            >
              <Text style={[styles.filterChipText, filters.health === 'Tốt' && styles.filterChipTextActive]}>
                ✅ Tốt
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Khoảng cách:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              onPress={() => toggleDistanceFilter('near')}
              style={[styles.filterChip, filters.distance === 'near' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filters.distance === 'near' && styles.filterChipTextActive]}>
                📍 Gần nhất (&lt;50m)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleDistanceFilter('medium')}
              style={[styles.filterChip, filters.distance === 'medium' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filters.distance === 'medium' && styles.filterChipTextActive]}>
                🚶 Trung bình (50-200m)
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleDistanceFilter('far')}
              style={[styles.filterChip, filters.distance === 'far' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filters.distance === 'far' && styles.filterChipTextActive]}>
                🚗 Xa (&gt;200m)
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {(filters.health !== 'all' || filters.distance !== 'all') && (
          <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
            <Text style={styles.clearFiltersText}>✖️ Xóa bộ lọc</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Radius Selector - Compact */}
      <View style={styles.radiusSection}>
        <Text style={styles.radiusLabel}>Bán kính:</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.radiusScroll}>
          {RADIUS_OPTIONS.map((radius) => (
            <TouchableOpacity
              key={radius}
              onPress={() => handleRadiusChange(radius)}
              disabled={!userLocation || loading}
              style={[
                styles.radiusButton,
                selectedRadius === radius && styles.radiusButtonActive,
                (!userLocation || loading) && styles.radiusButtonDisabled,
              ]}
            >
              <Text
                style={[
                  styles.radiusButtonText,
                  selectedRadius === radius && styles.radiusButtonTextActive,
                ]}
              >
                {radius}m
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
        </View>
      ) : (
        <>
          {trees.length > 0 && (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {filteredTrees.length === trees.length
                  ? `Tìm thấy ${trees.length} cây`
                  : `Hiển thị ${filteredTrees.length}/${trees.length} cây`}
              </Text>
              <TouchableOpacity onPress={handleRefreshLocation} disabled={locationLoading}>
                <Text style={styles.refreshIcon}>{locationLoading ? '⏳' : '🔄'}</Text>
              </TouchableOpacity>
            </View>
          )}
          <FlatList
            data={filteredTrees}
            renderItem={renderTree}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              !locationLoading && userLocation ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyIcon}>🌳</Text>
                  <Text style={styles.emptyText}>
                    {trees.length === 0
                      ? 'Không tìm thấy cây nào xung quanh'
                      : 'Không có cây nào phù hợp với bộ lọc'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {trees.length === 0
                      ? `Thử tăng bán kính tìm kiếm (hiện tại: ${selectedRadius}m)`
                      : 'Thử điều chỉnh bộ lọc hoặc xóa bộ lọc'}
                  </Text>
                  {trees.length > 0 && (
                    <TouchableOpacity onPress={clearFilters} style={styles.emptyActionButton}>
                      <Text style={styles.emptyActionButtonText}>Xóa bộ lọc</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : null
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e', // Tối hơn để tăng độ tương phản
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#1e293b',
    borderBottomWidth: 2,
    borderBottomColor: '#334155',
  },
  backButton: {
    padding: 8,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 48,
  },
  locationInfo: {
    padding: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  locationText: {
    color: '#cbd5e1',
    fontSize: 12,
    textAlign: 'center',
  },
  // Bộ lọc thông minh
  filtersSection: {
    padding: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 2,
    borderBottomColor: '#334155',
  },
  filterRow: {
    marginBottom: 12,
  },
  filterLabel: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    backgroundColor: '#334155',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 8,
    minHeight: 48, // Dễ bấm
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  filterChipActive: {
    borderColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  filterChipText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  clearFiltersButton: {
    backgroundColor: '#475569',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
    minHeight: 48,
    justifyContent: 'center',
  },
  clearFiltersText: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
  },
  // Radius selector - compact
  radiusSection: {
    padding: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  radiusLabel: {
    color: '#f1f5f9',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  radiusScroll: {
    flexDirection: 'row',
  },
  radiusButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginRight: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  radiusButtonActive: {
    backgroundColor: '#22c55e',
  },
  radiusButtonDisabled: {
    opacity: 0.4,
  },
  radiusButtonText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  radiusButtonTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  refreshIcon: {
    fontSize: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#cbd5e1',
    fontSize: 14,
    marginTop: 12,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#1e293b',
  },
  resultsCount: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '600',
  },
  list: {
    padding: 12,
    paddingBottom: 80, // Thêm padding để tránh che nút dưới
  },
  // Card tinh gọn
  treeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  treeMainInfo: {
    padding: 16,
  },
  treeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  treeInfo: {
    flex: 1,
  },
  treeCode: {
    fontSize: 22, // To hơn để dễ đọc
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  speciesName: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  distanceContainer: {
    alignItems: 'flex-end',
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  distanceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  treeDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  healthBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  healthText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailText: {
    fontSize: 13,
    color: '#cbd5e1',
    flex: 1,
  },
  // Nút hành động nhanh - Ở dưới để dễ bấm
  quickActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52, // Đủ lớn để bấm dễ dàng
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonPrimary: {
    backgroundColor: '#22c55e',
  },
  actionButtonSecondary: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  // Empty state cải thiện
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    color: '#cbd5e1',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyActionButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
    minHeight: 52,
    justifyContent: 'center',
  },
  emptyActionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
