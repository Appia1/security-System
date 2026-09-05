import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Firestore,
} from 'firebase/firestore';
import { DistressAlert, UserProfile, EmergencyContact } from '../types';

export const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBHtQEP3wm485kKcXIdGJaM2Sk6ZAo0C6k",
  authDomain: "safe-word-8c08e.firebaseapp.com",
  projectId: "safe-word-8c08e",
  storageBucket: "safe-word-8c08e.firebasestorage.app",
  messagingSenderId: "654493495612",
  appId: "1:654493495612:web:54e79fb365915ce0d4ae39",
};

let appInstance: FirebaseApp | null = null;
let firestoreInstance: Firestore | null = null;

export function getFirebaseApp(): FirebaseApp | null {
  try {
    if (appInstance) return appInstance;
    if (getApps().length > 0) {
      appInstance = getApp();
      return appInstance;
    }
    appInstance = initializeApp(DEFAULT_FIREBASE_CONFIG);
    return appInstance;
  } catch (err) {
    console.warn('Firebase initialization notice:', err);
    return null;
  }
}

export function getFirestoreDB(): Firestore | null {
  try {
    if (firestoreInstance) return firestoreInstance;
    const app = getFirebaseApp();
    if (!app) return null;
    firestoreInstance = getFirestore(app);
    return firestoreInstance;
  } catch (err) {
    console.warn('Firestore initialization notice:', err);
    return null;
  }
}

// Sync distress alert to Cloud Firestore
export async function syncAlertToFirestore(alert: DistressAlert): Promise<boolean> {
  try {
    const db = getFirestoreDB();
    if (!db) return false;
    const alertRef = doc(db, 'alerts', alert.id);
    await setDoc(alertRef, alert, { merge: true });
    return true;
  } catch (err) {
    console.warn('Failed to sync alert to Firestore (falling back to local):', err);
    return false;
  }
}

// Update alert status in Cloud Firestore
export async function updateAlertInFirestore(
  alertId: string,
  updates: Partial<DistressAlert>
): Promise<boolean> {
  try {
    const db = getFirestoreDB();
    if (!db) return false;
    const alertRef = doc(db, 'alerts', alertId);
    await updateDoc(alertRef, updates);
    return true;
  } catch (err) {
    console.warn('Failed to update alert in Firestore:', err);
    return false;
  }
}

// Sync user profile to Cloud Firestore
export async function syncUserToFirestore(user: UserProfile): Promise<boolean> {
  try {
    const db = getFirestoreDB();
    if (!db) return false;
    const userRef = doc(db, 'users', user.emergencyId);
    await setDoc(userRef, user, { merge: true });
    return true;
  } catch (err) {
    console.warn('Failed to sync user to Firestore:', err);
    return false;
  }
}

// Sync emergency contact to Cloud Firestore
export async function syncContactToFirestore(
  contact: EmergencyContact,
  userEmergencyId: string
): Promise<boolean> {
  try {
    const db = getFirestoreDB();
    if (!db) return false;
    const contactRef = doc(db, 'emergency_contacts', contact.id);
    await setDoc(contactRef, { ...contact, userEmergencyId }, { merge: true });
    return true;
  } catch (err) {
    console.warn('Failed to sync contact to Firestore:', err);
    return false;
  }
}

// Subscribe to real-time alerts across all devices
export function subscribeToFirestoreAlerts(
  onAlertsReceived: (alerts: DistressAlert[]) => void
): () => void {
  try {
    const db = getFirestoreDB();
    if (!db) return () => {};

    const alertsQuery = query(
      collection(db, 'alerts'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(
      alertsQuery,
      (snapshot) => {
        const alerts: DistressAlert[] = [];
        snapshot.forEach((docSnap) => {
          alerts.push(docSnap.data() as DistressAlert);
        });
        if (alerts.length > 0) {
          onAlertsReceived(alerts);
        }
      },
      (error) => {
        console.warn('Firestore alerts subscription notice:', error.message);
      }
    );

    return unsubscribe;
  } catch (err) {
    console.warn('Could not establish Firestore subscription:', err);
    return () => {};
  }
}
