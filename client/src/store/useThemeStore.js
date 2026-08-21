import { create } from 'zustand';

export const ACCENT_COLORS = {
  blue: {
    id: 'blue',
    name: 'Light Blue',
    hex: '#007aff',
    hoverHex: '#0066ee',
    previewColor: '#007aff',
  },
  purple: {
    id: 'purple',
    name: 'Lavender Purple',
    hex: '#af52de',
    hoverHex: '#9b30d9',
    previewColor: '#af52de',
  },
  pink: {
    id: 'pink',
    name: 'Rose Pink',
    hex: '#ff2d55',
    hoverHex: '#e01b44',
    previewColor: '#ff2d55',
  },
  red: {
    id: 'red',
    name: 'Coral Red',
    hex: '#ff3b30',
    hoverHex: '#e02b20',
    previewColor: '#ff3b30',
  },
  orange: {
    id: 'orange',
    name: 'Sunset Orange',
    hex: '#ff9500',
    hoverHex: '#e08500',
    previewColor: '#ff9500',
  },
  yellow: {
    id: 'yellow',
    name: 'Amber Yellow',
    hex: '#ffcc00',
    hoverHex: '#e0b300',
    previewColor: '#ffcc00',
  },
  green: {
    id: 'green',
    name: 'Mint Green',
    hex: '#34c759',
    hoverHex: '#28a745',
    previewColor: '#34c759',
  },
  teal: {
    id: 'teal',
    name: 'Aqua Teal',
    hex: '#30b0c7',
    hoverHex: '#2398ad',
    previewColor: '#30b0c7',
  },
  indigo: {
    id: 'indigo',
    name: 'Royal Indigo',
    hex: '#5856d6',
    hoverHex: '#4745b8',
    previewColor: '#5856d6',
  },
};

const useThemeStore = create((set, get) => ({
  isDarkMode: localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches),
  accentColor: localStorage.getItem('accentColor') || 'blue',
  accentIntensity: Number(localStorage.getItem('accentIntensity')) || 100,
  
  toggleDarkMode: () => set((state) => {
    const newMode = !state.isDarkMode;
    if (newMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    return { isDarkMode: newMode };
  }),

  setAccentColor: (colorId) => {
    if (ACCENT_COLORS[colorId]) {
      document.documentElement.setAttribute('data-accent', colorId);
      localStorage.setItem('accentColor', colorId);
      set({ accentColor: colorId });
    }
  },

  setAccentIntensity: (intensity) => {
    const clamped = Math.max(30, Math.min(130, Number(intensity) || 100));
    document.documentElement.style.setProperty('--accent-intensity', `${clamped}%`);
    localStorage.setItem('accentIntensity', clamped);
    set({ accentIntensity: clamped });
  },

  getAccentHex: () => {
    const { accentColor } = get();
    return ACCENT_COLORS[accentColor]?.hex || '#007aff';
  },

  initTheme: () => {
    const isDark = localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    const savedAccent = localStorage.getItem('accentColor') || 'blue';
    document.documentElement.setAttribute('data-accent', savedAccent);

    const savedIntensity = Number(localStorage.getItem('accentIntensity')) || 100;
    document.documentElement.style.setProperty('--accent-intensity', `${savedIntensity}%`);

    set({ accentColor: savedAccent, accentIntensity: savedIntensity });
  }
}));

export default useThemeStore;
