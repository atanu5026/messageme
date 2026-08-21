import { create } from 'zustand';
import api from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateKeyPair, exportKey } from '../utils/crypto';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isCheckingAuth: true,
  isLoading: false,
  error: null,

  setAuth: async (user, token) => {
    if (token) {
      await AsyncStorage.setItem('token', token);
    }
    set({ user, isAuthenticated: true, isCheckingAuth: false, isLoading: false, error: null });
  },

  clearAuth: async () => {
    await AsyncStorage.removeItem('token');
    set({ user: null, isAuthenticated: false, isCheckingAuth: false, isLoading: false, error: null });
  },

  checkAuth: async () => {
    set({ isCheckingAuth: true });
    try {
      const res = await api.get('/auth/me');
      if (res.data.success) {
        const userData = res.data.data;
        
        let privateKeyString = await AsyncStorage.getItem('e2ee_private_key');
        let publicKeyString = await AsyncStorage.getItem('e2ee_public_key');
        
        if (!privateKeyString || !publicKeyString) {
          const keyPair = await generateKeyPair();
          privateKeyString = await exportKey(keyPair.privateKey);
          publicKeyString = await exportKey(keyPair.publicKey);
          await AsyncStorage.setItem('e2ee_private_key', privateKeyString);
          await AsyncStorage.setItem('e2ee_public_key', publicKeyString);
          
          try {
            await api.put('/users/profile', { publicKey: publicKeyString });
            userData.publicKey = publicKeyString;
          } catch {
            // non-blocking
          }
        } else if (userData && userData.publicKey !== publicKeyString) {
          try {
            await api.put('/users/profile', { publicKey: publicKeyString });
            userData.publicKey = publicKeyString;
          } catch {
            // non-blocking
          }
        }

        set({ user: userData, isAuthenticated: true, isCheckingAuth: false });
      }
    } catch {
      await get().clearAuth();
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      let publicKeyString = await AsyncStorage.getItem('e2ee_public_key');
      let privateKeyString = await AsyncStorage.getItem('e2ee_private_key');
      
      if (!publicKeyString || !privateKeyString) {
        const keyPair = await generateKeyPair();
        privateKeyString = await exportKey(keyPair.privateKey);
        publicKeyString = await exportKey(keyPair.publicKey);
        await AsyncStorage.setItem('e2ee_private_key', privateKeyString);
        await AsyncStorage.setItem('e2ee_public_key', publicKeyString);
      }

      const res = await api.post('/auth/login', { email, password, publicKey: publicKeyString });
      if (res.data.success) {
        await get().setAuth(res.data.data, res.data.data.accessToken);
        return true;
      }
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Login failed', 
        isLoading: false 
      });
      return false;
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const keyPair = await generateKeyPair();
      const privateKeyString = await exportKey(keyPair.privateKey);
      const publicKeyString = await exportKey(keyPair.publicKey);
      await AsyncStorage.setItem('e2ee_private_key', privateKeyString);
      await AsyncStorage.setItem('e2ee_public_key', publicKeyString);

      const res = await api.post('/auth/register', { name, email, password, publicKey: publicKeyString });
      if (res.data.success) {
        await get().setAuth(res.data.data, res.data.data.accessToken);
        return true;
      }
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Registration failed', 
        isLoading: false 
      });
      return false;
    }
  }
}));

export default useAuthStore;
