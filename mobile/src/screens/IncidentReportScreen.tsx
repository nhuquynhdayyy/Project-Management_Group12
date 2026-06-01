import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createIncident } from '../api/incidents';
import { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'IncidentReport'>;

const INCIDENT_TYPES = ['Gay canh', 'Cay do', 'Sau benh', 'Nguy co mat an toan', 'Khac'];

export default function IncidentReportScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [treeId, setTreeId] = useState('');
  const [incidentType, setIncidentType] = useState(INCIDENT_TYPES[0]);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const numericTreeId = Number(treeId);
    if (!Number.isInteger(numericTreeId) || numericTreeId <= 0) {
      Alert.alert('Loi', 'Vui long nhap ID cay hop le');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Loi', 'Vui long mo ta su co');
      return;
    }

    setSubmitting(true);
    try {
      await createIncident({
        tree_id: numericTreeId,
        incident_type: incidentType,
        description: description.trim(),
      });
      Alert.alert('Thanh cong', 'Da gui bao cao su co den quan ly', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error: any) {
      Alert.alert('Loi', error.message || 'Khong the gui bao cao su co');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Quay lai</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bao cao su co</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.label}>ID cay</Text>
          <TextInput
            value={treeId}
            onChangeText={setTreeId}
            keyboardType="number-pad"
            placeholder="Vi du: 12"
            placeholderTextColor="#64748b"
            style={styles.input}
          />

          <Text style={styles.label}>Loai su co</Text>
          <View style={styles.typeGrid}>
            {INCIDENT_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.typeButton, incidentType === type && styles.typeButtonActive]}
                onPress={() => setIncidentType(type)}
              >
                <Text style={[styles.typeText, incidentType === type && styles.typeTextActive]}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Mo ta chi tiet</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
            placeholder="Mo ta tinh trang va muc do khan cap..."
            placeholderTextColor="#64748b"
            style={[styles.input, styles.textArea]}
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.disabledButton]}
            disabled={submitting}
            onPress={handleSubmit}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Gui bao cao</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: {
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  backText: { color: '#16a34a', fontSize: 16, marginBottom: 8 },
  title: { color: '#fff', fontSize: 22, fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  card: {
    backgroundColor: '#1e293b',
    borderColor: '#334155',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  label: { color: '#cbd5e1', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  input: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: 8,
    borderWidth: 1,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    padding: 12,
  },
  textArea: { minHeight: 130, textAlignVertical: 'top' },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeButton: {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  typeButtonActive: { backgroundColor: '#16a34a', borderColor: '#22c55e' },
  typeText: { color: '#cbd5e1', fontSize: 13, fontWeight: '600' },
  typeTextActive: { color: '#fff' },
  submitButton: {
    alignItems: 'center',
    backgroundColor: '#dc2626',
    borderRadius: 10,
    justifyContent: 'center',
    minHeight: 54,
    padding: 16,
  },
  disabledButton: { opacity: 0.6 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
