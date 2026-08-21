import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';

const VerifyEmailScreen = () => {
  const [otp, setOtp] = useState('');
  const route = useRoute();
  const navigation = useNavigation();
  const { email } = route.params || { email: 'your email' };
  
  const { verifyEmail, isLoading, error } = useAuthStore();
  const { isDarkMode, getAccentHex } = useThemeStore();
  const accentHex = getAccentHex();

  const handleVerify = async () => {
    if (!otp) return;
    const success = await verifyEmail(email, otp);
    if (success) {
      // Assuming checkAuth will update state and route to MainTabs,
      // but we can explicitly call checkAuth just to be sure.
      useAuthStore.getState().checkAuth();
    }
  };

  const bgColor = isDarkMode ? '#000000' : '#f2f2f7';
  const textColor = isDarkMode ? '#f5f5f7' : '#1c1c1e';
  const textMuted = '#8e8e93';
  const inputBg = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const panelBorder = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)';
  const glassTint = isDarkMode ? 'dark' : 'light';

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: bgColor }}
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
        
        {/* Glow Blob */}
        <View 
          style={{ 
            position: 'absolute', 
            top: '20%', 
            left: '-10%', 
            width: 300, 
            height: 300, 
            backgroundColor: accentHex, 
            borderRadius: 150, 
            opacity: isDarkMode ? 0.25 : 0.2 
          }} 
        />

        <BlurView 
          intensity={Platform.OS === 'ios' ? 80 : 100}
          tint={glassTint}
          style={{
            width: '100%',
            maxWidth: 400,
            borderRadius: 32,
            borderWidth: 1,
            borderColor: panelBorder,
            overflow: 'hidden',
            alignSelf: 'center',
            backgroundColor: isDarkMode ? 'rgba(28,28,30,0.7)' : 'rgba(255,255,255,0.7)',
          }}
        >
          <View className="p-6 sm:p-8">
            <View className="items-center mb-8">
              <View 
                style={{ backgroundColor: accentHex, shadowColor: accentHex }}
                className="w-16 h-16 rounded-2xl items-center justify-center shadow-lg mb-5"
              >
                <Ionicons name="mail-open" size={30} color="white" />
              </View>
              <Text style={{ color: textColor }} className="text-2xl font-extrabold tracking-tight">
                Verify Email
              </Text>
              <Text style={{ color: textMuted }} className="text-[13px] mt-2 text-center">
                We sent a 6-digit code to {email}.
              </Text>
            </View>

            <View>
              {error ? (
                <View className="bg-[#ff3b30]/10 border border-[#ff3b30]/20 p-3 rounded-2xl mb-6">
                  <Text className="text-[12px] font-semibold text-[#ff3b30] text-center">{error}</Text>
                </View>
              ) : null}

              <View className="mb-6">
                <Text style={{ color: textMuted }} className="text-xs font-semibold mb-1.5 ml-1">OTP Code</Text>
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="123456"
                  placeholderTextColor={textMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textColor }}
                  className="w-full px-4 py-3.5 rounded-xl text-[20px] text-center tracking-widest border"
                />
              </View>

              <TouchableOpacity 
                onPress={handleVerify}
                disabled={isLoading}
                style={{ backgroundColor: accentHex }}
                className={`w-full py-3.5 rounded-full flex-row justify-center items-center ${isLoading ? 'opacity-70' : ''}`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-sm">Verify</Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="mt-6 p-2 items-center"
                onPress={() => navigation.navigate('Login')}
              >
                <Text style={{ color: textMuted }} className="text-xs">
                  Back to <Text style={{ color: accentHex, fontWeight: 'bold' }}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </BlurView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default VerifyEmailScreen;
