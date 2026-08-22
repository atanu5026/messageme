import { create } from 'zustand';
import useAuthStore from './useAuthStore';
import useChatStore from './useChatStore';

const useCallStore = create((set, get) => ({
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  
  callStatus: 'idle', // idle | ringing | active
  incomingCall: null, // { from: userId, name: string, signal: SDP, callType: 'video'|'audio' }
  otherUserId: null,  // The person we are calling or talking to
  callType: 'video',  // 'video' | 'audio'

  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
  callStartTime: null,
  pendingIceCandidates: [], // Cache for ICE candidates that arrive too early

  // Initialize Socket listeners for Calls
  initCallListeners: () => {
    const socket = useChatStore.getState().socket;
    if (!socket) return;

    // Avoid duplicate listeners by removing old ones first
    socket.off('call_user');
    socket.off('call_accepted');
    socket.off('ice_candidate');
    socket.off('call_ended');

    socket.on('call_user', async ({ signal, from, name, callType = 'video' }) => {
      set({
        incomingCall: { from, name, signal, callType },
        callStatus: 'ringing',
        otherUserId: from,
        callType: callType,
        callStartTime: null,
        pendingIceCandidates: [] // reset on new call
      });
    });

    socket.on('call_accepted', async (signal) => {
      const pc = get().peerConnection;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        
        set({ callStatus: 'active', callStartTime: Date.now() });

        // Add any cached ICE candidates now that remote description is set
        const { pendingIceCandidates } = get();
        for (const candidate of pendingIceCandidates) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('Error adding cached ice candidate', e);
          }
        }
        set({ pendingIceCandidates: [] });
      }
    });

    socket.on('ice_candidate', async (candidate) => {
      const pc = get().peerConnection;
      if (pc) {
        if (pc.remoteDescription) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('Error adding ice candidate', e);
          }
        } else {
          set(state => ({ pendingIceCandidates: [...state.pendingIceCandidates, candidate] }));
        }
      }
    });

    socket.on('call_ended', () => {
      get().endCall(false); // end call without emitting to other user
    });
  },

  // Setup WebRTC and local media
  setupWebRTC: async (isCaller, remoteUserId, callType = 'video') => {
    try {
      let stream;
      if (callType === 'audio') {
        stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        set({ isVideoOff: true });
      } else {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
          set({ isVideoOff: false });
        } catch (err) {
          console.warn('Could not access camera, falling back to audio only', err);
          stream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
          set({ isVideoOff: true });
        }
      }

      set({ localStream: stream, otherUserId: remoteUserId });

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      });

      // Handle receiving remote stream
      pc.ontrack = (event) => {
        set({ remoteStream: event.streams[0] });
      };

      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      const socket = useChatStore.getState().socket;
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice_candidate', {
            to: remoteUserId,
            candidate: event.candidate
          });
        }
      };

      set({ peerConnection: pc });
      return pc;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Could not access camera/microphone. Please allow permissions or connect a microphone.');
      return null;
    }
  },

  callUser: async (userId, _userName, callType = 'video') => {
    const socket = useChatStore.getState().socket;
    if (!socket) return;

    const myId = useAuthStore.getState().user._id;
    set({ callStatus: 'active', otherUserId: userId, callType, pendingIceCandidates: [], callStartTime: null, callerId: myId });
    
    const pc = await get().setupWebRTC(true, userId, callType);
    if (!pc) {
      set({ callStatus: 'idle', otherUserId: null });
      return;
    }

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    socket.emit('call_user', {
      userToCall: userId,
      signalData: offer,
      from: useAuthStore.getState().user._id,
      name: useAuthStore.getState().user.name,
      callType: callType
    });
  },

  // Answer an incoming call
  answerCall: async () => {
    const socket = useChatStore.getState().socket;
    const { incomingCall } = get();
    if (!socket || !incomingCall) return;

    set({ callStatus: 'active', callStartTime: Date.now(), callerId: incomingCall.from });

    const pc = await get().setupWebRTC(false, incomingCall.from, incomingCall.callType || 'video');
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit('answer_call', {
      to: incomingCall.from,
      signal: answer
    });
  },

  // End call
  endCall: (emitToOther = true) => {
    const { localStream, peerConnection, otherUserId, callStartTime, callType, callStatus } = get();
    const socket = useChatStore.getState().socket;

    if (peerConnection) {
      peerConnection.close();
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    if (emitToOther && socket && otherUserId) {
      let duration;
      if (callStartTime && callStatus === 'active') {
        duration = Math.floor((Date.now() - callStartTime) / 1000);
      }
      socket.emit('end_call', { to: otherUserId, duration, callType, callerId: get().callerId });
    }

    set({
      localStream: null,
      remoteStream: null,
      peerConnection: null,
      callStatus: 'idle',
      incomingCall: null,
      otherUserId: null,
      isMuted: false,
      isVideoOff: false,
      pendingIceCandidates: [],
      callStartTime: null,
      callerId: null
    });
  },

  // Media Controls
  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted; // If currently muted, we want to enable (unmute)
      }
      set({ isMuted: !isMuted });
    }
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = isVideoOff; 
      }
      set({ isVideoOff: !isVideoOff });
    }
  },

  toggleScreenShare: async () => {
    const { peerConnection, localStream, isScreenSharing } = get();
    if (!peerConnection) return;

    try {
      if (isScreenSharing) {
        // Stop screen share and revert to camera
        const userStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        const videoTrack = userStream.getVideoTracks()[0];
        
        // Find the video sender and replace track
        const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(videoTrack);
        }

        // Stop the screen share tracks
        localStream.getVideoTracks().forEach(track => track.stop());
        
        // Keep audio track from old stream, replace video track
        const newStream = new MediaStream([videoTrack, localStream.getAudioTracks()[0]]);
        set({ localStream: newStream, isScreenSharing: false, isVideoOff: false });

      } else {
        // Start screen share
        const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = displayStream.getVideoTracks()[0];
        
        // Listen for user stopping screen share via browser UI
        screenTrack.onended = () => {
          get().toggleScreenShare(); // revert to camera
        };

        const sender = peerConnection.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }

        // Stop the camera track
        localStream.getVideoTracks().forEach(track => track.stop());

        // Create new stream with screen track and existing audio track
        const newStream = new MediaStream([screenTrack, localStream.getAudioTracks()[0]]);
        set({ localStream: newStream, isScreenSharing: true, isVideoOff: false });
      }
    } catch (err) {
      console.error("Error toggling screen share:", err);
    }
  }

}));

export default useCallStore;
