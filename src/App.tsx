/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Calculator } from './components/Calculator';
import { ContactsManager } from './components/ContactsManager';
import { NotificationsCenter } from './components/NotificationsCenter';
import { SafeWordSettings } from './components/SafeWordSettings';
import { AuthModal } from './components/AuthModal';
import { UserProfile, EmergencyContact, DistressAlert } from './types';
import { StorageService } from './services/storage';
import { globalVoiceDetector } from './services/voiceRecognition';
import { subscribeToFirestoreAlerts } from './services/firebase';
import { ShieldCheck, PhoneCall } from 'lucide-react';

export default function App() {
  // Always start in covert calculator mode every single time the app opens or refreshes
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => 
    StorageService.getOrCreateCurrentUser()
  );
  const [contacts, setContacts] = useState<EmergencyContact[]>(() => 
    StorageService.getContactsForUser(currentUser.emergencyId)
  );
  const [alerts, setAlerts] = useState<DistressAlert[]>(() => StorageService.getAllAlerts());
  const [currentTab, setCurrentTab] = useState<'calculator' | 'contacts' | 'notifications' | 'safewords'>('calculator');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);

  // Sync contacts when user changes
  useEffect(() => {
    if (currentUser) {
      const userContacts = StorageService.getContactsForUser(currentUser.emergencyId);
      setContacts(userContacts);
    }
  }, [currentUser?.emergencyId]);

  // Listen to cross-component and cross-tab storage sync events
  useEffect(() => {
    const handleSync = () => {
      const allAlerts = StorageService.getAllAlerts();
      setAlerts(allAlerts);

      if (currentUser) {
        const updatedContacts = StorageService.getContactsForUser(currentUser.emergencyId);
        setContacts(updatedContacts);
      }
    };

    window.addEventListener('safeword_sync', handleSync);
    window.addEventListener('storage', handleSync);

    // Real-time Firestore alerts subscription
    const unsubscribeFirestore = subscribeToFirestoreAlerts((firestoreAlerts) => {
      if (firestoreAlerts && firestoreAlerts.length > 0) {
        setAlerts(firestoreAlerts);
      }
    });

    return () => {
      window.removeEventListener('safeword_sync', handleSync);
      window.removeEventListener('storage', handleSync);
      unsubscribeFirestore();
    };
  }, [currentUser?.emergencyId]);

  // Monitor voice listening state
  useEffect(() => {
    const interval = setInterval(() => {
      setIsMicActive(globalVoiceDetector.getIsRunning());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleUserSwitch = (newUser: UserProfile) => {
    StorageService.setCurrentUser(newUser);
    setCurrentUser(newUser);
    setContacts(StorageService.getContactsForUser(newUser.emergencyId));
  };

  const handleSignOut = () => {
    StorageService.signOut();
    const fallbackUser = StorageService.getOrCreateCurrentUser();
    setCurrentUser(fallbackUser);
    setContacts(StorageService.getContactsForUser(fallbackUser.emergencyId));
    setIsUnlocked(false);
  };

  const handleAlertDispatched = (newAlert: DistressAlert) => {
    setAlerts(StorageService.getAllAlerts());
  };

  // =========================================================================
  // STEALTH MODE: Every time the user opens the software, show ONLY Calculator
  // No navbar, no tabs, no sidebars, subtle silent distress button at the down part.
  // New users can tap registration or type 0000 to obtain their Emergency ID & PIN.
  // =========================================================================
  if (!isUnlocked) {
    return (
      <>
        <Calculator
          currentUser={currentUser}
          contacts={contacts}
          alerts={alerts}
          isUnlocked={false}
          onUnlock={() => setIsUnlocked(true)}
          onAlertDispatched={handleAlertDispatched}
          onOpenSafeSettings={() => {}}
          onOpenContacts={() => {}}
          onOpenAuth={() => setIsAuthOpen(true)}
        />

        {/* Profile Registration / Sign In Modal accessible from covert screen */}
        <AuthModal
          isOpen={isAuthOpen}
          onClose={() => setIsAuthOpen(false)}
          onUserLoggedIn={(user) => {
            handleUserSwitch(user);
            setIsUnlocked(true);
            setIsAuthOpen(false);
          }}
        />
      </>
    );
  }

  // =========================================================================
  // UNLOCKED MODE: Displays full application when emergency PIN is typed
  // =========================================================================
  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Top Navigation Bar with Lock Button */}
      <Navbar
        currentUser={currentUser}
        contactsCount={contacts.length}
        activeAlerts={alerts}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        onUserSwitch={handleUserSwitch}
        onSignOut={handleSignOut}
        onLockApp={() => setIsUnlocked(false)}
        isMicActive={isMicActive}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {currentTab === 'calculator' && (
          <Calculator
            currentUser={currentUser}
            contacts={contacts}
            alerts={alerts}
            isUnlocked={true}
            onUnlock={() => {}}
            onLock={() => setIsUnlocked(false)}
            onAlertDispatched={handleAlertDispatched}
            onOpenSafeSettings={() => setCurrentTab('safewords')}
            onOpenContacts={() => setCurrentTab('contacts')}
            onOpenNotifications={() => setCurrentTab('notifications')}
            onContactsUpdated={(updated) => setContacts(updated)}
          />
        )}

        {currentTab === 'contacts' && (
          <ContactsManager
            currentUser={currentUser}
            contacts={contacts}
            onContactsUpdated={(updated) => setContacts(updated)}
          />
        )}

        {currentTab === 'notifications' && (
          <NotificationsCenter
            currentUser={currentUser}
            alerts={alerts}
            onAlertsUpdated={() => setAlerts(StorageService.getAllAlerts())}
          />
        )}

        {currentTab === 'safewords' && (
          <SafeWordSettings
            currentUser={currentUser}
            contacts={contacts}
            onUserUpdated={(updated) => setCurrentUser(updated)}
            onAlertDispatched={handleAlertDispatched}
          />
        )}
      </main>

      {/* Profile Registration / Switcher Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onUserLoggedIn={(user) => {
          setCurrentUser(user);
          setContacts(StorageService.getContactsForUser(user.emergencyId));
        }}
      />

      {/* Clean, Discreet Bottom Footer */}
      <footer className="border-t border-[#27272A] bg-[#0A0A0B] py-3.5 px-4 text-xs text-[#71717A]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-center sm:text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[#A1A1AA]">
              SafeWord Alert NG &bull; Encrypted Geolocation Protocols
            </span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <span>Hotlines:</span>
            <a href="tel:112" className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1">
              <PhoneCall className="w-3 h-3" /> 112
            </a>
            <a href="tel:199" className="text-[#A1A1AA] hover:text-white font-semibold flex items-center gap-1">
              <PhoneCall className="w-3 h-3" /> 199
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
