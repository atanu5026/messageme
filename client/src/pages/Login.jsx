import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import QRCode from 'react-qr-code';
import { io } from 'socket.io-client';
import useAuthStore from '../store/useAuthStore';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState('password'); // 'password' or 'qr'
  const [qrSessionId, setQrSessionId] = useState('');
  const { login, error, isLoading } = useAuthStore();

  useEffect(() => {
    if (loginMethod === 'qr') {
      const sessionId = Math.random().toString(36).substring(2, 15);
      setQrSessionId(sessionId);

      const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:3000', {
        auth: { isQRDesktop: true } // Bypass standard auth
      });

      socket.on('connect', () => {
        socket.emit('qr_login_join', sessionId);
      });

      socket.on('qr_login_success', ({ token, privateKey }) => {
        // Set the token where api.js and useAuthStore expect it
        localStorage.setItem('token', token);
        if (privateKey) {
          localStorage.setItem('e2ee_private_key', privateKey);
        }
        document.cookie = `token=${token}; path=/; max-age=86400`; // 1 day
        socket.disconnect();
        window.location.href = '/';
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [loginMethod]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await login(email, password);
    if (success) {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f2f7] dark:bg-[#000000] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300 messageme-tint-bg">
      <div className="max-w-md w-full glass-panel p-8 sm:p-10 rounded-3xl shadow-2xl border border-black/[0.06] dark:border-white/[0.08] relative z-10 space-y-7">
        <div className="text-center space-y-2.5">
          <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-white mx-auto shadow-accent transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path fillRule="evenodd" d="M4.804 21.644A6.707 6.707 0 006 21.75a6.721 6.721 0 003.583-1.029c.774.182 1.584.279 2.417.279 5.322 0 9.75-3.97 9.75-9 0-5.03-4.428-9-9.75-9s-9.75 3.97-9.75 9c0 2.409 1.025 4.587 2.674 6.192.232.226.277.428.254.543a3.73 3.73 0 01-.814 1.686.75.75 0 00.444 1.223zM8.25 10.875a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25zM10.875 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875-1.125a1.125 1.125 0 100 2.25 1.125 1.125 0 000-2.25z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7] tracking-tight">
              {loginMethod === 'qr' ? 'Login with QR' : 'Sign In'}
            </h2>
            <p className="text-xs text-[#8e8e93] mt-1">
              {loginMethod === 'qr' ? 'Use MessageMe on your phone to scan this code' : 'Sign in with your MessageMe-secured credentials'}
            </p>
          </div>
        </div>

        {/* Toggle Login Method */}
        <div className="flex bg-black/[0.04] dark:bg-white/[0.08] rounded-xl p-1 w-full max-w-xs mx-auto">
          <button 
            onClick={() => setLoginMethod('password')}
            className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${loginMethod === 'password' ? 'bg-white dark:bg-[#1c1c1e] shadow-sm text-[#1c1c1e] dark:text-[#f5f5f7]' : 'text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]'}`}
          >
            Password
          </button>
          <button 
            onClick={() => setLoginMethod('qr')}
            className={`flex-1 text-xs font-bold py-2 rounded-lg transition-all ${loginMethod === 'qr' ? 'bg-white dark:bg-[#1c1c1e] shadow-sm text-[#1c1c1e] dark:text-[#f5f5f7]' : 'text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7]'}`}
          >
            QR Code
          </button>
        </div>

        {loginMethod === 'qr' ? (
          <div className="flex flex-col items-center justify-center py-6 space-y-6">
            <div className="bg-white p-4 rounded-3xl shadow-sm border border-black/5">
              {qrSessionId ? (
                <QRCode 
                  value={JSON.stringify({ type: 'messageme_qr_login', sessionId: qrSessionId })} 
                  size={200}
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-100 rounded-xl animate-pulse"></div>
              )}
            </div>
            <div className="text-center space-y-2 text-sm text-[#8e8e93]">
              <p>1. Open MessageMe on your phone</p>
              <p>2. Tap the <strong>QR Code icon</strong> in the sidebar</p>
              <p>3. Point your phone to this screen to confirm login</p>
            </div>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-[#ff3b30]/10 border border-[#ff3b30]/20 p-3 rounded-2xl">
              <p className="text-xs font-semibold text-[#ff3b30] text-center">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#8e8e93] mb-1">Email Address</label>
              <input
                name="email"
                type="email"
                required
                className="w-full glass-input placeholder-[#8e8e93] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                placeholder="you@messageme.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8e8e93] mb-1">Password</label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full glass-input placeholder-[#8e8e93] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all pr-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-[#f5f5f7] transition-colors"
                >
                  {showPassword ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-accent hover-bg-accent text-white font-semibold text-sm rounded-full shadow-accent disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </div>
          
          <div className="text-center pt-2">
            <p className="text-xs text-[#8e8e93]">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-accent hover:underline">
                Create one now
              </Link>
            </p>
          </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Login;
