import React, { useState } from 'react';
import useAuthStore from '../store/useAuthStore';
import useThemeStore, { ACCENT_COLORS } from '../store/useThemeStore';
import { useNavigate } from 'react-router-dom';
import QRScannerModal from '../components/chat/QRScannerModal';

const Settings = () => {
  const { user, updatePassword, updatePrivacySettings, logout, isLoading, error } = useAuthStore();
  const { isDarkMode, toggleDarkMode, accentColor, setAccentColor, accentIntensity, setAccentIntensity } = useThemeStore();
  
  const [activeTab, setActiveTab] = useState('appearance');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showQRScanner, setShowQRScanner] = useState(false);
  
  const [lastSeen, setLastSeen] = useState(user?.privacySettings?.lastSeen || 'everyone');
  const [statusPrivacy, setStatusPrivacy] = useState(user?.privacySettings?.status || 'everyone');
  
  const navigate = useNavigate();

  const [notifPermission, setNotifPermission] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'granted'
  );

  const handleRequestNotification = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPermission(perm);
      if (perm === 'granted') {
        new Notification('MessageMe Notifications Enabled', {
          body: 'You will now receive desktop notifications for new messages!',
          icon: '/vite.svg',
        });
      }
    }
  };

  const handleTestNotification = () => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('MessageMe Test Notification', {
        body: 'Notifications are working properly on your device.',
        icon: '/vite.svg',
      });
    } else {
      handleRequestNotification();
    }
  };

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    const success = await updatePassword(currentPassword, newPassword);
    if (success) {
      alert("Password updated successfully!");
      setCurrentPassword('');
      setNewPassword('');
    }
  };

  const handlePrivacyUpdate = async (e) => {
    e.preventDefault();
    const success = await updatePrivacySettings(lastSeen, statusPrivacy);
    if (success) {
      alert("Privacy settings updated successfully!");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Extensible Settings Navigation Tabs
  const settingsTabs = [
    { id: 'appearance', label: 'Appearance & Accent', icon: '🎨', description: 'Themes, accent colors & styling' },
    { id: 'notifications', label: 'Notifications', icon: '🔔', description: 'System alerts & permissions' },
    { id: 'privacy', label: 'Privacy & Visibility', icon: '🛡️', description: 'Last seen & story permissions' },
    { id: 'security', label: 'Account & Security', icon: '🔒', description: 'Password & credentials' },
    { id: 'devices', label: 'Linked Devices', icon: '📱', description: 'Link to mobile app using QR code' },
    { id: 'about', label: 'About MessageMe', icon: 'ℹ️', description: 'Encryption, version & developer info' },
  ];

  const currentTabObj = settingsTabs.find(t => t.id === activeTab) || settingsTabs[0];

  return (
    <div className="max-w-5xl mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#1c1c1e] dark:text-[#f5f5f7] tracking-tight">
            Settings
          </h1>
          <p className="text-xs sm:text-sm text-[#8e8e93] mt-0.5">Customize your app experience, security, and privacy</p>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setShowMobileMenu(true)}
          className="md:hidden flex items-center space-x-2 px-3.5 py-2 rounded-2xl glass-card border border-black/[0.06] dark:border-white/[0.08] text-[#1c1c1e] dark:text-[#f5f5f7] hover:bg-black/[0.04] dark:hover:bg-white/[0.08] text-xs font-semibold active:scale-95 shadow-sm"
          title="Open Settings Menu"
        >
          <span className="text-sm">{currentTabObj.icon}</span>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 text-accent">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
          <span className="font-bold">Menu</span>
        </button>
      </div>

      {error && (
        <div className="glass-card border-l-4 border-[#ff3b30] p-4 rounded-2xl">
          <p className="text-sm font-semibold text-[#ff3b30]">{error}</p>
        </div>
      )}

      {/* Main Settings Layout (Sidebar + Content) */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        
        {/* Left Settings Sidebar (Visible on Desktop only) */}
        <div className="hidden md:block w-64 lg:w-72 shrink-0 glass-card rounded-3xl p-3 border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-1">
          <div className="px-3 py-2 text-[11px] font-bold text-[#8e8e93] uppercase tracking-wider">
            Preferences
          </div>

          {/* Desktop Tab List */}
          <div className="space-y-1">
            {settingsTabs.map((tab) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150 text-left active:scale-[0.98] ${
                    isSelected
                      ? 'bg-accent text-white shadow-accent font-bold'
                      : 'text-[#1c1c1e] dark:text-[#f5f5f7] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] bg-transparent'
                  }`}
                >
                  <span className="text-lg shrink-0">{tab.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">{tab.label}</p>
                    <p className={`text-[10px] truncate font-normal mt-0.5 ${isSelected ? 'text-white/80' : 'text-[#8e8e93]'}`}>
                      {tab.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Desktop Sign Out Button */}
          <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
            <button
              onClick={handleLogout}
              className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold text-[#ff3b30] hover:bg-[#ff3b30]/10 transition-colors text-left"
            >
              <span className="text-base">🚪</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Right Settings Content Area */}
        <div className="flex-1 w-full min-w-0 space-y-6">
          
          {/* TAB 1: Appearance & Accent Colors */}
          {activeTab === 'appearance' && (
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-6 animate-fade-in">
              <div className="border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                <h2 className="text-lg font-bold text-[#1c1c1e] dark:text-[#f5f5f7] flex items-center space-x-2">
                  <span>🎨</span>
                  <span>Appearance & Colors</span>
                </h2>
                <p className="text-xs text-[#8e8e93] mt-0.5">Customize your app interface mode and accent color</p>
              </div>

              {/* Light / Dark Mode Toggle */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-[#8e8e93] uppercase tracking-wider">Interface Theme</label>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  <button
                    onClick={() => { if (isDarkMode) toggleDarkMode(); }}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col space-y-2 ${
                      !isDarkMode
                        ? 'border-accent bg-accent-tint shadow-sm ring-2 ring-accent'
                        : 'border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="text-2xl">☀️</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">Light Mode</h4>
                      <p className="text-[10px] text-[#8e8e93]">Clean MessageMe light canvas</p>
                    </div>
                  </button>

                  <button
                    onClick={() => { if (!isDarkMode) toggleDarkMode(); }}
                    className={`p-4 rounded-2xl border text-left transition-all flex flex-col space-y-2 ${
                      isDarkMode
                        ? 'border-accent bg-accent-tint shadow-sm ring-2 ring-accent'
                        : 'border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="text-2xl">🌙</span>
                    <div>
                      <h4 className="text-xs font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">Dark Mode</h4>
                      <p className="text-[10px] text-[#8e8e93]">Deep OLED black canvas</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Accent Color Picker */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-[#8e8e93] uppercase tracking-wider">Accent Color</label>
                  <span className="text-xs font-bold text-accent capitalize">
                    {ACCENT_COLORS[accentColor]?.name || 'Light Blue'}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {Object.values(ACCENT_COLORS).map((color) => {
                    const isCurrent = accentColor === color.id;
                    return (
                      <button
                        key={color.id}
                        onClick={() => setAccentColor(color.id)}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center space-y-2 active:scale-95 ${
                          isCurrent
                            ? 'border-accent bg-accent-tint shadow-md ring-2 ring-accent'
                            : 'border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <div 
                          className="w-8 h-8 rounded-full shadow-md flex items-center justify-center text-white text-xs font-bold transition-transform hover:scale-110"
                          style={{ backgroundColor: color.hex }}
                        >
                          {isCurrent && '✓'}
                        </div>
                        <span className="text-[11px] font-bold text-[#1c1c1e] dark:text-[#f5f5f7] truncate max-w-full">
                          {color.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Accent Intensity Slider */}
              <div className="space-y-3 pt-2 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08]">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">Color Intensity</label>
                    <p className="text-[10px] text-[#8e8e93]">Adjust saturation, tint glow, and accent vibrancy</p>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-accent text-white shadow-accent">
                    {accentIntensity}% {accentIntensity < 60 ? '(Soft)' : accentIntensity < 90 ? '(Subtle)' : accentIntensity <= 105 ? '(Standard)' : '(Ultra)'}
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <input
                    type="range"
                    min="30"
                    max="130"
                    step="5"
                    value={accentIntensity}
                    onChange={(e) => setAccentIntensity(Number(e.target.value))}
                    className="w-full h-2 bg-black/[0.1] dark:bg-white/[0.15] rounded-lg appearance-none cursor-pointer accent-current text-accent"
                  />
                  <div className="flex justify-between text-[10px] text-[#8e8e93] font-semibold">
                    <span>30% Pastel</span>
                    <span>75% Muted</span>
                    <span>100% Standard</span>
                    <span>130% Ultra Vivid</span>
                  </div>
                </div>

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {[
                    { label: 'Soft Pastel', val: 50 },
                    { label: 'Subtle', val: 75 },
                    { label: 'Standard', val: 100 },
                    { label: 'Ultra Vivid', val: 125 }
                  ].map(p => (
                    <button
                      key={p.val}
                      onClick={() => setAccentIntensity(p.val)}
                      className={`px-3 py-1 rounded-xl text-[11px] font-bold transition-all ${
                        accentIntensity === p.val
                          ? 'bg-accent text-white shadow-accent'
                          : 'glass-card hover:bg-black/[0.05] dark:hover:bg-white/[0.08] text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] space-y-2">
                <span className="text-[11px] font-bold text-[#8e8e93] uppercase tracking-wider block">Live UI Preview</span>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="px-3.5 py-1.5 rounded-full bg-accent text-white text-xs font-bold shadow-accent">
                    Button Sample
                  </span>
                  <span className="px-3.5 py-1.5 rounded-full bg-accent-tint text-accent text-xs font-bold border border-accent">
                    Active Badge
                  </span>
                  <span className="text-xs font-bold text-accent">
                    Highlighted Link
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Notifications */}
          {activeTab === 'notifications' && (
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-6 animate-fade-in">
              <div className="border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                <h2 className="text-lg font-bold text-[#1c1c1e] dark:text-[#f5f5f7] flex items-center space-x-2">
                  <span>🔔</span>
                  <span>Desktop Notifications</span>
                </h2>
                <p className="text-xs text-[#8e8e93] mt-0.5">Control message alert banners and Chrome system notifications</p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08]">
                  <div>
                    <h4 className="text-xs font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">Chrome Push Notifications</h4>
                    <p className="text-xs text-[#8e8e93]">Receive popups even when tab is in background</p>
                  </div>

                  <div className="flex items-center space-x-3">
                    <span className={`px-2.5 py-0.5 rounded-full font-bold capitalize text-xs border ${
                      notifPermission === 'granted' ? 'bg-[#34c759]/10 text-[#34c759] border-[#34c759]/20' :
                      notifPermission === 'denied' ? 'bg-[#ff3b30]/10 text-[#ff3b30] border-[#ff3b30]/20' : 'bg-[#ff9500]/10 text-[#ff9500] border-[#ff9500]/20'
                    }`}>
                      {notifPermission}
                    </span>

                    {notifPermission !== 'granted' ? (
                      <button
                        onClick={handleRequestNotification}
                        className="py-1.5 px-4 bg-accent hover-bg-accent text-white font-semibold rounded-full text-xs shadow-accent transition-all"
                      >
                        Enable
                      </button>
                    ) : (
                      <button
                        onClick={handleTestNotification}
                        className="py-1.5 px-4 rounded-full bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#1c1c1e] dark:text-[#f5f5f7] font-semibold text-xs border border-black/[0.06] dark:border-white/[0.08] transition-all"
                      >
                        Send Test
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Privacy */}
          {activeTab === 'privacy' && (
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-6 animate-fade-in">
              <div className="border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                <h2 className="text-lg font-bold text-[#1c1c1e] dark:text-[#f5f5f7] flex items-center space-x-2">
                  <span>🛡️</span>
                  <span>Privacy & Visibility</span>
                </h2>
                <p className="text-xs text-[#8e8e93] mt-0.5">Control who can see your activity status and status stories</p>
              </div>

              <form onSubmit={handlePrivacyUpdate} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-[#8e8e93] mb-1">Last Seen Visibility</label>
                  <select 
                    value={lastSeen} 
                    onChange={(e) => setLastSeen(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My Contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#8e8e93] mb-1">Stories & Status Visibility</label>
                  <select 
                    value={statusPrivacy} 
                    onChange={(e) => setStatusPrivacy(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="contacts">My Contacts</option>
                    <option value="nobody">Nobody</option>
                  </select>
                </div>

                <div>
                  <button 
                    type="submit" 
                    disabled={isLoading} 
                    className="py-2 px-5 bg-accent hover-bg-accent text-white font-semibold rounded-full text-xs shadow-accent disabled:opacity-50 transition-all"
                  >
                    Save Privacy Settings
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 4: Security */}
          {activeTab === 'security' && (
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-6 animate-fade-in">
              <div className="border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                <h2 className="text-lg font-bold text-[#1c1c1e] dark:text-[#f5f5f7] flex items-center space-x-2">
                  <span>🔒</span>
                  <span>Account Security</span>
                </h2>
                <p className="text-xs text-[#8e8e93] mt-0.5">Manage password and cryptography keys</p>
              </div>

              <form onSubmit={handlePasswordUpdate} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-semibold text-[#8e8e93] mb-1">Current Password</label>
                  <input 
                    type="password" 
                    required
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#8e8e93] mb-1">New Password</label>
                  <input 
                    type="password" 
                    required
                    minLength={6}
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <button 
                    type="submit" 
                    disabled={isLoading} 
                    className="py-2 px-5 bg-accent hover-bg-accent text-white font-semibold rounded-full text-xs shadow-accent disabled:opacity-50 transition-all"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 5: Linked Devices */}
          {activeTab === 'devices' && (
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-6 animate-fade-in">
              <div className="border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                <h2 className="text-lg font-bold text-[#1c1c1e] dark:text-[#f5f5f7] flex items-center space-x-2">
                  <span>📱</span>
                  <span>Linked Devices</span>
                </h2>
                <p className="text-xs text-[#8e8e93] mt-0.5">Connect and sync with the MessageMe mobile app</p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08]">
                  <h4 className="font-bold text-accent mb-2">Link your mobile device</h4>
                  <p className="text-xs text-[#8e8e93] leading-relaxed mb-4">
                    Open the MessageMe app on your phone, navigate to settings, and use the QR Scanner. Once you scan the code shown on your phone with this laptop camera, your devices will be securely paired.
                  </p>
                  
                  <button 
                    onClick={() => setShowQRScanner(true)}
                    className="py-2.5 px-6 bg-accent hover-bg-accent text-white font-semibold rounded-full text-xs shadow-accent transition-all flex items-center space-x-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5zM6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
                    </svg>
                    <span>Scan QR Code</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: About MessageMe */}
          {activeTab === 'about' && (
            <div className="glass-card p-6 sm:p-8 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] shadow-sm space-y-6 animate-fade-in">
              <div className="border-b border-black/[0.06] dark:border-white/[0.08] pb-4">
                <h2 className="text-lg font-bold text-[#1c1c1e] dark:text-[#f5f5f7] flex items-center space-x-2">
                  <span>ℹ️</span>
                  <span>About MessageMe</span>
                </h2>
                <p className="text-xs text-[#8e8e93] mt-0.5">Version, cryptography architecture and developer details</p>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-[#1c1c1e] dark:text-[#f5f5f7]">
                <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.06] dark:border-white/[0.08] space-y-1.5">
                  <h4 className="font-bold text-accent">Security Protocol</h4>
                  <p className="text-xs text-[#8e8e93] leading-relaxed">
                    Messages and media are encrypted client-side using 256-bit Elliptic Curve Diffie-Hellman (ECDH P-256) key agreement with AES-GCM 256-bit authenticated symmetric encryption.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl glass-input">
                  <span className="font-medium text-[#8e8e93]">Application Version</span>
                  <span className="font-mono font-bold text-accent">v2.4.0 (MessageMe Glass UI)</span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl glass-input">
                  <span className="font-medium text-[#8e8e93]">Developer</span>
                  <a 
                    href="https://github.com/atanu5026" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="font-bold text-accent hover:underline flex items-center space-x-1"
                  >
                    <span>Atanu Ghosh (@atanu5026)</span>
                    <span>↗</span>
                  </a>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Mobile Settings Drawer / Bottom Sheet Modal */}
      {showMobileMenu && (
        <div 
          className="fixed inset-0 z-[100] flex flex-col justify-end sm:justify-center items-center bg-black/60 dark:bg-black/85 backdrop-blur-xl p-0 sm:p-4 transition-all duration-300 md:hidden animate-fade-in"
          onClick={() => setShowMobileMenu(false)}
        >
          <div 
            className="w-full sm:max-w-md glass-panel rounded-t-3xl sm:rounded-3xl p-6 border-t sm:border border-black/[0.08] dark:border-white/[0.1] shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle & Header */}
            <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
              <div className="flex items-center space-x-2">
                <span className="text-base">⚙️</span>
                <h3 className="text-base font-bold text-[#1c1c1e] dark:text-[#f5f5f7]">Settings Sections</h3>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="w-8 h-8 rounded-full bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center text-[#8e8e93] hover:text-[#1c1c1e] dark:hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Category List */}
            <div className="space-y-1.5">
              {settingsTabs.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setShowMobileMenu(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'bg-accent text-white shadow-accent font-bold'
                        : 'text-[#1c1c1e] dark:text-[#f5f5f7] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] bg-black/[0.02] dark:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <span className="text-xl shrink-0">{tab.icon}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{tab.label}</p>
                        <p className={`text-[10px] truncate ${isSelected ? 'text-white/80' : 'text-[#8e8e93]'}`}>
                          {tab.description}
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <span className="text-sm font-bold shrink-0 ml-2">✓</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Mobile Sheet Sign Out Button */}
            <div className="pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
              <button
                onClick={() => {
                  setShowMobileMenu(false);
                  handleLogout();
                }}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-2xl text-xs font-bold text-[#ff3b30] bg-[#ff3b30]/10 hover:bg-[#ff3b30]/20 transition-colors"
              >
                <span>🚪</span>
                <span>Sign Out of Account</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
      />
    </div>
  );
};

export default Settings;
