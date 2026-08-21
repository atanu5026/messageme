import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, ActivityIndicator, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import api from '../services/api';

const ProfileScreen = () => {
  const { user, setUser } = useAuthStore();
  const { isDarkMode, getAccentHex } = useThemeStore();
  const accentHex = getAccentHex();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const bgColor = isDarkMode ? '#000000' : '#f2f2f7';
  const textColor = isDarkMode ? '#f5f5f7' : '#1c1c1e';
  const textMuted = '#8e8e93';
  const panelBg = isDarkMode ? 'rgba(28,28,30,0.6)' : 'rgba(255,255,255,0.65)';
  const panelBorder = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)';
  const inputBg = isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)';
  const inputBorder = isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
  const glassTint = isDarkMode ? 'dark' : 'light';

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.put('/users/profile', { name, bio });
      if (res.data.success) {
        setUser(res.data.data);
        navigation.goBack();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Background Glow Blobs */}
      <View style={{ position: 'absolute', top: '10%', right: '-15%', width: 350, height: 350, backgroundColor: accentHex, borderRadius: 175, opacity: isDarkMode ? 0.25 : 0.2 }} />
      <View style={{ position: 'absolute', bottom: '20%', left: '-20%', width: 300, height: 300, backgroundColor: accentHex, borderRadius: 150, opacity: isDarkMode ? 0.15 : 0.1 }} />

      <ScrollView contentContainerStyle={{ padding: 24, paddingTop: insets.top + 20, paddingBottom: 100, alignItems: 'center' }}>
        
        {/* Header */}
        <View className="flex-row items-center w-full mb-8">
          <TouchableOpacity onPress={() => navigation.goBack()} className="p-2">
            <Ionicons name="chevron-back" size={28} color={accentHex} />
          </TouchableOpacity>
          <Text style={{ color: textColor }} className="text-2xl font-extrabold tracking-tight flex-1 ml-2">Edit Profile</Text>
        </View>

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
            backgroundColor: panelBg,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 5,
            padding: 24,
          }}
        >
          {/* Avatar Section */}
          <View className="items-center mb-8">
            <View className="relative">
              {user?.profilePicture ? (
                <Image source={{ uri: user.profilePicture }} className="w-24 h-24 rounded-full bg-gray-200" />
              ) : (
                <View style={{ backgroundColor: accentHex }} className="w-24 h-24 rounded-full items-center justify-center shadow-lg">
                  <Text className="text-white text-4xl font-bold">{user?.name?.charAt(0) || 'U'}</Text>
                </View>
              )}
              <TouchableOpacity style={{ backgroundColor: bgColor, borderColor: panelBorder, borderWidth: 1 }} className="absolute bottom-0 right-0 w-8 h-8 rounded-full items-center justify-center shadow-sm">
                <Ionicons name="camera" size={16} color={textColor} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: textMuted }} className="text-xs mt-3">Tap to change profile picture</Text>
          </View>

          {error ? (
            <View className="bg-[#ff3b30]/10 border border-[#ff3b30]/20 p-3 rounded-2xl mb-6">
              <Text className="text-[12px] font-semibold text-[#ff3b30] text-center">{error}</Text>
            </View>
          ) : null}

          <View className="space-y-4 mb-8">
            <View className="mb-4">
              <Text style={{ color: textMuted }} className="text-xs font-semibold mb-1.5 ml-1">Display Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your Name"
                placeholderTextColor={textMuted}
                style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textColor }}
                className="w-full px-4 py-3.5 rounded-xl text-[14px] border"
              />
            </View>

            <View className="mb-4">
              <Text style={{ color: textMuted }} className="text-xs font-semibold mb-1.5 ml-1">Bio</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                placeholder="Available"
                placeholderTextColor={textMuted}
                multiline
                numberOfLines={3}
                style={{ backgroundColor: inputBg, borderColor: inputBorder, color: textColor }}
                className="w-full px-4 py-3.5 rounded-xl text-[14px] border min-h-[100px] text-justify"
              />
            </View>
          </View>

          <TouchableOpacity
            onPress={handleSave}
            disabled={isLoading}
            style={{ backgroundColor: accentHex }}
            className={`w-full py-3.5 rounded-full flex-row justify-center items-center shadow-sm ${isLoading ? 'opacity-70' : ''}`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-sm">Save Changes</Text>
            )}
          </TouchableOpacity>
        </BlurView>
      </ScrollView>
    </View>
  );
};

export default ProfileScreen;
