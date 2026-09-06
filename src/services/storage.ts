import { UserProfile, EmergencyContact, DistressAlert, FirebaseConfigState } from '../types';
import {
  syncAlertToFirestore,
  updateAlertInFirestore,
  syncUserToFirestore,
  syncContactToFirestore,
  DEFAULT_FIREBASE_CONFIG,
} from './firebase';

// Storage Service Manager for SafeWord Alert NG
const STORAGE_KEYS = {
  CURRENT_USER: 'safeword_current_user_v1',
  ALL_USERS: 'safeword_all_users_v1',
  CONTACTS_PREFIX: 'safeword_contacts_',
  ALERTS: 'safeword_alerts_v1',
  FIREBASE_CONFIG: 'safeword_firebase_config_v1',
};

// Clean up any legacy demo data from prior sessions so user only sees real users & contacts
function purgeLegacyDemoData(): void {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (userStr) {
      const u = JSON.parse(userStr);
      if (['ADEBAYO-482910', 'CHUKWU-719302', 'BELLO-302918'].includes(u?.emergencyId)) {
        localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
      }
    }
    const allUsersStr = localStorage.getItem(STORAGE_KEYS.ALL_USERS);
    if (allUsersStr) {
      const allUsers: UserProfile[] = JSON.parse(allUsersStr);
      const cleaned = allUsers.filter(u => !['ADEBAYO-482910', 'CHUKWU-719302', 'BELLO-302918'].includes(u.emergencyId));
      localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(cleaned));
    }
    const alertsStr = localStorage.getItem(STORAGE_KEYS.ALERTS);
    if (alertsStr) {
      const alerts: DistressAlert[] = JSON.parse(alertsStr);
      const cleaned = alerts.filter(a => a.id !== 'alert-sample-01' && a.senderEmergencyId !== 'BELLO-302918');
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(cleaned));
    }
    localStorage.removeItem(STORAGE_KEYS.CONTACTS_PREFIX + 'ADEBAYO-482910');
    localStorage.removeItem(STORAGE_KEYS.CONTACTS_PREFIX + 'CHUKWU-719302');
    localStorage.removeItem(STORAGE_KEYS.CONTACTS_PREFIX + 'BELLO-302918');
  } catch {
    // Storage access fallback
  }
}

// Run cleanup immediately on load
purgeLegacyDemoData();

// Generate an Emergency ID formatted as SURNAME-6DIGITS
export function generateEmergencyId(surname: string): string {
  const cleanSurname = surname.trim().toUpperCase().replace(/[^A-Z]/g, '') || 'USER';
  const digits = Math.floor(100000 + Math.random() * 900000).toString();
  return `${cleanSurname}-${digits}`;
}

/**
 * Storage Service Manager
 */
