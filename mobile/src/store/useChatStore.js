import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import api from '../services/api';
import useAuthStore from './useAuthStore';
import useStatusStore from './useStatusStore';
import { Alert } from 'react-native';
import { importPrivateKey, importPublicKey, deriveSharedKey, encryptPayload, decryptPayload } from '../utils/crypto';

// Helper to decrypt a direct 1-on-1 message
const decryptDirectMessage = async (content, otherPublicKey, privateKeyString) => {
  if (!content || typeof content !== 'string' || !content.trim().startsWith('{')) return content;
  if (!otherPublicKey || !privateKeyString) return content;
  try {
    const privateKey = await importPrivateKey(privateKeyString);
    const publicKey = await importPublicKey(otherPublicKey);
    if (!privateKey || !publicKey) return content;
    const sharedKey = await deriveSharedKey(privateKey, publicKey);
    if (!sharedKey) return content;
    return await decryptPayload(sharedKey, content);
  } catch (err) {
    console.error('Failed to decrypt direct message:', err);
    return content;
  }
};

const useChatStore = create(
  persist(
    (set, get) => ({
      socket: null,
      conversations: [],
      activeConversation: null,
      messages: [],
      isConversationsLoading: false,
      isMessagesLoading: false,
      isImageUploading: false,
      isAudioUploading: false,
      error: null,
      typingUsers: {}, 
      unreadCounts: {},
      replyingToMessage: null,
      editingMessage: null,
      pinnedConversationIds: [],

      setReplyingToMessage: (message) => set({ replyingToMessage: message }),
      setEditingMessage: (message) => set({ editingMessage: message }),

      togglePinConversation: (conversationId) => {
        set((state) => {
          const pinned = state.pinnedConversationIds || [];
          const isPinned = pinned.includes(conversationId);
          return { pinnedConversationIds: isPinned ? pinned.filter(id => id !== conversationId) : [...pinned, conversationId] };
        });
      },

      startConversation: async (userId) => {
        try {
          const res = await api.post('/chat/conversations', { participantId: userId });
          if (res.data.success) {
            const conv = res.data.data;
            // Add to conversations list if not already there
            set((state) => ({
              conversations: state.conversations.some(c => c._id === conv._id)
                ? state.conversations
                : [conv, ...state.conversations],
            }));
            return conv;
          }
        } catch (error) {
          console.error('Start conversation error:', error);
          Alert.alert('Error', 'Could not start conversation');
        }
        return null;
      },

      initializeSocket: (token) => {
        if (get().socket) return; 

        // Use local IP for Expo Go development
        const socketUrl = 'http://192.168.0.216:3000'; 

        const socket = io(socketUrl, {
          auth: { token },
          extraHeaders: {
            'Bypass-Tunnel-Reminder': 'true'
          }
        });

        socket.on('connect', () => {
          console.log('Socket connected:', socket.id);
        });

        socket.on('receive_message', async (message) => {
          const { activeConversation, unreadCounts } = get();
          const currentUserId = useAuthStore.getState().user?._id;

          let decryptedMessage = { ...message };
          if (!message.isGroup && (message.type === 'text' || message.type === 'document')) {
            const privateKeyString = await AsyncStorage.getItem('e2ee_private_key');
            const conv = (activeConversation && activeConversation._id === message.conversationId)
              ? activeConversation
              : get().conversations.find(c => c._id === message.conversationId);
            
            let otherPublicKey = null;
            if (conv && !conv.isGroup && conv.participants) {
              const other = conv.participants.find(p => (p._id || p)?.toString() !== currentUserId?.toString());
              otherPublicKey = other?.publicKey;
            }

            const senderIdStr = (message.senderId?._id || message.senderId)?.toString();
            if (!otherPublicKey && senderIdStr && senderIdStr !== currentUserId?.toString() && message.senderId?.publicKey) {
              otherPublicKey = message.senderId.publicKey;
            }

            if (otherPublicKey && privateKeyString) {
              decryptedMessage.content = await decryptDirectMessage(message.content, otherPublicKey, privateKeyString);
            }
          }

          const existsInList = get().conversations.some(c => c._id === message.conversationId);
          if (!existsInList) {
            get().fetchConversations();
          }

          if (activeConversation && activeConversation._id === decryptedMessage.conversationId) {
            set((state) => {
              if (state.messages.some(m => m._id === decryptedMessage._id)) return state;
              return { messages: [...state.messages, decryptedMessage] };
            });
            
            const senderIdStr = (decryptedMessage.senderId?._id || decryptedMessage.senderId)?.toString();
            if (senderIdStr !== currentUserId?.toString()) {
              socket.emit('mark_messages_read', { conversationId: message.conversationId, senderId: senderIdStr });
            }
          } else {
            const senderIdStr = (decryptedMessage.senderId?._id || decryptedMessage.senderId)?.toString();
            if (senderIdStr !== currentUserId?.toString()) {
              set({
                unreadCounts: {
                  ...unreadCounts,
                  [message.conversationId]: (unreadCounts[message.conversationId] || 0) + 1
                }
              });
            }
          }

          set((state) => ({
            conversations: state.conversations.map((conv) => {
              if (conv._id === decryptedMessage.conversationId) {
                return { ...conv, lastMessage: decryptedMessage, updatedAt: decryptedMessage.createdAt };
              }
              return conv;
            }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
          }));
        });

        socket.on('messages_read', ({ conversationId }) => {
          set((state) => ({
            messages: state.messages.map(m => 
              m.conversationId === conversationId && m.status !== 'read' ? { ...m, status: 'read' } : m
            ),
          }));
        });

        socket.on('typing_start', ({ conversationId, senderId }) => {
          set((state) => ({
            typingUsers: {
              ...state.typingUsers,
              [conversationId]: [...(state.typingUsers[conversationId] || []).filter(id => id !== senderId), senderId]
            }
          }));
        });

        socket.on('typing_stop', ({ conversationId, senderId }) => {
          set((state) => ({
            typingUsers: {
              ...state.typingUsers,
              [conversationId]: (state.typingUsers[conversationId] || []).filter(id => id !== senderId)
            }
          }));
        });

        socket.on('status_updated', () => {
          useStatusStore.getState().fetchStatuses();
        });

        set({ socket });
      },

      disconnectSocket: () => {
        const { socket } = get();
        if (socket) {
          socket.disconnect();
          set({ socket: null });
        }
      },

      fetchConversations: async () => {
        set({ isConversationsLoading: true, error: null });
        try {
          const res = await api.get('/chat/conversations');
          if (res.data.success) {
            let fetchedConversations = res.data.data;
            const privateKeyString = await AsyncStorage.getItem('e2ee_private_key');
            const currentUserId = useAuthStore.getState().user?._id;
            
            if (privateKeyString) {
              fetchedConversations = await Promise.all(fetchedConversations.map(async (conv) => {
                if (!conv.isGroup && conv.participants) {
                  const other = conv.participants.find(p => (p._id || p)?.toString() !== currentUserId?.toString());
                  if (other?.publicKey) {
                    let decryptedLastMsg = conv.lastMessage;
                    if (conv.lastMessage && conv.lastMessage.type === 'text') {
                      const decrypted = await decryptDirectMessage(conv.lastMessage.content, other.publicKey, privateKeyString);
                      decryptedLastMsg = { ...conv.lastMessage, content: decrypted };
                    }
                    return { ...conv, lastMessage: decryptedLastMsg };
                  }
                }
                return conv;
              }));
            }
            set({ conversations: fetchedConversations, isConversationsLoading: false });
          }
        } catch (error) {
          set({ error: error.message, isConversationsLoading: false });
        }
      },

      setActiveConversation: (conversation) => {
        set((state) => {
          const newUnreadCounts = { ...state.unreadCounts };
          if (conversation?._id) delete newUnreadCounts[conversation._id];
          return { activeConversation: conversation, unreadCounts: newUnreadCounts, replyingToMessage: null, editingMessage: null };
        });
        const { socket } = get();
        if (socket && conversation?._id) {
          socket.emit('join_conversation', conversation._id);
          get().fetchMessages(conversation._id);
        }
      },

      fetchMessages: async (conversationId) => {
        set({ isMessagesLoading: true, error: null });
        try {
          const res = await api.get(`/chat/messages/${conversationId}`);
          if (res.data.success) {
            const conversation = get().conversations.find(c => c._id === conversationId) || get().activeConversation;
            let fetchedMessages = res.data.data;
            const currentUserId = useAuthStore.getState().user?._id;
            
            if (conversation && !conversation.isGroup && conversation.participants) {
              const privateKeyString = await AsyncStorage.getItem('e2ee_private_key');
              const other = conversation.participants.find(p => (p._id || p)?.toString() !== currentUserId?.toString());
              const otherPublicKey = other?.publicKey;

              if (privateKeyString && otherPublicKey) {
                fetchedMessages = await Promise.all(fetchedMessages.map(async (msg) => {
                  let decryptedContent = msg.content;
                  if (msg.type === 'text' || msg.type === 'document') {
                    decryptedContent = await decryptDirectMessage(msg.content, otherPublicKey, privateKeyString);
                  }
                  return { ...msg, content: decryptedContent };
                }));
              }
            }
            
            set({ messages: fetchedMessages, isMessagesLoading: false });
          }
        } catch (error) {
          set({ error: error.message, isMessagesLoading: false });
        }
      },

      sendMessage: async (content, type = 'text') => {
        const { socket, activeConversation, replyingToMessage } = get();
        if (!socket || !activeConversation || !content.trim()) return;

        const currentUserId = useAuthStore.getState().user?._id;
        const otherParticipant = activeConversation.participants.find(p => p._id !== currentUserId);
        const receiverIds = activeConversation.isGroup
          ? activeConversation.participants.filter(p => p._id !== currentUserId).map(p => p._id)
          : (otherParticipant ? [otherParticipant._id] : []);

        let finalContent = content;
        if (!activeConversation.isGroup && type === 'text') {
          const privateKeyString = await AsyncStorage.getItem('e2ee_private_key');
          const recipientPublicKeyStr = otherParticipant?.publicKey;
          
          if (privateKeyString && recipientPublicKeyStr) {
            try {
              const privateKey = await importPrivateKey(privateKeyString);
              const publicKey = await importPublicKey(recipientPublicKeyStr);
              if (privateKey && publicKey) {
                const sharedKey = await deriveSharedKey(privateKey, publicKey);
                if (sharedKey) {
                  finalContent = await encryptPayload(sharedKey, content);
                }
              }
            } catch (err) {
              console.error("Failed to encrypt message:", err);
            }
          }
        }

        socket.emit('send_message', {
          conversationId: activeConversation._id,
          receiverIds,
          content: finalContent,
          type,
          metadata: {},
          replyTo: replyingToMessage?._id || null,
        });

        set({ replyingToMessage: null });
      },
    }),
    {
      name: 'chat-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ 
        pinnedConversationIds: state.pinnedConversationIds,
      }), // Only persist specific fields
    }
  )
);

export default useChatStore;
