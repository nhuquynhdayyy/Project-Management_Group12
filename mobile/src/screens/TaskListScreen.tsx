import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getMyTasks, MaintenanceTask } from '../api/maintenance';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TaskList'>;

type StatusFilter = 'all' | 'Pending' | 'In_Progress' | 'Completed';
type PriorityLevel = 'high' | 'medium' | 'low';

interface TaskWithPriority extends MaintenanceTask {
  priority: PriorityLevel;
  isOverdue: boolean;
}

export default function TaskListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signOut } = useAuth();
  
  const [tasks, setTasks] = useState<TaskWithPriority[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<TaskWithPriority[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    loadTasks();
    
    const unsubscribe = navigation.addListener('focus', () => {
      loadTasks();
    });

    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    applyFilters();
  }, [tasks, statusFilter]);

  const calculatePriority = (task: MaintenanceTask): PriorityLevel => {
    const scheduledDate = new Date(task.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    scheduledDate.setHours(0, 0, 0, 0);
    
    const daysUntilDue = Math.ceil((scheduledDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (task.status === 'Completed') return 'low';
    if (daysUntilDue < 0) return 'high'; // Quá hạn
    if (daysUntilDue <= 2) return 'high'; // Trong 2 ngày tới
    if (daysUntilDue <= 5) return 'medium'; // Trong 5 ngày tới
    return 'low';
  };

  const isTaskOverdue = (task: MaintenanceTask): boolean => {
    if (task.status === 'Completed') return false;
    const scheduledDate = new Date(task.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    scheduledDate.setHours(0, 0, 0, 0);
    return scheduledDate < today;
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const data = await getMyTasks();
      
      if (Array.isArray(data)) {
        const tasksWithPriority: TaskWithPriority[] = data.map(task => ({
          ...task,
          priority: calculatePriority(task),
          isOverdue: isTaskOverdue(task),
        }));
        
        // Sắp xếp: Quá hạn > Ưu tiên cao > Đang thực hiện > Chờ xử lý > Hoàn thành
        tasksWithPriority.sort((a, b) => {
          if (a.isOverdue !== b.isOverdue) return a.isOverdue ? -1 : 1;
          
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          if (a.priority !== b.priority) {
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          }
          
          const statusOrder = { In_Progress: 0, Pending: 1, Completed: 2 };
          if (a.status !== b.status) {
            return statusOrder[a.status] - statusOrder[b.status];
          }
          
          return new Date(a.scheduled_date).getTime() - new Date(b.scheduled_date).getTime();
        });
        
        setTasks(tasksWithPriority);
      } else {
        setTasks([]);
        Alert.alert('Lỗi', 'Dữ liệu không đúng định dạng');
      }
    } catch (error: any) {
      console.error('Error loading tasks:', error);
      Alert.alert('Lỗi kết nối', error.message || 'Không thể tải danh sách công việc. Vui lòng thử lại.');
      setTasks([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let result = [...tasks];
    
    if (statusFilter !== 'all') {
      result = result.filter(task => task.status === statusFilter);
    }
    
    setFilteredTasks(result);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTasks();
  }, []);

  const openMapLocation = (task: TaskWithPriority) => {
    if (!task.tree?.location?.coordinates) {
      Alert.alert('Lỗi', 'Không có thông tin vị trí cây');
      return;
    }
    
    const [longitude, latitude] = task.tree.location.coordinates;
    const label = encodeURIComponent(`Cây ${task.tree.tree_code}`);
    
    const scheme = Platform.select({
      ios: `maps:0,0?q=${label}@${latitude},${longitude}`,
      android: `geo:0,0?q=${latitude},${longitude}(${label})`,
    });
    
    if (scheme) {
      Linking.openURL(scheme).catch(() => {
        Alert.alert('Lỗi', 'Không thể mở ứng dụng bản đồ');
      });
    }
  };

  const handleUpdateTask = (task: TaskWithPriority) => {
    navigation.navigate('TaskDetail', { task });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Pending': return '#f59e0b';
      case 'In_Progress': return '#3b82f6';
      case 'Completed': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'Pending': return 'Chờ xử lý';
      case 'In_Progress': return 'Đang thực hiện';
      case 'Completed': return 'Hoàn thành';
      default: return status;
    }
  };

  const getPriorityColor = (priority: PriorityLevel): string => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
    }
  };

  const getPriorityText = (priority: PriorityLevel): string => {
    switch (priority) {
      case 'high': return 'Cao';
      case 'medium': return 'Trung bình';
      case 'low': return 'Thấp';
    }
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    
    const diffDays = Math.ceil((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hôm nay';
    if (diffDays === 1) return 'Ngày mai';
    if (diffDays === -1) return 'Hôm qua';
    if (diffDays < -1) return `Quá hạn ${Math.abs(diffDays)} ngày`;
    
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const renderTaskCard = ({ item }: { item: TaskWithPriority }) => {
    if (!item || !item.id) return null;

    const statusColor = getStatusColor(item.status);
    const borderColor = item.isOverdue ? '#ef4444' : statusColor;

    return (
      <View style={[styles.taskCard, { borderLeftColor: borderColor }]}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.taskType}>{item.task_type}</Text>
            {item.isOverdue && (
              <View style={styles.overdueTag}>
                <Text style={styles.overdueText}>⚠️ QUÁ HẠN</Text>
              </View>
            )}
          </View>
          <View style={[styles.priorityChip, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.priorityText}>{getPriorityText(item.priority)}</Text>
          </View>
        </View>

        {/* Tree Info */}
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>🌳 Mã cây:</Text>
            <Text style={styles.infoValue}>{item.tree?.tree_code || 'N/A'}</Text>
          </View>
          
          {item.tree?.species?.common_name && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>🌿 Loài:</Text>
              <Text style={styles.infoValue}>{item.tree.species.common_name}</Text>
            </View>
          )}
          
          {item.tree?.area && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>📍 Khu vực:</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {(item.tree.area as any).name || 'Không rõ'}
              </Text>
            </View>
          )}
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>📅 Thời hạn:</Text>
            <Text style={[styles.infoValue, item.isOverdue && styles.overdueDate]}>
              {formatDate(item.scheduled_date)}
            </Text>
          </View>
        </View>

        {/* Status Badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.cardActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.mapButton]}
            onPress={() => openMapLocation(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>🗺️ Xem bản đồ</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.updateButton]}
            onPress={() => handleUpdateTask(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.actionButtonText}>
              {item.status === 'Completed' ? '👁️ Chi tiết' : '✏️ Cập nhật'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>📋</Text>
      <Text style={styles.emptyTitle}>
        {statusFilter === 'all' ? 'Không có công việc nào' : 'Không tìm thấy công việc'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {statusFilter === 'all' 
          ? 'Kéo xuống để làm mới danh sách' 
          : 'Thử thay đổi bộ lọc để xem công việc khác'}
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#3b82f6" />
      <Text style={styles.loadingText}>Đang tải công việc...</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Danh sách công việc</Text>
          <Text style={styles.headerSubtitle}>
            {tasks.length} công việc • {filteredTasks.filter(t => t.status !== 'Completed').length} chưa hoàn thành
          </Text>
        </View>
        <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Đăng xuất</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, statusFilter === 'all' && styles.filterTabActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[styles.filterTabText, statusFilter === 'all' && styles.filterTabTextActive]}>
            Tất cả ({tasks.length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, statusFilter === 'Pending' && styles.filterTabActive]}
          onPress={() => setStatusFilter('Pending')}
        >
          <Text style={[styles.filterTabText, statusFilter === 'Pending' && styles.filterTabTextActive]}>
            Chưa làm ({tasks.filter(t => t.status === 'Pending').length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, statusFilter === 'In_Progress' && styles.filterTabActive]}
          onPress={() => setStatusFilter('In_Progress')}
        >
          <Text style={[styles.filterTabText, statusFilter === 'In_Progress' && styles.filterTabTextActive]}>
            Đang làm ({tasks.filter(t => t.status === 'In_Progress').length})
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.filterTab, statusFilter === 'Completed' && styles.filterTabActive]}
          onPress={() => setStatusFilter('Completed')}
        >
          <Text style={[styles.filterTabText, statusFilter === 'Completed' && styles.filterTabTextActive]}>
            Hoàn thành ({tasks.filter(t => t.status === 'Completed').length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Task List */}
      {loading ? (
        renderLoadingState()
      ) : (
        <FlatList
          data={filteredTasks}
          renderItem={renderTaskCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
              colors={['#3b82f6']}
            />
          }
          ListEmptyComponent={renderEmptyState}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Quick Actions */}
      <View style={styles.quickActionsContainer}>
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('QRScanner')}
        >
          <Text style={styles.quickActionIcon}>📷</Text>
          <Text style={styles.quickActionText}>Quét QR</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('NearbyTrees')}
        >
          <Text style={styles.quickActionIcon}>🌳</Text>
          <Text style={styles.quickActionText}>Cây gần đây</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.quickActionButton}
          onPress={() => navigation.navigate('RegisterTree')}
        >
          <Text style={styles.quickActionIcon}>➕</Text>
          <Text style={styles.quickActionText}>Đăng ký cây</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fee2e2',
  },
  logoutText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  filterTabActive: {
    backgroundColor: '#3b82f6',
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#ffffff',
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  taskCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
    gap: 6,
  },
  taskType: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
  },
  overdueTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  overdueText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#dc2626',
  },
  priorityChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  cardBody: {
    gap: 8,
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '500',
    width: 100,
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
    fontWeight: '600',
  },
  overdueDate: {
    color: '#dc2626',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapButton: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  updateButton: {
    backgroundColor: '#3b82f6',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
  quickActionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quickActionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
});
