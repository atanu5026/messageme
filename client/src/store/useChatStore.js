import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';
import api from '../services/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import useAuthStore from './useAuthStore';
import useStatusStore from './useStatusStore';
import { importPrivateKey, importPublicKey, deriveSharedKey, encryptPayload, decryptPayload } from '../utils/crypto';

// Helper to decrypt a direct 1-on-1 message
const decryptDirectMessage = async (content, otherPublicKey, privateKeyString) => {
  if (!content || typeof content !== 'string' || !content.trim().startsWith('{')) return content;
  
  const isEncryptedFormat = (str) => {
    try { const parsed = JSON.parse(str); return !!(parsed.iv && parsed.data); } catch { return false; }
  };
  
  if (!isEncryptedFormat(content)) return content;
  
  const fallback = '🔒 [Message could not be decrypted]';
  if (!otherPublicKey || !privateKeyString) return fallback;

  try {
    const privateKey = await importPrivateKey(privateKeyString);
    const publicKey = await importPublicKey(otherPublicKey);
    if (!privateKey || !publicKey) return fallback;
    const sharedKey = await deriveSharedKey(privateKey, publicKey);
    if (!sharedKey) return fallback;
    const decrypted = await decryptPayload(sharedKey, content);
    if (decrypted === content) return fallback;
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt direct message:', err);
    return fallback;
  }
};

