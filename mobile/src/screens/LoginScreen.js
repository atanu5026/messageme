import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';

const LoginScreen = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState('password');
  const { login, isLoading, error } = useAuthStore();

  const { isDarkMode, getAccentHex } = useThemeStore();
  const accentHex = getAccentHex();

  const handleLogin = () => {
    login(email, password);
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
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>

        {/* Glow Blobs - Placed BEHIND the BlurView so they get blurred! */}
        <View
          style={{
            position: 'absolute',
            top: '15%',
            right: '-15%',
            width: 350,
            height: 350,
            backgroundColor: accentHex,
            borderRadius: 175,
            opacity: isDarkMode ? 0.25 : 0.2
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '-20%',
            width: 300,
            height: 300,
            backgroundColor: accentHex,
            borderRadius: 150,
            opacity: isDarkMode ? 0.15 : 0.1
          }}
        />

        <BlurView
          intensity={Platform.OS === 'ios' ? 70 : 100}
          tint={glassTint}
          style={{
            width: '100%',
            maxWidth: 400,
            borderRadius: 32,
            borderWidth: 1,
            borderColor: panelBorder,
            overflow: 'hidden',
            backgroundColor: isDarkMode ? 'rgba(28,28,30,0.6)' : 'rgba(255,255,255,0.65)',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 5,
          }}
        >
          <View className="p-6 sm:p-8">
            <View className="items-center mb-8">
              <View
                style={{ backgroundColor: accentHex, shadowColor: accentHex }}
                className="w-16 h-16 rounded-2xl items-center justify-center shadow-lg mb-5"
              >
                <Ionicons name="chatbubbles" size={32} color="white" />
              </View>
              <Text style={{ color: textColor }} className="text-2xl font-extrabold tracking-tight">
                {loginMethod === 'qr' ? 'Login with QR' : 'Sign In'}
              </Text>
              <Text style={{ color: textMuted }} className="text-[13px] mt-2 text-center">
                {loginMethod === 'qr'
                  ? 'Use MessageMe on your phone to scan this code'
                  : 'Sign in with your MessageMe-secured credentials'}
              </Text>
            </View>

            {/* Toggle Login Method */}
            <View style={{ backgroundColor: inputBg }} className="flex-row rounded-xl p-1 w-full mx-auto mb-8">
              <TouchableOpacity
                onPress={() => setLoginMethod('password')}
                style={{ backgroundColor: loginMethod === 'password' ? (isDarkMode ? '#1c1c1e' : '#ffffff') : 'transparent' }}
                className={`flex-1 py-2.5 rounded-lg items-center ${loginMethod === 'password' ? 'shadow-sm' : ''}`}
              >
                <Text style={{ color: loginMethod === 'password' ? textColor : textMuted }} className="text-xs font-bold">
                  Password
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setLoginMethod('qr')}
                style={{ backgroundColor: loginMethod === 'qr' ? (isDarkMode ? '#1c1c1e' : '#ffffff') : 'transparent' }}
                className={`flex-1 py-2.5 rounded-lg items-center ${loginMethod === 'qr' ? 'shadow-sm' : ''}`}
              >
                <Text style={{ color: loginMethod === 'qr' ? textColor : textMuted }} className="text-xs font-bold">
                  QR Code
                </Text>
              </TouchableOpacity>
            </View>

            {loginMethod === 'qr' ? (
              <View className="items-center justify-center py-4 space-y-6">
                <View style={{ backgroundColor: isDarkMode ? '#1c1c1e' : '#ffffff', borderColor: inputBorder }} className="p-4 rounded-3xl shadow-sm border">
                  <View style={{ backgroundColor: isDarkMode ? '#2c2c2e' : '#f2f2f7' }} className="w-[180px] h-[180px] rounded-xl items-center justify-center">
                    <Ionicons name="qr-code-outline" size={80} color={accentHex} className="opacity-50" />
                  </View>
                </View>
                <View className="items-center mt-6">
                  <Text style={{ color: textMuted }} className="text-[13px] mb-1">1. Open MessageMe on another device</Text>
                  <Text style={{ color: textMuted }} className="text-[13px] mb-1">2. Go to Settings → Linked Devices</Text>
                  <Text style={{ color: textMuted }} className="text-[13px]">3. Scan this code to log in</Text>
                </View>
              </View>
            ) : (
              <View>
                {error ? (
                  <View className="bg-[#ff3b30]/10 border border-[#ff3b30]/20 p-3 rounded-2xl mb-6">
                    <Text className="text-[12px] font-semibold text-[#ff3b30] text-center">{error}</Text>
                  </View>
                ) : null}

                <View className="space-y-4 mb-8">
                  <View className="mb-4">
                    <Text style={{ color: textMuted }} className="text-xs font-semibold mb-1.5 ml-1">Email Address</Text>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="you@messageme.app"
                      placeholderTextColor={textMuted}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textColor }}
                      className="w-full px-4 py-3.5 rounded-xl text-[14px] border"
                    />
                  </View>

                  <View className="mb-2">
                    <Text style={{ color: textMuted }} className="text-xs font-semibold mb-1.5 ml-1">Password</Text>
                    <View className="relative justify-center">
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder="••••••••"
                        placeholderTextColor={textMuted}
                        secureTextEntry={!showPassword}
                        style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textColor }}
                        className="w-full pl-4 pr-12 py-3.5 rounded-xl text-[14px] border"
                      />
                      <TouchableOpacity
                        className="absolute right-3 p-2"
                        onPress={() => setShowPassword(!showPassword)}
                      >
                        <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={20} color={textMuted} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  onPress={handleLogin}
                  disabled={isLoading}
                  style={{ backgroundColor: accentHex }}
                  className={`w-full py-3.5 rounded-full flex-row justify-center items-center ${isLoading ? 'opacity-70' : ''}`}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-white font-semibold text-sm">Sign In</Text>
                  )}
                </TouchableOpacity>

                <View className="mt-6 flex-row justify-center">
                  <Text style={{ color: textMuted }} className="text-[12px]">Don't have an account? </Text>
                  <TouchableOpacity>
                    <Text style={{ color: accentHex }} className="text-[12px] font-semibold">Create one now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </BlurView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;
