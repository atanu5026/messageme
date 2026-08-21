import { create } from 'zustand';
import api from '../services/api';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';
import useAuthStore from './useAuthStore';
import useStatusStore from './useStatusStore';
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

const useChatStore = create((set, get) => ({
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
    });

    // Real-time events
    socket.on('receive_message', async (message) => {
      const { activeConversation, unreadCounts } = get();
      const currentUserId = useAuthStore.getState().user?._id;

      // Decrypt message if needed
      let decryptedMessage = { ...message };
      if (!message.isGroup && message.type === 'text') {
        const privateKeyString = localStorage.getItem('e2ee_private_key');
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
          if (state.messages.some(m => m._id === decryptedMessage._id)) {
            return state;
          }
          return {
            messages: [...state.messages, decryptedMessage]
          };
        });
        
        const senderIdStr = (decryptedMessage.senderId?._id || decryptedMessage.senderId)?.toString();
        if (document.visibilityState === 'visible' && senderIdStr !== currentUserId?.toString()) {
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

      // Handle Notifications
      const isWindowFocused = document.hasFocus() && document.visibilityState === 'visible';
      const isCurrentActiveChat = activeConversation && activeConversation._id === decryptedMessage.conversationId;
      const senderIdStr = (decryptedMessage.senderId?._id || decryptedMessage.senderId)?.toString();
      const isFromOther = senderIdStr && senderIdStr !== currentUserId?.toString();
      const senderName = decryptedMessage.senderId?.name?.split(' ')[0] || 'Someone';
      const notificationText = decryptedMessage.type === 'image' ? '📸 Sent an image' : decryptedMessage.type === 'audio' ? '🎙️ Voice note' : decryptedMessage.content;

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
      if (!updatedMessage.isGroup && updatedMessage.type === 'text') {
        const privateKeyString = localStorage.getItem('e2ee_private_key');
        const conv = get().conversations.find(c => c._id === updatedMessage.conversationId) || get().activeConversation;
        let otherPublicKey = null;
        if (conv && !conv.isGroup && conv.participants) {
          const other = conv.participants.find(p => (p._id || p)?.toString() !== currentUserId?.toString());
          otherPublicKey = other?.publicKey || updatedMessage.senderId?.publicKey;
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
      if (decryptedPinned && decryptedPinned.type === 'text') {
        const privateKeyString = localStorage.getItem('e2ee_private_key');
        const conv = get().conversations.find(c => c._id === conversationId) || get().activeConversation;
        if (conv && !conv.isGroup && conv.participants && privateKeyString) {
          const other = conv.participants.find(p => (p._id || p)?.toString() !== currentUserId?.toString());
          const otherPublicKey = other?.publicKey || decryptedPinned.senderId?.publicKey;
          if (otherPublicKey) {
            decryptedPinned.content = await decryptDirectMessage(decryptedPinned.content, otherPublicKey, privateKeyString);
          }
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
        )
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
        let conversations = res.data.data;
        const privateKeyString = localStorage.getItem('e2ee_private_key');
        const currentUserId = useAuthStore.getState().user?._id;
        
        if (privateKeyString) {
          conversations = await Promise.all(conversations.map(async (conv) => {
            if (!conv.isGroup && conv.participants) {
              const other = conv.participants.find(p => (p._id || p)?.toString() !== currentUserId?.toString());
              if (other?.publicKey) {
                let decryptedLastMsg = conv.lastMessage;
                if (conv.lastMessage && conv.lastMessage.type === 'text') {
                  const decrypted = await decryptDirectMessage(conv.lastMessage.content, other.publicKey, privateKeyString);
                  decryptedLastMsg = { ...conv.lastMessage, content: decrypted };
                }

                let decryptedPinnedMsg = conv.pinnedMessage;
                if (conv.pinnedMessage && conv.pinnedMessage.type === 'text') {
                  const decrypted = await decryptDirectMessage(conv.pinnedMessage.content, other.publicKey, privateKeyString);
                  decryptedPinnedMsg = { ...conv.pinnedMessage, content: decrypted };
                }

                return {
                  ...conv,
                  lastMessage: decryptedLastMsg,
                  pinnedMessage: decryptedPinnedMsg
                };
              }
            }
            return conv;
          }));
        }

        set({ conversations, isConversationsLoading: false });
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
          return state;
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
        const conversation = get().conversations.find(c => c._id === conversationId) || get().activeConversation;
        let messages = res.data.data;
        
        if (conversation && !conversation.isGroup && conversation.participants) {
          const privateKeyString = localStorage.getItem('e2ee_private_key');
          const currentUserId = useAuthStore.getState().user?._id;
          const other = conversation.participants.find(p => (p._id || p)?.toString() !== currentUserId?.toString());
          const otherPublicKey = other?.publicKey;

          if (privateKeyString) {
            messages = await Promise.all(messages.map(async (msg) => {
              let decryptedContent = msg.content;
              const senderIdStr = (msg.senderId?._id || msg.senderId)?.toString();
              const keyToUse = otherPublicKey || (senderIdStr && senderIdStr !== currentUserId?.toString() ? msg.senderId?.publicKey : null);
              
              if (msg.type === 'text' && keyToUse) {
                decryptedContent = await decryptDirectMessage(msg.content, keyToUse, privateKeyString);
              }

              let decryptedReplyTo = msg.replyTo;
              if (msg.replyTo && msg.replyTo.type === 'text' && keyToUse) {
                const replyContent = await decryptDirectMessage(msg.replyTo.content, keyToUse, privateKeyString);
                decryptedReplyTo = { ...msg.replyTo, content: replyContent };
              }

              return { ...msg, content: decryptedContent, replyTo: decryptedReplyTo };
            }));
          }
        }
        
        set({ messages, isMessagesLoading: false });
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

    socket.emit('send_message', {
      conversationId: activeConversation._id,
      receiverIds,
      content: finalContent,
      type,
      metadata,
      replyTo: replyingToMessage?._id || null,
    });

    set({ replyingToMessage: null });
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
  }
}));

export default useChatStore;
