import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Use local IP for Expo Go development
const API_URL = 'http://192.168.0.216:3000/api'; 

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Bypass-Tunnel-Reminder': 'true'
  }
});

api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(`${API_URL}/auth/refresh`, {}, {
          headers: { 'Bypass-Tunnel-Reminder': 'true' }
        });
        if (res.data.success) {
          await AsyncStorage.setItem('token', res.data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${res.data.data.accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Dynamically require to avoid require cycle
        const useAuthStore = require('../store/useAuthStore').default;
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
