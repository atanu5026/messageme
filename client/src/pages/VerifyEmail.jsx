import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const VerifyEmail = () => {
  const [otp, setOtp] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';
  
  const { verifyEmail, error, isLoading } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      alert("Email not found. Please register again.");
      return navigate('/register');
    }
    const success = await verifyEmail(email, otp);
    if (success) {
      alert("Email verified successfully! You can now login.");
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f2f7] dark:bg-[#000000] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300 messageme-tint-bg">
      <div className="max-w-md w-full glass-panel p-8 sm:p-10 rounded-3xl shadow-2xl border border-black/[0.06] dark:border-white/[0.08] relative z-10 space-y-6">
        <div className="text-center space-y-2.5">
          <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-white mx-auto shadow-accent transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
              <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7] tracking-tight">
              Verification Code
            </h2>
            <p className="text-xs text-[#8e8e93] mt-1">
              Enter the 6-digit code sent to <span className="font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">{email || 'your email'}</span>
            </p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-[#ff3b30]/10 border border-[#ff3b30]/20 p-3 rounded-2xl">
              <p className="text-xs font-semibold text-[#ff3b30] text-center">{error}</p>
            </div>
          )}
          <div>
            <label htmlFor="otp" className="sr-only">OTP Code</label>
            <input
              name="otp"
              type="text"
              required
              maxLength="6"
              className="w-full glass-input rounded-2xl px-4 py-3 text-center tracking-[0.5em] font-mono text-2xl font-bold focus:outline-none focus:ring-2 focus:ring-accent transition-all placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || otp.length < 6}
              className="w-full py-2.5 px-4 bg-accent hover-bg-accent text-white font-semibold text-sm rounded-full shadow-accent disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {isLoading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default VerifyEmail;
