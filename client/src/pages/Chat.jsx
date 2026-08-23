import React, { useEffect } from 'react';
import Sidebar from '../components/chat/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import useChatStore from '../store/useChatStore';

const Chat = () => {
  const { activeConversation } = useChatStore();

  return (
    <div className="h-full flex overflow-hidden w-full relative messageme-tint-bg">
      <Sidebar />
      <ChatWindow />
    </div>
  );
};

export default Chat;
