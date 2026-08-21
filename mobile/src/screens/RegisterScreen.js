import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ActivityIndicator, StyleSheet, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';

const RegisterScreen = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { register, isLoading, error } = useAuthStore();
  const navigation = useNavigation();
  
  const { isDarkMode, getAccentHex } = useThemeStore();
  const accentHex = getAccentHex();

  const handleRegister = async () => {
    if (!name || !email || !password) return;
    const success = await register(name, email, password, phone);
    if (success) {
      // Navigate to Verify Email Screen
      navigation.navigate('VerifyEmail', { email });
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
            <View className="items-center mb-6">
              <View 
                style={{ backgroundColor: accentHex, shadowColor: accentHex }}
                className="w-16 h-16 rounded-2xl items-center justify-center shadow-lg mb-5"
              >
                <Ionicons name="person-add" size={30} color="white" />
              </View>
              <Text style={{ color: textColor }} className="text-2xl font-extrabold tracking-tight">
                Create Account
              </Text>
              <Text style={{ color: textMuted }} className="text-[13px] mt-2 text-center">
                Join MessageMe and connect securely
              </Text>
            </View>

            <View>
              {error ? (
                <View className="bg-[#ff3b30]/10 border border-[#ff3b30]/20 p-3 rounded-2xl mb-6">
                  <Text className="text-[12px] font-semibold text-[#ff3b30] text-center">{error}</Text>
                </View>
              ) : null}

              <View className="space-y-3 mb-6">
                <View className="mb-3">
                  <Text style={{ color: textMuted }} className="text-xs font-semibold mb-1.5 ml-1">Full Name</Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="John Doe"
                    placeholderTextColor={textMuted}
                    style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textColor }}
                    className="w-full px-4 py-3 rounded-xl text-[14px] border"
                  />
                </View>

                <View className="mb-3">
                  <Text style={{ color: textMuted }} className="text-xs font-semibold mb-1.5 ml-1">Email Address</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@messageme.app"
                    placeholderTextColor={textMuted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textColor }}
                    className="w-full px-4 py-3 rounded-xl text-[14px] border"
                  />
                </View>

                <View className="mb-3">
                  <Text style={{ color: textMuted }} className="text-xs font-semibold mb-1.5 ml-1">Phone Number (Optional)</Text>
                  <TextInput
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+1 234 567 890"
                    placeholderTextColor={textMuted}
                    keyboardType="phone-pad"
                    style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textColor }}
                    className="w-full px-4 py-3 rounded-xl text-[14px] border"
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
                      className="w-full pl-4 pr-12 py-3 rounded-xl text-[14px] border"
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
                onPress={handleRegister}
                disabled={isLoading}
                style={{ backgroundColor: accentHex }}
                className={`w-full py-3.5 rounded-full flex-row justify-center items-center ${isLoading ? 'opacity-70' : ''}`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-white font-semibold text-sm">Sign Up</Text>
                )}
              </TouchableOpacity>

              <View className="mt-6 flex-row justify-center">
                <Text style={{ color: textMuted }} className="text-[12px]">Already have an account? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                  <Text style={{ color: accentHex }} className="text-[12px] font-semibold">Sign In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </BlurView>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen;
