import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { register, error, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const calculateStrength = (pass) => {
    let score = 0;
    if (pass.length > 5) score += 1;
    if (pass.length > 7) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const strength = calculateStrength(password);
  
  const getStrengthConfig = (s) => {
    if (password.length === 0) return { label: '', color: 'bg-transparent', width: '0%' };
    if (s <= 1) return { label: 'Weak', color: 'bg-[#ff3b30]', width: '20%' };
    if (s === 2) return { label: 'Fair', color: 'bg-[#ff9500]', width: '40%' };
    if (s === 3) return { label: 'Good', color: 'bg-[#ffcc00]', width: '60%' };
    if (s === 4) return { label: 'Strong', color: 'bg-[#34c759]', width: '80%' };
    return { label: 'Very Strong', color: 'bg-[#32d74b]', width: '100%' };
  };

  const strengthConfig = getStrengthConfig(strength);

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
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full glass-input placeholder-[#8e8e93] rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent transition-all pr-10"
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
              {/* Password Strength Meter */}
              {password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-semibold">
                    <span className="text-[#8e8e93]">Strength</span>
                    <span className={strengthConfig.color.replace('bg-', 'text-')}>{strengthConfig.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-black/[0.04] dark:bg-white/[0.08] rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${strengthConfig.color} transition-all duration-300`} 
                      style={{ width: strengthConfig.width }}
                    ></div>
                  </div>
                </div>
              )}
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
