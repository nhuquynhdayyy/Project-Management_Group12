import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getMyTasks, MaintenanceTask, startTask } from '../api/maintenance';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TaskList'>;

// Bộ lọc thông minh cho Task
type StatusFilter = 'all' | 'Pending' | 'In_Progress' | 'Completed';
type TaskTypeFilter = 'all' | 'Cắt tỉa' | 'Bón phân' | 'Tưới nước' | 'Kiểm tra';

interface TaskFilterState {
  status: StatusFilter;
  taskType: TaskTypeFilter;
}

export default function TaskListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signOut } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingTaskId, setProcessingTaskId] = useState<number | null>(null);
  const [filters, setFilters] = useState<TaskFilterState>({
    status: 'all',
    taskType: 'all',
  });

  useEffect(() => {
    loadTasks();
    
    // Lắng nghe sự kiện focus để refresh danh sách khi quay lại màn hình
    const unsubscribe = navigation.addListener('focus', () => {
      loadTasks();
    });

    return unsubscribe;
  }, [navigation]);

  // Lọc và sắp xếp task
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Lọc theo trạng thái
    if (filters.status !== 'all') {
      result = result.filter((task) => task.status === filters.status);
    }

    // Lọc theo loại công việc
    if (filters.taskType !== 'all') {
      result = result.filter((task) => task.task_type === filters.taskType);
    }

    // Sắp xếp: Ưu tiên Pending và In_Progress lên đầu
    result.sort((a, b) => {
      const priorityOrder = { 'Pending': 0, 'In_Progress': 1, 'Completed': 2 };
      const aPriority = priorityOrder[a.status] ?? 3;
      const bPriority = priorityOrder[b.status] ?? 3;
      
      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }
      
      // Nếu cùng trạng thái, sắp xếp theo ngày
      return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
    });

    return result;
  }, [tasks, filters]);

  function clearFilters() {
    setFilters({ status: 'all', taskType: 'all' });
  }

  function toggleStatusFilter(status: StatusFilter) {
    setFilters((prev) => ({
      ...prev,
      status: prev.status === status ? 'all' : status,
    }));
  }

  function toggleTaskTypeFilter(taskType: TaskTypeFilter) {
    setFilters((prev) => ({
      ...prev,
      taskType: prev.taskType === taskType ? 'all' : taskType,
    }));
  }

  async function loadTasks() {
    try {
      const data = await getMyTasks();
      console.log('Tasks loaded:', data); // Debug log
      // Ensure data is an array
      if (Array.isArray(data)) {
        setTasks(data);
      } else {
        console.error('Invalid data format:', data);
        setTasks([]);
        Alert.alert('Lỗi', 'Dữ liệu không đúng định dạng');
      }
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      Alert.alert('Lỗi', error.message || 'Không thể tải danh sách công việc');
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function onRefresh() {
    setRefreshing(true);
    loadTasks();
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'Pending':
        return '#fb923c'; // Tăng độ tương phản
      case 'In_Progress':
        return '#3b82f6';
      case 'Completed':
        return '#22c55e'; // Tăng độ tương phản
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

  async function handleStartWork(task: MaintenanceTask) {
    Alert.alert(
      'Bắt đầu làm việc',
      `Bạn có muốn bắt đầu công việc "${task.task_type}" cho cây ${task.tree?.tree_code || task.tree_id}?`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Bắt đầu',
          onPress: async () => {
            try {
              setProcessingTaskId(task.id);
              // Cập nhật status sang In_Progress
              const updatedTask = await startTask(task.id);
              
              // Cập nhật task trong danh sách
              setTasks((prevTasks) =>
                prevTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t))
              );
              
              Alert.alert('Thành công', 'Đã bắt đầu công việc', [
                {
                  text: 'OK',
                  onPress: () => {
                    // Chuyển sang màn hình chi tiết để thực hiện công việc
                    navigation.navigate('TaskDetail', { task: updatedTask });
                  },
                },
              ]);
            } catch (error: any) {
              console.error('Error starting task:', error);
              const message = error.response?.data?.message || 'Không thể bắt đầu công việc';
              Alert.alert('Lỗi', message);
            } finally {
              setProcessingTaskId(null);
            }
          },
        },
      ]
    );
  }

  function handleCompleteTask(task: MaintenanceTask) {
    // Chuyển sang màn hình chi tiết để hoàn thành
    navigation.navigate('TaskDetail', { task });
  }

  function renderTask({ item }: { item: MaintenanceTask }) {
    // Safety check for item
    if (!item || !item.id) {
      return null;
    }

    return (
      <View style={styles.taskCard}>
        {/* Thông tin chính - Compact */}
        <TouchableOpacity
          style={styles.taskMainInfo}
          onPress={() => navigation.navigate('TaskDetail', { task: item })}
          activeOpacity={0.7}
        >
          <View style={styles.taskHeader}>
            <Text style={styles.taskType}>{item.task_type || 'Không rõ'}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
            </View>
          </View>
          
          {item.tree ? (
            <Text style={styles.treeInfo} numberOfLines={1}>
              🌳 {item.tree.tree_code || 'N/A'} - {item.tree.species?.common_name || 'Không rõ loài'}
            </Text>
          ) : (
            <Text style={styles.treeInfo}>
              🌳 Cây ID: {item.tree_id || 'N/A'}
            </Text>
          )}
          
          <Text style={styles.scheduledDate}>
            📅 {item.scheduled_date ? new Date(item.scheduled_date).toLocaleDateString('vi-VN') : 'Chưa có ngày'}
          </Text>
        </TouchableOpacity>

        {/* Nút hành động nhanh - Chỉ hiện cho task chưa hoàn thành */}
        {item.status !== 'Completed' && (
          <View style={styles.quickActions}>
            {item.status === 'Pending' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonStart]}
                onPress={() => handleStartWork(item)}
                disabled={processingTaskId === item.id}
              >
                {processingTaskId === item.id ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.actionButtonText}>▶️ Bắt đầu làm việc</Text>
                )}
              </TouchableOpacity>
            )}
            {item.status === 'In_Progress' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonComplete]}
                onPress={() => handleCompleteTask(item)}
              >
                <Text style={styles.actionButtonText}>✅ Hoàn thành</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Công việc của tôi</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bộ lọc thông minh */}
      <View style={styles.filtersSection}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Trạng thái:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              onPress={() => toggleStatusFilter('Pending')}
              style={[
                styles.filterChip,
                filters.status === 'Pending' && styles.filterChipActive,
                filters.status === 'Pending' && { backgroundColor: '#fb923c' },
              ]}
            >
              <Text style={[styles.filterChipText, filters.status === 'Pending' && styles.filterChipTextActive]}>
                ⏳ Cần bảo trì
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleStatusFilter('In_Progress')}
              style={[
                styles.filterChip,
                filters.status === 'In_Progress' && styles.filterChipActive,
                filters.status === 'In_Progress' && { backgroundColor: '#3b82f6' },
              ]}
            >
              <Text style={[styles.filterChipText, filters.status === 'In_Progress' && styles.filterChipTextActive]}>
                🔄 Đang thực hiện
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleStatusFilter('Completed')}
              style={[
                styles.filterChip,
                filters.status === 'Completed' && styles.filterChipActive,
                filters.status === 'Completed' && { backgroundColor: '#22c55e' },
              ]}
            >
              <Text style={[styles.filterChipText, filters.status === 'Completed' && styles.filterChipTextActive]}>
                ✅ Đã xong
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>Loại công việc:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              onPress={() => toggleTaskTypeFilter('Cắt tỉa')}
              style={[styles.filterChip, filters.taskType === 'Cắt tỉa' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filters.taskType === 'Cắt tỉa' && styles.filterChipTextActive]}>
                ✂️ Cắt tỉa
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleTaskTypeFilter('Bón phân')}
              style={[styles.filterChip, filters.taskType === 'Bón phân' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filters.taskType === 'Bón phân' && styles.filterChipTextActive]}>
                🌱 Bón phân
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleTaskTypeFilter('Tưới nước')}
              style={[styles.filterChip, filters.taskType === 'Tưới nước' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filters.taskType === 'Tưới nước' && styles.filterChipTextActive]}>
                💧 Tưới nước
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggleTaskTypeFilter('Kiểm tra')}
              style={[styles.filterChip, filters.taskType === 'Kiểm tra' && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, filters.taskType === 'Kiểm tra' && styles.filterChipTextActive]}>
                🔍 Kiểm tra
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {(filters.status !== 'all' || filters.taskType !== 'all') && (
          <TouchableOpacity onPress={clearFilters} style={styles.clearFiltersButton}>
            <Text style={styles.clearFiltersText}>✖️ Xóa bộ lọc</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Nút hành động nhanh - Ở trên danh sách */}
      <View style={styles.topActions}>
        <TouchableOpacity 
          onPress={() => navigation.navigate('RegisterTree')} 
          style={[styles.topActionButton, styles.topActionButtonPrimary]}
        >
          <Text style={styles.topActionButtonText}>🌳 Đăng ký cây mới</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => navigation.navigate('NearbyTrees')} 
          style={[styles.topActionButton, styles.topActionButtonSecondary]}
        >
          <Text style={styles.topActionButtonText}>📍 Tìm cây gần đây</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          onPress={() => navigation.navigate('QRScanner')} 
          style={[styles.topActionButton, styles.topActionButtonSecondary]}
        >
          <Text style={styles.topActionButtonText}>📷 Quét QR</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Đang tải...</Text>
        </View>
      ) : (
        <>
          {tasks.length > 0 && (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsCount}>
                {filteredTasks.length === tasks.length
                  ? `${tasks.length} công việc`
                  : `Hiển thị ${filteredTasks.length}/${tasks.length} công việc`}
              </Text>
            </View>
          )}
          <FlatList
            data={filteredTasks}
            renderItem={renderTask}
            keyExtractor={(item) => item?.id?.toString() || Math.random().toString()}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor="#22c55e"
                colors={['#22c55e']}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>
                  {tasks.length === 0
                    ? 'Không có công việc nào'
                    : 'Không có công việc nào phù hợp với bộ lọc'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {tasks.length === 0
                    ? 'Kéo xuống để làm mới'
                    : 'Thử điều chỉnh bộ lọc hoặc xóa bộ lọc'}
                </Text>
                {tasks.length > 0 && (
                  <TouchableOpacity onPress={clearFilters} style={styles.emptyActionButton}>
                    <Text style={styles.emptyActionButtonText}>Xóa bộ lọc</Text>
                  </TouchableOpacity>
                )}
              </View>
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
    backgroundColor: '#0a0f1e',
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
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoutButton: {
    padding: 8,
    minHeight: 48,
    minWidth: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
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
    minHeight: 48,
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
  // Nút hành động trên cùng
  topActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  topActionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  topActionButtonPrimary: {
    backgroundColor: '#22c55e',
  },
  topActionButtonSecondary: {
    backgroundColor: '#3b82f6',
  },
  topActionButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  resultsHeader: {
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
    paddingBottom: 80,
  },
  // Card tinh gọn
  taskCard: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  taskMainInfo: {
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskType: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  treeInfo: {
    fontSize: 14,
    color: '#cbd5e1',
    marginBottom: 6,
  },
  scheduledDate: {
    fontSize: 14,
    color: '#cbd5e1',
  },
  // Nút hành động nhanh
  quickActions: {
    padding: 12,
    backgroundColor: '#0f172a',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  actionButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 52,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  actionButtonStart: {
    backgroundColor: '#3b82f6',
  },
  actionButtonComplete: {
    backgroundColor: '#22c55e',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  // Empty state
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
