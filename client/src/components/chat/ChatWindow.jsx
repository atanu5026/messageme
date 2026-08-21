import React, { useState, useEffect, useRef } from 'react';
import useChatStore from '../../store/useChatStore';
import useAuthStore from '../../store/useAuthStore';
import useCallStore from '../../store/useCallStore';
import AudioRecorder from './AudioRecorder';

const ChatWindow = () => {
  const {
    activeConversation,
    setActiveConversation,
    messages,
    isMessagesLoading,
    sendMessage,
    setTyping,
    typingUsers,
    sendImage,
    isImageUploading,
    reactMessage,
    toggleDisappearingMessages,
    sendAudio,
    isAudioUploading,
    replyingToMessage,
    setReplyingToMessage,
    editingMessage,
    setEditingMessage,
    editMessage,
    deleteMessage,
    togglePinMessage,
  } = useChatStore();
  
  const { user } = useAuthStore();
  const { callUser } = useCallStore();
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTypingLocal] = useState(false);
  const [activeReactionMessageId, setActiveReactionMessageId] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const typingTimeoutRef = useRef(null);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const messageRefs = useRef({});

  // Auto-scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const scrollToMessage = (msgId) => {
    if (msgId && messageRefs.current[msgId]) {
      messageRefs.current[msgId].scrollIntoView({ behavior: 'smooth', block: 'center' });
      messageRefs.current[msgId].classList.add('ring-2', 'ring-accent');
      setTimeout(() => {
        messageRefs.current[msgId]?.classList.remove('ring-2', 'ring-accent');
      }, 1500);
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (editingMessage) {
      editMessage(editingMessage._id, inputText);
      setInputText('');
      setEditingMessage(null);
    } else {
      sendMessage(inputText);
      setInputText('');
    }

    if (isTyping) {
      setIsTypingLocal(false);
      setTyping(false);
      clearTimeout(typingTimeoutRef.current);
    }
  };

  const handleInputChange = (e) => {
    setInputText(e.target.value);

    if (!isTyping) {
      setIsTypingLocal(true);
      setTyping(true);
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      setIsTypingLocal(false);
      setTyping(false);
    }, 2000);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      sendImage(file);
    }
  };

  const cancelEdit = () => {
    setEditingMessage(null);
    setInputText('');
  };

  const getCleanMessageContent = (msg) => {
    if (!msg) return '';
    if (msg.isDeleted) return '🚫 This message was deleted';
    if (msg.type === 'image') return '📷 Photo';
    if (msg.type === 'audio') return '🎙️ Voice note';
    
    // Check if we have this message in local decrypted messages list
    const msgId = msg._id || msg;
    const localMatch = messages.find(m => m._id === msgId);
    if (localMatch && localMatch.content && typeof localMatch.content === 'string' && !localMatch.content.startsWith('{"iv"')) {
      return localMatch.content;
    }

    if (typeof msg.content === 'string') {
      if (msg.content.startsWith('{"iv"') || msg.content.startsWith('{"data"')) {
        return '🔒 Encrypted message';
      }
      return msg.content;
    }

    return 'Message';
  };

  if (!activeConversation) {
    return (
      <div className="hidden md:flex flex-1 flex-col items-center justify-center bg-transparent relative overflow-hidden p-6">
        <div className="text-center max-w-md p-8 rounded-3xl glass-card border border-black/[0.06] dark:border-white/[0.08] shadow-2xl relative z-10">
          <div className="w-16 h-16 bg-accent rounded-2xl flex items-center justify-center mx-auto mb-5 text-white shadow-accent transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7] mb-2 tracking-tight">
            End-to-End Encrypted
          </h2>
          <p className="text-xs sm:text-sm text-[#8e8e93] leading-relaxed">
            Select a conversation to start messaging. Direct communication is secured with zero-knowledge encryption.
          </p>
          <div className="mt-5 inline-flex items-center space-x-1.5 text-xs font-semibold text-accent bg-accent-tint py-1.5 px-3 rounded-full border border-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]"></span>
            <span>256-Bit ECDH + AES-GCM</span>
          </div>
        </div>
      </div>
    );
  }

  const otherParticipant = activeConversation.participants?.find(p => (p._id || p)?.toString() !== user?._id?.toString());
  const isSomeoneTyping = typingUsers[activeConversation._id] && typingUsers[activeConversation._id].length > 0;
  const filteredMessages = searchQuery.trim()
    ? messages.filter(m => m.content?.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  return (
    <div className="flex-1 w-full flex flex-col h-full bg-transparent relative transition-colors overflow-hidden">
      {/* Header */}
      <div className="px-4 sm:px-6 py-3 glass-panel border-b border-black/[0.06] dark:border-white/[0.08] flex justify-between items-center z-10 shrink-0 transition-colors">
        <div className="flex items-center space-x-3 min-w-0">
          {/* Back button for mobile */}
          <button
            onClick={() => setActiveConversation(null)}
            className="md:hidden p-2 -ml-1 text-[#1c1c1e] dark:text-[#f5f5f7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-full transition-colors shrink-0"
            title="Back"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>

          <div className="relative shrink-0">
            {activeConversation.isGroup ? (
              <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center text-white font-bold shadow-sm text-sm sm:text-base">
                {activeConversation.groupName?.charAt(0).toUpperCase()}
              </div>
            ) : (
              otherParticipant?.profilePicture ? (
                <img src={otherParticipant.profilePicture} alt="Avatar" className="w-10 h-10 rounded-2xl object-cover shadow-sm border border-black/[0.06] dark:border-white/[0.08]" />
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-accent-tint text-accent border border-accent flex items-center justify-center font-bold text-sm sm:text-base shadow-sm">
                  {otherParticipant?.name?.charAt(0)?.toUpperCase()}
                </div>
              )
            )}
            {!activeConversation.isGroup && otherParticipant?.isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#34c759] border-2 border-white dark:border-[#1c1c1e] rounded-full shadow-sm"></span>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-base font-bold text-[#1c1c1e] dark:text-[#f5f5f7] leading-tight truncate">
              {activeConversation.isGroup ? activeConversation.groupName : otherParticipant?.name}
            </h2>

            {/* Typing Indicator / Online Status */}
            {isSomeoneTyping ? (
              <p className="text-xs text-accent font-semibold italic truncate animate-pulse flex items-center space-x-1">
                <span>typing</span>
                <span className="animate-bounce">.</span>
                <span className="animate-bounce delay-100">.</span>
                <span className="animate-bounce delay-200">.</span>
              </p>
            ) : (
              !activeConversation.isGroup && (
                <p className="text-[11px] text-[#8e8e93] truncate">
                  {otherParticipant?.isOnline ? (
                    <span className="text-[#34c759] font-semibold">Online</span>
                  ) : (
                    otherParticipant?.lastSeen ? `Last seen ${new Date(otherParticipant.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Offline'
                  )}
                </p>
              )
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
          {/* In-Chat Search Button */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              showSearch ? 'bg-accent text-white shadow-accent' : 'glass-card text-[#8e8e93] hover:text-accent'
            }`}
            title="Search in conversation"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
          </button>

          {/* Disappearing Messages Toggle */}
          <button
            onClick={() => toggleDisappearingMessages(activeConversation._id, activeConversation.disappearingMessagesTTL > 0 ? 0 : 86400)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${activeConversation.disappearingMessagesTTL > 0
                ? 'bg-[#af52de]/15 text-[#af52de] border border-[#af52de]/30'
                : 'glass-card text-[#8e8e93] hover:text-[#af52de] hover:bg-black/[0.04] dark:hover:bg-white/[0.08]'
              }`}
            title={activeConversation.disappearingMessagesTTL > 0 ? "Disappearing Messages: ON (24h)" : "Turn on Disappearing Messages (24h)"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>

          {/* Video Call - Only for 1-on-1 chats */}
          {!activeConversation.isGroup && otherParticipant && (
            <button
              onClick={() => callUser(otherParticipant._id, otherParticipant.name)}
              className="w-9 h-9 rounded-full glass-card hover:bg-accent-tint text-accent flex items-center justify-center transition-all border border-black/[0.06] dark:border-white/[0.08]"
              title="Start HD FaceTime Video Call"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* In-Chat Search Bar Dropdown */}
      {showSearch && (
        <div className="px-4 py-2 glass-panel border-b border-black/[0.06] dark:border-white/[0.08] flex items-center space-x-2 z-10 animate-fade-in">
          <input
            type="text"
            placeholder="Search keywords in this chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 glass-input rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-accent"
            autoFocus
          />
          {searchQuery && (
            <span className="text-[11px] text-[#8e8e93] font-semibold">
              {filteredMessages.length} match{filteredMessages.length === 1 ? '' : 'es'}
            </span>
          )}
          <button
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
            className="text-xs text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white px-2 py-1"
          >
            Done
          </button>
        </div>
      )}

      {/* Pinned Message Top Banner */}
      {activeConversation.pinnedMessage && (
        <div className="px-4 py-2 bg-accent-tint border-b border-accent flex items-center justify-between text-xs z-10">
          <div 
            onClick={() => scrollToMessage(activeConversation.pinnedMessage._id || activeConversation.pinnedMessage)}
            className="flex items-center space-x-2 truncate cursor-pointer hover:underline flex-1"
          >
            <span className="text-sm">📌</span>
            <div className="truncate">
              <span className="font-bold text-accent">Pinned: </span>
              <span className="text-[#1c1c1e] dark:text-[#f5f5f7] truncate">
                {getCleanMessageContent(activeConversation.pinnedMessage)}
              </span>
            </div>
          </div>
          <button 
            onClick={() => togglePinMessage(activeConversation.pinnedMessage._id, false)}
            className="text-[#8e8e93] hover:text-[#ff3b30] text-xs px-2 py-0.5"
            title="Unpin message"
          >
            Unpin
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-6 space-y-3">
        {isMessagesLoading ? (
          <div className="flex justify-center p-6"><span className="text-xs text-[#8e8e93] font-medium">Decrypting messages...</span></div>
        ) : (
          filteredMessages.map((msg, idx) => {
            const isMe = (msg.senderId?._id || msg.senderId) === user?._id;
            const showSenderName = activeConversation.isGroup && !isMe;
            const isDeleted = msg.isDeleted;

            return (
              <div 
                key={msg._id || idx} 
                ref={el => { if (msg._id) messageRefs.current[msg._id] = el; }}
                className={`flex w-full group relative ${isMe ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] md:max-w-[65%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {showSenderName && (
                    <span className="text-[11px] font-semibold text-accent ml-2 mb-0.5">
                      {msg.senderId?.name?.split(' ')[0] || 'Member'}
                    </span>
                  )}

                  <div className="relative group/msg flex items-center">
                    {/* Hover Action Pill Menu */}
                    <div 
                      className={`absolute -top-8 ${isMe ? 'right-0' : 'left-0'} opacity-0 group-hover/msg:opacity-100 transition-opacity z-20 flex items-center space-x-1 glass-panel px-2 py-1 rounded-full shadow-lg border border-black/[0.08] dark:border-white/[0.1]`}
                    >
                      {/* Reply Button */}
                      <button
                        onClick={() => setReplyingToMessage(msg)}
                        className="p-1 hover:scale-125 transition-transform text-xs text-[#8e8e93] hover:text-accent"
                        title="Reply"
                      >
                        ↩️
                      </button>

                      {/* Reaction Trigger */}
                      <button
                        onClick={() => setActiveReactionMessageId(msg._id === activeReactionMessageId ? null : msg._id)}
                        className="p-1 hover:scale-125 transition-transform text-xs"
                        title="React"
                      >
                        ❤️
                      </button>

                      {/* Pin Toggle */}
                      <button
                        onClick={() => togglePinMessage(msg._id, !msg.isPinned)}
                        className="p-1 hover:scale-125 transition-transform text-xs"
                        title={msg.isPinned ? "Unpin" : "Pin"}
                      >
                        📌
                      </button>

                      {/* Edit (Sender Only) */}
                      {isMe && !isDeleted && msg.type === 'text' && (
                        <button
                          onClick={() => {
                            setEditingMessage(msg);
                            setInputText(msg.content);
                          }}
                          className="p-1 hover:scale-125 transition-transform text-xs"
                          title="Edit"
                        >
                          ✏️
                        </button>
                      )}

                      {/* Delete for Everyone (Sender Only) */}
                      {isMe && !isDeleted && (
                        <button
                          onClick={() => {
                            if (window.confirm('Delete this message for everyone?')) {
                              deleteMessage(msg._id);
                            }
                          }}
                          className="p-1 hover:scale-125 transition-transform text-xs text-[#ff3b30]"
                          title="Delete for Everyone"
                        >
                          🗑️
                        </button>
                      )}
                    </div>

                    {/* Message Bubble Card */}
                    <div
                      className={`w-fit max-w-full rounded-2xl px-4 py-2.5 relative flex flex-col transition-all select-text ${
                        isDeleted
                          ? 'bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] text-[#8e8e93] rounded-2xl'
                          : isMe
                            ? 'bg-accent text-white rounded-br-sm shadow-accent'
                            : 'bg-[#e9e9eb] dark:bg-[#2c2c2e] text-[#000000] dark:text-white rounded-bl-sm border border-black/[0.04] dark:border-white/[0.08] shadow-sm'
                      }`}
                      onDoubleClick={() => setActiveReactionMessageId(msg._id === activeReactionMessageId ? null : msg._id)}
                    >
                      {/* Reaction Picker Overlay */}
                      {activeReactionMessageId === msg._id && (
                        <div className={`absolute ${isMe ? '-left-28 sm:-left-32' : '-right-28 sm:-right-32'} -top-10 glass-panel shadow-2xl rounded-full flex space-x-1.5 px-3 py-1.5 z-30 border border-black/[0.08] dark:border-white/[0.1]`}>
                          {['👍', '❤️', '😂', '😮', '😢', '🔥'].map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => { reactMessage(msg._id, emoji); setActiveReactionMessageId(null); }}
                              className="hover:scale-125 transition-transform text-base sm:text-lg"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Quoted Reply inside Message Bubble */}
                      {msg.replyTo && (
                        <div
                          onClick={() => scrollToMessage(msg.replyTo._id || msg.replyTo)}
                          className={`mb-1.5 p-2 rounded-xl text-xs cursor-pointer hover:opacity-85 transition-opacity border-l-4 ${
                            isMe 
                              ? 'bg-black/15 text-white/90 border-white' 
                              : 'bg-black/[0.04] dark:bg-white/[0.08] border-accent text-[#1c1c1e] dark:text-[#f5f5f7]'
                          }`}
                        >
                          <span className={`font-bold text-[11px] block ${isMe ? 'text-white' : 'text-accent'}`}>
                            {msg.replyTo.senderId?.name?.split(' ')[0] || 'Replied message'}
                          </span>
                          <p className="truncate text-[11px] opacity-80 mt-0.5">
                            {getCleanMessageContent(msg.replyTo)}
                          </p>
                        </div>
                      )}

                      {/* Deleted message state */}
                      {isDeleted ? (
                        <p className="text-xs italic opacity-75 flex items-center space-x-1.5 py-0.5">
                          <span>🚫</span>
                          <span>This message was deleted</span>
                        </p>
                      ) : (
                        <>
                          {msg.type === 'image' ? (
                            <img
                              src={msg.content}
                              alt="Shared Image"
                              className="max-w-[220px] sm:max-w-[340px] max-h-[300px] sm:max-h-[400px] rounded-xl mb-1 object-cover cursor-pointer border border-white/20 shadow-sm"
                              onClick={() => window.open(msg.content, '_blank')}
                            />
                          ) : msg.type === 'audio' ? (
                            <audio src={msg.content} controls className="max-w-[220px] sm:max-w-[300px] h-9 mb-1 rounded-xl" />
                          ) : (
                            <div className="flex flex-col min-w-0">
                              <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-normal">
                                {msg.content?.startsWith('{"iv"') ? '🔒 Encrypted message' : msg.content}
                              </p>

                              {/* Link Preview */}
                              {msg.metadata && msg.metadata.linkPreview && (
                                <a href={msg.metadata.linkPreview.url} target="_blank" rel="noopener noreferrer" className="mt-2 block w-full max-w-sm rounded-xl overflow-hidden glass-card hover:opacity-90 transition-all border border-black/[0.06] dark:border-white/[0.08]">
                                  {msg.metadata.linkPreview.image && (
                                    <div className="h-28 sm:h-32 w-full overflow-hidden bg-slate-100 dark:bg-[#1c1c1e]">
                                      <img src={msg.metadata.linkPreview.image} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                                    </div>
                                  )}
                                  <div className="p-2.5">
                                    <h4 className="text-xs sm:text-sm font-bold line-clamp-1">{msg.metadata.linkPreview.title}</h4>
                                    <p className="text-[11px] opacity-80 mt-0.5 line-clamp-2">{msg.metadata.linkPreview.description}</p>
                                    <span className="text-[10px] opacity-60 mt-1 block uppercase font-semibold tracking-wider">
                                      {new URL(msg.metadata.linkPreview.url).hostname}
                                    </span>
                                  </div>
                                </a>
                              )}
                            </div>
                          )}

                          {/* Timestamp, Edited Badge & Status */}
                          <div className={`flex justify-end items-center space-x-1 mt-1 shrink-0 ${isMe ? 'text-white/80' : 'text-[#8e8e93]'}`}>
                            {msg.isEdited && (
                              <span className="text-[9px] italic opacity-80 mr-0.5">(edited)</span>
                            )}
                            <span className="text-[10px] font-medium">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && (
                              <span className={`text-[10px] font-bold ${msg.status === 'read' ? 'text-white font-black' : 'text-white/70'}`}>
                                {msg.status === 'sent' ? '✓' : '✓✓'}
                              </span>
                            )}
                          </div>
                        </>
                      )}

                      {/* Display Reactions */}
                      {msg.reactions && msg.reactions.length > 0 && (
                        <div className={`flex flex-wrap gap-1 mt-1 z-10 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          {Object.entries(
                            msg.reactions.reduce((acc, r) => {
                              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                              return acc;
                            }, {})
                          ).map(([emoji, count]) => (
                            <div key={emoji} className="glass-panel rounded-full px-2 py-0.5 text-xs shadow-sm flex items-center cursor-pointer hover:scale-110 transition-transform border border-black/[0.06] dark:border-white/[0.08]"
                              onClick={() => reactMessage(msg._id, emoji)}>
                              <span>{emoji}</span>
                              {count > 1 && <span className="ml-1 font-bold text-[10px]">{count}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Floating MessageMe Glass Input Dock */}
      <div className="p-3 sm:p-4 relative z-10">
        <div className="glass-panel rounded-3xl p-1.5 sm:p-2 border border-black/[0.06] dark:border-white/[0.08] shadow-lg transition-all">
          {/* Quoted Reply Banner above dock */}
          {replyingToMessage && (
            <div className="flex items-center justify-between px-3.5 py-2 mb-1.5 bg-black/[0.04] dark:bg-white/[0.06] rounded-2xl border-l-4 border-accent text-xs animate-fade-in">
              <div className="min-w-0 flex-1">
                <span className="font-bold text-accent block text-[11px]">
                  Replying to {replyingToMessage.senderId?.name?.split(' ')[0] || (replyingToMessage.senderId === user?._id ? 'yourself' : 'Message')}
                </span>
                <p className="truncate text-[#8e8e93] text-[11px] mt-0.5">
                  {getCleanMessageContent(replyingToMessage)}
                </p>
              </div>
              <button 
                onClick={() => setReplyingToMessage(null)}
                className="text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white p-1 ml-2 rounded-full"
                title="Cancel reply"
              >
                ✕
              </button>
            </div>
          )}

          {/* Edit Message Banner above dock */}
          {editingMessage && (
            <div className="flex items-center justify-between px-3.5 py-2 mb-1.5 bg-accent-tint rounded-2xl border-l-4 border-accent text-xs animate-fade-in">
              <div className="min-w-0 flex-1">
                <span className="font-bold text-accent block text-[11px]">
                  ✏️ Editing message
                </span>
                <p className="truncate text-[#8e8e93] text-[11px] mt-0.5">
                  Press enter to save changes
                </p>
              </div>
              <button 
                onClick={cancelEdit}
                className="text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white p-1 ml-2 rounded-full font-bold text-xs"
                title="Cancel edit"
              >
                Cancel
              </button>
            </div>
          )}

          {isImageUploading && (
            <div className="absolute -top-8 left-6 text-xs font-semibold text-accent flex items-center glass-card px-3 py-1 rounded-full shadow-sm border border-accent">
              <svg className="animate-spin -ml-1 mr-2 h-3.5 w-3.5 text-accent" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Encrypting & Uploading...
            </div>
          )}

          <form onSubmit={handleSend} className="flex items-center space-x-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageSelect}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-[#8e8e93] hover:text-accent transition-colors p-2 rounded-full hover:bg-black/[0.04] dark:hover:bg-white/[0.08] shrink-0"
              title="Add Photo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </button>

            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder={editingMessage ? "Edit your message..." : "MessageMe..."}
                className="w-full bg-transparent text-[#1c1c1e] dark:text-[#f5f5f7] placeholder-[#8e8e93] border-none rounded-full px-3 sm:px-4 py-2 text-xs sm:text-sm focus:outline-none transition-all"
              />
            </div>

            {inputText.trim() ? (
              <button
                type="submit"
                disabled={!inputText.trim()}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-accent text-white flex items-center justify-center hover-bg-accent transition-all shadow-accent shrink-0 active:scale-95"
                title={editingMessage ? "Save" : "Send"}
              >
                {editingMessage ? (
                  <span className="text-xs font-bold">✓</span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5 ml-0.5">
                    <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
                  </svg>
                )}
              </button>
            ) : (
              <AudioRecorder onSendAudio={sendAudio} isUploading={isAudioUploading} />
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
