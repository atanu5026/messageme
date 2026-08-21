import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const { register, error, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await register(name, email, password, phoneNumber);
    if (success) {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f2f2f7] dark:bg-[#000000] py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden transition-colors duration-300 messageme-tint-bg">
      <div className="max-w-md w-full glass-panel p-8 sm:p-10 rounded-3xl shadow-2xl border border-black/[0.06] dark:border-white/[0.08] relative z-10 space-y-6">
        <div className="text-center space-y-2.5">
          <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center text-white mx-auto shadow-accent transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7] tracking-tight">
              Create Account
            </h2>
            <p className="text-xs text-[#8e8e93] mt-1">Get your encrypted identity & private keys</p>
          </div>
        </div>

        <form className="space-y-3.5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-[#ff3b30]/10 border border-[#ff3b30]/20 p-3 rounded-2xl">
              <p className="text-xs font-semibold text-[#ff3b30] text-center">{error}</p>
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#8e8e93] mb-1">Full Name</label>
              <input
                name="name"
                type="text"
                required
                className="w-full glass-input placeholder-[#8e8e93] rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                placeholder="Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8e8e93] mb-1">Phone Number</label>
              <input
                name="phoneNumber"
                type="tel"
                required
                className="w-full glass-input placeholder-[#8e8e93] rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                placeholder="+1 (555) 000-0000"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8e8e93] mb-1">Email Address</label>
              <input
                name="email"
                type="email"
                required
                className="w-full glass-input placeholder-[#8e8e93] rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                placeholder="you@messageme.app"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8e8e93] mb-1">Password</label>
              <input
                name="password"
                type="password"
                required
                className="w-full glass-input placeholder-[#8e8e93] rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-accent hover-bg-accent text-white font-semibold text-sm rounded-full shadow-accent disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {isLoading ? 'Generating Keys...' : 'Create Account'}
            </button>
          </div>
          
          <div className="text-center pt-1">
            <p className="text-xs text-[#8e8e93]">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-accent hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;
