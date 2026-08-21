import React from 'react';
import useChatStore from '../../store/useChatStore';
import useAuthStore from '../../store/useAuthStore';

const UserProfileDrawer = ({ isOpen, onClose, conversation }) => {
  const { blockUser, muteConversation, deleteConversation } = useChatStore();
  const { user: currentUser } = useAuthStore();

  if (!isOpen || !conversation) return null;

  const isGroup = conversation.isGroup;
  const otherParticipant = conversation.participants?.find(
    (p) => (p._id || p)?.toString() !== currentUser?._id?.toString()
  );

  const isMuted = conversation.mutedBy?.some((id) => id.toString() === currentUser?._id?.toString());
  const isBlocked = currentUser?.blockedUsers?.some((id) => id.toString() === otherParticipant?._id?.toString());

  const handleMuteToggle = () => {
    muteConversation(conversation._id);
  };

  const handleBlockToggle = () => {
    if (otherParticipant?._id) {
      blockUser(otherParticipant._id);
    }
  };

  const handleDeleteChat = () => {
    if (window.confirm('Are you sure you want to delete this chat? This action cannot be undone.')) {
      deleteConversation(conversation._id);
      onClose();
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#f5f5f7] dark:bg-[#000000] flex flex-col h-full animate-slide-in-right overflow-hidden">
      <div className="h-16 flex items-center px-4 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-black/80 backdrop-blur-xl shrink-0">
        <button
          onClick={onClose}
          className="mr-3 p-2 text-[#1c1c1e] dark:text-[#f5f5f7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-full transition-colors flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5 mr-1">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span className="font-semibold text-sm">Back</span>
        </button>
        <h2 className="text-lg font-bold text-[#1c1c1e] dark:text-[#f5f5f7] ml-2">Contact Info</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center max-w-xl mx-auto w-full">
        {isGroup ? (
          <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center text-white font-bold text-3xl shadow-lg mb-4">
            {conversation.groupName?.charAt(0).toUpperCase()}
          </div>
        ) : otherParticipant?.profilePicture ? (
          <img src={otherParticipant.profilePicture} alt="Avatar" className="w-24 h-24 rounded-full object-cover shadow-lg mb-4 border-2 border-white dark:border-[#1c1c1e]" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-accent-tint text-accent border border-accent flex items-center justify-center font-bold text-3xl shadow-lg mb-4">
            {otherParticipant?.name?.charAt(0)?.toUpperCase()}
          </div>
        )}

        <h3 className="text-xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7] mb-1">
          {isGroup ? conversation.groupName : otherParticipant?.name}
        </h3>
        
        {!isGroup && (
          <p className="text-[#8e8e93] text-sm mb-6 text-center">
            {otherParticipant?.about || 'Hey there! I am using this app.'}
          </p>
        )}

        <div className="w-full mt-6 space-y-3">
          {!isGroup && otherParticipant && (
            <div className="w-full p-4 bg-white/50 dark:bg-black/50 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] space-y-3 mb-2">
              <div className="flex items-center space-x-3 text-[#1c1c1e] dark:text-[#f5f5f7]">
                <div className="w-8 h-8 rounded-full bg-black/[0.04] dark:bg-white/[0.08] flex items-center justify-center shrink-0">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#8e8e93]">
                    <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
                    <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs text-[#8e8e93] font-semibold">Email</p>
                  <p className="text-sm font-medium truncate max-w-[200px]">{otherParticipant.email || 'Hidden'}</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleMuteToggle}
            className="w-full flex items-center justify-between p-4 bg-white/50 dark:bg-black/50 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center space-x-3 text-[#1c1c1e] dark:text-[#f5f5f7]">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                {isMuted ? (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM17.78 9.22a.75.75 0 10-1.06 1.06L18.44 12l-1.72 1.72a.75.75 0 001.06 1.06l1.72-1.72 1.72 1.72a.75.75 0 101.06-1.06L20.56 12l1.72-1.72a.75.75 0 00-1.06-1.06l-1.72 1.72-1.72-1.72z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path d="M13.5 4.06c0-1.336-1.616-2.005-2.56-1.06l-4.5 4.5H4.508c-1.141 0-2.318.664-2.66 1.905A9.76 9.76 0 001.5 12c0 .898.121 1.768.35 2.595.341 1.24 1.518 1.905 2.659 1.905h1.93l4.5 4.5c.945.945 2.561.276 2.561-1.06V4.06zM18.584 5.106a.75.75 0 011.06 0c3.808 3.807 3.808 9.98 0 13.788a.75.75 0 11-1.06-1.06 8.25 8.25 0 000-11.668.75.75 0 010-1.06z" />
                    <path d="M15.932 7.757a.75.75 0 011.061 0 6 6 0 010 8.486.75.75 0 01-1.06-1.061 4.5 4.5 0 000-6.364.75.75 0 010-1.06z" />
                  </svg>
                )}
              </div>
              <span className="font-semibold text-sm">Mute Notifications</span>
            </div>
            <div className={`w-11 h-6 rounded-full flex items-center p-1 transition-colors ${isMuted ? 'bg-accent' : 'bg-gray-300 dark:bg-gray-600'}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${isMuted ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
          </button>

          {!isGroup && (
            <button
              onClick={handleBlockToggle}
              className="w-full flex items-center justify-between p-4 bg-white/50 dark:bg-black/50 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
            >
              <div className="flex items-center space-x-3 text-[#ff3b30]">
                <div className="w-10 h-10 rounded-xl bg-[#ff3b30]/10 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM4.575 15.6l9.22-9.22a8.25 8.25 0 00-11.668 11.668h.001c.725.9 1.63 1.63 2.447 2.448zM19.425 8.4l-9.22 9.22a8.25 8.25 0 0011.668-11.668A8.204 8.204 0 0019.425 8.4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="font-semibold text-sm">{isBlocked ? 'Unblock Contact' : 'Block Contact'}</span>
              </div>
            </button>
          )}

          <button
            onClick={handleDeleteChat}
            className="w-full flex items-center justify-between p-4 bg-white/50 dark:bg-black/50 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
          >
            <div className="flex items-center space-x-3 text-[#ff3b30]">
              <div className="w-10 h-10 rounded-xl bg-[#ff3b30]/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M16.5 4.478v.227a48.816 48.816 0 013.878.512.75.75 0 11-.256 1.478l-.209-.035-1.005 13.07a3 3 0 01-2.991 2.77H8.084a3 3 0 01-2.991-2.77L4.087 6.66l-.209.035a.75.75 0 01-.256-1.478A48.567 48.567 0 017.5 4.705v-.227c0-1.564 1.213-2.9 2.816-2.951a52.662 52.662 0 013.369 0c1.603.051 2.815 1.387 2.815 2.951zm-6.136-1.452a51.196 51.196 0 013.273 0C14.39 3.05 15 3.684 15 4.478v.113a49.488 49.488 0 00-6 0v-.113c0-.794.609-1.428 1.364-1.452zm-.355 5.945a.75.75 0 10-1.5.058l.347 9a.75.75 0 101.499-.058l-.346-9zm5.48.058a.75.75 0 10-1.498-.058l-.347 9a.75.75 0 001.5.058l.345-9z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="font-semibold text-sm">Delete Chat</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};

export default UserProfileDrawer;
