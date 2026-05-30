import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import LoginScreen from './src/screens/LoginScreen';
import TaskListScreen from './src/screens/TaskListScreen';
import TaskDetailScreen from './src/screens/TaskDetailScreen';
import TreeHistoryScreen from './src/screens/TreeHistoryScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import { ActivityIndicator, View } from 'react-native';
import { RootStackParamList } from './src/types/navigation';
import * as Linking from 'expo-linking';

const Stack = createNativeStackNavigator<RootStackParamList>();

// Deep linking configuration
const linking = {
  prefixes: ['cayxanh://', 'https://cayxanh.danang.vn'],
  config: {
    screens: {
      Login: 'login',
      TaskList: 'tasks',
      TaskDetail: 'tasks/:taskId',
      TreeHistory: 'tree/:treeId',
      QRScanner: 'scanner',
    },
  },
};

function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="TaskList" component={TaskListScreen} />
            <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
            <Stack.Screen name="TreeHistory" component={TreeHistoryScreen} />
            <Stack.Screen name="QRScanner" component={QRScannerScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppNavigator />
    </AuthProvider>
  );
}
