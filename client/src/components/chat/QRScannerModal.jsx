import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

const QRScannerModal = ({ isOpen, onClose }) => {
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    setIsScanning(true);
    
    // Initialize scanner when modal opens
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      async (decodedText) => {
        // Stop scanning after success
        scanner.clear();
        setIsScanning(false);
        
        try {
          const data = JSON.parse(decodedText);
          if (data.type === 'messageme_qr_login' && data.sessionId) {
            // Read auth token from localStorage (saved on normal login)
            const token = localStorage.getItem('token')
                       || document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] 
                       || '';
            
            const privateKey = localStorage.getItem('e2ee_private_key');
            
            // Connect a temporary socket to send the approval
            const tempSocket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000', {
              auth: { token }
            });
            
            tempSocket.on('connect', () => {
              tempSocket.emit('qr_login_approve', { 
                sessionId: data.sessionId, 
                token,
                privateKey
              });
              
              toast.success('Device linked successfully!');
              setTimeout(() => {
                tempSocket.disconnect();
                onClose();
              }, 1500);
            });
          } else {
            toast.error('Invalid QR Code');
            onClose();
          }
        } catch (e) {
          toast.error('Unrecognized QR format');
          onClose();
        }
      },
      (error) => {
        // ignore continuous scanning errors
      }
    );

    return () => {
      scanner.clear().catch(e => console.error(e));
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity" onClick={onClose}></div>
      <div className="relative w-full max-w-md bg-white/80 dark:bg-[#1c1c1e]/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6 text-center border border-white/40 dark:border-white/10 animate-scale-in">
        <h2 className="text-xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7] mb-2">Scan QR Code</h2>
        <p className="text-sm text-[#8e8e93] mb-6">Point your camera at the desktop screen to link your device.</p>
        
        <div className="bg-black/5 dark:bg-white/5 rounded-2xl overflow-hidden min-h-[300px]">
          <div id="qr-reader" className={`w-full h-full ${!isScanning ? 'hidden' : ''}`}></div>
          {!isScanning && (
            <div className="flex flex-col items-center justify-center h-[300px] space-y-4">
              <div className="w-16 h-16 bg-[#34c759]/20 text-[#34c759] rounded-full flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                  <path fillRule="evenodd" d="M19.916 4.626a.75.75 0 01.208 1.04l-9 13.5a.75.75 0 01-1.154.114l-6-6a.75.75 0 011.06-1.06l5.353 5.353 8.493-12.739a.75.75 0 011.04-.208z" clipRule="evenodd" />
                </svg>
              </div>
              <p className="text-lg font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">Success!</p>
            </div>
          )}
        </div>
        
        <button 
          onClick={onClose}
          className="mt-6 w-full py-3 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 transition-colors font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default QRScannerModal;
