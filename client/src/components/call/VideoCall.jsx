import React, { useEffect, useRef } from 'react';
import useCallStore from '../../store/useCallStore';

const VideoCall = () => {
  const { 
    callStatus, 
    incomingCall, 
    localStream, 
    remoteStream, 
    answerCall, 
    endCall, 
    toggleMute,
    toggleVideo, 
    toggleScreenShare,
    isMuted, 
    isVideoOff,
    isScreenSharing
  } = useCallStore();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  // Bind streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, callStatus]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream, callStatus]);

  if (callStatus === 'idle') {
    return null;
  }

  // Incoming Call Overlay
  if (callStatus === 'ringing' && incomingCall) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 flex flex-col items-center animate-bounce shadow-2xl min-w-[300px]">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-500">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10">
              <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">{incomingCall.name}</h2>
          <p className="text-gray-500 mb-8">is calling you...</p>
          
          <div className="flex space-x-6">
            <button 
              onClick={() => endCall()}
              className="w-14 h-14 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <button 
              onClick={answerCall}
              className="w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white">
                <path fillRule="evenodd" d="M1.5 4.5a3 3 0 013-3h1.372c.86 0 1.61.586 1.819 1.42l1.105 4.423a1.875 1.875 0 01-.694 1.955l-1.293.97c-.135.101-.164.249-.126.352a11.285 11.285 0 006.697 6.697c.103.038.25.009.352-.126l.97-1.293a1.875 1.875 0 011.955-.694l4.423 1.105c.834.209 1.42.959 1.42 1.82V19.5a3 3 0 01-3 3h-2.25C8.552 22.5 1.5 15.448 1.5 6.75V4.5z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Active or Outbound Ringing Call UI
  return (
    <div className="fixed inset-0 z-[100] bg-zinc-900 flex flex-col">
      <div className="flex-1 relative">
        {/* Remote Video (Full Screen) */}
        {remoteStream ? (
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            playsInline
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-white/50 text-xl font-medium tracking-widest animate-pulse">
            {callStatus === 'ringing' ? 'Calling...' : 'Connecting...'}
          </div>
        )}

        {/* Local Video (Picture in Picture) */}
        <div className="absolute top-4 sm:top-6 right-4 sm:right-6 w-28 h-40 sm:w-48 sm:h-64 bg-black rounded-xl overflow-hidden shadow-2xl border-2 border-white/20 z-10">
          <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover transform -scale-x-100 ${isVideoOff ? 'hidden' : 'block'}`}
          />
          {isVideoOff && (
            <div className="w-full h-full flex items-center justify-center bg-zinc-800 text-white/50 text-xs sm:text-sm">
              Camera Off
            </div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="h-24 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-center space-x-3 sm:space-x-6 absolute bottom-0 left-0 right-0 p-4 sm:p-6 z-20">
        
        <button 
          onClick={toggleMute}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-red-500/80 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'}`}
        >
          {isMuted ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.395C2.806 8.757 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.531V19.94a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.506-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.395C2.806 8.757 3.63 8.25 4.51 8.25H6.75z" />
            </svg>
          )}
        </button>

        <button 
          onClick={() => endCall()}
          className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="white" className="w-7 h-7 sm:w-8 sm:h-8">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
          </svg>
        </button>

        <button 
          onClick={toggleVideo}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${isVideoOff ? 'bg-red-500/80 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'}`}
        >
          {isVideoOff ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white">
              <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white">
              <path strokeLinecap="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            </svg>
          )}
        </button>

        <button 
          onClick={toggleScreenShare}
          className={`w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-colors ${isScreenSharing ? 'bg-blue-500/80 hover:bg-blue-600' : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'}`}
          title="Share Screen"
        >
          {isScreenSharing ? (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8.25V18a2.25 2.25 0 002.25 2.25h13.5A2.25 2.25 0 0021 18V8.25m-18 0V6a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 6v2.25m-18 0h18M5.25 6h.008v.008H5.25V6zM7.5 6h.008v.008H7.5V6zm2.25 0h.008v.008H9.75V6z" />
            </svg>
          )}
        </button>

      </div>
    </div>
  );
};

export default VideoCall;
