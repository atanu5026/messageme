import { create } from 'zustand';
import useAuthStore from './useAuthStore';
// import useChatStore from './useChatStore';

const useCallStore = create((set, get) => ({
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  
  callStatus: 'idle', // idle | ringing | active
  incomingCall: null,
  otherUserId: null, 

  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  pendingIceCandidates: [], 

  initCallListeners: () => {
    // TODO: Implement with socket in Phase 5
  },

  setupWebRTC: async (isCaller, remoteUserId) => {
    // TODO: Implement react-native-webrtc in Phase 5
    return null;
  },

  callUser: async (userId, _userName) => {
    // TODO: Implement react-native-webrtc in Phase 5
  },

  answerCall: async () => {
    // TODO: Implement react-native-webrtc in Phase 5
  },

  endCall: (emitToOther = true) => {
    set({
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      callStatus: 'idle',
      incomingCall: null,
      otherUserId: null,
      isMuted: false,
      isVideoOff: false,
      pendingIceCandidates: []
    });
  },

  toggleMute: () => {
    set((state) => ({ isMuted: !state.isMuted }));
  },

  toggleVideo: () => {
    set((state) => ({ isVideoOff: !state.isVideoOff }));
  },

  toggleScreenShare: async () => {
    // Not supported in early React Native port
  }
}));

export default useCallStore;
