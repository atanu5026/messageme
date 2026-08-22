import { create } from 'zustand';
import api from '../services/api';
import { generateKeyPair, exportKey } from '../utils/crypto';

const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setAuth: (user, token) => {
    if (token) {
      localStorage.setItem('token', token);
    }
    set({ user, isAuthenticated: true, isLoading: false, error: null });
  },

  clearAuth: () => {
    localStorage.removeItem('token');
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  checkAuth: async () => {
    set({ isLoading: true });
    try {
      // API interceptor will handle attaching the token or refreshing it
      const res = await api.get('/auth/me');
      if (res.data.success) {
        const userData = res.data.data;
        
        let privateKeyString = localStorage.getItem('e2ee_private_key');
        let publicKeyString = localStorage.getItem('e2ee_public_key');
        
        if (!privateKeyString || !publicKeyString) {
          const keyPair = await generateKeyPair();
          privateKeyString = await exportKey(keyPair.privateKey);
          publicKeyString = await exportKey(keyPair.publicKey);
          localStorage.setItem('e2ee_private_key', privateKeyString);
          localStorage.setItem('e2ee_public_key', publicKeyString);
          
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

        set({ user: userData, isAuthenticated: true, isLoading: false });
      }
    } catch {
      get().clearAuth();
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Generate keys locally before sending to server
      let privateKeyString = localStorage.getItem('e2ee_private_key');
      let publicKeyString = localStorage.getItem('e2ee_public_key');
      
      if (!privateKeyString || !publicKeyString) {
        const keyPair = await generateKeyPair();
        privateKeyString = await exportKey(keyPair.privateKey);
        publicKeyString = await exportKey(keyPair.publicKey);
        localStorage.setItem('e2ee_private_key', privateKeyString);
        localStorage.setItem('e2ee_public_key', publicKeyString);
      }

      const res = await api.post('/auth/login', { 
        email, 
        password,
        publicKey: publicKeyString 
      });
      if (res.data.success) {
        get().setAuth(res.data.data, res.data.data.accessToken);
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

  register: async (name, email, password, phoneNumber) => {
    set({ isLoading: true, error: null });
    try {
      // 1. Generate keys locally before sending to server
      const keyPair = await generateKeyPair();
      const privateKeyString = await exportKey(keyPair.privateKey);
      const publicKeyString = await exportKey(keyPair.publicKey);
      localStorage.setItem('e2ee_private_key', privateKeyString);
      localStorage.setItem('e2ee_public_key', publicKeyString);

      const res = await api.post('/auth/register', { 
        name, 
        email, 
        password, 
        phoneNumber,
        publicKey: publicKeyString 
      });
      
      if (res.data.success) {
        set({ isLoading: false });
        return true;
      }
      set({ isLoading: false });
      return false;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Registration failed', 
        isLoading: false 
      });
      return false;
    }
  },

  verifyEmail: async (email, otp) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.post('/auth/verify-email', { email, otp });
      set({ isLoading: false });
      return res.data.success;
    } catch (error) {
      set({ 
        error: error.response?.data?.message || 'Verification failed', 
        isLoading: false 
      });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (error) {
      console.error('Logout error', error);
    } finally {
      get().clearAuth();
    }
  },

  updateProfile: async (name, email) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.put('/users/profile', { name, email });
      if (res.data.success) {
        set({ user: res.data.data, isLoading: false });
        return true;
      }
    } catch (error) {
      set({ error: error.response?.data?.message || 'Update failed', isLoading: false });
      return false;
    }
  },

  updateProfilePicture: async (file) => {
    set({ isLoading: true, error: null });
    const formData = new FormData();
    formData.append('image', file);
    
    try {
      const res = await api.put('/users/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (res.data.success) {
        set({ user: res.data.data, isLoading: false });
        return true;
      }
    } catch (error) {
      set({ error: error.response?.data?.message || 'Upload failed', isLoading: false });
      return false;
    }
  },

  updateAbout: async (about) => {
    set({ error: null });
    try {
      const res = await api.put('/users/about', { about });
      if (res.data.success) {
        set({ user: res.data.data });
        return true;
      }
    } catch (error) {
      set({ error: error.response?.data?.message || 'Update failed' });
      return false;
    }
  },

  updatePassword: async (currentPassword, newPassword) => {
    set({ error: null });
    try {
      const res = await api.put('/users/password', { currentPassword, newPassword });
      return res.data.success;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Update failed' });
      return false;
    }
  },

  updatePrivacySettings: async (lastSeen, status) => {
    set({ error: null });
    try {
      const res = await api.put('/users/privacy', { lastSeen, status });
      if (res.data.success) {
        set({ user: res.data.data });
        return true;
      }
    } catch (error) {
      set({ error: error.response?.data?.message || 'Privacy update failed' });
      return false;
    }
  },

  updateNotificationSettings: async (settings) => {
    set({ error: null });
    try {
      const res = await api.put('/users/profile', { notificationSettings: settings });
      if (res.data.success) {
        set({ user: res.data.data });
        return true;
      }
    } catch (error) {
      set({ error: error.response?.data?.message || 'Update failed' });
      return false;
    }
  },
}));

export default useAuthStore;
