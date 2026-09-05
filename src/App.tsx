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
import { FirebaseGuideModal } from './components/FirebaseGuideModal';
import { AuthModal } from './components/AuthModal';
import { UserProfile, EmergencyContact, DistressAlert } from './types';
import { StorageService } from './services/storage';
import { globalVoiceDetector } from './services/voiceRecognition';
import { subscribeToFirestoreAlerts } from './services/firebase';
import { ShieldCheck, PhoneCall, Radio, AlertOctagon, Flame } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => StorageService.getCurrentUser());
  const [contacts, setContacts] = useState<EmergencyContact[]>(() => 
    currentUser ? StorageService.getContactsForUser(currentUser.emergencyId) : []
  );
  const [alerts, setAlerts] = useState<DistressAlert[]>(() => StorageService.getAllAlerts());
  const [currentTab, setCurrentTab] = useState<'calculator' | 'contacts' | 'notifications' | 'safewords' | 'firebase'>('calculator');
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);

  // Sync contacts when user changes
  useEffect(() => {
    if (currentUser) {
      const userContacts = StorageService.getContactsForUser(currentUser.emergencyId);
      setContacts(userContacts);
    } else {
      setContacts([]);
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
    setCurrentUser(null);
    setContacts([]);
  };

  const handleAlertDispatched = (newAlert: DistressAlert) => {
    setAlerts(StorageService.getAllAlerts());
  };

  // MANDATORY SECURITY GATE: If not logged in, user must sign up or sign in before getting an Emergency ID
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] flex flex-col justify-between font-['Plus_Jakarta_Sans',sans-serif]">
        <AuthModal
          isOpen={true}
          isGate={true}
          onUserLoggedIn={(user) => {
            setCurrentUser(user);
            setContacts(StorageService.getContactsForUser(user.emergencyId));
          }}
        />

        {/* Minimal Footer during Auth Gate */}
        <footer className="border-t border-[#27272A] bg-[#0A0A0B] py-4 px-4 text-xs text-[#71717A] text-center">
          <p className="max-w-md mx-auto">
            SafeWord Alert NG &bull; Encrypted Geolocation Distress Protocol &bull; Toll-Free Hotline: <a href="tel:112" className="text-red-400 font-bold">112</a>
          </p>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Top Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        contactsCount={contacts.length}
        activeAlerts={alerts}
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        onOpenAuth={() => setIsAuthOpen(true)}
        onUserSwitch={handleUserSwitch}
        onSignOut={handleSignOut}
        isMicActive={isMicActive}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {currentTab === 'calculator' && (
          <Calculator
            currentUser={currentUser}
            contacts={contacts}
            alerts={alerts}
            onAlertDispatched={handleAlertDispatched}
            onOpenSafeSettings={() => setCurrentTab('safewords')}
            onOpenContacts={() => setCurrentTab('contacts')}
            onOpenNotifications={() => setCurrentTab('notifications')}
            onOpenFirebaseGuide={() => setCurrentTab('firebase')}
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

        {currentTab === 'firebase' && (
          <FirebaseGuideModal
            onClose={() => setCurrentTab('calculator')}
          />
        )}
      </main>

      {/* User Signup / Signin Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onUserLoggedIn={(user) => {
          setCurrentUser(user);
          setContacts(StorageService.getContactsForUser(user.emergencyId));
        }}
      />

      {/* Bottom Emergency Quick Reference Bar */}
      <footer className="border-t border-[#27272A] bg-[#0A0A0B] py-4 px-4 text-xs text-[#71717A]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          <div className="flex items-center gap-2 text-center sm:text-left">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-[#A1A1AA]">
              <strong className="text-white">SafeWord Alert NG:</strong> Combating insecurity in Nigeria with real-time encrypted geolocation protocols.
            </span>
          </div>

          <div className="flex items-center gap-4 flex-wrap justify-center font-mono text-[11px]">
            <span className="text-[#71717A]">Emergency Hotlines:</span>
            <a href="tel:112" className="text-red-400 hover:text-red-300 font-bold flex items-center gap-1">
              <PhoneCall className="w-3 h-3" /> Toll-Free 112
            </a>
            <a href="tel:199" className="text-orange-400 hover:text-orange-300 font-bold flex items-center gap-1">
              <PhoneCall className="w-3 h-3" /> Police 199
            </a>
            <button
              onClick={() => setCurrentTab('firebase')}
              className="text-amber-400 hover:text-amber-300 underline flex items-center gap-1 font-sans cursor-pointer"
            >
              <Flame className="w-3 h-3" /> Firebase Database Guide
            </button>
          </div>

        </div>
      </footer>

    </div>
  );
}
