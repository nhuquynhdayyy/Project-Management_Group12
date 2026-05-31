import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backend URL — update this if your local IP changes
// const API_BASE_URL = 'http://10.11.80.201:3000';
const API_BASE_URL = 'http://192.168.2.27:3000';
// const API_BASE_URL = 'http://localhost:3000';

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

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Log error for debugging
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      status: error.response?.status,
      data: error.response?.data,
      message: error.message,
    });

    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('access_token');
      await AsyncStorage.removeItem('user');
      // Navigation will be handled by AuthContext
    }
    
    // Enhance error message
    const enhancedError = {
      ...error,
      message: error.response?.data?.message || error.message || 'Lỗi kết nối',
    };
    
    return Promise.reject(enhancedError);
  }
);

export default apiClient;
