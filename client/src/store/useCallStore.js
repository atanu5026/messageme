import { create } from 'zustand';
import useAuthStore from './useAuthStore';
import useChatStore from './useChatStore';

const useCallStore = create((set, get) => ({
  localStream: null,
  remoteStream: null,
  peerConnection: null,
  
  callStatus: 'idle', // idle | ringing | active
  incomingCall: null, // { from: userId, name: string, signal: SDP }
  otherUserId: null,  // The person we are calling or talking to

  isMuted: false,
  isVideoOff: false,
  isScreenSharing: false,
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

    socket.on('call_user', async ({ signal, from, name }) => {
      set({
        incomingCall: { from, name, signal },
        callStatus: 'ringing',
        otherUserId: from,
        pendingIceCandidates: [] // reset on new call
      });
    });

    socket.on('call_accepted', async (signal) => {
      const pc = get().peerConnection;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal));
        
        // Apply any ICE candidates that arrived before we got the answer
        const { pendingIceCandidates } = get();
        for (const candidate of pendingIceCandidates) {
          pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e));
        }
        set({ callStatus: 'active', pendingIceCandidates: [] });
      }
    });

    socket.on('ice_candidate', (candidate) => {
      const pc = get().peerConnection;
      if (pc && pc.remoteDescription) {
        pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e));
      } else {
        // Cache them if pc is not ready or remoteDescription is not set
        set({ pendingIceCandidates: [...get().pendingIceCandidates, candidate] });
      }
    });

    socket.on('call_ended', () => {
      get().endCall(false); // false means don't emit end_call again
    });
  },

  // Setup media and create a PeerConnection
  setupWebRTC: async (isCaller, remoteUserId) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      set({ localStream: stream, otherUserId: remoteUserId });

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' }
        ]
      });

      // Add local tracks to peer connection
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        if (event.streams && event.streams[0]) {
          set({ remoteStream: event.streams[0] });
        }
      };

      // Handle ICE candidates
      const socket = useChatStore.getState().socket;
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice_candidate', {
            to: get().otherUserId,
            candidate: event.candidate
          });
        }
      };

      set({ peerConnection: pc });
      return pc;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      alert('Could not access camera/microphone. Please allow permissions.');
      return null;
    }
  },

  // Initiate a call to another user
  callUser: async (userId, _userName) => {
    const socket = useChatStore.getState().socket;
    if (!socket) return;

    set({ callStatus: 'active', otherUserId: userId, pendingIceCandidates: [] });
    
    const pc = await get().setupWebRTC(true, userId);
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
      name: useAuthStore.getState().user.name
    });
  },

  // Answer an incoming call
  answerCall: async () => {
    const socket = useChatStore.getState().socket;
    const { incomingCall } = get();
    if (!socket || !incomingCall) return;

    set({ callStatus: 'active' });

    const pc = await get().setupWebRTC(false, incomingCall.from);
    if (!pc) return;

    await pc.setRemoteDescription(new RTCSessionDescription(incomingCall.signal));
    
    // Apply pending ICE candidates now that remoteDescription is set
    const { pendingIceCandidates } = get();
    for (const candidate of pendingIceCandidates) {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(e => console.error(e));
    }
    set({ pendingIceCandidates: [] });
    
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    socket.emit('answer_call', {
      to: incomingCall.from,
      signal: answer
    });

    set({ incomingCall: null });
  },

  // Reject or End a call
  endCall: (emitToOther = true) => {
    const { peerConnection, localStream, otherUserId } = get();
    const socket = useChatStore.getState().socket;

    if (peerConnection) {
      peerConnection.close();
    }
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    if (emitToOther && socket && otherUserId) {
      socket.emit('end_call', { to: otherUserId });
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
      pendingIceCandidates: []
    });
  },

  // Media Controls
  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks()[0].enabled = isMuted; // If currently muted, we want to enable (unmute)
      set({ isMuted: !isMuted });
    }
  },

  toggleVideo: () => {
    const { localStream, isVideoOff } = get();
    if (localStream) {
      localStream.getVideoTracks()[0].enabled = isVideoOff; 
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
        const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
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

        const sender = peerConnection.getSenders().find(s => s.track.kind === 'video');
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