const idbStorage = {
  getItem: async (name) => {
    return (await idbGet(name)) || null;
  },
  setItem: async (name, value) => {
    await idbSet(name, value);
  },
  removeItem: async (name) => {
    await idbDel(name);
  },
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
  pinnedConversationIds: JSON.parse(localStorage.getItem('pinned_convos') || '[]'),
  offlineQueue: [],

  setReplyingToMessage: (message) => set({ replyingToMessage: message }),
  setEditingMessage: (message) => set({ editingMessage: message }),

  initializeSocket: (token) => {
    if (get().socket) return; 

    const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000', {
      auth: {
        token,
      },
    });

    socket.on('connect', () => {
      console.log('Socket connected:', socket.id);
      get().syncOfflineMessages();
    });

    // Real-time events
    socket.on('receive_message', async (message) => {
      const { activeConversation, unreadCounts } = get();
      const currentUserId = useAuthStore.getState().user?._id;

      // Decrypt message if needed
      let decryptedMessage = { ...message };
      const conv = (activeConversation && activeConversation._id === message.conversationId)
        ? activeConversation
        : get().conversations.find(c => c._id === message.conversationId);

      if ((!conv || !conv.isGroup) && (message.type === 'text' || message.type === 'document')) {
        const privateKeyString = localStorage.getItem('e2ee_private_key');
        
        let otherPublicKey = null;
        if (conv && conv.participants) {
          const other = conv.participants.find(p => (p._id || p)?.toString() !== currentUserId?.toString());
          otherPublicKey = other?.publicKey;
        }

        const senderIdStr = (message.senderId?._id || message.senderId)?.toString();
        if (!otherPublicKey && senderIdStr && senderIdStr !== currentUserId?.toString() && message.senderId?.publicKey) {
          otherPublicKey = message.senderId.publicKey;
        }

        if (otherPublicKey && privateKeyString) {
          decryptedMessage.content = await decryptDirectMessage(message.content, otherPublicKey, privateKeyString);
          
          if (message.replyTo && (message.replyTo.type === 'text' || message.replyTo.type === 'document')) {
            decryptedMessage.replyTo = {
              ...message.replyTo,
              content: await decryptDirectMessage(message.replyTo.content, otherPublicKey, privateKeyString)
            };
          }
        }
      }

      const existsInList = get().conversations.some(c => c._id === message.conversationId);
      if (!existsInList) {
        get().fetchConversations();
      }

      if (activeConversation && activeConversation._id === decryptedMessage.conversationId) {
        set((state) => {
          if (state.messages.some(m => m._id === decryptedMessage._id)) {
            return state;
          }
          return {
            messages: [...state.messages, decryptedMessage],
            conversations: state.conversations.map(c => 
              c._id === decryptedMessage.conversationId 
                ? { ...c, lastMessage: decryptedMessage } 
                : c
            )
          };
        });
        
        const senderIdStr = (decryptedMessage.senderId?._id || decryptedMessage.senderId)?.toString();
        if (document.visibilityState === 'visible' && senderIdStr !== currentUserId?.toString()) {
          socket.emit('mark_messages_read', { conversationId: message.conversationId, senderId: senderIdStr });
        }
      } else {
        const senderIdStr = (decryptedMessage.senderId?._id || decryptedMessage.senderId)?.toString();
        if (senderIdStr !== currentUserId?.toString()) {
          set((state) => ({
            unreadCounts: {
              ...state.unreadCounts,
              [message.conversationId]: (state.unreadCounts[message.conversationId] || 0) + 1
            },
            conversations: state.conversations.map(c => 
              c._id === decryptedMessage.conversationId 
                ? { ...c, lastMessage: decryptedMessage } 
                : c
            )
          }));
        }
      }

      // Handle Notifications
      const isWindowFocused = document.hasFocus() && document.visibilityState === 'visible';
      const isCurrentActiveChat = activeConversation && activeConversation._id === decryptedMessage.conversationId;
      const senderIdStr = (decryptedMessage.senderId?._id || decryptedMessage.senderId)?.toString();
      const isFromOther = senderIdStr && senderIdStr !== currentUserId?.toString();
      const senderName = decryptedMessage.senderId?.name?.split(' ')[0] || 'Someone';
      let notificationText = decryptedMessage.type === 'image' ? '📸 Sent an image' : decryptedMessage.type === 'audio' ? '🎙️ Voice note' : decryptedMessage.content;
      if (typeof notificationText === 'string' && notificationText.startsWith('{"iv"')) {
        notificationText = '🔒 Encrypted message';
      }

      if (isFromOther) {
        if (!isWindowFocused || !isCurrentActiveChat) {
          if ('Notification' in window && Notification.permission === 'granted') {
            try {
              const notif = new Notification(`New message from ${senderName}`, {
                body: notificationText,
                icon: '/vite.svg',
                tag: message.conversationId,
                renotify: true,
              });
              notif.onclick = () => {
                window.focus();
                const conv = get().conversations.find(c => c._id === message.conversationId) || get().activeConversation;
                if (conv) get().setActiveConversation(conv);
                notif.close();
              };
            } catch (err) {
              console.error('Failed to show system notification:', err);
            }
          }
        }

        if (!isCurrentActiveChat) {
          toast.success(`${senderName}: ${notificationText}`, {
            icon: '💬',
            style: {
              borderRadius: '10px',
              background: '#333',
              color: '#fff',
            },
          });
        }
      }

      // Update conversations list
      set((state) => ({
        conversations: state.conversations.map((conv) => {
          if (conv._id === decryptedMessage.conversationId) {
            return { ...conv, lastMessage: decryptedMessage, updatedAt: decryptedMessage.createdAt };
          }
          return conv;
        }).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
      }));
    });

    // Real-time Edited Message Listener
    socket.on('message_edited', async (updatedMessage) => {
      let decryptedMsg = { ...updatedMessage };
      const currentUserId = useAuthStore.getState().user?._id;
      const conv = get().conversations.find(c => c._id === updatedMessage.conversationId) || get().activeConversation;

      if ((!conv || !conv.isGroup) && updatedMessage.type === 'text') {
        const privateKeyString = localStorage.getItem('e2ee_private_key');
        let otherPublicKey = null;
        if (conv && conv.participants) {
          const other = conv.participants.find(p => (p._id || p)?.toString() !== currentUserId?.toString());
          otherPublicKey = other?.publicKey;
        }
        const senderIdStr = (updatedMessage.senderId?._id || updatedMessage.senderId)?.toString();
        if (!otherPublicKey && senderIdStr && senderIdStr !== currentUserId?.toString() && updatedMessage.senderId?.publicKey) {
          otherPublicKey = updatedMessage.senderId.publicKey;
        }
        if (otherPublicKey && privateKeyString) {
          decryptedMsg.content = await decryptDirectMessage(updatedMessage.content, otherPublicKey, privateKeyString);
        }
      }

      set((state) => ({
        messages: state.messages.map(m => m._id === decryptedMsg._id ? decryptedMsg : m),
        conversations: state.conversations.map(c => 
          c.lastMessage?._id === decryptedMsg._id ? { ...c, lastMessage: decryptedMsg } : c
        )
      }));
    });

    // Real-time Deleted Message Listener
    socket.on('message_deleted', (deletedMessage) => {
      set((state) => ({
        messages: state.messages.map(m => m._id === deletedMessage._id ? deletedMessage : m),
        conversations: state.conversations.map(c => 
          c.lastMessage?._id === deletedMessage._id ? { ...c, lastMessage: deletedMessage } : c
        )
      }));
    });

    // Real-time Pin Message Listener
    socket.on('message_pinned', async ({ conversationId, pinnedMessage }) => {
      let decryptedPinned = pinnedMessage ? { ...pinnedMessage } : null;
      const currentUserId = useAuthStore.getState().user?._id;
      const conv = get().conversations.find(c => c._id === conversationId) || get().activeConversation;
      
      if (decryptedPinned && decryptedPinned.type === 'text' && (!conv || !conv.isGroup)) {
        const privateKeyString = localStorage.getItem('e2ee_private_key');
        let otherPublicKey = null;
        if (conv && conv.participants) {
          const other = conv.participants.find(p => (p._id || p)?.toString() !== currentUserId?.toString());
          otherPublicKey = other?.publicKey;
        }
        const senderIdStr = (decryptedPinned.senderId?._id || decryptedPinned.senderId)?.toString();
        if (!otherPublicKey && senderIdStr && senderIdStr !== currentUserId?.toString() && decryptedPinned.senderId?.publicKey) {
          otherPublicKey = decryptedPinned.senderId.publicKey;
        }

        if (otherPublicKey && privateKeyString) {
          decryptedPinned.content = await decryptDirectMessage(decryptedPinned.content, otherPublicKey, privateKeyString);
        }
      }

      set((state) => ({
        activeConversation: state.activeConversation?._id === conversationId 
          ? { ...state.activeConversation, pinnedMessage: decryptedPinned }
          : state.activeConversation,
        conversations: state.conversations.map(c => 
          c._id === conversationId ? { ...c, pinnedMessage: decryptedPinned } : c
        )
      }));
    });

    socket.on('messages_read', ({ conversationId }) => {
      set((state) => ({
        messages: state.messages.map(m => 
          m.conversationId === conversationId && m.status !== 'read' ? { ...m, status: 'read' } : m
        ),
        conversations: state.conversations.map(c => 
          (c._id === conversationId && c.lastMessage && c.lastMessage.status !== 'read' && 
          (c.lastMessage.senderId?._id || c.lastMessage.senderId)?.toString() === useAuthStore.getState().user?._id?.toString()) 
            ? { ...c, lastMessage: { ...c.lastMessage, status: 'read' } } 
            : c
        )
      }));
    });

    socket.on('connection_request_received', (conversation) => {
      set((state) => {
        if (!state.conversations.some(c => c._id === conversation._id)) {
          return { conversations: [conversation, ...state.conversations] };
        }
        return state;
      });
      toast.info(`New connection request received!`);
    });

    socket.on('connection_request_approved', (conversation) => {
      set((state) => ({
        conversations: state.conversations.map(c => c._id === conversation._id ? conversation : c),
        activeConversation: state.activeConversation?._id === conversation._id ? conversation : state.activeConversation
      }));
      toast.success('Your connection request was approved!');
    });

    socket.on('connection_request_rejected', (conversationId) => {
      set((state) => ({
        conversations: state.conversations.filter(c => c._id !== conversationId),
        activeConversation: state.activeConversation?._id === conversationId ? null : state.activeConversation
      }));
      toast.info('A connection request was rejected.');
    });

    socket.on('conversation_deleted', (conversationId) => {
      set((state) => ({
        conversations: state.conversations.filter(c => c._id !== conversationId),
        activeConversation: state.activeConversation?._id === conversationId ? null : state.activeConversation
      }));
    });

    socket.on('conversation_favorited', (conversationId, isFavorited) => {
      const currentUserId = useAuthStore.getState().user?._id;
      set((state) => ({
        conversations: state.conversations.map(c => {
          if (c._id === conversationId) {
            let newFavoritedBy = c.favoritedBy || [];
            if (isFavorited) {
              if (!newFavoritedBy.includes(currentUserId)) {
                newFavoritedBy = [...newFavoritedBy, currentUserId];
              }
            } else {
              newFavoritedBy = newFavoritedBy.filter(id => id.toString() !== currentUserId?.toString());
            }
            return { ...c, favoritedBy: newFavoritedBy };
          }
          return c;
        }),
        activeConversation: state.activeConversation?._id === conversationId 
          ? { 
              ...state.activeConversation, 
              favoritedBy: isFavorited 
                ? [...(state.activeConversation.favoritedBy || []), currentUserId] 
                : (state.activeConversation.favoritedBy || []).filter(id => id.toString() !== currentUserId?.toString()) 
            }
          : state.activeConversation
      }));
    });

    socket.on('user_online', ({ userId }) => {
      set((state) => ({
        conversations: state.conversations.map(c => {
          const newParticipants = c.participants.map(p => p._id === userId ? { ...p, isOnline: true } : p);
          return { ...c, participants: newParticipants };
        }),
        activeConversation: state.activeConversation 
          ? { ...state.activeConversation, participants: state.activeConversation.participants.map(p => p._id === userId ? { ...p, isOnline: true } : p) }
          : null
      }));
    });

    socket.on('user_offline', ({ userId }) => {
      set((state) => ({
        conversations: state.conversations.map(c => {
          const newParticipants = c.participants.map(p => p._id === userId ? { ...p, isOnline: false, lastSeen: new Date().toISOString() } : p);
          return { ...c, participants: newParticipants };
        }),
        activeConversation: state.activeConversation 
          ? { ...state.activeConversation, participants: state.activeConversation.participants.map(p => p._id === userId ? { ...p, isOnline: false, lastSeen: new Date().toISOString() } : p) }
          : null
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

    socket.on('message_reaction_update', ({ messageId, reactions, conversationId }) => {
      set((state) => {
        if (state.activeConversation?._id !== conversationId) return state;
        return {
          messages: state.messages.map(m => 
            m._id === messageId ? { ...m, reactions } : m
          )
        };
      });
    });

    socket.on('status_updated', () => {
      useStatusStore.getState().fetchStatuses();
    });

    socket.on('status_feed_changed', () => {
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
        const currentUserId = useAuthStore.getState().user?._id;
        const privateKeyString = localStorage.getItem('e2ee_private_key');
        
        let fetchedConversations = res.data.data;
        
        // Decrypt lastMessage for direct chats
        if (privateKeyString) {
          fetchedConversations = await Promise.all(fetchedConversations.map(async (conv) => {
            if (!conv.isGroup && conv.participants) {
              const other = conv.participants.find(p => (p._id || p)?.toString() !== currentUserId?.toString());
              
              let decryptedLastMsg = conv.lastMessage;
              if (conv.lastMessage && (conv.lastMessage.type === 'text' || conv.lastMessage.type === 'document')) {
                const decrypted = await decryptDirectMessage(conv.lastMessage.content, other?.publicKey, privateKeyString);
                decryptedLastMsg = { ...conv.lastMessage, content: decrypted };
              }

              let decryptedPinnedMsg = conv.pinnedMessage;
              if (conv.pinnedMessage && (conv.pinnedMessage.type === 'text' || conv.pinnedMessage.type === 'document')) {
                const decrypted = await decryptDirectMessage(conv.pinnedMessage.content, other?.publicKey, privateKeyString);
                decryptedPinnedMsg = { ...conv.pinnedMessage, content: decrypted };
              }

              return {
                ...conv,
                lastMessage: decryptedLastMsg,
                pinnedMessage: decryptedPinnedMsg
              };
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
      if (conversation?._id) {
        delete newUnreadCounts[conversation._id];
      }
      
      return { 
        activeConversation: conversation,
        unreadCounts: newUnreadCounts,
        replyingToMessage: null,
        editingMessage: null,
      };
    });
    const { socket } = get();
    if (socket && conversation?._id) {
      socket.emit('join_conversation', conversation._id);
      get().fetchMessages(conversation._id);
    }
  },

  togglePinConversation: async (conversationId) => {
    const currentPinned = get().pinnedConversationIds;
    const isCurrentlyPinned = currentPinned.includes(conversationId);
    const updatedPinned = isCurrentlyPinned
      ? currentPinned.filter(id => id !== conversationId)
      : [conversationId, ...currentPinned];

    localStorage.setItem('pinned_convos', JSON.stringify(updatedPinned));
    set({ pinnedConversationIds: updatedPinned });

    try {
      await api.put(`/chat/conversations/${conversationId}/pin`);
    } catch {
      // Non-blocking
    }
    toast.success(isCurrentlyPinned ? 'Conversation unpinned' : 'Conversation pinned to top');
  },

  toggleFavoriteConversation: async (conversationId) => {
    try {
      const res = await api.put(`/chat/conversations/${conversationId}/favorite`);
      if (res.data.success) {
        const currentUserId = useAuthStore.getState().user?._id;
        const isFavorited = res.data.isFavorited;
        set((state) => ({
          conversations: state.conversations.map(c => {
            if (c._id === conversationId) {
              let newFavoritedBy = c.favoritedBy || [];
              if (isFavorited) {
                if (!newFavoritedBy.includes(currentUserId)) {
                  newFavoritedBy = [...newFavoritedBy, currentUserId];
                }
              } else {
                newFavoritedBy = newFavoritedBy.filter(id => id.toString() !== currentUserId?.toString());
              }
              return { ...c, favoritedBy: newFavoritedBy };
            }
            return c;
          }),
          activeConversation: state.activeConversation?._id === conversationId 
            ? { 
                ...state.activeConversation, 
                favoritedBy: isFavorited 
                  ? [...(state.activeConversation.favoritedBy || []), currentUserId] 
                  : (state.activeConversation.favoritedBy || []).filter(id => id.toString() !== currentUserId?.toString()) 
              }
            : state.activeConversation
        }));
        toast.success(isFavorited ? 'Added to favorites' : 'Removed from favorites');
      }
    } catch {
      toast.error('Failed to update favorites');
    }
  },

  muteConversation: async (conversationId, level = null) => {
    try {
      const payload = level ? { level } : {};
      const res = await api.put(`/chat/conversations/${conversationId}/mute`, payload);
      if (res.data.success) {
        set((state) => ({
          activeConversation: state.activeConversation?._id === conversationId 
            ? { ...state.activeConversation, mutedBy: res.data.data.mutedBy, muteSettings: res.data.data.muteSettings } 
            : state.activeConversation,
          conversations: state.conversations.map(c => c._id === conversationId ? { ...c, mutedBy: res.data.data.mutedBy, muteSettings: res.data.data.muteSettings } : c)
        }));
        toast.success(res.data.isMuted ? 'Conversation muted' : 'Conversation unmuted');
      }
    } catch {
      toast.error('Failed to mute/unmute conversation');
    }
  },

  deleteConversation: async (conversationId) => {
    try {
      const res = await api.delete(`/chat/conversations/${conversationId}`);
      if (res.data.success) {
        set((state) => ({
          conversations: state.conversations.filter(c => c._id !== conversationId),
          activeConversation: state.activeConversation?._id === conversationId ? null : state.activeConversation
        }));
        toast.success('Conversation deleted');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete conversation');
    }
  },

  blockUser: async (userId) => {
    try {
      const res = await api.put(`/users/block/${userId}`);
      if (res.data.success) {
        toast.success(res.data.message);
        // We update the local auth user state with the new blockedUsers array
        const authStore = useAuthStore.getState();
        if (authStore.user) {
          authStore.setUser({ ...authStore.user, blockedUsers: res.data.data });
        }
      }
    } catch {
      toast.error('Failed to block/unblock user');
    }
  },

  approveConversation: async (conversationId) => {
    try {
      const res = await api.put(`/chat/conversations/${conversationId}/approve`);
      if (res.data.success) {
        set((state) => ({
          conversations: state.conversations.map(c => c._id === conversationId ? res.data.data : c),
          activeConversation: state.activeConversation?._id === conversationId ? res.data.data : state.activeConversation
        }));
        toast.success('Connection request approved');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to approve request');
    }
  },

  rejectConversation: async (conversationId) => {
    try {
      const res = await api.put(`/chat/conversations/${conversationId}/reject`);
      if (res.data.success) {
        set((state) => ({
          conversations: state.conversations.filter(c => c._id !== conversationId),
          activeConversation: state.activeConversation?._id === conversationId ? null : state.activeConversation
        }));
        toast.success('Connection request rejected');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reject request');
    }
  },

  createGroup: async (name, userIds) => {
    try {
      const res = await api.post('/chat/groups', { name, userIds });
      set((state) => ({
        conversations: [res.data.data, ...state.conversations],
        activeConversation: res.data.data
      }));
      get().fetchMessages(res.data.data._id);
      return true;
    } catch (error) {
      set({ error: error.message });
      return false;
    }
  },

  startConversation: async (receiverId) => {
    try {
      const res = await api.post('/chat/conversations', { receiverId });
      if (res.data.success) {
        const newConvo = res.data.data;
        set((state) => {
          const exists = state.conversations.find(c => c._id === newConvo._id);
          if (!exists) {
            return { conversations: [newConvo, ...state.conversations] };
          }
          // Update the existing conversation with fresh populated data
          return { 
            conversations: state.conversations.map(c => c._id === newConvo._id ? newConvo : c)
          };
        });
        get().setActiveConversation(newConvo);
      }
    } catch (error) {
      console.error(error);
    }
  },

  fetchMessages: async (conversationId) => {
    set({ isMessagesLoading: true, error: null });
    try {
      const res = await api.get(`/chat/messages/${conversationId}`);
      if (res.data.success) {
        const conversation = res.data.conversation || get().conversations.find(c => c._id === conversationId) || get().activeConversation;
        let messages = res.data.data;
        const currentUserId = useAuthStore.getState().user?._id;
        
        if (conversation && !conversation.isGroup && conversation.participants) {
          const privateKeyString = localStorage.getItem('e2ee_private_key');
          const other = conversation.participants.find(p => (p._id || p)?.toString() !== currentUserId?.toString());
          const otherPublicKey = other?.publicKey;

          if (privateKeyString) {
            messages = await Promise.all(messages.map(async (msg) => {
              let decryptedContent = msg.content;
              const senderIdStr = (msg.senderId?._id || msg.senderId)?.toString();
              const keyToUse = otherPublicKey || (senderIdStr && senderIdStr !== currentUserId?.toString() ? msg.senderId?.publicKey : null);
              
              if (msg.type === 'text' || msg.type === 'document') {
                decryptedContent = await decryptDirectMessage(msg.content, keyToUse, privateKeyString);
              }

              let decryptedReplyTo = msg.replyTo;
              if (msg.replyTo && (msg.replyTo.type === 'text' || msg.replyTo.type === 'document')) {
                const replyContent = await decryptDirectMessage(msg.replyTo.content, keyToUse, privateKeyString);
                decryptedReplyTo = { ...msg.replyTo, content: replyContent };
              }

              return { ...msg, content: decryptedContent, replyTo: decryptedReplyTo };
            }));
          }
        }
        
        set({ messages, isMessagesLoading: false });

        const { socket } = get();
        const unreadMsg = messages.find(m => m.status !== 'read' && (m.senderId?._id || m.senderId)?.toString() !== currentUserId?.toString());
        if (socket && unreadMsg) {
          const senderIdStr = (unreadMsg.senderId?._id || unreadMsg.senderId)?.toString();
          socket.emit('mark_messages_read', { conversationId, senderId: senderIdStr });
        }
      }
    } catch (error) {
      set({ error: error.message, isMessagesLoading: false });
    }
  },

  toggleDisappearingMessages: async (conversationId, ttl) => {
    try {
      const res = await api.put(`/chat/conversations/${conversationId}/disappearing`, { ttl });
      if (res.data.success) {
        set((state) => ({
          activeConversation: state.activeConversation?._id === conversationId 
            ? { ...state.activeConversation, disappearingMessagesTTL: ttl } 
            : state.activeConversation
        }));
        toast.success(`Disappearing messages ${ttl > 0 ? `set to ${ttl}s` : 'disabled'}`);
      }
    } catch {
      toast.error('Failed to update disappearing messages setting');
    }
  },

  sendImage: async (file) => {
    const { activeConversation, replyingToMessage } = get();
    if (!activeConversation || !file) return;

    const receivers = activeConversation.participants
      .filter((p) => p._id !== useAuthStore.getState().user?._id)
      .map(p => p._id);

    const formData = new FormData();
    formData.append('image', file);
    formData.append('conversationId', activeConversation._id);
    formData.append('receiverIds', JSON.stringify(receivers)); 
    if (receivers.length > 0) formData.append('receiverId', receivers[0]);
    if (replyingToMessage) formData.append('replyTo', replyingToMessage._id);

    set({ isImageUploading: true, error: null, replyingToMessage: null });
    try {
      await api.post('/chat/messages/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      set({ isImageUploading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to send message', isImageUploading: false });
    }
  },

  sendAudio: async (audioBlob) => {
    const { socket, activeConversation, replyingToMessage } = get();
    if (!socket || !activeConversation) return;

    const receivers = activeConversation.participants
      .filter((p) => p._id !== useAuthStore.getState().user?._id)
      .map(p => p._id);

    const formData = new FormData();
    formData.append('audio', audioBlob, 'voicenote.webm');
    formData.append('conversationId', activeConversation._id);
    formData.append('receiverIds', JSON.stringify(receivers)); 
    if (receivers.length > 0) formData.append('receiverId', receivers[0]);
    if (replyingToMessage) formData.append('replyTo', replyingToMessage._id);

    set({ isAudioUploading: true, error: null, replyingToMessage: null });
    try {
      await api.post('/chat/messages/audio', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      set({ isAudioUploading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to send audio', isAudioUploading: false });
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

    let metadata = {};
    if (type === 'text') {
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = content.match(urlRegex);
      if (urls && urls.length > 0) {
        try {
          const res = await api.get(`/chat/link-preview?url=${encodeURIComponent(urls[0])}`);
          if (res.data.success && res.data.data) {
            metadata.linkPreview = res.data.data;
          }
        } catch {
          // non-blocking
        }
      }
    }

    let finalContent = content;
    if (!activeConversation.isGroup && type === 'text') {
      const privateKeyString = localStorage.getItem('e2ee_private_key');
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

    const messagePayload = {
      conversationId: activeConversation._id,
      receiverIds,
      content: finalContent,
      type,
      metadata,
      replyTo: replyingToMessage?._id || null,
    };

    if (!navigator.onLine) {
      set((state) => ({
        offlineQueue: [...state.offlineQueue, messagePayload]
      }));
      toast.success('Message queued for offline sending');
    } else {
      socket.emit('send_message', messagePayload);
    }

    set({ replyingToMessage: null });
  },

  sendDocument: async (file) => {
    const { socket, activeConversation, replyingToMessage } = get();
    if (!socket || !activeConversation || !file) return;

    const currentUserId = useAuthStore.getState().user?._id;
    const otherParticipant = activeConversation.participants.find(p => p._id !== currentUserId);
    const receiverIds = activeConversation.isGroup
      ? activeConversation.participants.filter(p => p._id !== currentUserId).map(p => p._id)
      : (otherParticipant ? [otherParticipant._id] : []);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Data = e.target.result;
      let finalContent = base64Data;
      let metadata = { fileName: file.name, fileSize: file.size, fileType: file.type };

      if (!activeConversation.isGroup) {
        const privateKeyString = localStorage.getItem('e2ee_private_key');
        const recipientPublicKeyStr = otherParticipant?.publicKey;
        
        if (privateKeyString && recipientPublicKeyStr) {
          try {
            const privateKey = await importPrivateKey(privateKeyString);
            const publicKey = await importPublicKey(recipientPublicKeyStr);
            if (privateKey && publicKey) {
              const sharedKey = await deriveSharedKey(privateKey, publicKey);
              if (sharedKey) {
                finalContent = await encryptPayload(sharedKey, base64Data);
              }
            }
          } catch (err) {
            console.error("Failed to encrypt document:", err);
          }
        }
      }

      socket.emit('send_message', {
        conversationId: activeConversation._id,
        receiverIds,
        content: finalContent,
        type: 'document',
        metadata,
        replyTo: replyingToMessage?._id || null,
      });
      set({ replyingToMessage: null });
    };
    reader.readAsDataURL(file);
  },

  editMessage: async (messageId, newContent) => {
    const { socket, activeConversation } = get();
    if (!socket || !activeConversation || !newContent.trim()) return;

    const currentUserId = useAuthStore.getState().user?._id;
    const otherParticipant = activeConversation.participants.find(p => p._id !== currentUserId);
    const receiverIds = activeConversation.isGroup
      ? activeConversation.participants.filter(p => p._id !== currentUserId).map(p => p._id)
      : (otherParticipant ? [otherParticipant._id] : []);

    let finalContent = newContent;
    if (!activeConversation.isGroup) {
      const privateKeyString = localStorage.getItem('e2ee_private_key');
      const recipientPublicKeyStr = otherParticipant?.publicKey;
      if (privateKeyString && recipientPublicKeyStr) {
        try {
          const privateKey = await importPrivateKey(privateKeyString);
          const publicKey = await importPublicKey(recipientPublicKeyStr);
          if (privateKey && publicKey) {
            const sharedKey = await deriveSharedKey(privateKey, publicKey);
            if (sharedKey) {
              finalContent = await encryptPayload(sharedKey, newContent);
            }
          }
        } catch (err) {
          console.error('Failed to encrypt edited message:', err);
        }
      }
    }

    socket.emit('edit_message', {
      messageId,
      newContent: finalContent,
      receiverIds
    });

    set({ editingMessage: null });
    toast.success('Message updated');
  },

  deleteMessage: (messageId) => {
    const { socket, activeConversation } = get();
    if (!socket || !activeConversation) return;

    const currentUserId = useAuthStore.getState().user?._id;
    const receiverIds = activeConversation.participants
      .filter(p => p._id !== currentUserId)
      .map(p => p._id);

    socket.emit('delete_message', {
      messageId,
      receiverIds
    });
    toast.success('Message deleted');
  },

  togglePinMessage: (messageId, isPinned) => {
    const { socket, activeConversation } = get();
    if (!socket || !activeConversation) return;

    const currentUserId = useAuthStore.getState().user?._id;
    const receiverIds = activeConversation.participants
      .filter(p => p._id !== currentUserId)
      .map(p => p._id);

    socket.emit('pin_message', {
      messageId,
      conversationId: activeConversation._id,
      isPinned,
      receiverIds
    });
    toast.success(isPinned ? 'Message pinned' : 'Message unpinned');
  },

  reactMessage: (messageId, emoji) => {
    const { socket, activeConversation } = get();
    if (!socket || !activeConversation) return;

    const currentUserId = useAuthStore.getState().user?._id;
    const receiverIds = activeConversation.participants
      .filter(p => p._id !== currentUserId)
      .map(p => p._id);

    socket.emit('react_message', {
      messageId,
      emoji,
      receiverIds
    });
  },

  setTyping: (isTyping) => {
    const { socket, activeConversation } = get();
    if (!socket || !activeConversation) return;

    const currentUserId = useAuthStore.getState().user?._id;
    const receivers = activeConversation.participants
      .filter((p) => p._id !== currentUserId)
      .map(p => p._id);

    if (receivers.length > 0) {
      socket.emit(isTyping ? 'typing_start' : 'typing_stop', {
        conversationId: activeConversation._id,
        receiverIds: receivers
      });
    }
  },

  syncOfflineMessages: () => {
    const { offlineQueue, socket } = get();
    if (offlineQueue.length === 0 || !socket || !navigator.onLine) return;

    offlineQueue.forEach((msg) => {
      socket.emit('send_message', msg);
    });

    set({ offlineQueue: [] });
    toast.success(`${offlineQueue.length} offline messages sent`);
  }
}), {
  name: 'chat-storage',
  storage: createJSONStorage(() => idbStorage),
  partialize: (state) => ({ 
    conversations: state.conversations, 
    messages: state.messages,
    pinnedConversationIds: state.pinnedConversationIds,
    offlineQueue: state.offlineQueue
  }),
}));

export default useChatStore;
