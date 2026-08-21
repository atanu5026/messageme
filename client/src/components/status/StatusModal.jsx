import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import useAuthStore from '../../store/useAuthStore';
import useStatusStore from '../../store/useStatusStore';

const StatusModal = ({ statusGroup, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const { user } = useAuthStore();
  const { deleteStatus } = useStatusStore();
  const isMe = statusGroup.user?._id === user?._id;

  useEffect(() => {
    // Auto-advance every 5 seconds
    const timer = setTimeout(() => {
      if (currentIndex < statusGroup.statuses.length - 1) {
        setCurrentIndex(prev => prev + 1);
      } else {
        onClose();
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [currentIndex, statusGroup.statuses.length, onClose]);

  const handleNext = (e) => {
    e.stopPropagation();
    if (currentIndex < statusGroup.statuses.length - 1) {
      setCurrentIndex(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const handleDeleteCurrent = async (e) => {
    e.stopPropagation();
    if (window.confirm('Delete this story update?')) {
      const statusId = currentStatus._id;
      await deleteStatus(statusId);
      if (statusGroup.statuses.length <= 1) {
        onClose();
      } else if (currentIndex >= statusGroup.statuses.length - 1) {
        setCurrentIndex(Math.max(0, currentIndex - 1));
      }
    }
  };

  const currentStatus = statusGroup.statuses[currentIndex];
  if (!currentStatus) return null;

  const bgGradient = currentStatus.metadata?.bgGradient || 'from-indigo-600 via-purple-700 to-pink-600';

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 dark:bg-black/85 backdrop-blur-3xl overflow-hidden transition-all" onClick={onClose}>
      <style>{`
        @keyframes statusProgress {
          0% { width: 0%; }
          100% { width: 100%; }
        }
      `}</style>
      <div className="relative w-screen h-screen bg-transparent flex flex-col" onClick={(e) => e.stopPropagation()}>
        
        {/* Progress Bars */}
        <div className="absolute top-0 left-0 right-0 p-4 flex space-x-2 z-30 pt-6">
          {statusGroup.statuses.map((s, idx) => (
            <div key={s._id} className="h-1.5 flex-1 bg-white/30 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                key={`${s._id}-${idx === currentIndex ? 'active' : 'idle'}`}
                className="h-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                style={{ 
                  width: idx < currentIndex ? '100%' : '0%',
                  animation: idx === currentIndex ? 'statusProgress 5s linear forwards' : 'none'
                }}
              />
            </div>
          ))}
        </div>

        {/* Header with Back Button and Delete */}
        <div className="absolute top-8 left-0 right-0 p-4 sm:p-6 flex items-center justify-between z-30 bg-gradient-to-b from-black/70 via-black/30 to-transparent pb-12">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <button onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-full backdrop-blur-md transition-colors flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6 sm:w-8 sm:h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
            </button>
            
            {statusGroup.user.profilePicture ? (
              <img 
                src={statusGroup.user.profilePicture} 
                alt="User" 
                className="w-11 h-11 sm:w-13 sm:h-13 rounded-full border-2 border-white/60 object-cover shadow-lg"
              />
            ) : (
              <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-accent text-white font-bold flex items-center justify-center text-lg border-2 border-white/60 shadow-lg">
                {statusGroup.user.name?.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="drop-shadow-md">
              <h3 className="text-white text-base sm:text-lg font-bold tracking-wide leading-tight">
                {isMe ? 'My Story' : statusGroup.user.name}
              </h3>
              <p className="text-xs text-white/80 font-medium">
                {new Date(currentStatus.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Delete Story Button for owner */}
          {isMe && (
            <button
              onClick={handleDeleteCurrent}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold shadow-lg backdrop-blur-md transition-all active:scale-95"
              title="Delete this update"
            >
              <span>🗑️</span>
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
        </div>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center relative bg-black/20 backdrop-blur-md">
          {/* Navigation overlay zones */}
          <div className="absolute inset-y-0 left-0 w-1/3 z-20 cursor-pointer" onClick={handlePrev} />
          <div className="absolute inset-y-0 right-0 w-1/3 z-20 cursor-pointer" onClick={handleNext} />

          {currentStatus.type === 'image' ? (
            <img 
              src={currentStatus.content} 
              alt="Status" 
              className="w-full h-full object-contain drop-shadow-2xl sm:rounded-3xl sm:m-8 sm:h-[calc(100vh-4rem)] sm:w-auto"
            />
          ) : (
            <div className={`text-center bg-gradient-to-br ${bgGradient} w-full h-full flex items-center justify-center sm:rounded-3xl sm:m-12 sm:h-[calc(100vh-6rem)] shadow-2xl border border-white/20 p-6`}>
              <p className="text-white text-3xl sm:text-5xl md:text-6xl font-black max-w-4xl whitespace-pre-wrap leading-tight drop-shadow-2xl px-4">
                {currentStatus.content}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default StatusModal;
