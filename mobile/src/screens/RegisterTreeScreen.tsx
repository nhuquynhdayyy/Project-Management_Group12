import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { RootStackParamList } from '../types/navigation';
import { createTree, getAllSpecies, getAllAreas, TreeSpecies, AdministrativeArea } from '../api/trees';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'RegisterTree'>;

export default function RegisterTreeScreen() {
  const navigation = useNavigation<NavigationProp>();
  
  // Form state
  const [treeCode, setTreeCode] = useState('');
  const [speciesId, setSpeciesId] = useState<number | null>(null);
  const [areaId, setAreaId] = useState<number | null>(null);
  const [plantingYear, setPlantingYear] = useState('');
  const [height, setHeight] = useState('');
  const [trunkDiameter, setTrunkDiameter] = useState('');
  const [canopyDiameter, setCanopyDiameter] = useState('');
  const [tiltDegree, setTiltDegree] = useState('');
  
  // GPS & Location state
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  
  // Data state
  const [species, setSpecies] = useState<TreeSpecies[]>([]);
  const [areas, setAreas] = useState<AdministrativeArea[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [showSpeciesPicker, setShowSpeciesPicker] = useState(false);
  const [showAreaPicker, setShowAreaPicker] = useState(false);

  useEffect(() => {
    loadInitialData();
    requestLocationAndFetch();
  }, []);

  async function loadInitialData() {
    try {
      const [speciesData, areasData] = await Promise.all([
        getAllSpecies(),
        getAllAreas(),
      ]);
      setSpecies(speciesData);
      setAreas(areasData);
    } catch (error: any) {
      Alert.alert('Lỗi', 'Không thể tải dữ liệu ban đầu');
      console.error('Error loading initial data:', error);
    } finally {
      setDataLoading(false);
    }
  }

  async function requestLocationAndFetch() {
    setLocationLoading(true);
    setLocationError(null);
    
    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        setLocationError('Cần cấp quyền truy cập vị trí để sử dụng tính năng này');
        Alert.alert(
          'Quyền truy cập vị trí',
          'Ứng dụng cần quyền truy cập vị trí để tự động lấy tọa độ cây.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setLatitude(location.coords.latitude);
      setLongitude(location.coords.longitude);
      setLocationError(null);
    } catch (error: any) {
      console.error('Error getting location:', error);
      setLocationError('Không thể lấy vị trí hiện tại');
      Alert.alert('Lỗi GPS', 'Không thể lấy vị trí hiện tại. Vui lòng thử lại.');
    } finally {
      setLocationLoading(false);
    }
  }

  function getSelectedSpeciesName(): string {
    if (!speciesId) return 'Chọn loài cây';
    const selected = species.find(s => s.id === speciesId);
    return selected ? `${selected.common_name} (${selected.scientific_name})` : 'Chọn loài cây';
  }

  function getSelectedAreaName(): string {
    if (!areaId) return 'Chọn khu vực';
    const selected = areas.find(a => a.id === areaId);
    return selected ? selected.area_name : 'Chọn khu vực';
  }

  function validateForm(): boolean {
    if (!treeCode.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập mã cây');
      return false;
    }
    if (!speciesId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn loài cây');
      return false;
    }
    if (!areaId) {
      Alert.alert('Thiếu thông tin', 'Vui lòng chọn khu vực');
      return false;
    }
    if (latitude === null || longitude === null) {
      Alert.alert('Thiếu thông tin', 'Vui lòng cập nhật vị trí GPS');
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const treeData = {
        tree_code: treeCode.trim(),
        species_id: speciesId!,
        area_id: areaId!,
        latitude: latitude!,
        longitude: longitude!,
        planting_year: plantingYear ? parseInt(plantingYear) : undefined,
        height_m: height ? parseFloat(height) : undefined,
        trunk_diameter_cm: trunkDiameter ? parseFloat(trunkDiameter) : undefined,
        canopy_diameter_m: canopyDiameter ? parseFloat(canopyDiameter) : undefined,
        tilt_degree: tiltDegree ? parseInt(tiltDegree) : undefined,
      };

      await createTree(treeData);
      
      Alert.alert(
        '✅ Thành công',
        'Đã đăng ký cây mới thành công!',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    } catch (error: any) {
      console.error('Error creating tree:', error);
      const message = error.response?.data?.message || error.message || 'Không thể đăng ký cây';
      Alert.alert('❌ Lỗi', message);
    } finally {
      setSubmitting(false);
    }
  }

  if (dataLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#22c55e" />
        <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Quay lại</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🌳 Đăng ký cây mới</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* GPS Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>📍 Vị trí GPS</Text>
            <TouchableOpacity
              onPress={requestLocationAndFetch}
              disabled={locationLoading}
              style={styles.refreshButton}
            >
              {locationLoading ? (
                <ActivityIndicator size="small" color="#22c55e" />
              ) : (
                <Text style={styles.refreshButtonText}>🔄 Cập nhật</Text>
              )}
            </TouchableOpacity>
          </View>

          {locationError ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>⚠️ {locationError}</Text>
            </View>
          ) : latitude !== null && longitude !== null ? (
            <>
              <View style={styles.coordinatesBox}>
                <View style={styles.coordinateRow}>
                  <Text style={styles.coordinateLabel}>Vĩ độ:</Text>
                  <Text style={styles.coordinateValue}>{latitude.toFixed(6)}</Text>
                </View>
                <View style={styles.coordinateRow}>
                  <Text style={styles.coordinateLabel}>Kinh độ:</Text>
                  <Text style={styles.coordinateValue}>{longitude.toFixed(6)}</Text>
                </View>
              </View>

              {/* Map Preview */}
              <View style={styles.mapContainer}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  initialRegion={{
                    latitude,
                    longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                  }}
                  scrollEnabled={false}
                  zoomEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                >
                  <Marker
                    coordinate={{ latitude, longitude }}
                    title="Vị trí cây mới"
                    pinColor="#22c55e"
                  />
                </MapView>
              </View>
            </>
          ) : (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Nhấn "Cập nhật" để lấy vị trí GPS</Text>
            </View>
          )}
        </View>

        {/* Tree Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌲 Thông tin cây</Text>

          {/* Tree Code */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Mã cây *</Text>
            <TextInput
              style={styles.input}
              value={treeCode}
              onChangeText={setTreeCode}
              placeholder="Ví dụ: TREE-001"
              placeholderTextColor="#64748b"
            />
          </View>

          {/* Species Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Loài cây *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowSpeciesPicker(!showSpeciesPicker)}
            >
              <Text style={[styles.pickerButtonText, speciesId ? styles.pickerButtonTextSelected : null]}>
                {getSelectedSpeciesName()}
              </Text>
              <Text style={styles.pickerButtonIcon}>{showSpeciesPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showSpeciesPicker && (
              <View style={styles.pickerList}>
                <ScrollView style={styles.pickerScrollView} nestedScrollEnabled>
                  {species.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.pickerItem,
                        speciesId === s.id && styles.pickerItemSelected,
                      ]}
                      onPress={() => {
                        setSpeciesId(s.id);
                        setShowSpeciesPicker(false);
                      }}
                    >
                      <Text style={styles.pickerItemText}>
                        {s.common_name}
                      </Text>
                      <Text style={styles.pickerItemSubtext}>
                        {s.scientific_name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>

          {/* Area Picker */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Khu vực *</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowAreaPicker(!showAreaPicker)}
            >
              <Text style={[styles.pickerButtonText, areaId ? styles.pickerButtonTextSelected : null]}>
                {getSelectedAreaName()}
              </Text>
              <Text style={styles.pickerButtonIcon}>{showAreaPicker ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {showAreaPicker && (
              <View style={styles.pickerList}>
                <ScrollView style={styles.pickerScrollView} nestedScrollEnabled>
                  {areas.map((a) => (
                    <TouchableOpacity
                      key={a.id}
                      style={[
                        styles.pickerItem,
                        areaId === a.id && styles.pickerItemSelected,
                      ]}
                      onPress={() => {
                        setAreaId(a.id);
                        setShowAreaPicker(false);
                      }}
                    >
                      <Text style={styles.pickerItemText}>{a.area_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            )}
          </View>
        </View>

        {/* Optional Information Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Thông tin bổ sung (Tùy chọn)</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Năm trồng</Text>
              <TextInput
                style={styles.input}
                value={plantingYear}
                onChangeText={setPlantingYear}
                placeholder="2024"
                placeholderTextColor="#64748b"
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Chiều cao (m)</Text>
              <TextInput
                style={styles.input}
                value={height}
                onChangeText={setHeight}
                placeholder="5.5"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Đường kính thân (cm)</Text>
              <TextInput
                style={styles.input}
                value={trunkDiameter}
                onChangeText={setTrunkDiameter}
                placeholder="30"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
              />
            </View>

            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Đường kính tán (m)</Text>
              <TextInput
                style={styles.input}
                value={canopyDiameter}
                onChangeText={setCanopyDiameter}
                placeholder="4.0"
                placeholderTextColor="#64748b"
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Độ nghiêng (độ)</Text>
            <TextInput
              style={styles.input}
              value={tiltDegree}
              onChangeText={setTiltDegree}
              placeholder="0-90"
              placeholderTextColor="#64748b"
              keyboardType="numeric"
            />
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>✅ Đăng ký cây mới</Text>
          )}
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f1e',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0a0f1e',
  },
  loadingText: {
    color: '#cbd5e1',
    fontSize: 16,
    marginTop: 12,
  },
  header: {
    paddingTop: 48,
    paddingBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 2,
    borderBottomColor: '#22c55e',
  },
  backButton: {
    marginBottom: 8,
    padding: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#22c55e',
    marginBottom: 16,
  },
  refreshButton: {
    backgroundColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#22c55e',
    fontSize: 14,
    fontWeight: '600',
  },
  coordinatesBox: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#22c55e',
  },
  coordinateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  coordinateLabel: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  coordinateValue: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  map: {
    flex: 1,
  },
  errorBox: {
    backgroundColor: '#7f1d1d',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 14,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#1e3a8a',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  infoText: {
    color: '#93c5fd',
    fontSize: 14,
    textAlign: 'center',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#f1f5f9',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
  },
  pickerButton: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    color: '#64748b',
    fontSize: 16,
    flex: 1,
  },
  pickerButtonTextSelected: {
    color: '#fff',
  },
  pickerButtonIcon: {
    color: '#22c55e',
    fontSize: 16,
    marginLeft: 8,
  },
  pickerList: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#22c55e',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
    overflow: 'hidden',
  },
  pickerScrollView: {
    maxHeight: 200,
  },
  pickerItem: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  pickerItemSelected: {
    backgroundColor: '#22c55e',
  },
  pickerItemText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pickerItemSubtext: {
    color: '#94a3b8',
    fontSize: 13,
    marginTop: 4,
    fontStyle: 'italic',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  submitButton: {
    backgroundColor: '#22c55e',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  submitButtonDisabled: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  bottomSpacer: {
    height: 40,
  },
});
