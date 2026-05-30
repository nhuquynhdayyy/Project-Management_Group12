import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend URL — update this if your local IP changes
// Expo đang chạy trên: 192.168.1.183
const API_BASE_URL = 'http://192.168.1.183:3000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add JWT token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for 401 handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('user');
      // Navigation will be handled by AuthContext
    }
    return Promise.reject(error);
  }
);

export default apiClient;
