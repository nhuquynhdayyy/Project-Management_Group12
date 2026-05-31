import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { getTasksByTreeId } from '../api/maintenance';
import type { MaintenanceTask } from '../api/maintenance';
import NetworkStatusIndicator from '../components/NetworkStatusIndicator';
import OfflineBanner from '../components/OfflineBanner';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'TreeHistory'>;
type TreeHistoryRouteProp = RouteProp<RootStackParamList, 'TreeHistory'>;

export default function TreeHistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<TreeHistoryRouteProp>();
  const { treeId, treeCode } = route.params;

  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTasks();
  }, [treeId]);

  async function loadTasks() {
    try {
      setLoading(true);
      const data = await getTasksByTreeId(treeId);
      setTasks(data);
    } catch (error) {
      console.error('Failed to load tree history:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
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

  function getStatusIcon(status: string) {
    switch (status) {
      case 'Pending': return '⏳';
      case 'In_Progress': return '🔵';
      case 'Completed': return '✅';
      default: return '❓';
    }
  }

  function isOverdue(task: MaintenanceTask): boolean {
    if (task.status === 'Completed') return false;
    const scheduledDate = new Date(task.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return scheduledDate < today;
  }

  function handleTaskPress(task: MaintenanceTask) {
    navigation.navigate('TaskDetail', { task });
  }

  if (loading) {
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
          <Text style={styles.headerTitle}>Lịch sử bảo trì</Text>
          <NetworkStatusIndicator />
        </View>
        <Text style={styles.headerSubtitle}>Cây: {treeCode}</Text>
      </View>
      <OfflineBanner />

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#16a34a"
            colors={['#16a34a']}
          />
        }
      >
        {tasks.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>Chưa có lịch sử bảo trì</Text>
            <Text style={styles.emptySubtext}>
              Cây này chưa có công việc bảo trì nào được ghi nhận
            </Text>
          </View>
        ) : (
          <View style={styles.taskList}>
            <Text style={styles.sectionTitle}>
              Tổng số: {tasks.length} công việc
            </Text>

            {tasks.map((task, index) => {
              const overdue = isOverdue(task);
              
              return (
                <TouchableOpacity
                  key={task.id}
                  style={[
                    styles.taskCard,
                    overdue && styles.taskCardOverdue,
                  ]}
                  onPress={() => handleTaskPress(task)}
                  activeOpacity={0.7}
                >
                  <View style={styles.taskHeader}>
                    <View style={styles.taskTitleRow}>
                      <Text style={styles.taskIcon}>{getStatusIcon(task.status)}</Text>
                      <Text style={styles.taskType}>{task.task_type}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(task.status) }]}>
                      <Text style={styles.statusText}>{getStatusText(task.status)}</Text>
                    </View>
                  </View>

                  <View style={styles.taskDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>📅 Ngày hẹn:</Text>
                      <Text style={styles.detailValue}>
                        {new Date(task.scheduled_date).toLocaleDateString('vi-VN')}
                      </Text>
                    </View>

                    {task.completed_at && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>✓ Hoàn thành:</Text>
                        <Text style={styles.detailValue}>
                          {new Date(task.completed_at).toLocaleDateString('vi-VN')}
                        </Text>
                      </View>
                    )}

                    {overdue && (
                      <View style={styles.overdueWarning}>
                        <Text style={styles.overdueText}>⚠️ Quá hạn</Text>
                      </View>
                    )}

                    {task.notes && (
                      <View style={styles.notesContainer}>
                        <Text style={styles.notesLabel}>Ghi chú:</Text>
                        <Text style={styles.notesText} numberOfLines={2}>
                          {task.notes}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.taskFooter}>
                    <Text style={styles.viewDetailsText}>Xem chi tiết →</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
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
    marginBottom: 4,
  },
  headerTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  taskList: {
    paddingBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#94a3b8',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  taskCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  taskCardOverdue: {
    borderColor: '#f59e0b',
    borderWidth: 2,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  taskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  taskIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  taskType: {
    fontSize: 16,
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
  taskDetails: {
    marginBottom: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#94a3b8',
  },
  detailValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  overdueWarning: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  overdueText: {
    fontSize: 13,
    color: '#f59e0b',
    fontWeight: '600',
    textAlign: 'center',
  },
  notesContainer: {
    marginTop: 8,
    backgroundColor: '#0f172a',
    borderRadius: 6,
    padding: 8,
  },
  notesLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  taskFooter: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  viewDetailsText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '500',
    textAlign: 'right',
  },
});
