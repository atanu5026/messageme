import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const ACCENT_COLORS = {
  blue: { id: 'blue', name: 'Light Blue', hex: '#007aff', hoverHex: '#0066ee' },
  purple: { id: 'purple', name: 'Lavender Purple', hex: '#af52de', hoverHex: '#9b30d9' },
  pink: { id: 'pink', name: 'Rose Pink', hex: '#ff2d55', hoverHex: '#e01b44' },
  red: { id: 'red', name: 'Coral Red', hex: '#ff3b30', hoverHex: '#e02b20' },
  orange: { id: 'orange', name: 'Sunset Orange', hex: '#ff9500', hoverHex: '#e08500' },
  yellow: { id: 'yellow', name: 'Amber Yellow', hex: '#ffcc00', hoverHex: '#e0b300' },
  green: { id: 'green', name: 'Mint Green', hex: '#34c759', hoverHex: '#28a745' },
  teal: { id: 'teal', name: 'Aqua Teal', hex: '#30b0c7', hoverHex: '#2398ad' },
  indigo: { id: 'indigo', name: 'Royal Indigo', hex: '#5856d6', hoverHex: '#4745b8' },
};

const useThemeStore = create(
  persist(
    (set, get) => ({
      isDarkMode: false,
      accentColor: 'blue',
      
      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      
      setAccentColor: (colorId) => {
        if (ACCENT_COLORS[colorId]) {
          set({ accentColor: colorId });
        }
      },

      getAccentHex: () => {
        const { accentColor } = get();
        return ACCENT_COLORS[accentColor]?.hex || '#007aff';
      },
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);

export default useThemeStore;
