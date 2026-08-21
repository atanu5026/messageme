import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import useChatStore from '../store/useChatStore';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ChatWindowScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { conversationId } = route.params;
  const insets = useSafeAreaInsets();
  
  const { 
    activeConversation, 
    messages, 
    sendMessage,
    setActiveConversation,
    conversations,
    typingUsers,
    replyingToMessage,
    setReplyingToMessage,
  } = useChatStore();
  const { user } = useAuthStore();
  const { isDarkMode, getAccentHex } = useThemeStore();
  const accentHex = getAccentHex();
  
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    // If not active, find and set it
    if (!activeConversation || activeConversation._id !== conversationId) {
      const conv = conversations.find(c => c._id === conversationId);
      if (conv) {
        setActiveConversation(conv);
      }
    }
  }, [conversationId]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendMessage(inputText, 'text');
    setInputText('');
  };

  const getOtherParticipant = () => {
    if (!activeConversation || activeConversation.isGroup) return null;
    return activeConversation.participants?.find(p => p._id !== user?._id);
  };

  const otherParticipant = getOtherParticipant();
  const title = activeConversation?.isGroup ? (activeConversation.groupName || activeConversation.name) : otherParticipant?.name || 'Chat';
  const isSomeoneTyping = typingUsers && activeConversation && typingUsers[activeConversation._id] && typingUsers[activeConversation._id].length > 0;

  const renderMessage = ({ item }) => {
    const isMine = (item.senderId?._id || item.senderId) === user?._id;
    let displayContent = item.content;
    if (typeof displayContent === 'string' && displayContent.startsWith('{"iv":')) {
      displayContent = '\ud83d\udd12 Encrypted message';
    }
    if (item.isDeleted) displayContent = '\uD83D\uDEAB This message was deleted';

    return (
      <View style={{ flexDirection: isMine ? 'row-reverse' : 'row', marginBottom: 12, paddingHorizontal: 16, maxWidth: '100%' }}>
        <View style={{ maxWidth: '80%' }}>
          {/* Message Bubble - matches web client style */}
          <View
            style={{
              paddingHorizontal: 14,
              paddingVertical: 10,
              borderRadius: 18,
              borderTopRightRadius: isMine ? 4 : 18,
              borderTopLeftRadius: isMine ? 18 : 4,
              backgroundColor: item.isDeleted
                ? (isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)')
                : isMine
                  ? accentHex
                  : (isDarkMode ? '#2c2c2e' : '#e9e9eb'),
              borderWidth: item.isDeleted ? 1 : 0,
              borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }}
          >
            <Text style={{
              fontSize: 14,
              lineHeight: 20,
              color: item.isDeleted ? '#8e8e93' : isMine ? '#ffffff' : (isDarkMode ? '#f5f5f7' : '#000000'),
              fontStyle: item.isDeleted ? 'italic' : 'normal',
            }}>
              {displayContent}
            </Text>
            {/* Timestamp + Read receipts */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: 4, gap: 4 }}>
              <Text style={{ fontSize: 10, color: isMine ? 'rgba(255,255,255,0.7)' : '#8e8e93', fontWeight: '500' }}>
                {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
              {isMine && (
                <Text style={{ fontSize: 10, fontWeight: '700', color: item.status === 'read' ? '#47c6ff' : 'rgba(255,255,255,0.6)' }}>
                  {item.status === 'sent' ? '\u2713' : '\u2713\u2713'}
                </Text>
              )}
            </View>
          </View>
        </View>
      </View>
    );
  };

  const bgColor = isDarkMode ? '#000000' : '#f2f2f7';
  const textColor = isDarkMode ? '#f5f5f7' : '#1c1c1e';
  const glassTint = isDarkMode ? 'dark' : 'light';

  return (
    <View style={{ flex: 1, backgroundColor: bgColor }}>
      {/* Atmospheric Background */}
      <View style={{ position: 'absolute', top: '20%', left: '-10%', width: 250, height: 250, backgroundColor: accentHex, borderRadius: 125, opacity: isDarkMode ? 0.12 : 0.08 }} />
      <View style={{ position: 'absolute', bottom: '10%', right: '-20%', width: 300, height: 300, backgroundColor: accentHex, borderRadius: 150, opacity: isDarkMode ? 0.12 : 0.08 }} />
      <BlurView intensity={isDarkMode ? 90 : 80} tint={glassTint} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />

      {/* Header - matches web ChatWindow header */}
      <BlurView
        intensity={isDarkMode ? 60 : 85}
        tint={glassTint}
        style={{
          paddingTop: insets.top,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }}
      >
        {/* Left: Back + Avatar + Name */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0 }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 6, marginRight: 4 }}>
            <Ionicons name="chevron-back" size={26} color={accentHex} />
          </TouchableOpacity>

          {/* Avatar - clickable, matches web profile toggle */}
          <View style={{ position: 'relative', marginRight: 10 }}>
            <View style={{ width: 38, height: 38, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: `${accentHex}20`, borderWidth: 1, borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}>
              {activeConversation?.isGroup ? (
                <Text style={{ color: accentHex, fontWeight: '700', fontSize: 16 }}>{title.charAt(0).toUpperCase()}</Text>
              ) : otherParticipant?.profilePicture ? (
                <Image source={{ uri: otherParticipant.profilePicture }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <Text style={{ color: accentHex, fontWeight: '700', fontSize: 16 }}>{title.charAt(0).toUpperCase()}</Text>
              )}
            </View>
            {!activeConversation?.isGroup && otherParticipant?.isOnline && (
              <View style={{ position: 'absolute', bottom: -1, right: -1, width: 12, height: 12, backgroundColor: '#34c759', borderRadius: 6, borderWidth: 2, borderColor: isDarkMode ? '#000' : '#f2f2f7' }} />
            )}
          </View>

          {/* Name + Status */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ color: textColor, fontWeight: '700', fontSize: 15 }} numberOfLines={1}>
              {title}
            </Text>
            {isSomeoneTyping ? (
              <Text style={{ color: accentHex, fontSize: 11, fontWeight: '600', fontStyle: 'italic' }}>typing...</Text>
            ) : !activeConversation?.isGroup && (
              <Text style={{ fontSize: 11, color: otherParticipant?.isOnline ? '#34c759' : '#8e8e93', fontWeight: otherParticipant?.isOnline ? '600' : '400' }}>
                {otherParticipant?.isOnline ? 'Online' : 'Offline'}
              </Text>
            )}
          </View>
        </View>

        {/* Right: Action Buttons */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.65)', borderWidth: 1, borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}>
            <Ionicons name="search-outline" size={17} color="#8e8e93" />
          </TouchableOpacity>
          {!activeConversation?.isGroup && (
            <TouchableOpacity style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.65)', borderWidth: 1, borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }}>
              <Ionicons name="videocam" size={17} color={accentHex} />
            </TouchableOpacity>
          )}
        </View>
      </BlurView>

      {/* Messages */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={[...messages].reverse()}
          keyExtractor={(item) => item._id || String(Math.random())}
          renderItem={renderMessage}
          inverted
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Floating Glass Input Dock - matches web client */}
        <BlurView
          intensity={isDarkMode ? 60 : 85}
          tint={glassTint}
          style={{
            borderTopWidth: 1,
            borderTopColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            paddingHorizontal: 12,
            paddingVertical: 10,
            paddingBottom: insets.bottom + 10,
          }}
        >
          {/* Glass dock inner */}
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: isDarkMode ? 'rgba(28,28,30,0.7)' : 'rgba(255,255,255,0.8)',
            borderRadius: 24,
            paddingHorizontal: 8,
            paddingVertical: 6,
            borderWidth: 1,
            borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
          }}>
            {/* Attach / Doc button */}
            <TouchableOpacity style={{ padding: 8 }}>
              <Ionicons name="attach" size={22} color="#8e8e93" />
            </TouchableOpacity>
            {/* Photo button */}
            <TouchableOpacity style={{ padding: 8 }}>
              <Ionicons name="image-outline" size={22} color="#8e8e93" />
            </TouchableOpacity>

            {/* Text Input */}
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="MessageMe..."
              placeholderTextColor="#8e8e93"
              style={{ flex: 1, color: textColor, fontSize: 14, paddingHorizontal: 8, paddingVertical: 4, maxHeight: 100 }}
              multiline
            />

            {/* Send or Mic */}
            {inputText.trim() ? (
              <TouchableOpacity
                onPress={handleSend}
                style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: accentHex, alignItems: 'center', justifyContent: 'center', marginLeft: 4 }}
              >
                <Ionicons name="arrow-up" size={18} color="white" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={{ padding: 8 }}>
                <Ionicons name="mic-outline" size={22} color="#8e8e93" />
              </TouchableOpacity>
            )}
          </View>
        </BlurView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default ChatWindowScreen;
