import React, { useState, useRef } from 'react';

const AudioRecorder = ({ onSendAudio, isUploading }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        onSendAudio(audioBlob);
        
        // Stop all tracks to release the microphone
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current.start();
      setIsRecording(true);
      
      // Start Timer
      setRecordingTime(0);
      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
      
    } catch (err) {
      console.error("Failed to start recording:", err);
      alert("Microphone permission denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };
  
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = () => {
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      };
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  if (isRecording) {
    return (
      <div className="flex items-center space-x-2 bg-[#ff3b30]/10 px-3 py-1.5 rounded-full border border-[#ff3b30]/25 backdrop-blur-md">
        <div className="flex items-center space-x-2 text-[#ff3b30]">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff3b30] animate-pulse"></div>
          <span className="text-xs font-bold font-mono tracking-wider">{formatTime(recordingTime)}</span>
        </div>
        <button 
          onClick={cancelRecording} 
          className="text-[#8e8e93] hover:text-[#ff3b30] p-1 transition-colors"
          title="Cancel"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <button 
          onClick={stopRecording} 
          className="bg-[#ff3b30] text-white rounded-full p-1.5 hover:bg-[#e02b20] shadow-sm transition-transform active:scale-95"
          title="Send Voice Memo"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={startRecording}
      disabled={isUploading}
      className={`p-2 rounded-full transition-all ${
        isUploading 
          ? 'text-[#8e8e93]/50 cursor-not-allowed' 
          : 'text-[#8e8e93] hover:text-[#007aff] hover:bg-black/[0.04] dark:hover:bg-white/[0.08]'
      }`}
      title="Record Voice Memo"
    >
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.75} stroke="currentColor" className="w-5 h-5 sm:w-6 sm:h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
    </button>
  );
};

export default AudioRecorder;