export class StorageService {
  // Get all registered users (starts empty, only real users)
  static getAllUsers(): UserProfile[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ALL_USERS);
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch {
      return [];
    }
  }

  // Get current active user (returns null if not signed in)
  static getCurrentUser(): UserProfile | null {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fallback
    }
    return null;
  }

  // Get current active user, or create a clean primary profile if none exists yet
  static getOrCreateCurrentUser(): UserProfile {
    const existing = StorageService.getCurrentUser();
    if (existing && existing.emergencyId) {
      return existing;
    }
    const all = StorageService.getAllUsers();
    if (all.length > 0 && all[0].emergencyId) {
      StorageService.setCurrentUser(all[0]);
      return all[0];
    }
    const defaultUser: UserProfile = {
      id: 'usr-default',
      surname: 'BELLO',
      firstName: 'Safety User',
      phone: '+234 800 123 4567',
      email: 'user@safeword.ng',
      emergencyId: 'BELLO-829104',
      state: 'Lagos State',
      lga: 'Ikeja',
      createdAt: Date.now(),
      safeWord: 'Red Umbrella',
      safeText: 'Bring the textbook',
      unlockPin: '829104',
      isListeningSafeWord: false,
      avatarColor: 'from-emerald-600 to-teal-700',
    };
    StorageService.setCurrentUser(defaultUser);
    return defaultUser;
  }

  // Sign out current user
  static signOut(): void {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    StorageService.broadcastUpdate('user_signed_out', null);
  }

  // Set current user
  static setCurrentUser(user: UserProfile): void {
    localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    // Also ensure updated in all users list
    const users = StorageService.getAllUsers();
    const index = users.findIndex(u => u.emergencyId === user.emergencyId);
    if (index >= 0) {
      users[index] = user;
    } else {
      users.push(user);
    }
    localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users));
    StorageService.broadcastUpdate('user_updated', user);
    // Background cloud sync
    syncUserToFirestore(user).catch(() => {});
  }

  // Register new user with generated Emergency ID
  static registerUser(userData: {
    surname: string;
    firstName: string;
    phone: string;
    email: string;
    state: string;
    lga?: string;
    safeWord?: string;
    safeText?: string;
    unlockPin?: string;
  }): UserProfile {
    const emergencyId = generateEmergencyId(userData.surname);
    const emergencyDigits = emergencyId.split('-')[1] || '829104';
    const chosenPin = userData.unlockPin?.trim().replace(/\D/g, '') || emergencyDigits;

    const colors = [
      'from-blue-600 to-indigo-700',
      'from-emerald-600 to-teal-700',
      'from-purple-600 to-violet-700',
      'from-rose-600 to-pink-700',
      'from-amber-600 to-orange-700',
    ];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    const newUser: UserProfile = {
      id: 'usr-' + Date.now(),
      surname: userData.surname.trim().toUpperCase(),
      firstName: userData.firstName.trim(),
      phone: userData.phone.trim(),
      email: userData.email.trim(),
      emergencyId,
      state: userData.state || 'Lagos State',
      lga: userData.lga || '',
      createdAt: Date.now(),
      safeWord: userData.safeWord || 'Red Umbrella',
      safeText: userData.safeText || 'Bring the textbook',
      unlockPin: chosenPin,
      isListeningSafeWord: false,
      avatarColor,
    };

    const users = StorageService.getAllUsers();
    users.push(newUser);
    localStorage.setItem(STORAGE_KEYS.ALL_USERS, JSON.stringify(users));
    StorageService.setCurrentUser(newUser);

    // Initial contacts list is strictly empty - no unsolicited people
    StorageService.saveContactsForUser(emergencyId, []);

    return newUser;
  }

  // Get contacts for an Emergency ID (Max 6)
  static getContactsForUser(emergencyId: string): EmergencyContact[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONTACTS_PREFIX + emergencyId);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fallback
    }
    return [];
  }

  // Save contacts
  static saveContactsForUser(emergencyId: string, contacts: EmergencyContact[]): void {
    const trimmed = contacts.slice(0, 6); // Hard limit of 6
    localStorage.setItem(STORAGE_KEYS.CONTACTS_PREFIX + emergencyId, JSON.stringify(trimmed));
    StorageService.broadcastUpdate('contacts_updated', { emergencyId, contacts: trimmed });
    // Sync each contact to Cloud Firestore
    trimmed.forEach(c => {
      syncContactToFirestore(c, emergencyId).catch(() => {});
    });
  }

  // Add a single contact
  static addContact(
    userEmergencyId: string,
    contact: { name: string; emergencyId: string; phone: string; relationship: string }
  ): { success: boolean; message: string; contacts?: EmergencyContact[] } {
    const current = StorageService.getContactsForUser(userEmergencyId);
    if (current.length >= 6) {
      return { success: false, message: 'Emergency contact list is full (Maximum 6 contacts allowed).' };
    }

    const cleanId = contact.emergencyId.trim().toUpperCase();
    if (!cleanId) {
      return { success: false, message: 'Emergency ID is required.' };
    }

    // Prevent duplicate Emergency ID
    if (current.some(c => c.emergencyId === cleanId)) {
      return { success: false, message: `Emergency ID ${cleanId} is already in your contacts.` };
    }

    const newContact: EmergencyContact = {
      id: 'ct-' + Date.now(),
      name: contact.name.trim() || 'Emergency Contact',
      emergencyId: cleanId,
      phone: contact.phone.trim() || 'N/A',
      relationship: contact.relationship.trim() || 'Responder',
      addedAt: Date.now(),
    };

    const updated = [...current, newContact];
    StorageService.saveContactsForUser(userEmergencyId, updated);
    return { success: true, message: `Added ${newContact.name} (${newContact.emergencyId})`, contacts: updated };
  }

  // Remove a contact
  static removeContact(userEmergencyId: string, contactId: string): EmergencyContact[] {
    const current = StorageService.getContactsForUser(userEmergencyId);
    const updated = current.filter(c => c.id !== contactId);
    StorageService.saveContactsForUser(userEmergencyId, updated);
    return updated;
  }

  // Get all alerts (starts empty, only real dispatched alerts)
  static getAllAlerts(): DistressAlert[] {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.ALERTS);
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch {
      return [];
    }
  }

  // Get alerts strictly filtered for a specific user:
  // ONLY returns alerts where user is the sender OR was added as an emergency contact by the sender
  static getAlertsForUser(userEmergencyId: string): DistressAlert[] {
    const allAlerts = StorageService.getAllAlerts();
    if (!userEmergencyId) return [];
    const cleanId = userEmergencyId.trim().toUpperCase();

    return allAlerts.filter(alert => {
      const isSender = alert.senderEmergencyId?.trim().toUpperCase() === cleanId;
      const isDesignatedResponder = Array.isArray(alert.respondersNotified) &&
        alert.respondersNotified.some(id => id?.trim().toUpperCase() === cleanId);
      return isSender || isDesignatedResponder;
    });
  }

  // Dispatches a new silent distress alert
  static dispatchDistressAlert(alert: DistressAlert): void {
    const alerts = StorageService.getAllAlerts();
    alerts.unshift(alert);
    // Keep last 50 alerts in history
    const trimmed = alerts.slice(0, 50);
    localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(trimmed));
    StorageService.broadcastUpdate('alert_dispatched', alert);
    // Background cloud sync to Firestore
    syncAlertToFirestore(alert).catch(() => {});
  }

  // Mark alert acknowledged
  static acknowledgeAlert(alertId: string, responderEmergencyId: string): void {
    const alerts = StorageService.getAllAlerts();
    const target = alerts.find(a => a.id === alertId);
    if (target) {
      if (!target.acknowledgedBy.includes(responderEmergencyId)) {
        target.acknowledgedBy.push(responderEmergencyId);
      }
      target.status = 'acknowledged';
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
      StorageService.broadcastUpdate('alert_updated', target);
      // Sync update to Firestore
      updateAlertInFirestore(alertId, {
        status: 'acknowledged',
        acknowledgedBy: target.acknowledgedBy,
      }).catch(() => {});
    }
  }

  // Resolve alert
  static resolveAlert(alertId: string): void {
    const alerts = StorageService.getAllAlerts();
    const target = alerts.find(a => a.id === alertId);
    if (target) {
      target.status = 'resolved';
      localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts));
      StorageService.broadcastUpdate('alert_updated', target);
      // Sync update to Firestore
      updateAlertInFirestore(alertId, {
        status: 'resolved',
      }).catch(() => {});
    }
  }

  // Firebase Config
  static getFirebaseConfig(): FirebaseConfigState {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FIREBASE_CONFIG);
      if (data) {
        return JSON.parse(data);
      }
    } catch {
      // Fallback
    }
    return {
      apiKey: DEFAULT_FIREBASE_CONFIG.apiKey,
      authDomain: DEFAULT_FIREBASE_CONFIG.authDomain,
      projectId: DEFAULT_FIREBASE_CONFIG.projectId,
      storageBucket: DEFAULT_FIREBASE_CONFIG.storageBucket,
      messagingSenderId: DEFAULT_FIREBASE_CONFIG.messagingSenderId,
      appId: DEFAULT_FIREBASE_CONFIG.appId,
      firestoreDatabaseId: '(default)',
      isConfigured: true,
      isConnected: true,
      lastTestMessage: 'Connected to safe-word-8c08e',
    };
  }

  static saveFirebaseConfig(cfg: FirebaseConfigState): void {
    localStorage.setItem(STORAGE_KEYS.FIREBASE_CONFIG, JSON.stringify(cfg));
    StorageService.broadcastUpdate('firebase_config_updated', cfg);
  }

  // Multi-tab broadcast channel
  private static broadcastUpdate(type: string, data: unknown): void {
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('safeword_sync', { detail: { type, data } }));
        // Also trigger storage event for cross-tab sync
        localStorage.setItem('safeword_last_event', JSON.stringify({ type, time: Date.now() }));
      }
    } catch {
      // Ignore
    }
  }
}
