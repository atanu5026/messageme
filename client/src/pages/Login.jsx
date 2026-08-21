import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, error, isLoading } = useAuthStore();

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
              Sign In
            </h2>
            <p className="text-xs text-[#8e8e93] mt-1">Sign in with your MessageMe-secured credentials</p>
          </div>
        </div>

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
              <input
                name="password"
                type="password"
                required
                className="w-full glass-input placeholder-[#8e8e93] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all"
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
      </div>
    </div>
  );
};

export default Login;
