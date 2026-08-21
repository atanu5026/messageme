import { create } from 'zustand';
import api from '../services/api';
import { Alert } from 'react-native';

const useStatusStore = create((set, get) => ({
  statuses: [], // Array of { user, statuses }
  isLoading: false,
  error: null,
  isUploading: false,

  fetchStatuses: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/status');
      set({ statuses: res.data.data, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  createStatus: async (content, type = 'text', file = null, metadata = {}) => {
    set({ isUploading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('type', type);
      
      if (type === 'image' && file) {
        formData.append('image', file);
      } else {
        formData.append('content', content);
      }

      if (metadata && Object.keys(metadata).length > 0) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      await api.post('/status', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      await get().fetchStatuses();
      set({ isUploading: false });
      return true;
    } catch (error) {
      set({ error: error.message, isUploading: false });
      Alert.alert('Error', 'Failed to post story');
      return false;
    }
  },

  deleteStatus: async (statusId) => {
    try {
      await api.delete(`/status/${statusId}`);
      await get().fetchStatuses();
      return true;
    } catch {
      Alert.alert('Error', 'Failed to delete story');
      return false;
    }
  }
}));

export default useStatusStore;
