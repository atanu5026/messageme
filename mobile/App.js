import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import React, { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import useAuthStore from './src/store/useAuthStore';
import './global.css';

export default function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <AppNavigator />
    </View>
  );
}
