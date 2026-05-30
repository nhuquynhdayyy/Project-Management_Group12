import React, { useState, useEffect } from 'react';
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
import { findTreesNearby, NearbyTree } from '../api/trees';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'NearbyTrees'>;

const RADIUS_OPTIONS = [50, 100, 200, 500, 1000];

export default function NearbyTreesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [trees, setTrees] = useState<NearbyTree[]>([]);
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedRadius, setSelectedRadius] = useState(200);

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

  function getHealthStatusColor(status: string) {
    switch (status) {
      case 'Tốt':
        return '#10b981';
      case 'Yếu':
        return '#f59e0b';
      case 'Sâu bệnh':
        return '#f97316';
      case 'Chết':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  }

  function renderTree({ item }: { item: NearbyTree }) {
    return (
      <TouchableOpacity
        style={styles.treeCard}
        onPress={() => navigation.navigate('TreeHistory', { treeId: item.id, treeCode: item.tree_code })}
      >
        <View style={styles.treeHeader}>
          <View style={styles.treeInfo}>
            <Text style={styles.treeCode}>{item.tree_code}</Text>
            <Text style={styles.speciesName}>{item.species?.common_name || 'Không rõ loài'}</Text>
          </View>
          <View style={styles.distanceContainer}>
            <Text style={styles.distanceValue}>{item.distance}m</Text>
            <Text style={styles.distanceLabel}>khoảng cách</Text>
          </View>
        </View>

        <View style={styles.treeDetails}>
          <View style={[styles.healthBadge, { backgroundColor: getHealthStatusColor(item.health_status) }]}>
            <Text style={styles.healthText}>{item.health_status}</Text>
          </View>

          {item.area && (
            <Text style={styles.detailText}>📍 {item.area.area_name}</Text>
          )}

          {item.height_m && (
            <Text style={styles.detailText}>📏 Cao: {item.height_m}m</Text>
          )}
        </View>
      </TouchableOpacity>
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

      {/* Radius Selector */}
      <View style={styles.radiusSection}>
        <Text style={styles.radiusLabel}>Bán kính tìm kiếm:</Text>
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

      {/* Refresh Button */}
      <TouchableOpacity
        onPress={handleRefreshLocation}
        disabled={locationLoading}
        style={[styles.refreshButton, locationLoading && styles.refreshButtonDisabled]}
      >
        <Text style={styles.refreshButtonText}>
          {locationLoading ? '🔄 Đang lấy vị trí...' : '🔄 Làm mới vị trí'}
        </Text>
      </TouchableOpacity>

      {/* Results */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>Đang tìm kiếm...</Text>
        </View>
      ) : (
        <>
          {trees.length > 0 && (
            <Text style={styles.resultsCount}>
              Tìm thấy {trees.length} cây trong bán kính {selectedRadius}m
            </Text>
          )}
          <FlatList
            data={trees}
            renderItem={renderTree}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              !locationLoading && userLocation ? (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Không tìm thấy cây nào xung quanh</Text>
                  <Text style={styles.emptySubtext}>Thử tăng bán kính tìm kiếm</Text>
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
  backButton: {
    padding: 8,
  },
  backButtonText: {
    color: '#16a34a',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 80,
  },
  locationInfo: {
    padding: 12,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  locationText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
  },
  radiusSection: {
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  radiusLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  radiusScroll: {
    flexDirection: 'row',
  },
  radiusButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  radiusButtonActive: {
    backgroundColor: '#16a34a',
  },
  radiusButtonDisabled: {
    opacity: 0.5,
  },
  radiusButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  radiusButtonTextActive: {
    color: '#fff',
  },
  refreshButton: {
    backgroundColor: '#16a34a',
    margin: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
    marginTop: 12,
  },
  resultsCount: {
    color: '#94a3b8',
    fontSize: 14,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  list: {
    padding: 16,
  },
  treeCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
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
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  speciesName: {
    fontSize: 14,
    color: '#94a3b8',
  },
  distanceContainer: {
    alignItems: 'flex-end',
  },
  distanceValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  distanceLabel: {
    fontSize: 10,
    color: '#64748b',
  },
  treeDetails: {
    gap: 8,
  },
  healthBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  healthText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  detailText: {
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
