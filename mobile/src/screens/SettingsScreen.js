import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import useAuthStore from '../store/useAuthStore';
import useThemeStore, { ACCENT_COLORS } from '../store/useThemeStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const SettingsScreen = () => {
  const { user, logout } = useAuthStore();
  const { isDarkMode, toggleDarkMode, accentColor, setAccentColor, getAccentHex } = useThemeStore();
  const accentHex = getAccentHex();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: logout },
    ]);
  };

  const bgColor = isDarkMode ? '#000000' : '#f2f2f7';
  const textColor = isDarkMode ? '#f5f5f7' : '#1c1c1e';
  const textMuted = '#8e8e93';
  const panelBg = isDarkMode ? 'rgba(28,28,30,0.7)' : 'rgba(255,255,255,0.7)';
  const panelBorder = isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)';

  const SettingRow = ({ icon, title, value, onPress, isDanger }) => (
    <TouchableOpacity 
      onPress={onPress}
      className="flex-row items-center py-3 border-b"
      style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
    >
      <View className="w-8 items-center mr-3">
        <Ionicons name={icon} size={22} color={isDanger ? '#ff3b30' : textMuted} />
      </View>
      <Text style={{ color: isDanger ? '#ff3b30' : textColor }} className="flex-1 text-base">{title}</Text>
      {value ? (
        <Text style={{ color: textMuted }} className="mr-2">{value}</Text>
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={textMuted} />
    </TouchableOpacity>
  );

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Background Glow Blobs */}
      <View style={{ position: 'absolute', top: '-5%', right: '-15%', width: 300, height: 300, backgroundColor: accentHex, borderRadius: 150, opacity: isDarkMode ? 0.2 : 0.15 }} />
      <View style={{ position: 'absolute', bottom: '15%', left: '-20%', width: 250, height: 250, backgroundColor: accentHex, borderRadius: 125, opacity: isDarkMode ? 0.2 : 0.15 }} />
      <BlurView intensity={100} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, paddingBottom: 100 }}>
        <Text style={{ color: textColor }} className="text-3xl font-extrabold tracking-tight mb-6">Settings</Text>

        {/* Profile Card */}
        <BlurView 
          intensity={Platform.OS === 'ios' ? 70 : 100}
          tint={isDarkMode ? 'dark' : 'light'}
          style={{ backgroundColor: panelBg, borderColor: panelBorder, borderWidth: 1, borderRadius: 24, overflow: 'hidden', marginBottom: 24 }}
        >
          <View className="p-5 flex-row items-center">
            {user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} className="w-16 h-16 rounded-full bg-gray-200" />
            ) : (
              <View style={{ backgroundColor: accentHex }} className="w-16 h-16 rounded-full items-center justify-center shadow-sm">
                <Text className="text-white text-2xl font-bold">{user?.name?.charAt(0) || 'U'}</Text>
              </View>
            )}
            <View className="ml-4 flex-1">
              <Text style={{ color: textColor }} className="text-xl font-bold">{user?.name || 'User'}</Text>
              <Text style={{ color: textMuted }} className="text-sm mt-0.5">{user?.email}</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('Profile')} className="p-2 bg-black/5 dark:bg-white/10 rounded-full">
              <Ionicons name="pencil" size={18} color={accentHex} />
            </TouchableOpacity>
          </View>
        </BlurView>

        {/* Appearance Section */}
        <Text style={{ color: textMuted }} className="text-xs font-semibold ml-4 mb-2 uppercase tracking-wider">Appearance</Text>
        <BlurView 
          intensity={80}
          tint={isDarkMode ? 'dark' : 'light'}
          style={{ backgroundColor: panelBg, borderColor: panelBorder, borderWidth: 1, borderRadius: 24, overflow: 'hidden', marginBottom: 24 }}
        >
          <View className="px-5 py-2">
            <TouchableOpacity 
              onPress={toggleDarkMode}
              className="flex-row items-center justify-between py-3 border-b"
              style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
            >
              <View className="flex-row items-center">
                <View className="w-8 items-center mr-3">
                  <Ionicons name={isDarkMode ? 'moon' : 'sunny'} size={22} color={isDarkMode ? '#5e5ce6' : '#ff9500'} />
                </View>
                <Text style={{ color: textColor }} className="text-base">Dark Mode</Text>
              </View>
              <View style={{ backgroundColor: isDarkMode ? accentHex : 'rgba(0,0,0,0.1)' }} className="w-12 h-7 rounded-full justify-center px-1">
                <View style={{ alignSelf: isDarkMode ? 'flex-end' : 'flex-start' }} className="w-5 h-5 bg-white rounded-full shadow-sm" />
              </View>
            </TouchableOpacity>
            
            <View className="py-4">
              <Text style={{ color: textColor }} className="text-base mb-3">Accent Color</Text>
              <View className="flex-row flex-wrap gap-3">
                {Object.values(ACCENT_COLORS).map(color => (
                  <TouchableOpacity
                    key={color.id}
                    onPress={() => setAccentColor(color.id)}
                    style={{ backgroundColor: color.hex, borderColor: textColor, borderWidth: accentColor === color.id ? 2 : 0 }}
                    className="w-10 h-10 rounded-full items-center justify-center shadow-sm"
                  >
                    {accentColor === color.id && <Ionicons name="checkmark" size={20} color="white" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </BlurView>

        {/* Account Section */}
        <Text style={{ color: textMuted }} className="text-xs font-semibold ml-4 mb-2 uppercase tracking-wider">Account</Text>
        <BlurView 
          intensity={80}
          tint={isDarkMode ? 'dark' : 'light'}
          style={{ backgroundColor: panelBg, borderColor: panelBorder, borderWidth: 1, borderRadius: 24, overflow: 'hidden', marginBottom: 24 }}
        >
          <View className="px-5 py-2">
            <SettingRow icon="lock-closed-outline" title="Privacy & Security" />
            <SettingRow icon="notifications-outline" title="Notifications" />
            <SettingRow icon="scan-outline" title="Linked Devices" value="Tap to Scan QR" onPress={() => navigation.navigate('Scanner')} />
          </View>
        </BlurView>

        {/* Danger Section */}
        <BlurView 
          intensity={80}
          tint={isDarkMode ? 'dark' : 'light'}
          style={{ backgroundColor: panelBg, borderColor: panelBorder, borderWidth: 1, borderRadius: 24, overflow: 'hidden' }}
        >
          <View className="px-5 py-2">
            <SettingRow icon="log-out-outline" title="Log Out" isDanger onPress={handleLogout} />
          </View>
        </BlurView>
      </ScrollView>
    </View>
  );
};

export default SettingsScreen;
