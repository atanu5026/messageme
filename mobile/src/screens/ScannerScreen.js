import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';
import useThemeStore from '../store/useThemeStore';

const ScannerScreen = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const navigation = useNavigation();
  
  const { getAccentHex } = useThemeStore();
  const accentHex = getAccentHex();

  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ type, data }) => {
    setScanned(true);
    try {
      // Expecting a JSON object with sessionId or just the sessionId directly
      let sessionId = data;
      try {
        const parsed = JSON.parse(data);
        if (parsed.sessionId) sessionId = parsed.sessionId;
      } catch (e) {
        // Not a JSON, assume raw sessionId
      }

      if (!sessionId || sessionId.length < 10) {
        throw new Error('Invalid QR Code');
      }

      const res = await api.post('/auth/qr/approve', { sessionId });
      if (res.data.success) {
        Alert.alert('Success', 'Desktop logged in successfully!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        throw new Error('Failed to approve');
      }
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to scan QR code.', [
        { text: 'Scan Again', onPress: () => setScanned(false) },
        { text: 'Cancel', onPress: () => navigation.goBack(), style: 'cancel' }
      ]);
    }
  };

  if (!permission) {
    return <View className="flex-1 bg-black" />;
  }

  if (!permission.granted) {
    return (
      <View className="flex-1 items-center justify-center bg-black px-6">
        <Ionicons name="camera-outline" size={80} color="white" className="mb-4" />
        <Text className="text-white text-center text-lg mb-6">
          MessageMe needs camera access to scan QR codes for desktop login.
        </Text>
        <TouchableOpacity 
          onPress={requestPermission}
          style={{ backgroundColor: accentHex }}
          className="px-6 py-3 rounded-full"
        >
          <Text className="text-white font-bold">Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <CameraView 
        style={StyleSheet.absoluteFillObject}
        facing="back"
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ["qr"],
        }}
      >
        <View className="flex-1 justify-between py-12 px-6">
          <View className="flex-row items-center justify-between mt-10">
            <TouchableOpacity 
              onPress={() => navigation.goBack()}
              className="w-12 h-12 bg-black/50 rounded-full items-center justify-center backdrop-blur-md"
            >
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-lg font-bold shadow-sm">Scan QR Code</Text>
            <View className="w-12 h-12" />
          </View>
          
          <View className="items-center">
            {/* Target Reticle Overlay */}
            <View className="w-64 h-64 border-2 border-white/50 rounded-3xl items-center justify-center">
              <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-3xl" style={{ borderColor: accentHex }} />
              <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-3xl" style={{ borderColor: accentHex }} />
              <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-3xl" style={{ borderColor: accentHex }} />
              <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-3xl" style={{ borderColor: accentHex }} />
            </View>
            <Text className="text-white/80 text-center mt-8 px-4 bg-black/50 py-2 rounded-xl overflow-hidden backdrop-blur-md">
              Point your camera at the QR code on MessageMe Web to log in instantly.
            </Text>
          </View>

          <View className="items-center pb-8">
            {scanned && (
              <TouchableOpacity 
                onPress={() => setScanned(false)}
                style={{ backgroundColor: accentHex }}
                className="px-8 py-4 rounded-full shadow-lg"
              >
                <Text className="text-white font-bold text-base">Tap to Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
};

export default ScannerScreen;
