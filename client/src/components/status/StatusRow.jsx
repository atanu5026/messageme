import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import useStatusStore from '../../store/useStatusStore';
import useAuthStore from '../../store/useAuthStore';
import StatusModal from './StatusModal';

const GRADIENT_OPTIONS = [
  { id: 'midnight', name: 'Midnight', bg: 'from-slate-900 via-indigo-950 to-black', preview: 'bg-gradient-to-br from-slate-900 via-indigo-950 to-black' },
  { id: 'ocean', name: 'Ocean Blue', bg: 'from-blue-600 to-cyan-500', preview: 'bg-gradient-to-br from-blue-600 to-cyan-500' },
  { id: 'neon', name: 'Neon Purple', bg: 'from-purple-600 via-pink-600 to-red-500', preview: 'bg-gradient-to-br from-purple-600 via-pink-600 to-red-500' },
  { id: 'sunset', name: 'Sunset Coral', bg: 'from-orange-500 via-rose-500 to-pink-500', preview: 'bg-gradient-to-br from-orange-500 via-rose-500 to-pink-500' },
  { id: 'emerald', name: 'Emerald Mint', bg: 'from-emerald-600 to-teal-800', preview: 'bg-gradient-to-br from-emerald-600 to-teal-800' },
  { id: 'amber', name: 'Warm Amber', bg: 'from-amber-500 to-rose-600', preview: 'bg-gradient-to-br from-amber-500 to-rose-600' },
  { id: 'aqua', name: 'Aqua Flow', bg: 'from-teal-500 to-indigo-600', preview: 'bg-gradient-to-br from-teal-500 to-indigo-600' },
];

