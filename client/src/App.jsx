import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/useAuthStore';
import useChatStore from './store/useChatStore';
import useCallStore from './store/useCallStore';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import VerifyEmail from './pages/VerifyEmail';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Chat from './pages/Chat';
import { Link } from 'react-router-dom';
import VideoCall from './components/call/VideoCall';
import { Toaster } from 'react-hot-toast';
import useThemeStore from './store/useThemeStore';
import OfflineBanner from './components/OfflineBanner';
import { ReactLenis } from 'lenis/react';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  const { checkAuth, isLoading, user } = useAuthStore();
  const { initializeSocket, disconnectSocket } = useChatStore();
  const { initCallListeners } = useCallStore();
  const { initTheme, isDarkMode, toggleDarkMode } = useThemeStore();

  useEffect(() => {
    checkAuth();
    initTheme();

    // Request system notification permission on load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, [checkAuth, initTheme]);

  useEffect(() => {
    if (user) {
      const token = localStorage.getItem('token');
      if (token) {
        initializeSocket(token);
      }
      // Wait for socket to connect before initializing call listeners
      setTimeout(() => {
        initCallListeners();
      }, 500);

      const handleOnline = () => {
        useChatStore.getState().syncOfflineMessages();
      };
      window.addEventListener('online', handleOnline);

      return () => {
        disconnectSocket();
        window.removeEventListener('online', handleOnline);
      };
    } else {
      disconnectSocket();
    }
  }, [user, initializeSocket, disconnectSocket, initCallListeners]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f2f7] dark:bg-[#000000] relative overflow-hidden transition-colors duration-300 messageme-tint-bg">
        <style>{`
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(1.5); opacity: 0; }
          }
          @keyframes float-icon {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-8px); }
          }
        `}</style>
        
        {/* Background glow effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-accent/20 dark:bg-accent/30 rounded-full blur-[80px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center">
          {/* Pulsing rings */}
          <div className="relative flex items-center justify-center w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-accent/40" style={{ animation: 'pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite' }}></div>
            <div className="absolute inset-0 rounded-full border-2 border-accent/40" style={{ animation: 'pulse-ring 2s cubic-bezier(0.215, 0.61, 0.355, 1) 1s infinite' }}></div>
            
            {/* Glass Icon Container */}
            <div className="w-16 h-16 rounded-3xl glass-panel shadow-2xl border border-black/5 dark:border-white/10 flex items-center justify-center" style={{ animation: 'float-icon 3s ease-in-out infinite' }}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 text-accent drop-shadow-sm">
                <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.444 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7] tracking-tight mb-2">MessageMe</h2>
          <div className="flex space-x-1.5 items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-1.5 h-1.5 rounded-full bg-accent animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ReactLenis root>
      <Router>
        <OfflineBanner />
      <Toaster 
        position="top-right" 
        toastOptions={{
          className: '!bg-white/90 dark:!bg-[#1c1c1e]/90 !backdrop-blur-2xl !text-[#1c1c1e] dark:!text-[#f5f5f7] !border !border-black/[0.06] dark:border-white/[0.08] !shadow-2xl !rounded-2xl',
        }}
      />
      <VideoCall />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <div className="h-[100dvh] pt-safe-top pb-safe-bottom pl-safe-left pr-safe-right bg-[#f2f2f7] dark:bg-[#000000] flex flex-col transition-colors duration-300 overflow-hidden relative messageme-tint-bg">
                {/* MessageMe Tinted Glass Navbar */}
                <nav className="glass-panel px-4 sm:px-6 py-2.5 sm:py-3 flex justify-between items-center z-20 shrink-0 border-b border-black/[0.06] dark:border-white/[0.08] transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-2xl bg-accent flex items-center justify-center text-white shadow-accent shrink-0 transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 sm:w-5 sm:h-5">
                        <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.444 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <h1 className="text-base sm:text-lg font-bold text-[#1c1c1e] dark:text-[#f5f5f7] tracking-tight">
                        MessageMe
                      </h1>
                    </div>
                    <span className="hidden md:inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-black/[0.04] dark:bg-white/[0.08] text-slate-700 dark:text-zinc-300 border border-black/[0.04] dark:border-white/[0.06]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#34c759]"></span>
                      <span>E2EE Protected</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 sm:space-x-3 text-xs sm:text-sm">
                    <button 
                      onClick={toggleDarkMode} 
                      className="px-3 py-1.5 rounded-full glass-card hover:bg-black/[0.06] dark:hover:bg-white/[0.1] text-[#1c1c1e] dark:text-[#f5f5f7] transition-all flex items-center space-x-1.5 border border-black/[0.06] dark:border-white/[0.08]"
                      title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                    >
                      <span className="text-xs">{isDarkMode ? '☀️' : '🌙'}</span>
                      <span className="font-semibold text-xs">{isDarkMode ? 'Light' : 'Dark'}</span>
                    </button>
                    
                    <Link 
                      to="/profile" 
                      className="px-3 py-1.5 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#1c1c1e] dark:text-[#f5f5f7] font-semibold transition-all"
                    >
                      Profile
                    </Link>
                    
                    <Link 
                      to="/settings" 
                      className="px-3 py-1.5 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#1c1c1e] dark:text-[#f5f5f7] font-semibold transition-all"
                    >
                      Settings
                    </Link>
                  </div>
                </nav>

                <div className="flex-1 w-full overflow-hidden relative z-10">
                  <Chat />
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-[#f2f2f7] dark:bg-[#000000] transition-colors duration-300 relative messageme-tint-bg">
                <nav className="glass-panel px-4 sm:px-6 py-3 flex justify-between items-center z-20 sticky top-0 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex items-center space-x-3">
                    <Link to="/" className="px-3 py-1.5 rounded-full glass-card text-[#1c1c1e] dark:text-[#f5f5f7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] font-semibold flex items-center space-x-1.5 text-xs sm:text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                      <span>Chats</span>
                    </Link>
                    <span className="text-base font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">MessageMe</span>
                  </div>
                  <div className="flex space-x-2 text-xs sm:text-sm">
                    <Link to="/profile" className="px-3.5 py-1.5 rounded-full bg-accent text-white font-semibold shadow-accent transition-colors">Profile</Link>
                    <Link to="/settings" className="px-3.5 py-1.5 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#1c1c1e] dark:text-[#f5f5f7] font-semibold">Settings</Link>
                  </div>
                </nav>
                <div className="relative z-10">
                  <Profile />
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <div className="min-h-screen bg-[#f2f2f7] dark:bg-[#000000] transition-colors duration-300 relative messageme-tint-bg">
                <nav className="glass-panel px-4 sm:px-6 py-3 flex justify-between items-center z-20 sticky top-0 border-b border-black/[0.06] dark:border-white/[0.08]">
                  <div className="flex items-center space-x-3">
                    <Link to="/" className="px-3 py-1.5 rounded-full glass-card text-[#1c1c1e] dark:text-[#f5f5f7] hover:bg-black/[0.05] dark:hover:bg-white/[0.08] font-semibold flex items-center space-x-1.5 text-xs sm:text-sm">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                      <span>Chats</span>
                    </Link>
                    <span className="text-base font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">MessageMe</span>
                  </div>
                  <div className="flex space-x-2 text-xs sm:text-sm">
                    <Link to="/profile" className="px-3.5 py-1.5 rounded-full hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#1c1c1e] dark:text-[#f5f5f7] font-semibold">Profile</Link>
                    <Link to="/settings" className="px-3.5 py-1.5 rounded-full bg-accent text-white font-semibold shadow-accent transition-colors">Settings</Link>
                  </div>
                </nav>
                <div className="relative z-10">
                  <Settings />
                </div>
              </div>
            </ProtectedRoute>
          } 
        />
        </Routes>
      </Router>
    </ReactLenis>
  );
}

export default App;
