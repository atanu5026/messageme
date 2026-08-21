import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import useChatStore from '../../store/useChatStore';

const CreateGroupModal = ({ onClose }) => {
  const [groupName, setGroupName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const { createGroup } = useChatStore();

  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const res = await api.get(`/chat/users/search?q=${searchQuery}`);
        setSearchResults(res.data.data);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearching(false);
      }
    };

    const delayDebounceFn = setTimeout(() => {
      searchUsers();
    }, 350);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const toggleUser = (user) => {
    if (selectedUsers.find(u => u._id === user._id)) {
      setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
    } else {
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleCreate = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) return;
    const userIds = selectedUsers.map(u => u._id);
    const success = await createGroup(groupName, userIds);
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md p-4" onClick={onClose}>
      <div className="glass-panel w-full max-w-md rounded-3xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        
        <div className="p-5 border-b border-black/[0.06] dark:border-white/[0.08] flex justify-between items-center bg-black/[0.02] dark:bg-white/[0.02]">
          <h2 className="text-base font-bold text-[#1c1c1e] dark:text-[#f5f5f7] tracking-tight">New Group</h2>
          <button onClick={onClose} className="text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7] p-1 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-1.5">Group Name</label>
            <input 
              type="text" 
              placeholder="e.g. Project Team"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007aff]/40 transition-all placeholder-[#8e8e93]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8e8e93] uppercase tracking-wider mb-1.5">Add Members ({selectedUsers.length})</label>
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {selectedUsers.map(u => (
                  <span key={u._id} className="bg-[#007aff]/10 border border-[#007aff]/30 text-[#007aff] dark:text-[#0a84ff] text-xs font-semibold px-2.5 py-1 rounded-full flex items-center shadow-sm">
                    <span>{u.name.split(' ')[0]}</span>
                    <button onClick={() => toggleUser(u)} className="ml-1.5 text-[#007aff] font-bold">×</button>
                  </span>
                ))}
              </div>
            )}
            <input 
              type="text" 
              placeholder="Search by name or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#007aff]/40 transition-all placeholder-[#8e8e93]"
            />
          </div>

          <div className="space-y-1 max-h-48 overflow-y-auto">
            {isSearching ? (
              <p className="text-xs text-[#8e8e93] text-center py-3">Searching...</p>
            ) : searchResults.length > 0 ? (
              searchResults.map(u => {
                const isSelected = !!selectedUsers.find(selected => selected._id === u._id);
                return (
                  <div 
                    key={u._id} 
                    onClick={() => toggleUser(u)}
                    className={`flex items-center space-x-3 p-2.5 rounded-2xl cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-[#007aff]/10 border border-[#007aff]/30' 
                        : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.05] border border-transparent'
                    }`}
                  >
                    <input 
                      type="checkbox" 
                      readOnly
                      checked={isSelected}
                      className="w-4 h-4 text-[#007aff] rounded focus:ring-[#007aff]"
                    />
                    {u.profilePicture ? (
                      <img src={u.profilePicture} alt="avatar" className="w-8 h-8 rounded-xl object-cover shadow-sm" />
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-[#007aff]/10 text-[#007aff] dark:text-[#0a84ff] flex items-center justify-center font-bold text-xs">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs sm:text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">{u.name}</span>
                  </div>
                );
              })
            ) : searchQuery ? (
              <p className="text-xs text-[#8e8e93] text-center py-3">No matching users found.</p>
            ) : null}
          </div>
        </div>

        <div className="p-4 border-t border-black/[0.06] dark:border-white/[0.08] flex justify-end space-x-2 bg-black/[0.02] dark:bg-white/[0.02]">
          <button 
            onClick={onClose} 
            className="px-4 py-2 text-xs font-semibold text-[#8e8e93] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] rounded-full transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleCreate} 
            disabled={!groupName.trim() || selectedUsers.length === 0}
            className="px-5 py-2 bg-[#007aff] hover:bg-[#0066ee] text-white text-xs font-semibold rounded-full shadow-sm disabled:opacity-50 transition-all"
          >
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateGroupModal;
