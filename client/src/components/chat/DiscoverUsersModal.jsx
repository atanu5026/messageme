import React, { useState, useEffect } from 'react';
import useAuthStore from '../../store/useAuthStore';
import api from '../../services/api';

const DiscoverUsersModal = ({ isOpen, onClose, onStartChat }) => {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const { user: currentUser } = useAuthStore();

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // 'all' query returns up to 50 registered users
      const res = await api.get('/chat/users/search?q=all');
      if (res.data.success) {
        setUsers(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="relative w-full max-w-md bg-white dark:bg-[#1c1c1e] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in border border-black/[0.06] dark:border-white/[0.08]">
        {/* Header */}
        <div className="p-5 border-b border-black/[0.06] dark:border-white/[0.08] flex justify-between items-center bg-gray-50/50 dark:bg-black/20">
          <div>
            <h2 className="text-xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">Discover Users</h2>
            <p className="text-xs text-[#8e8e93] mt-0.5">Find people on MessageMe</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 bg-black/[0.04] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] rounded-full transition-colors text-[#1c1c1e] dark:text-[#f5f5f7]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* User List */}
        <div className="flex-1 overflow-y-auto p-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-48 space-y-3">
              <div className="w-8 h-8 border-4 border-accent/30 border-t-accent rounded-full animate-spin"></div>
              <p className="text-sm font-semibold text-[#8e8e93]">Discovering users...</p>
            </div>
          ) : users.length > 0 ? (
            <div className="space-y-1">
              {users.map((u) => (
                <div 
                  key={u._id}
                  onClick={() => {
                    onStartChat(u._id);
                    onClose();
                  }}
                  className="flex items-center p-3 hover:bg-black/[0.03] dark:hover:bg-white/[0.05] rounded-2xl cursor-pointer transition-colors group"
                >
                  <div className="relative mr-4 shrink-0">
                    {u.profilePicture ? (
                      <img src={u.profilePicture} alt="Avatar" className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-accent-tint text-accent border border-accent flex items-center justify-center font-bold text-lg shadow-sm">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {u.isOnline && (
                      <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-[#34c759] border-2 border-white dark:border-[#1c1c1e] rounded-full shadow-sm"></span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-[#1c1c1e] dark:text-[#f5f5f7] truncate group-hover:text-accent transition-colors">{u.name}</h4>
                    <p className="text-xs text-[#8e8e93] truncate">{u.about || 'Hey there! I am using this app.'}</p>
                  </div>
                  <div className="ml-3 shrink-0">
                    <button className="p-2 rounded-xl bg-accent text-white shadow-accent shadow-sm group-hover:scale-105 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.444 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 px-4">
              <div className="w-16 h-16 bg-black/[0.04] dark:bg-white/[0.08] rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">👥</span>
              </div>
              <p className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">No users found</p>
              <p className="text-xs text-[#8e8e93] mt-1">Be the first to invite your friends!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiscoverUsersModal;