const StatusRow = () => {
  const { statuses, fetchStatuses, createStatus, deleteStatus, isUploading } = useStatusStore();
  const { user } = useAuthStore();
  const [selectedUserGroup, setSelectedUserGroup] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchStatuses();
    const interval = setInterval(fetchStatuses, 60000); 
    return () => clearInterval(interval);
  }, [fetchStatuses]);

  const [showCreateOptions, setShowCreateOptions] = useState(false);
  const [showTextStatusModal, setShowTextStatusModal] = useState(false);
  const [textStatus, setTextStatus] = useState('');
  const [selectedGradient, setSelectedGradient] = useState(GRADIENT_OPTIONS[0].bg);

  const handleCreateImageStatus = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setShowCreateOptions(false);
      await createStatus('', 'image', file);
    }
  };

  const handleCreateTextStatusSubmit = async (e) => {
    e.preventDefault();
    if (textStatus.trim()) {
      await createStatus(textStatus.trim(), 'text', null, { bgGradient: selectedGradient });
      setTextStatus('');
      setShowTextStatusModal(false);
      setShowCreateOptions(false);
    }
  };

  const myStatusGroup = statuses.find(s => s.user?._id === user?._id);

  const handleDeleteAllMyStories = async () => {
    if (!myStatusGroup) return;
    if (window.confirm('Delete all your active story updates?')) {
      for (const st of myStatusGroup.statuses) {
        await deleteStatus(st._id);
      }
      setShowCreateOptions(false);
    }
  };

  return (
    <div className="border-b border-black/[0.06] dark:border-white/[0.08] p-3 flex overflow-x-auto space-x-3.5 items-center transition-colors relative scrollbar-none bg-black/[0.02] dark:bg-white/[0.02]">
      {/* Create Status Button (My Status) */}
      <div className="flex flex-col items-center space-y-1 shrink-0 relative group">
        <div 
          className={`w-12 h-12 rounded-full p-[2px] transition-all ${
            myStatusGroup 
              ? 'border-2 border-accent ring-2 ring-accent/30 shadow-accent' 
              : 'border-2 border-dashed border-accent/60'
          } relative cursor-pointer hover:scale-105 active:scale-95`}
          onClick={() => setShowCreateOptions(true)}
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-slate-200 dark:bg-zinc-800 relative">
            {user?.profilePicture ? (
              <img 
                src={user.profilePicture} 
                alt="My Status" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-accent-tint text-accent font-bold flex items-center justify-center text-sm">
                {user?.name?.charAt(0).toUpperCase() || 'M'}
              </div>
            )}
          </div>
          <div 
            className="absolute -bottom-0.5 -right-0.5 bg-accent text-white rounded-full w-4 h-4 flex items-center justify-center border-2 border-white dark:border-[#1c1c1e] transition-transform hover:scale-110 shadow-accent cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setShowCreateOptions(true);
            }}
          >
            <span className="text-[10px] font-black leading-none">+</span>
          </div>
        </div>
        <span className="text-[11px] font-medium text-[#1c1c1e] dark:text-[#f5f5f7] truncate w-14 text-center">
          {isUploading ? 'Uploading...' : 'My Story'}
        </span>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleCreateImageStatus} 
          accept="image/*" 
          className="hidden" 
        />
      </div>

      {/* Floating Story Options Modal in front of everything via Portal */}
      {showCreateOptions && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 dark:bg-black/75 backdrop-blur-md p-4 animate-fade-in"
          onClick={() => setShowCreateOptions(false)}
        >
          <div 
            className="glass-panel rounded-3xl p-5 w-full max-w-xs shadow-2xl border border-black/[0.08] dark:border-white/[0.1] space-y-3 relative z-10"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center space-x-2">
                <span className="text-base">✨</span>
                <h3 className="text-sm font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">My Story</h3>
              </div>
              <button 
                onClick={() => setShowCreateOptions(false)}
                className="w-7 h-7 rounded-full bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white transition-colors text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {myStatusGroup && (
                <button
                  onClick={() => {
                    setShowCreateOptions(false);
                    setSelectedUserGroup(myStatusGroup);
                  }}
                  className="w-full flex items-center space-x-3 p-3 text-xs font-bold text-[#1c1c1e] dark:text-[#f5f5f7] bg-accent-tint border border-accent rounded-2xl hover:opacity-90 transition-all text-left"
                >
                  <span className="text-lg">👁️</span>
                  <div>
                    <span>View My Story</span>
                    <p className="text-[10px] text-[#8e8e93] font-normal">
                      {myStatusGroup.statuses.length} active update{myStatusGroup.statuses.length === 1 ? '' : 's'}
                    </p>
                  </div>
                </button>
              )}

              <button
                onClick={() => {
                  setShowCreateOptions(false);
                  fileInputRef.current?.click();
                }}
                className="w-full flex items-center space-x-3 p-3 text-xs font-bold text-[#1c1c1e] dark:text-[#f5f5f7] glass-card hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-2xl transition-all text-left border border-black/[0.06] dark:border-white/[0.08]"
              >
                <span className="text-lg">📷</span>
                <div>
                  <span>Add Photo Story</span>
                  <p className="text-[10px] text-[#8e8e93] font-normal">Share a photo</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setShowCreateOptions(false);
                  setShowTextStatusModal(true);
                }}
                className="w-full flex items-center space-x-3 p-3 text-xs font-bold text-[#1c1c1e] dark:text-[#f5f5f7] glass-card hover:bg-black/[0.05] dark:hover:bg-white/[0.08] rounded-2xl transition-all text-left border border-black/[0.06] dark:border-white/[0.08]"
              >
                <span className="text-lg">✍️</span>
                <div>
                  <span>Add Text Story</span>
                  <p className="text-[10px] text-[#8e8e93] font-normal">With custom background colors</p>
                </div>
              </button>

              {myStatusGroup && (
                <button
                  onClick={handleDeleteAllMyStories}
                  className="w-full flex items-center space-x-3 p-3 text-xs font-bold text-[#ff3b30] hover:bg-[#ff3b30]/10 rounded-2xl transition-all text-left border border-[#ff3b30]/20 pt-2.5"
                >
                  <span className="text-lg">🗑️</span>
                  <div>
                    <span>Delete My Story</span>
                    <p className="text-[10px] text-[#ff3b30]/80 font-normal">Remove active updates</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Text Status Modal with Custom Color Selector */}
      {showTextStatusModal && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 dark:bg-black/85 backdrop-blur-md p-4 animate-fade-in" 
          onClick={() => setShowTextStatusModal(false)}
        >
          <div className="glass-panel rounded-3xl p-6 w-full max-w-lg shadow-2xl border border-black/[0.08] dark:border-white/[0.1] relative z-10 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#1c1c1e] dark:text-[#f5f5f7] tracking-tight">Create Text Story</h3>
              <button 
                onClick={() => setShowTextStatusModal(false)}
                className="w-7 h-7 rounded-full bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white transition-colors text-xs"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCreateTextStatusSubmit} className="space-y-4">
              {/* Live Canvas Preview with Selected Gradient */}
              <div className={`w-full rounded-2xl p-6 bg-gradient-to-br ${selectedGradient} min-h-[160px] flex items-center justify-center shadow-lg transition-all border border-white/20`}>
                <textarea
                  value={textStatus}
                  onChange={e => setTextStatus(e.target.value)}
                  placeholder="What's on your mind? Type your story..."
                  rows={4}
                  maxLength={250}
                  required
                  className="w-full bg-transparent text-white font-bold text-lg sm:text-xl text-center placeholder-white/60 focus:outline-none resize-none drop-shadow-md"
                  autoFocus
                />
              </div>

              {/* Color & Gradient Swatch Palette */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#8e8e93] uppercase tracking-wider">
                  Story Background Palette
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {GRADIENT_OPTIONS.map((grad) => (
                    <button
                      key={grad.id}
                      type="button"
                      onClick={() => setSelectedGradient(grad.bg)}
                      className={`w-8 h-8 rounded-full ${grad.preview} transition-transform active:scale-95 border-2 shadow-sm ${
                        selectedGradient === grad.bg ? 'border-white ring-2 ring-accent scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      title={grad.name}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
                <button
                  type="button"
                  onClick={() => setShowTextStatusModal(false)}
                  className="px-4 py-2 rounded-full text-xs font-semibold text-[#8e8e93] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!textStatus.trim() || isUploading}
                  className="px-6 py-2 rounded-full text-xs font-bold bg-accent hover-bg-accent text-white shadow-accent disabled:opacity-50 active:scale-95 transition-all"
                >
                  {isUploading ? 'Sharing...' : 'Share Story'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Connected Users' Statuses with Accent Circle Icons */}
      {statuses.filter(s => s.user?._id !== user?._id).map((statusGroup) => (
        <div 
          key={statusGroup.user?._id} 
          className="flex flex-col items-center space-y-1 shrink-0 cursor-pointer group hover:scale-105 active:scale-95 transition-all"
          onClick={() => setSelectedUserGroup(statusGroup)}
        >
          <div className="w-12 h-12 rounded-full border-2 border-accent p-[2px] ring-2 ring-accent/30 shadow-accent transition-all">
            <div className="w-full h-full rounded-full overflow-hidden bg-slate-200 dark:bg-zinc-800">
              {statusGroup.user?.profilePicture ? (
                <img 
                  src={statusGroup.user.profilePicture} 
                  alt={statusGroup.user?.name} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-accent-tint text-accent font-bold flex items-center justify-center text-sm">
                  {statusGroup.user?.name?.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          </div>
          <span className="text-[11px] font-medium text-[#1c1c1e] dark:text-[#f5f5f7] truncate w-14 text-center">
            {statusGroup.user?.name?.split(' ')[0]}
          </span>
        </div>
      ))}

      {selectedUserGroup && (
        <StatusModal 
          statusGroup={selectedUserGroup} 
          onClose={() => setSelectedUserGroup(null)} 
        />
      )}
    </div>
  );
};

export default StatusRow;
