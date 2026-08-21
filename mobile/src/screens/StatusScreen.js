import React, { useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useStatusStore from '../store/useStatusStore';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

const StatusScreen = () => {
  const { statuses, fetchStatuses, isLoading } = useStatusStore();
  const { user } = useAuthStore();
  const { isDarkMode, getAccentHex } = useThemeStore();
  const accentHex = getAccentHex();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  useEffect(() => {
    fetchStatuses();
  }, []);

  const bgColor = isDarkMode ? '#000000' : '#f2f2f7';
  const textColor = isDarkMode ? '#f5f5f7' : '#1c1c1e';
  const textMuted = '#8e8e93';

  // Find my status
  const safeStatuses = statuses || [];
  const myStatus = safeStatuses.find(s => s?.user?._id === user?._id);
  // Other users' statuses
  const otherStatuses = safeStatuses.filter(s => s?.user && s.user._id !== user?._id);

  const renderStatusRing = (statusGroup) => {
    if (!statusGroup || !statusGroup.user) return null;
    
    const isMine = statusGroup.user._id === user?._id;
    const hasUnseen = (statusGroup.statuses || []).some(s => !(s.viewers || []).includes(user?._id));
    const ringColor = hasUnseen || isMine ? accentHex : textMuted;

    return (
      <TouchableOpacity 
        className="items-center mr-4"
        onPress={() => {
          // navigation.navigate('StatusView', { statusGroup });
        }}
      >
        <View 
          style={{ borderColor: ringColor, borderWidth: 2 }}
          className="w-16 h-16 rounded-full items-center justify-center p-0.5"
        >
          {statusGroup.user.profilePicture ? (
            <Image source={{ uri: statusGroup.user.profilePicture }} className="w-full h-full rounded-full" />
          ) : (
            <View style={{ backgroundColor: isDarkMode ? '#1c1c1e' : '#e5e5ea' }} className="w-full h-full rounded-full items-center justify-center">
              <Text style={{ color: textColor }} className="text-xl font-bold">{statusGroup.user.name?.charAt(0) || '?'}</Text>
            </View>
          )}
        </View>
        <Text style={{ color: textColor }} className="text-xs mt-1 font-medium" numberOfLines={1}>
          {isMine ? 'My Status' : (statusGroup.user.name?.split(' ')[0] || 'User')}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Background Glow Blobs */}
      <View style={{ position: 'absolute', top: -50, right: -50, width: 300, height: 300, backgroundColor: accentHex, borderRadius: 150, opacity: isDarkMode ? 0.2 : 0.15 }} />
      <View style={{ position: 'absolute', bottom: 100, left: -50, width: 250, height: 250, backgroundColor: accentHex, borderRadius: 125, opacity: isDarkMode ? 0.2 : 0.15 }} />
      <BlurView intensity={100} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      <View style={{ flex: 1, paddingTop: insets.top + 10, paddingBottom: 100 }} className="z-10">
        <View className="px-6 mb-6 flex-row justify-between items-center">
          <Text style={{ color: textColor }} className="text-3xl font-extrabold tracking-tight">Status</Text>
        </View>
        
        <View className="px-6 mb-6">
          <Text style={{ color: textMuted }} className="text-xs font-semibold mb-3 uppercase tracking-wider">Recent Updates</Text>
          <View className="flex-row items-center">
            {/* Add Status Button */}
            <TouchableOpacity className="items-center mr-4">
              <View className="w-16 h-16 rounded-full items-center justify-center border border-dashed border-gray-400">
                <Ionicons name="add" size={28} color={textMuted} />
              </View>
              <Text style={{ color: textColor }} className="text-xs mt-1 font-medium">Add</Text>
            </TouchableOpacity>
            
            {/* My Status */}
            {myStatus && renderStatusRing(myStatus)}
            
            {/* Friends Statuses */}
            <FlatList 
              data={otherStatuses}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={item => item?.user?._id || Math.random().toString()}
              renderItem={({ item }) => renderStatusRing(item)}
              contentContainerStyle={{ paddingRight: 20 }}
            />
          </View>
        </View>

        {/* Placeholder for Viewed/Muted Statuses */}
        <View className="px-6 flex-1">
          <BlurView 
            intensity={Platform.OS === 'ios' ? 70 : 100}
            tint={isDarkMode ? 'dark' : 'light'}
            style={{ 
              flex: 1,
              borderRadius: 24, 
              borderWidth: 1, 
              borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', 
              overflow: 'hidden', 
              backgroundColor: isDarkMode ? 'rgba(28,28,30,0.6)' : 'rgba(255,255,255,0.65)',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Ionicons name="camera-outline" size={48} color={textMuted} style={{ opacity: 0.5, mb: 2 }} />
            <Text style={{ color: textMuted }} className="text-sm font-medium mt-2">No older statuses to show</Text>
          </BlurView>
        </View>
      </View>
    </View>
  );
};

export default StatusScreen;
