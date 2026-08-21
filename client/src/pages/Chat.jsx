import React, { useEffect } from 'react';
import Sidebar from '../components/chat/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import useChatStore from '../store/useChatStore';

const Chat = () => {
  const { activeConversation } = useChatStore();

  return (
    <div className="h-[calc(100dvh-57px)] sm:h-[calc(100dvh-65px)] flex overflow-hidden w-full relative messageme-tint-bg">
      <Sidebar />
      <ChatWindow />
    </div>
  );
};

export default Chat;
