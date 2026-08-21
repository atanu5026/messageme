import React, { useEffect } from 'react';
import Sidebar from '../components/chat/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import useChatStore from '../store/useChatStore';

const Chat = () => {
  const { initializeSocket, disconnectSocket } = useChatStore();

  useEffect(() => {
    // When the Chat page mounts, initialize the socket connection
    const token = localStorage.getItem('token');
    if (token) {
      initializeSocket(token);
    }

    // Cleanup when leaving the chat page entirely
    return () => {
      disconnectSocket();
    };
  }, [initializeSocket, disconnectSocket]);

  return (
    <div className="h-[calc(100dvh-57px)] sm:h-[calc(100dvh-65px)] flex overflow-hidden w-full relative messageme-tint-bg">
      <Sidebar />
      <ChatWindow />
    </div>
  );
};

export default Chat;
