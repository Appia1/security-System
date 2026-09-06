import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Calculator, 
  Users, 
  Bell, 
  Mic, 
  Database, 
  Copy, 
  Check, 
  UserCheck, 
  MapPin,
  ChevronDown,
  LogOut,
  Lock
} from 'lucide-react';
import { UserProfile, DistressAlert } from '../types';
import { StorageService } from '../services/storage';

interface NavbarProps {
  currentUser: UserProfile;
  contactsCount: number;
  activeAlerts: DistressAlert[];
  currentTab: 'calculator' | 'contacts' | 'notifications' | 'safewords';
  setCurrentTab: (tab: 'calculator' | 'contacts' | 'notifications' | 'safewords') => void;
  onOpenAuth: () => void;
  onUserSwitch: (user: UserProfile) => void;
  onSignOut?: () => void;
  onLockApp?: () => void;
  isMicActive: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  contactsCount,
  activeAlerts,
  currentTab,
  setCurrentTab,
  onOpenAuth,
  onUserSwitch,
  onSignOut,
  onLockApp,
  isMicActive,
}) => {
  const [copied, setCopied] = useState(false);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  const allUsers = StorageService.getAllUsers();
  // Only count active alerts that were sent by currentUser OR where currentUser is a designated responder
  const unreadAlertsCount = activeAlerts.filter(a => {
    if (a.status !== 'active') return false;
    const cleanCurrentId = currentUser.emergencyId?.trim().toUpperCase();
    const isSender = a.senderEmergencyId?.trim().toUpperCase() === cleanCurrentId;
    const isTargetedContact = Array.isArray(a.respondersNotified) &&
      a.respondersNotified.some(id => id?.trim().toUpperCase() === cleanCurrentId);
    return isSender || isTargetedContact;
  }).length;

  const handleCopyId = () => {
    navigator.clipboard.writeText(currentUser.emergencyId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#27272A] bg-[#0A0A0B]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          
          {/* Brand & Project Identity */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCurrentTab('calculator')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
              title="Return to Covert Calculator Homepage"
            >
              <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-red-600 to-amber-600 text-white shadow-lg shadow-red-950/50">
                <ShieldAlert className="w-5 h-5 text-white animate-pulse" />
                {isMicActive && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                )}
              </div>
              <div className="hidden sm:block">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold tracking-tight text-white text-base">SafeWord Alert</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-semibold bg-red-950 text-red-400 border border-red-800/60">
                    NG SECURE
                  </span>
                </div>
                <p className="text-[11px] text-[#71717A]">Emergency Geolocation Protocol</p>
              </div>
            </button>
          </div>

          {/* User's Generated Emergency ID Badge (Required by prompt) */}
          <div className="flex items-center">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] shadow-inner">
              <div className="flex flex-col text-right">
                <span className="text-[10px] font-medium tracking-wide uppercase text-[#71717A]">
                  Your Emergency ID
                </span>
                <span className="font-mono text-xs sm:text-sm font-bold text-white tracking-wider">
                  {currentUser.emergencyId}
                </span>
              </div>
              <button
                onClick={handleCopyId}
                className="p-1.5 rounded-md text-[#71717A] hover:text-white hover:bg-[#27272A] transition-colors cursor-pointer"
                title="Copy Emergency ID"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="hidden md:flex items-center gap-1.5">
            <button
              onClick={() => setCurrentTab('calculator')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'calculator'
                  ? 'bg-[#27272A] text-white shadow-sm border border-[#3F3F46]'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
              }`}
            >
              <Calculator className="w-4 h-4 text-orange-500" />
              <span>Calculator</span>
            </button>

            <button
              onClick={() => setCurrentTab('contacts')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all relative cursor-pointer ${
                currentTab === 'contacts'
                  ? 'bg-[#27272A] text-white shadow-sm border border-[#3F3F46]'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
              }`}
            >
              <Users className="w-4 h-4 text-sky-400" />
              <span>Emergency IDs</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono font-bold ${
                contactsCount >= 6 ? 'bg-amber-950 text-amber-400 border border-amber-800' : 'bg-[#09090B] text-[#A1A1AA] border border-[#27272A]'
              }`}>
                {contactsCount}/6
              </span>
            </button>

            <button
              onClick={() => setCurrentTab('notifications')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all relative cursor-pointer ${
                currentTab === 'notifications'
                  ? 'bg-[#27272A] text-white shadow-sm border border-[#3F3F46]'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
              }`}
            >
              <Bell className="w-4 h-4 text-rose-400" />
              <span>Notifications</span>
              {unreadAlertsCount > 0 && (
                <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setCurrentTab('safewords')}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                currentTab === 'safewords'
                  ? 'bg-[#27272A] text-white shadow-sm border border-[#3F3F46]'
                  : 'text-[#A1A1AA] hover:text-white hover:bg-[#18181B]'
              }`}
            >
              <Mic className={`w-4 h-4 ${isMicActive ? 'text-emerald-400 animate-pulse' : 'text-purple-400'}`} />
              <span>Safe Word & Text</span>
            </button>
          </div>

          {/* User Profile & Lock Switcher */}
          <div className="flex items-center gap-2">
            {onLockApp && (
              <button
                onClick={onLockApp}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] hover:border-amber-500/40 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
                title="Lock back to covert calculator"
              >
                <Lock className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Lock</span>
              </button>
            )}

            <div className="relative">
              <button
                onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-xs text-[#E4E4E7] transition-colors cursor-pointer"
                title="Switch User Identity or Test As Responder"
              >
                <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${currentUser.avatarColor} flex items-center justify-center text-[10px] font-bold text-white`}>
                  {currentUser.surname.charAt(0)}
                </div>
                <span className="hidden sm:inline font-medium">
                  {currentUser.firstName} ({currentUser.surname})
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-[#71717A]" />
              </button>

              {/* Identity Switcher Dropdown */}
              {showSwitchMenu && (
                <div className="absolute right-0 mt-2 w-72 rounded-xl bg-[#18181B] border border-[#27272A] shadow-2xl p-2 z-50">
                  <div className="px-3 py-2 border-b border-[#27272A]">
                    <p className="text-[11px] font-semibold text-[#71717A] uppercase tracking-wider">Active User Profile</p>
                    <p className="text-sm font-bold text-white mt-0.5">{currentUser.firstName} {currentUser.surname}</p>
                    <p className="text-xs font-mono text-emerald-400">{currentUser.emergencyId}</p>
                    <p className="text-[11px] text-[#71717A] mt-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-[#71717A]" /> {currentUser.state}
                    </p>
                  </div>

                  {allUsers.length > 1 && (
                    <div className="py-2">
                      <p className="px-3 py-1 text-[10px] font-medium text-[#71717A] uppercase tracking-wider">
                        Switch Identity on this Device:
                      </p>
                      {allUsers.map(user => (
                        <button
                          key={user.emergencyId}
                          onClick={() => {
                            onUserSwitch(user);
                            setShowSwitchMenu(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 text-left rounded-lg text-xs transition-colors cursor-pointer ${
                            user.emergencyId === currentUser.emergencyId
                              ? 'bg-[#27272A] text-emerald-400 font-semibold'
                              : 'text-[#E4E4E7] hover:bg-[#27272A]/70 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-5 h-5 rounded-full bg-gradient-to-tr ${user.avatarColor} flex items-center justify-center text-[9px] text-white font-bold`}>
                              {user.surname.charAt(0)}
                            </div>
                            <div>
                              <span className="block font-medium">{user.firstName} {user.surname}</span>
                              <span className="block text-[10px] font-mono text-[#71717A]">{user.emergencyId}</span>
                            </div>
                          </div>
                          {user.emergencyId === currentUser.emergencyId && (
                            <Check className="w-4 h-4 text-emerald-400" />
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#27272A] flex flex-col gap-1.5">
                    <button
                      onClick={() => {
                        setShowSwitchMenu(false);
                        onOpenAuth();
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-white text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                      Add / Register New Profile
                    </button>
                    {onSignOut && (
                      <button
                        onClick={() => {
                          setShowSwitchMenu(false);
                          onSignOut();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5 text-red-400" />
                        Sign Out
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Mobile Sub-Navigation Bar: Optimized for Thumb Reach on Phones */}
        <div className="flex md:hidden items-center justify-between py-1.5 border-t border-[#27272A] gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setCurrentTab('calculator')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 px-2.5 py-2 rounded-lg shrink-0 cursor-pointer min-h-[44px] transition-colors ${
              currentTab === 'calculator' ? 'bg-[#27272A] text-white font-semibold' : 'text-[#71717A] hover:text-white'
            }`}
          >
            <Calculator className="w-4 h-4 text-orange-500" />
            <span className="text-[11px]">Calculator</span>
          </button>

          <button
            onClick={() => setCurrentTab('contacts')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 px-2.5 py-2 rounded-lg shrink-0 cursor-pointer min-h-[44px] transition-colors ${
              currentTab === 'contacts' ? 'bg-[#27272A] text-white font-semibold' : 'text-[#71717A] hover:text-white'
            }`}
          >
            <Users className="w-4 h-4 text-sky-400" />
            <span className="text-[11px]">IDs ({contactsCount}/6)</span>
          </button>

          <button
            onClick={() => setCurrentTab('notifications')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 px-2.5 py-2 rounded-lg shrink-0 relative cursor-pointer min-h-[44px] transition-colors ${
              currentTab === 'notifications' ? 'bg-[#27272A] text-white font-semibold' : 'text-[#71717A] hover:text-white'
            }`}
          >
            <div className="relative">
              <Bell className="w-4 h-4 text-rose-400" />
              {unreadAlertsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
            </div>
            <span className="text-[11px]">Alerts</span>
          </button>

          <button
            onClick={() => setCurrentTab('safewords')}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 px-2.5 py-2 rounded-lg shrink-0 cursor-pointer min-h-[44px] transition-colors ${
              currentTab === 'safewords' ? 'bg-[#27272A] text-white font-semibold' : 'text-[#71717A] hover:text-white'
            }`}
          >
            <Mic className={`w-4 h-4 ${isMicActive ? 'text-emerald-400 animate-pulse' : 'text-purple-400'}`} />
            <span className="text-[11px]">Duress</span>
          </button>

          {onLockApp && (
            <button
              onClick={onLockApp}
              className="flex flex-col sm:flex-row items-center justify-center gap-1 px-2.5 py-2 rounded-lg shrink-0 cursor-pointer min-h-[44px] text-amber-400 hover:text-amber-300 transition-colors"
              title="Lock to Calculator"
            >
              <Lock className="w-4 h-4" />
              <span className="text-[11px]">Lock</span>
            </button>
          )}
        </div>

      </div>
    </header>
  );
};
