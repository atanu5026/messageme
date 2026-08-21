import React, { useState, useRef, useEffect } from 'react';
import useAuthStore from '../store/useAuthStore';
import useThemeStore from '../store/useThemeStore';
import QRCode from 'react-qr-code';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateProfile, updateProfilePicture, updateAbout, isLoading, error } = useAuthStore();
  const { getAccentHex } = useThemeStore();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [about, setAbout] = useState(user?.about || '');

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingAbout, setIsEditingAbout] = useState(false);
  const [showFullscreenQR, setShowFullscreenQR] = useState(false);

  const fileInputRef = useRef(null);

  // Keyboard Escape listener to close fullscreen QR
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowFullscreenQR(false);
      }
    };
    if (showFullscreenQR) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showFullscreenQR]);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const success = await updateProfile(name, email);
    if (success) setIsEditingProfile(false);
  };

  const handleAboutSubmit = async (e) => {
    e.preventDefault();
    const success = await updateAbout(about);
    if (success) setIsEditingAbout(false);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      await updateProfilePicture(file);
    }
  };

  const copyConnectCode = () => {
    if (user?.connectCode) {
      navigator.clipboard.writeText(user.connectCode);
      toast.success(`Connect code ${user.connectCode} copied!`);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8 space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7] tracking-tight">
          Connect ID & Profile
        </h1>
        <p className="text-xs sm:text-sm text-[#8e8e93] mt-0.5">Manage your identity and end-to-end connect details</p>
      </div>

      {error && (
        <div className="glass-card border-l-4 border-[#ff3b30] p-4 rounded-2xl">
          <p className="text-sm font-semibold text-[#ff3b30]">{error}</p>
        </div>
      )}

      {/* Connect Details Card */}
      <div className="glass-card p-6 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm transition-all space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#8e8e93] uppercase tracking-wider">Connect Identity</h3>
          <span className="text-[11px] font-semibold text-accent bg-accent-tint px-2.5 py-0.5 rounded-full border border-accent">
            Tap QR to Expand
          </span>
        </div>

        <div className="bg-accent-tint rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 border border-accent">
          <div className="text-center md:text-left space-y-1.5 flex-1">
            <p className="text-xs text-accent font-bold uppercase tracking-widest">4-Digit Connect Code</p>
            <div className="text-4xl sm:text-5xl font-black text-accent tracking-widest font-mono flex items-center justify-center md:justify-start space-x-3">
              <span>{user?.connectCode || '----'}</span>
              {user?.connectCode && (
                <button
                  onClick={copyConnectCode}
                  className="text-xs font-semibold px-2.5 py-1 rounded-full bg-accent text-white shadow-accent hover-bg-accent transition-colors"
                  title="Copy code"
                >
                  Copy
                </button>
              )}
            </div>
            <p className="text-xs text-[#8e8e93] max-w-sm leading-relaxed">
              Friends can scan your QR code or search code/phone number <span className="font-semibold text-[#1c1c1e] dark:text-[#f5f5f7]">({user?.phoneNumber || 'No phone set'})</span>.
            </p>
          </div>

          {/* Interactive QR Code Card */}
          <div
            onClick={() => user?.connectCode && setShowFullscreenQR(true)}
            className={`bg-white p-3 rounded-2xl shadow-sm border border-black/[0.06] shrink-0 ${user?.connectCode ? 'cursor-pointer hover:scale-105 hover:shadow-md transition-all active:scale-95 group relative' : ''}`}
            title="Click to expand fullscreen"
          >
            {user?.connectCode ? (
              <>
                <QRCode
                  value={`connect:${user.connectCode}`}
                  size={110}
                  fgColor={getAccentHex()}
                  level="Q"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-2xl transition-colors flex items-center justify-center">
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/75 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm">
                    🔍 Expand
                  </span>
                </div>
              </>
            ) : (
              <div className="w-[110px] h-[110px] bg-slate-100 flex items-center justify-center text-xs text-slate-400">No Code</div>
            )}
          </div>
        </div>
      </div>

      {/* Fullscreen QR Code Modal */}
      {showFullscreenQR && user?.connectCode && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/75 dark:bg-black/90 backdrop-blur-2xl p-4 sm:p-6 transition-all duration-300 animate-fade-in overflow-y-auto"
          onClick={() => setShowFullscreenQR(false)}
        >
          {/* Fullscreen QR Display Card */}
          <div 
            className="w-full max-w-sm glass-panel p-6 sm:p-8 rounded-3xl shadow-2xl border border-black/[0.08] dark:border-white/[0.1] flex flex-col items-center text-center space-y-5 relative z-10 my-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Card Header with Back Button */}
            <div className="w-full flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
              <button
                onClick={() => setShowFullscreenQR(false)}
                className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.14] text-[#1c1c1e] dark:text-[#f5f5f7] font-semibold text-xs border border-black/[0.06] dark:border-white/[0.08] transition-all active:scale-95 cursor-pointer shadow-sm"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                <span>Back</span>
              </button>

              <span className="text-[11px] font-bold text-accent uppercase tracking-wider">
                Connect Card
              </span>
            </div>

            {/* User Avatar & Identity Header */}
            <div className="flex flex-col items-center space-y-2">
              <div className="w-16 h-16 rounded-full overflow-hidden bg-slate-200 dark:bg-[#2c2c2e] border-2 border-white dark:border-[#3a3a3c] shadow-md">
                {user?.profilePicture ? (
                  <img src={user.profilePicture} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-accent font-bold text-2xl">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <h2 className="text-xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7] tracking-tight">{user?.name}</h2>
              <p className="text-xs text-[#8e8e93]">Scan with MessageMe camera to connect</p>
            </div>

            {/* Giant High-Resolution QR Code */}
            <div className="bg-white p-5 sm:p-6 rounded-3xl shadow-lg border border-black/[0.06] flex items-center justify-center">
              <QRCode
                value={`connect:${user.connectCode}`}
                size={230}
                fgColor={getAccentHex()}
                level="H"
              />
            </div>

            {/* Code Badge & Copy Action */}
            <div className="w-full space-y-2 pt-1">
              <div className="text-xs font-bold text-[#8e8e93] uppercase tracking-wider">Connect Code</div>
              <div className="text-3xl font-black text-accent font-mono tracking-widest bg-accent-tint py-2 px-6 rounded-2xl border border-accent">
                {user.connectCode}
              </div>
            </div>

            <button
              onClick={copyConnectCode}
              className="w-full py-2.5 px-4 bg-accent hover-bg-accent text-white font-semibold text-xs rounded-full shadow-accent transition-all active:scale-[0.98]"
            >
              Copy Connect Code
            </button>
          </div>

          {/* Perfectly Center-Aligned Dismiss Hint Text */}
          <p className="text-xs text-[#8e8e93] dark:text-[#8e8e93] font-medium text-center mt-4 select-none">
            Press <kbd className="px-1.5 py-0.5 rounded bg-black/10 dark:bg-white/10 font-mono text-[10px]">Esc</kbd> or tap outside to close
          </p>
        </div>
      )}

      {/* Profile Info Card */}
      <div className="glass-card p-6 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-6">
        {/* Avatar Section */}
        <div className="flex items-center space-x-5 pb-6 border-b border-black/[0.06] dark:border-white/[0.08]">
          <div className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full overflow-hidden bg-slate-200 dark:bg-[#2c2c2e] border-2 border-white dark:border-[#3a3a3c] shadow-sm shrink-0">
            {user?.profilePicture ? (
              <img src={user.profilePicture} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="h-full w-full flex items-center justify-center text-[#007aff] text-3xl font-bold">
                {user?.name?.charAt(0).toUpperCase()}
              </span>
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">{user?.name}</h3>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className="px-3.5 py-1.5 rounded-full text-xs font-semibold bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#1c1c1e] dark:text-[#f5f5f7] transition-all border border-black/[0.06] dark:border-white/[0.08]"
            >
              {isLoading ? 'Updating...' : 'Change Photo'}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
              accept="image/jpeg, image/png, image/webp"
            />
          </div>
        </div>

        {/* Personal Details */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#8e8e93] uppercase tracking-wider">Account Information</h4>
            {!isEditingProfile && (
              <button
                onClick={() => setIsEditingProfile(true)}
                className="text-xs font-semibold text-[#007aff] hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          {!isEditingProfile ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-2xl glass-input">
                <span className="text-xs text-[#8e8e93] font-medium block">Display Name</span>
                <p className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] mt-0.5">{user?.name}</p>
              </div>
              <div className="p-3.5 rounded-2xl glass-input">
                <span className="text-xs text-[#8e8e93] font-medium block">Email Address</span>
                <p className="text-sm font-semibold text-[#1c1c1e] dark:text-[#f5f5f7] mt-0.5">{user?.email}</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProfileSubmit} className="space-y-3 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[#007aff]/30">
              <div>
                <label className="block text-xs font-semibold text-[#8e8e93] mb-1">Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007aff]/40"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#8e8e93] mb-1">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007aff]/40"
                />
              </div>
              <div className="flex space-x-2 pt-1">
                <button type="submit" disabled={isLoading} className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#007aff] hover:bg-[#0066ee] text-white shadow-sm transition-all">Save</button>
                <button type="button" onClick={() => setIsEditingProfile(false)} className="px-4 py-1.5 rounded-full text-xs font-semibold text-[#8e8e93] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]">Cancel</button>
              </div>
            </form>
          )}
        </div>

        {/* About Section */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-[#8e8e93] uppercase tracking-wider">Bio / Status</h4>
            {!isEditingAbout && (
              <button
                onClick={() => setIsEditingAbout(true)}
                className="text-xs font-semibold text-[#007aff] hover:underline"
              >
                Edit
              </button>
            )}
          </div>

          {!isEditingAbout ? (
            <div className="p-3.5 rounded-2xl glass-input">
              <p className="text-sm text-[#1c1c1e] dark:text-[#f5f5f7]">{user?.about || 'Available'}</p>
            </div>
          ) : (
            <form onSubmit={handleAboutSubmit} className="space-y-3 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-[#007aff]/30">
              <div>
                <textarea
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  rows={3}
                  maxLength={150}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#007aff]/40 resize-none"
                />
              </div>
              <div className="flex space-x-2">
                <button type="submit" disabled={isLoading} className="px-4 py-1.5 rounded-full text-xs font-semibold bg-[#007aff] hover:bg-[#0066ee] text-white shadow-sm transition-all">Save</button>
                <button type="button" onClick={() => setIsEditingAbout(false)} className="px-4 py-1.5 rounded-full text-xs font-semibold text-[#8e8e93] hover:bg-black/[0.05] dark:hover:bg-white/[0.08]">Cancel</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
