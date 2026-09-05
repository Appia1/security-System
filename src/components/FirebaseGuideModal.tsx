import React, { useState } from 'react';
import { 
  Database, 
  Flame, 
  Check, 
  Copy, 
  ExternalLink, 
  ShieldCheck, 
  Terminal, 
  Key, 
  AlertCircle, 
  CheckCircle2, 
  Code,
  Layers,
  Sparkles
} from 'lucide-react';
import { FirebaseConfigState } from '../types';
import { StorageService } from '../services/storage';

interface FirebaseGuideModalProps {
  onClose?: () => void;
}

export const FirebaseGuideModal: React.FC<FirebaseGuideModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'schema' | 'rules' | 'config'>('guide');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Live config form state
  const [config, setConfig] = useState<FirebaseConfigState>(StorageService.getFirebaseConfig());
  const [jsonInput, setJsonInput] = useState<string>('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testFeedback, setTestFeedback] = useState<string>('');

  const copyToClipboard = (text: string, sectionId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: FirebaseConfigState = {
      ...config,
      isConfigured: !!(config.apiKey && config.projectId),
    };
    StorageService.saveFirebaseConfig(updated);
    setConfig(updated);
    setTestFeedback('Firebase configuration saved locally!');
    setTimeout(() => setTestFeedback(''), 3000);
  };

  const handleParseJson = () => {
    try {
      // Clean up js object notation to json if user pastes const firebaseConfig = { ... }
      let clean = jsonInput.trim();
      if (clean.includes('=')) {
        clean = clean.split('=')[1].trim();
      }
      if (clean.endsWith(';')) {
        clean = clean.slice(0, -1).trim();
      }
      // Replace unquoted keys
      const jsonValid = clean.replace(/([a-zA-Z0-9_]+):/g, '"$1":');
      const parsed = JSON.parse(jsonValid);

      const newConfig: FirebaseConfigState = {
        apiKey: parsed.apiKey || '',
        authDomain: parsed.authDomain || '',
        projectId: parsed.projectId || '',
        storageBucket: parsed.storageBucket || '',
        messagingSenderId: parsed.messagingSenderId || '',
        appId: parsed.appId || '',
        firestoreDatabaseId: parsed.firestoreDatabaseId || '(default)',
        isConfigured: !!(parsed.apiKey && parsed.projectId),
        isConnected: false,
      };

      setConfig(newConfig);
      StorageService.saveFirebaseConfig(newConfig);
      setTestFeedback('Successfully parsed and saved Firebase configuration!');
      setJsonInput('');
      setTimeout(() => setTestFeedback(''), 4000);
    } catch (err) {
      setTestFeedback('Invalid format. Please paste valid JSON or fill the form fields below.');
    }
  };

  const testFirebaseConnection = async () => {
    if (!config.apiKey || !config.projectId) {
      setTestStatus('error');
      setTestFeedback('Please enter at least an API Key and Project ID first.');
      return;
    }

    setTestStatus('testing');
    setTestFeedback('Testing connection to Firebase Firestore servers...');

    try {
      // Dynamic import of firebase to verify
      const { initializeApp, getApps } = await import('firebase/app');
      const { getFirestore, doc, getDoc } = await import('firebase/firestore');

      const app = getApps().length === 0 ? initializeApp(config) : getApps()[0];
      const db = getFirestore(app);

      // Attempt to read test ping document
      await getDoc(doc(db, 'system_ping', 'test'));

      setTestStatus('success');
      setTestFeedback('Connected successfully to Firebase Cloud Firestore!');
      const updated = { ...config, isConnected: true };
      setConfig(updated);
      StorageService.saveFirebaseConfig(updated);
    } catch (err: any) {
      console.warn('Firebase test connection response:', err);
      // If error is permission-denied or client-offline, it still proved network reachability
      if (err?.code === 'permission-denied' || err?.message?.includes('Missing or insufficient permissions')) {
        setTestStatus('success');
        setTestFeedback('Firebase reachable! Rules active. (Firestore responded with security rules validation).');
        const updated = { ...config, isConnected: true };
        setConfig(updated);
        StorageService.saveFirebaseConfig(updated);
      } else {
        setTestStatus('error');
        setTestFeedback(`Connection test notice: ${err?.message || 'Check your project ID and network.'}`);
      }
    }
  };

  const FIRESTORE_RULES_SNIPPET = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Default deny all unknown collections
    match /{document=**} {
      allow read, write: if false;
    }

    // User Profiles Collection
    match /users/{emergencyId} {
      allow read: if true; // Allows emergency responders to verify emergency ID
      allow create: if request.resource.data.emergencyId == emergencyId
                    && request.resource.data.surname is string
                    && request.resource.data.phone is string;
      allow update: if request.resource.data.emergencyId == emergencyId;
    }

    // Emergency Contacts Collection
    match /emergency_contacts/{contactId} {
      allow read: if true;
      allow create, update, delete: if request.resource.data.userEmergencyId is string;
    }

    // Real-Time Distress Alerts Collection (Encrypted & Geolocation)
    match /alerts/{alertId} {
      allow read: if true; // Responders receive real-time location alerts
      allow create: if request.resource.data.senderEmergencyId is string
                    && request.resource.data.location.lat is number
                    && request.resource.data.location.lng is number
                    && request.resource.data.status in ['active', 'acknowledged', 'resolved'];
      allow update: if request.resource.data.status in ['active', 'acknowledged', 'resolved'];
    }
  }
}`;

  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-6 px-3 sm:px-6">
      
      {/* Header */}
      <div className="mb-6 rounded-2xl bg-[#18181B] border border-[#27272A] p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-lg">
              <Flame className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Firebase Database Setup Guide
                </h1>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-amber-950/60 text-amber-300 border border-amber-800">
                  FIRESTORE CLOUD SYNC
                </span>
              </div>
              <p className="text-xs text-[#71717A] mt-1">
                Complete step-by-step documentation and configuration manager to hook up Firebase Cloud Firestore for multi-device synchronization.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://console.firebase.google.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold transition-colors shadow-md"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Open Firebase Console</span>
            </a>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mt-5 pt-3 border-t border-[#27272A] flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('guide')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-amber-500 text-neutral-950 shadow'
                : 'text-[#71717A] hover:text-white hover:bg-[#27272A]'
            }`}
          >
            1. Setup Walkthrough
          </button>
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer ${
              activeTab === 'schema'
                ? 'bg-amber-500 text-neutral-950 shadow'
                : 'text-[#71717A] hover:text-white hover:bg-[#27272A]'
            }`}
          >
            2. Database Schema
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer ${
              activeTab === 'rules'
                ? 'bg-amber-500 text-neutral-950 shadow'
                : 'text-[#71717A] hover:text-white hover:bg-[#27272A]'
            }`}
          >
            3. Security Rules (firestore.rules)
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-colors shrink-0 cursor-pointer ${
              activeTab === 'config'
                ? 'bg-amber-500 text-neutral-950 shadow'
                : 'text-[#71717A] hover:text-white hover:bg-[#27272A]'
            }`}
          >
            4. Live Firebase Connect
          </button>
        </div>
      </div>

      {/* TAB 1: STEP-BY-STEP WALKTHROUGH */}
      {activeTab === 'guide' && (
        <div className="space-y-4">
          
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] p-5 shadow-xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-mono font-bold">1</span>
              Create a Firebase Project
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-xs text-[#E4E4E7] ml-2">
              <li>Go to the <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-amber-400 underline font-semibold">Firebase Console</a>.</li>
              <li>Click <strong>&quot;Add project&quot;</strong> and enter a project name (e.g., <code className="text-amber-300">safeword-alert-nigeria</code>).</li>
              <li>Google Analytics is optional — you can disable it or keep it enabled, then click <strong>&quot;Create Project&quot;</strong>.</li>
            </ol>
          </div>

          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] p-5 shadow-xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-mono font-bold">2</span>
              Enable Cloud Firestore Database
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-xs text-[#E4E4E7] ml-2">
              <li>In the left sidebar under <strong>Build</strong>, click on <strong>Firestore Database</strong>.</li>
              <li>Click <strong>&quot;Create database&quot;</strong>.</li>
              <li>Choose a cloud location closest to West Africa / Europe (e.g., <code className="text-amber-300">europe-west1</code> or <code className="text-amber-300">europe-west2</code>).</li>
              <li>Select <strong>&quot;Start in production mode&quot;</strong> (you will paste our secure rules in step 3).</li>
            </ol>
          </div>

          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] p-5 shadow-xl">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 text-xs font-mono font-bold">3</span>
              Register Web App & Copy Configuration Keys
            </h2>
            <ol className="list-decimal list-inside space-y-2 text-xs text-[#E4E4E7] ml-2">
              <li>In Project Overview, click the Web icon (<strong>&lt;/&gt;</strong>) to add a web app.</li>
              <li>App nickname: <code className="text-amber-300">SafeWord-Web</code>.</li>
              <li>Firebase will display a code snippet containing <code className="text-amber-300">firebaseConfig</code> object.</li>
              <li>Copy the values or the JSON into Tab 4 (&quot;Live Firebase Connect&quot;) right in this app!</li>
            </ol>
          </div>

          <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-[#71717A] flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-white">Local-First Resilient Architecture: </span>
              Even before you paste your Firebase keys, this app is fully functional with instant client-side persistence and multi-tab broadcast sync. Once you link Firebase, alerts will synchronize across physical phones and responder terminals automatically!
            </div>
          </div>

        </div>
      )}

      {/* TAB 2: DATABASE SCHEMA & COLLECTIONS */}
      {activeTab === 'schema' && (
        <div className="space-y-4 text-xs">
          
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] p-5 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Firestore Collections Architecture
            </h2>
            <p className="text-[#71717A] mb-4">
              Here is the exact document structure used by SafeWord Alert Nigeria in Cloud Firestore:
            </p>

            <div className="space-y-3">
              
              {/* Collection 1: users */}
              <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A]">
                <div className="flex items-center justify-between font-mono text-sm text-amber-300 font-bold mb-2">
                  <span>/users/{`{emergencyId}`}</span>
                  <span className="text-[10px] text-[#71717A] font-sans">User Profiles</span>
                </div>
                <pre className="font-mono text-[11px] text-[#E4E4E7] overflow-x-auto p-2 rounded bg-[#18181B]/80">
{`{
  "emergencyId": "ADEBAYO-482910",   // Surname + 6 digits
  "surname": "ADEBAYO",
  "firstName": "Victor",
  "phone": "+234 803 456 7890",
  "state": "Lagos State",
  "safeWord": "Red Umbrella",         // Voice Duress Trigger
  "safeText": "Bring the textbook",   // Typed Duress Trigger
  "createdAt": 1741160000000
}`}
                </pre>
              </div>

              {/* Collection 2: emergency_contacts */}
              <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A]">
                <div className="flex items-center justify-between font-mono text-sm text-sky-400 font-bold mb-2">
                  <span>/emergency_contacts/{`{contactId}`}</span>
                  <span className="text-[10px] text-[#71717A] font-sans">Max 6 Contacts per user</span>
                </div>
                <pre className="font-mono text-[11px] text-[#E4E4E7] overflow-x-auto p-2 rounded bg-[#18181B]/80">
{`{
  "userEmergencyId": "ADEBAYO-482910",
  "emergencyId": "CHUKWU-719302",    // Responder Emergency ID
  "name": "Emeka Chukwu",
  "phone": "+234 812 998 3344",
  "relationship": "Trusted Brother",
  "addedAt": 1741161200000
}`}
                </pre>
              </div>

              {/* Collection 3: alerts */}
              <div className="p-4 rounded-xl bg-[#09090B] border border-[#27272A]">
                <div className="flex items-center justify-between font-mono text-sm text-red-400 font-bold mb-2">
                  <span>/alerts/{`{alertId}`}</span>
                  <span className="text-[10px] text-[#71717A] font-sans">Real-time Emergency Distress Alerts</span>
                </div>
                <pre className="font-mono text-[11px] text-[#E4E4E7] overflow-x-auto p-2 rounded bg-[#18181B]/80">
{`{
  "id": "alt-1741162000000",
  "senderEmergencyId": "ADEBAYO-482910",
  "senderName": "Victor Adebayo",
  "timestamp": 1741162000000,
  "triggerType": "distress_button",   // distress_button | safe_word | safe_text
  "location": {
    "lat": 6.6018,
    "lng": 3.3515,
    "accuracy": 14,
    "addressHint": "Ikeja Commercial Corridor, Lagos",
    "city": "Ikeja",
    "state": "Lagos State"
  },
  "status": "active",                // active | acknowledged | resolved
  "respondersNotified": ["CHUKWU-719302", "POLICE-112099"],
  "encryptedPayload": "AES256GCM:...",
  "encryptionHash": "SHA256:...",
  "encryptionAlgorithm": "AES-256-GCM"
}`}
                </pre>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* TAB 3: FIRESTORE SECURITY RULES */}
      {activeTab === 'rules' && (
        <div className="space-y-4 text-xs">
          
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Production Security Rules (firestore.rules)
              </h2>
              <button
                onClick={() => copyToClipboard(FIRESTORE_RULES_SNIPPET, 'rules')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-amber-300 text-xs font-semibold border border-[#3F3F46] transition-colors cursor-pointer"
              >
                {copiedSection === 'rules' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'rules' ? 'Copied Rules!' : 'Copy Rules'}</span>
              </button>
            </div>
            
            <p className="text-[#71717A] mb-3">
              Copy these security rules and paste them into your Firebase Console under <strong>Firestore Database &gt; Rules</strong>, then click <strong>Publish</strong>.
            </p>

            <pre className="font-mono text-[11px] text-amber-300/90 bg-[#09090B] p-4 rounded-xl border border-[#27272A] overflow-x-auto leading-relaxed">
              {FIRESTORE_RULES_SNIPPET}
            </pre>
          </div>

        </div>
      )}

      {/* TAB 4: LIVE FIREBASE CONNECT */}
      {activeTab === 'config' && (
        <div className="space-y-4 text-xs">
          
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] p-5 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Key className="w-4 h-4 text-amber-400" />
              Connect Your Live Firebase Project
            </h2>
            <p className="text-[#71717A] mb-4">
              Paste your Firebase Web configuration below. The application will immediately persist and listen to Cloud Firestore!
            </p>

            {/* Quick JSON Paste */}
            <div className="mb-5 p-3.5 rounded-xl bg-[#09090B] border border-[#27272A]">
              <label className="block text-[#E4E4E7] font-semibold mb-1">
                Fast Option: Paste Complete Firebase Config Object
              </label>
              <textarea
                rows={3}
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder={'const firebaseConfig = {\n  apiKey: "...",\n  projectId: "..."\n};'}
                className="w-full bg-[#18181B] border border-[#27272A] rounded-lg p-2.5 font-mono text-[11px] text-white placeholder-[#71717A] focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleParseJson}
                className="mt-2 px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-amber-400 hover:text-amber-300 font-semibold text-xs border border-[#3F3F46] transition-colors cursor-pointer"
              >
                Parse & Auto-Fill Fields
              </button>
            </div>

            {/* Individual Fields */}
            <form onSubmit={handleSaveConfig} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#71717A] mb-1">API Key</label>
                  <input
                    type="text"
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="AIzaSy..."
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[#71717A] mb-1">Project ID</label>
                  <input
                    type="text"
                    value={config.projectId}
                    onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                    placeholder="safeword-nigeria-app"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[#71717A] mb-1">Auth Domain</label>
                  <input
                    type="text"
                    value={config.authDomain}
                    onChange={(e) => setConfig({ ...config, authDomain: e.target.value })}
                    placeholder="safeword-nigeria-app.firebaseapp.com"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-[#71717A] mb-1">App ID</label>
                  <input
                    type="text"
                    value={config.appId}
                    onChange={(e) => setConfig({ ...config, appId: e.target.value })}
                    placeholder="1:123456789:web:abcdef"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {testFeedback && (
                <div className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  testStatus === 'success' 
                    ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200' 
                    : testStatus === 'error'
                    ? 'bg-red-950/60 border border-red-800 text-red-200'
                    : 'bg-[#09090B] border border-[#27272A] text-[#E4E4E7]'
                }`}>
                  {testStatus === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : testStatus === 'error' ? (
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  ) : (
                    <Terminal className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>{testFeedback}</span>
                </div>
              )}

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-neutral-950 font-bold text-xs transition-colors shadow-md cursor-pointer"
                >
                  Save Configuration
                </button>
                <button
                  type="button"
                  onClick={testFirebaseConnection}
                  disabled={testStatus === 'testing'}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white font-semibold text-xs border border-[#3F3F46] transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {testStatus === 'testing' ? 'Testing Connection...' : '⚡ Test Live Firestore Connection'}
                </button>
              </div>

            </form>
          </div>

        </div>
      )}

    </div>
  );
};
