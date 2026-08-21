import React, { useState, useEffect } from 'react';
import useChatStore from '../../store/useChatStore';
import useAuthStore from '../../store/useAuthStore';
import CreateGroupModal from './CreateGroupModal';
import StatusRow from '../status/StatusRow';
import api from '../../services/api';

const Sidebar = () => {
  const { 
    conversations, 
    activeConversation, 
    setActiveConversation, 
    fetchConversations, 
    unreadCounts,
    startConversation,
    pinnedConversationIds,
    togglePinConversation,
    typingUsers
  } = useChatStore();
  const { logout, user } = useAuthStore();
  
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [notifPermission, setNotifPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'granted'
  );

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    const handleSearch = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await api.get(`/chat/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.data.success) {
          setSearchResults(res.data.data);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(handleSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleStartChat = async (userId) => {
    await startConversation(userId);
    setSearchQuery('');
  };

  const requestNotifPermission = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
    }
  };

  // Sort conversations: Pinned first, then by last updated
  const sortedConversations = [...conversations].sort((a, b) => {
    const aPinned = pinnedConversationIds.includes(a._id);
    const bPinned = pinnedConversationIds.includes(b._id);
    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;
    return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0);
  });

  const renderConversation = (conversation) => {
    const isActive = activeConversation?._id === conversation._id;
    const isPinned = pinnedConversationIds.includes(conversation._id);

    if (conversation.isGroup) {
      const unreadCount = unreadCounts[conversation._id] || 0;
      const isTyping = typingUsers[conversation._id] && typingUsers[conversation._id].length > 0;
      return (
        <div 
          key={conversation._id}
          onClick={() => setActiveConversation(conversation)}
          className={`mx-2 my-1 px-3.5 py-3 rounded-2xl cursor-pointer transition-all duration-150 flex items-center space-x-3.5 group relative ${
            isActive 
              ? 'bg-accent-tint border border-accent shadow-sm' 
              : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05] border border-transparent'
          }`}
        >
          <div className="relative w-12 h-12 rounded-2xl bg-accent flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm transition-colors">
            {conversation.groupName?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
              <h3 className={`text-sm font-semibold truncate flex items-center space-x-1.5 ${isActive ? 'text-accent' : 'text-[#1c1c1e] dark:text-[#f5f5f7]'}`}>
                <span className="truncate">{conversation.groupName}</span>
                {isPinned && <span className="text-xs shrink-0" title="Pinned chat">📌</span>}
              </h3>
              {conversation.lastMessage && (
                <span className="text-[11px] text-[#8e8e93] shrink-0 font-medium">
                  {new Date(conversation.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
            <p className={`text-xs truncate ${unreadCount > 0 ? 'text-[#1c1c1e] dark:text-white font-bold' : 'text-[#8e8e93]'}`}>
              {isTyping ? (
                <span className="text-accent font-semibold italic flex items-center space-x-1">
                  <span>typing</span>
                  <span className="animate-bounce">.</span>
                  <span className="animate-bounce delay-100">.</span>
                  <span className="animate-bounce delay-200">.</span>
                </span>
              ) : (
                <>
                  {conversation.lastMessage ? (
                    <span className={unreadCount > 0 ? 'font-bold' : 'font-medium text-[#3a3a3c] dark:text-[#aeaeb2]'}>
                      {conversation.lastMessage.senderId === user?._id ? 'You: ' : (conversation.lastMessage.senderId?.name?.split(' ')[0] + ': ' || '')}
                    </span>
                  ) : null}
                  {conversation.lastMessage ? (conversation.lastMessage.type === 'image' ? '📷 Photo' : conversation.lastMessage.type === 'audio' ? '🎙️ Voice note' : conversation.lastMessage.type === 'document' ? '📄 Document' : conversation.lastMessage.content) : 'Start chatting'}
                </>
              )}
            </p>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            {unreadCount > 0 && (
              <div className="bg-accent text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm transition-colors">
                {unreadCount > 99 ? '99+' : unreadCount}
              </div>
            )}
            
            {/* Quick Pin Toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePinConversation(conversation._id);
              }}
              className={`p-1 rounded-full text-xs transition-opacity ${
                isPinned ? 'opacity-100 text-accent' : 'opacity-0 group-hover:opacity-100 text-[#8e8e93] hover:text-accent'
              }`}
              title={isPinned ? 'Unpin chat' : 'Pin chat to top'}
            >
              📌
            </button>
          </div>
        </div>
      );
    }

    // Single chat rendering logic
    const otherParticipant = conversation.participants?.find(p => (p._id || p)?.toString() !== user?._id?.toString());
    if (!otherParticipant) return null;

    const unreadCount = unreadCounts[conversation._id] || 0;
    const isTyping = typingUsers[conversation._id] && typingUsers[conversation._id].length > 0;
    const lastMsg = conversation.lastMessage;
    const lastMsgText = lastMsg 
      ? (lastMsg.type === 'image' 
          ? '📷 Photo' 
          : lastMsg.type === 'audio' 
            ? '🎙️ Voice note' 
            : lastMsg.type === 'document'
              ? '📄 Document'
              : (lastMsg.content?.startsWith('{"iv"') ? '🔒 Encrypted message' : lastMsg.content))
      : 'Start a conversation';

    return (
      <div 
        key={conversation._id}
        onClick={() => setActiveConversation(conversation)}
        className={`mx-2 my-1 px-3.5 py-3 rounded-2xl cursor-pointer transition-all duration-150 flex items-center space-x-3.5 group relative ${
          isActive 
            ? 'bg-accent-tint border border-accent shadow-sm' 
            : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05] border border-transparent'
        }`}
      >
        <div className="relative shrink-0">
          {otherParticipant.profilePicture ? (
            <img src={otherParticipant.profilePicture} alt="Avatar" className="w-12 h-12 rounded-2xl object-cover shadow-sm border border-black/[0.05] dark:border-white/[0.08]" />
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-accent-tint border border-accent text-accent flex items-center justify-center font-bold text-base shadow-sm transition-colors">
              {otherParticipant.name?.charAt(0)?.toUpperCase()}
            </div>
          )}
          {otherParticipant.isOnline && (
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#34c759] border-2 border-white dark:border-[#1c1c1e] rounded-full shadow-sm"></span>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-1">
            <h3 className={`text-sm font-semibold truncate flex items-center space-x-1.5 ${isActive ? 'text-accent' : 'text-[#1c1c1e] dark:text-[#f5f5f7]'}`}>
              <span className="truncate">{otherParticipant.name}</span>
              {isPinned && <span className="text-xs shrink-0" title="Pinned chat">📌</span>}
            </h3>
            {lastMsg && (
              <span className={`text-[11px] shrink-0 font-medium ${unreadCount > 0 ? 'text-accent font-bold' : 'text-[#8e8e93]'}`}>
                {new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>
          <p className={`text-xs truncate ${unreadCount > 0 ? 'text-[#1c1c1e] dark:text-white font-bold' : 'text-[#8e8e93]'}`}>
            {isTyping ? (
              <span className="text-accent font-semibold italic flex items-center space-x-1">
                <span>typing</span>
                <span className="animate-bounce">.</span>
                <span className="animate-bounce delay-100">.</span>
                <span className="animate-bounce delay-200">.</span>
              </span>
            ) : (
              lastMsgText
            )}
          </p>
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          {unreadCount > 0 && (
            <div className="bg-accent text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center shadow-sm shrink-0 transition-colors">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
          
          {/* Quick Pin Toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              togglePinConversation(conversation._id);
            }}
            className={`p-1 rounded-full text-xs transition-opacity ${
              isPinned ? 'opacity-100 text-accent' : 'opacity-0 group-hover:opacity-100 text-[#8e8e93] hover:text-accent'
            }`}
            title={isPinned ? 'Unpin chat' : 'Pin chat to top'}
          >
            📌
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full md:w-80 lg:w-96 xl:w-[380px] glass-panel border-r border-black/[0.06] dark:border-white/[0.08] flex-col h-full transition-all duration-300 z-20 ${activeConversation ? 'hidden md:flex' : 'flex'}`}>
      {/* Header */}
      <div className="p-4 border-b border-black/[0.06] dark:border-white/[0.08] bg-transparent flex justify-between items-center shrink-0">
        <h2 className="text-xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7] tracking-tight">Messages</h2>
        
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => setShowCreateGroup(true)}
            className="p-2 rounded-full glass-card hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-accent transition-all"
            title="New Group"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
          
          <button 
            onClick={logout}
            className="px-3 py-1.5 rounded-full text-xs font-semibold text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Notification Banner if permission not granted */}
      {notifPermission === 'default' && (
        <div className="bg-accent-tint border-b border-accent p-3 flex items-center justify-between text-xs transition-colors">
          <div className="flex items-center space-x-2 text-accent font-medium">
            <span>🔔</span>
            <span>Enable Chrome notifications</span>
          </div>
          <button
            onClick={requestNotifPermission}
            className="px-3 py-1 bg-accent hover-bg-accent text-white font-semibold rounded-full shadow-accent transition-all text-xs"
          >
            Allow
          </button>
        </div>
      )}

      {/* 24h Status / Story Feed Row */}
      <StatusRow />

      {/* Search Input */}
      <div className="p-3 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0">
        <div className="relative flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-[#8e8e93] absolute left-3.5 pointer-events-none">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search messages, phone or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full glass-input placeholder-[#8e8e93] rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white p-0.5 rounded-full"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Conversation List or Search Results */}
      <div className="flex-1 overflow-y-auto py-1 space-y-0.5">
        {searchQuery ? (
          <div>
            <div className="px-4 py-2 text-[11px] font-bold text-[#8e8e93] uppercase tracking-wider">Search Results</div>
            {isSearching ? (
              <div className="p-6 text-center text-xs text-[#8e8e93]">Searching directory...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map(u => (
                <div 
                  key={u._id} 
                  onClick={() => handleStartChat(u._id)}
                  className="mx-2 my-1 px-3.5 py-3 rounded-2xl cursor-pointer hover:bg-black/[0.04] dark:hover:bg-white/[0.05] flex items-center space-x-3.5 transition-all border border-transparent"
                >
                  {u.profilePicture ? (
                    <img src={u.profilePicture} alt="Avatar" className="w-11 h-11 rounded-2xl object-cover shadow-sm border border-black/[0.06] dark:border-white/[0.08]" />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-accent-tint text-accent border border-accent flex items-center justify-center font-bold text-sm shadow-sm">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] truncate">{u.name}</h3>
                    <p className="text-xs text-[#8e8e93] truncate">{u.email || u.phoneNumber || `Code: ${u.connectCode}`}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-[#8e8e93]">No users found matching "{searchQuery}"</div>
            )}
          </div>
        ) : (
          <div>
            {sortedConversations.length > 0 ? (
              sortedConversations.map(renderConversation)
            ) : (
              <div className="p-8 text-center flex flex-col items-center justify-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-accent-tint border border-accent flex items-center justify-center text-2xl shadow-sm text-accent">
                  💬
                </div>
                <div className="text-sm font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">No Conversations Yet</div>
                <p className="text-xs text-[#8e8e93] max-w-xs leading-relaxed">
                  Search by phone number or 4-digit connect code to start chatting with end-to-end encryption.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Branding */}
      <div className="p-3 border-t border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.02] flex items-center justify-between shrink-0">
        <span className="text-[11px] font-medium text-[#8e8e93]">
          Made with ❤️ by <span className="font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">Atanu Ghosh</span>
        </span>
        
        <a 
          href="https://github.com/atanu5026" 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full glass-card hover:bg-black/[0.06] dark:hover:bg-white/[0.1] transition-all text-[11px] font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] border border-black/[0.06] dark:border-white/[0.08] shadow-sm active:scale-95"
          title="Atanu Ghosh on GitHub"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
            <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          <span>GitHub</span>
        </a>
      </div>

      {showCreateGroup && <CreateGroupModal onClose={() => setShowCreateGroup(false)} />}
    </div>
  );
};

export default Sidebar;
