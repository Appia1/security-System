export interface UserProfile {
  id: string;
  surname: string;
  firstName: string;
  phone: string;
  email: string;
  emergencyId: string; // Format: SURNAME-XXXXXX
  state: string;
  lga?: string;
  createdAt: number;
  safeWord: string; // Voice duress trigger
  safeText: string; // Text duress trigger
  unlockPin?: string; // Custom 4-8 digit calculator unlock PIN
  isListeningSafeWord: boolean;
  avatarColor: string;
}

export interface EmergencyContact {
  id: string;
  name: string;
  emergencyId: string; // Format: SURNAME-XXXXXX
  phone: string;
  relationship: string;
  addedAt: number;
}

export interface GeolocationData {
  lat: number;
  lng: number;
  accuracy: number;
  addressHint: string;
  state: string;
  city: string;
  timestamp: number;
  isMock?: boolean;
}

export interface DistressAlert {
  id: string;
  senderEmergencyId: string;
  senderName: string;
  senderPhone: string;
  timestamp: number;
  triggerType: 'distress_button' | 'safe_word' | 'safe_text' | 'covert_calculator';
  triggerDetail?: string;
  location: GeolocationData;
  status: 'active' | 'acknowledged' | 'resolved';
  acknowledgedBy: string[];
  respondersNotified: string[]; // Emergency IDs notified
  encryptedPayload: string; // Encrypted string
  encryptionHash: string; // SHA-256 hash verification
  encryptionAlgorithm: string; // 'AES-256-GCM'
  notes?: string;
}

export interface FirebaseConfigState {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  firestoreDatabaseId?: string;
  isConfigured: boolean;
  isConnected: boolean;
  lastTestMessage?: string;
}
