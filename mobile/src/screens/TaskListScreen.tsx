import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getMyTasks, MaintenanceTask } from '../api/maintenance';
import { useAuth } from '../context/AuthContext';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TaskList'>;

export default function TaskListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { signOut } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTasks();
  }, []);

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

  function renderTask({ item }: { item: MaintenanceTask }) {
    // Safety check for item
    if (!item || !item.id) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.taskCard}
        onPress={() => navigation.navigate('TaskDetail', { task: item })}
      >
        <View style={styles.taskHeader}>
          <Text style={styles.taskType}>{item.task_type || 'Không rõ'}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.statusText}>{getStatusText(item.status)}</Text>
          </View>
        </View>
        
        {item.tree ? (
          <Text style={styles.treeInfo}>
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
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Công việc của tôi</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('QRScanner')} 
            style={styles.qrButton}
          >
            <Text style={styles.qrButtonText}>📷 Quét QR</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Đăng xuất</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Đang tải...</Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          renderItem={renderTask}
          keyExtractor={(item) => item?.id?.toString() || Math.random().toString()}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Không có công việc nào</Text>
              <Text style={styles.emptySubtext}>Kéo xuống để làm mới</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qrButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  qrButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 14,
  },
  list: {
    padding: 16,
  },
  taskCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskType: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
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
  treeInfo: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  scheduledDate: {
    fontSize: 14,
    color: '#94a3b8',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
  },
  emptySubtext: {
    color: '#475569',
    fontSize: 14,
    marginTop: 8,
  },
});
