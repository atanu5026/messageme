import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Image, ActivityIndicator, TextInput, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import useChatStore from '../store/useChatStore';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import api from '../services/api';

const ChatsListScreen = () => {
  const navigation = useNavigation();
  const { conversations, isConversationsLoading, fetchConversations, setActiveConversation, pinnedConversationIds, typingUsers, unreadCounts, startConversation } = useChatStore();
  const { user } = useAuthStore();
  const { isDarkMode, getAccentHex } = useThemeStore();
  const accentHex = getAccentHex();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    const handleSearch = async () => {
      if (!searchQuery.trim()) { setSearchResults([]); return; }
      setIsSearching(true);
      try {
        const res = await api.get(`/chat/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.data.success) setSearchResults(res.data.data);
        else setSearchResults([]);
      } catch (err) { console.error('Search error:', err); setSearchResults([]); }
      finally { setIsSearching(false); }
    };
    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStartChat = async (userId) => {
    const conv = await startConversation(userId);
    if (conv) {
      setSearchQuery('');
      setActiveConversation(conv);
      navigation.navigate('ChatWindow', { conversationId: conv._id });
    }
  };

  const getOtherParticipant = (conversation) => {
    if (!conversation || !conversation.participants || conversation.isGroup) return null;
    return conversation.participants.find(p => p._id !== user?._id);
  };

  const sortedConversations = [...conversations].sort((a, b) => {
    const aPinned = (pinnedConversationIds || []).includes(a._id);
    const bPinned = (pinnedConversationIds || []).includes(b._id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });

  const renderConversation = ({ item }) => {
    const isGroup = item.isGroup;
    const otherParticipant = getOtherParticipant(item);
    const isPinned = (pinnedConversationIds || []).includes(item._id);
    const unreadCount = (unreadCounts || {})[item._id] || 0;
    const isTyping = typingUsers && typingUsers[item._id] && typingUsers[item._id].length > 0;

    let title = isGroup ? (item.groupName || item.name) : otherParticipant?.name || 'Unknown User';
    if (!title) title = 'Unknown';

    let lastMsg = item.lastMessage?.content || 'Start a conversation';
    if (typeof lastMsg === 'string' && lastMsg.startsWith('{"iv":')) lastMsg = '🔒 Encrypted message';
    if (item.lastMessage?.type === 'image') lastMsg = '📷 Photo';
    if (item.lastMessage?.type === 'audio') lastMsg = '🎙️ Voice note';
    if (item.lastMessage?.type === 'document') lastMsg = '📄 Document';

    const isFromMe = item.lastMessage?.senderId === user?._id || item.lastMessage?.senderId?._id === user?._id;

    return (
      <View key={item._id}>
        <TouchableOpacity
          onPress={() => { setActiveConversation(item); navigation.navigate('ChatWindow', { conversationId: item._id }); }}
          className="mx-2 my-0.5 px-3.5 py-3 rounded-2xl flex-row items-center"
          style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)' }}
        >
          {/* Avatar */}
          <View style={{ position: 'relative' }} className="shrink-0">
            <View className="w-12 h-12 rounded-2xl items-center justify-center overflow-hidden shadow-sm"
              style={{ backgroundColor: `${accentHex}20`, borderWidth: 1, borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
              {otherParticipant?.profilePicture && !isGroup ? (
                <Image source={{ uri: otherParticipant.profilePicture }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={{ color: accentHex }} className="text-lg font-bold">{title.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            {!isGroup && otherParticipant?.isOnline && (
              <View style={{ position: 'absolute', bottom: -1, right: -1, width: 14, height: 14, backgroundColor: '#34c759', borderRadius: 7, borderWidth: 2, borderColor: isDarkMode ? '#000' : '#f2f2f7' }} />
            )}
          </View>

          {/* Content */}
          <View className="flex-1 ml-3.5 min-w-0">
            <View className="flex-row justify-between items-baseline mb-0.5">
              <View className="flex-row items-center flex-1 pr-2 min-w-0">
                <Text className="text-sm font-semibold" style={{ color: isDarkMode ? '#f5f5f7' : '#1c1c1e' }} numberOfLines={1}>
                  {title}
                </Text>
                {isPinned && <Text className="ml-1 text-[10px]">📌</Text>}
              </View>
              {item.lastMessage?.createdAt && (
                <Text className="text-[11px] font-medium shrink-0" style={{ color: unreadCount > 0 ? accentHex : '#8e8e93' }}>
                  {new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              )}
            </View>
            <View className="flex-row items-center justify-between">
              {isTyping ? (
                <Text className="text-xs font-semibold italic" style={{ color: accentHex }}>typing...</Text>
              ) : (
                <Text className="text-xs flex-1" style={{ color: isDarkMode ? '#aeaeb2' : '#3a3a3c', fontWeight: unreadCount > 0 ? '700' : '400' }} numberOfLines={1}>
                  {isFromMe ? 'You: ' : ''}{lastMsg}
                </Text>
              )}
              {unreadCount > 0 && (
                <View className="ml-2 px-2 py-0.5 rounded-full" style={{ backgroundColor: accentHex }}>
                  <Text className="text-white text-[11px] font-bold">{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
        <View className="mx-6 h-[0.5px]" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }} />
      </View>
    );
  };

  const bgColor = isDarkMode ? '#000000' : '#f2f2f7';
  const textColor = isDarkMode ? '#f5f5f7' : '#1c1c1e';
  const glassTint = isDarkMode ? 'dark' : 'light';

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Atmospheric Background */}
      <View style={{ position: 'absolute', top: -60, left: -60, width: 320, height: 320, backgroundColor: accentHex, borderRadius: 160, opacity: isDarkMode ? 0.18 : 0.12 }} />
      <View style={{ position: 'absolute', bottom: 80, right: -60, width: 260, height: 260, backgroundColor: accentHex, borderRadius: 130, opacity: isDarkMode ? 0.15 : 0.1 }} />
      <BlurView intensity={isDarkMode ? 90 : 80} tint={glassTint} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      <View style={{ flex: 1, paddingTop: insets.top, paddingBottom: 100 }}>
        {/* Header - matches web Sidebar header */}
        <View className="px-5 py-3.5 flex-row justify-between items-center border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
          <Text className="text-xl font-bold tracking-tight" style={{ color: textColor }}>Messages</Text>
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Profile')}
              className="p-2 rounded-full border shadow-sm"
              style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
            >
              <Ionicons name="people-outline" size={17} color={accentHex} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              className="p-2 rounded-full border shadow-sm"
              style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.7)', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}
            >
              <Ionicons name="add-outline" size={17} color={accentHex} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Input - matches web client search */}
        <View className="p-3 border-b" style={{ borderColor: isDarkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }}>
          <View className="flex-row items-center px-3 py-2 rounded-xl border" style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}>
            <Ionicons name="search" size={16} color="#8e8e93" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search messages, phone or code..."
              placeholderTextColor="#8e8e93"
              style={{ color: textColor, flex: 1, marginLeft: 8, fontSize: 14 }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={16} color="#8e8e93" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        {searchQuery ? (
          <ScrollView style={{ flex: 1 }}>
            <Text className="px-5 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: '#8e8e93' }}>Search Results</Text>
            {isSearching ? (
              <ActivityIndicator size="small" color={accentHex} style={{ marginTop: 16 }} />
            ) : searchResults.length > 0 ? (
              searchResults.map(u => (
                <TouchableOpacity
                  key={u._id}
                  onPress={() => handleStartChat(u._id)}
                  className="mx-2 my-0.5 px-3.5 py-3 rounded-2xl flex-row items-center"
                  style={{ backgroundColor: isDarkMode ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.5)' }}
                >
                  <View className="w-11 h-11 rounded-2xl items-center justify-center overflow-hidden" style={{ backgroundColor: `${accentHex}20`, borderWidth: 1, borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }}>
                    {u.profilePicture ? (
                      <Image source={{ uri: u.profilePicture }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Text style={{ color: accentHex }} className="font-bold text-sm">{u.name?.charAt(0)?.toUpperCase()}</Text>
                    )}
                  </View>
                  <View className="flex-1 ml-3.5 min-w-0">
                    <Text className="text-sm font-semibold" style={{ color: textColor }}>{u.name}</Text>
                    <Text className="text-xs" style={{ color: '#8e8e93' }}>{u.email || u.phoneNumber || `Code: ${u.connectCode}`}</Text>
                  </View>
                  <Ionicons name="chatbubble-outline" size={16} color={accentHex} />
                </TouchableOpacity>
              ))
            ) : (
              <Text className="text-center text-xs mt-6" style={{ color: '#8e8e93' }}>No users found matching "{searchQuery}"</Text>
            )}
          </ScrollView>
        ) : (
          isConversationsLoading ? (
            <ActivityIndicator size="large" color={accentHex} style={{ marginTop: 40 }} />
          ) : (
            <FlatList
              data={sortedConversations}
              keyExtractor={(item) => item._id}
              renderItem={renderConversation}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingVertical: 4 }}
              ListEmptyComponent={
                <View style={{ padding: 32, alignItems: 'center' }}>
                  <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: `${accentHex}20`, borderWidth: 1, borderColor: `${accentHex}40`, alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 24 }}>💬</Text>
                  </View>
                  <Text style={{ color: textColor, fontWeight: '700', fontSize: 14, marginBottom: 6 }}>No Conversations Yet</Text>
                  <Text style={{ color: '#8e8e93', fontSize: 12, textAlign: 'center', lineHeight: 18 }}>Search by phone number or 4-digit connect code to start chatting with end-to-end encryption.</Text>
                </View>
              }
            />
          )
        )}
      </View>
    </View>
  );
};

export default ChatsListScreen;
