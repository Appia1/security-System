import React, { useState, useEffect } from 'react';
import { 
  Mic, 
  MicOff, 
  Type, 
  ShieldAlert, 
  Check, 
  AlertCircle, 
  Volume2, 
  Zap, 
  Radio, 
  Sparkles,
  Info,
  Lock,
  MessageSquare,
  KeyRound
} from 'lucide-react';
import { UserProfile, EmergencyContact, DistressAlert } from '../types';
import { StorageService } from '../services/storage';
import { globalVoiceDetector, VoiceStatus } from '../services/voiceRecognition';
import { getCurrentDeviceLocation } from '../services/geolocation';
import { encryptEmergencyPayload } from '../services/crypto';

interface SafeWordSettingsProps {
  currentUser: UserProfile;
  contacts: EmergencyContact[];
  onUserUpdated: (user: UserProfile) => void;
  onAlertDispatched: (alert: DistressAlert) => void;
}

export const SafeWordSettings: React.FC<SafeWordSettingsProps> = ({
  currentUser,
  contacts,
  onUserUpdated,
  onAlertDispatched,
}) => {
  const defaultEmergencyDigits = currentUser.emergencyId?.split('-')[1] || '829104';
  const [unlockPin, setUnlockPin] = useState<string>(
    currentUser.unlockPin || defaultEmergencyDigits
  );
  const [safeWord, setSafeWord] = useState<string>(currentUser.safeWord || 'Red Umbrella');
  const [safeText, setSafeText] = useState<string>(currentUser.safeText || 'Bring the textbook');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle');
  const [voiceStatusMsg, setVoiceStatusMsg] = useState<string>('');
  const [liveTranscript, setLiveTranscript] = useState<string>('');
  const [simulatedVoiceInput, setSimulatedVoiceInput] = useState<string>('');
  const [testTextInput, setTestTextInput] = useState<string>('');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [alertFeedback, setAlertFeedback] = useState<string>('');

  // Preset Safe Word & Safe Text suggestions suited for covert duress in Nigeria
  const SAFE_WORD_PRESETS = [
    'Red Umbrella',
    'Covenant Shield',
    'Mayday Nigeria',
    'Abeg Help Me',
    'Blue Ocean Seven',
    'Operation Fortress',
  ];

  const SAFE_TEXT_PRESETS = [
    'Bring the textbook',
    'Running 10 mins late',
    'Please buy bread at the gate',
    'Forgot my office keys',
    'Will call you back shortly',
  ];

  // Initialize or update voice detector when safeWord changes or toggle state changes
  useEffect(() => {
    if (isListening) {
      startListening();
    } else {
      globalVoiceDetector.stop();
    }

    return () => {
      globalVoiceDetector.stop();
    };
  }, [isListening, safeWord]);

  const startListening = () => {
    const started = globalVoiceDetector.start({
      safeWord,
      onSafeWordDetected: (word, transcript) => {
        setVoiceStatus('detected');
        setVoiceStatusMsg(`Safe word "${word}" detected in speech! Triggering silent alert...`);
        triggerEmergency('safe_word', `Voice Safe Word Spoken: "${word}" (Transcript: "${transcript}")`);
      },
      onTranscript: (txt) => {
        setLiveTranscript(txt);
      },
      onStatusChange: (status, msg) => {
        setVoiceStatus(status);
        if (msg) setVoiceStatusMsg(msg);
      },
    });

    if (!started) {
      setIsListening(false);
    }
  };

  const toggleMicListening = () => {
    if (isListening) {
      globalVoiceDetector.stop();
      setIsListening(false);
      setVoiceStatus('idle');
      setVoiceStatusMsg('Voice detection paused.');
    } else {
      setIsListening(true);
    }
  };

  const [pinError, setPinError] = useState<string>('');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError('');

    const cleanPin = unlockPin.trim().replace(/\D/g, '');
    if (!cleanPin || cleanPin.length < 4 || cleanPin.length > 8) {
      setPinError('Unlock PIN must be between 4 and 8 numeric digits.');
      return;
    }

    const updated: UserProfile = {
      ...currentUser,
      safeWord: safeWord.trim(),
      safeText: safeText.trim(),
      unlockPin: cleanPin,
    };
    StorageService.setCurrentUser(updated);
    onUserUpdated(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Master alert trigger function
  const triggerEmergency = async (type: 'safe_word' | 'safe_text', detail: string) => {
    try {
      const location = await getCurrentDeviceLocation(currentUser.state);
      
      const payload = {
        emergencyId: currentUser.emergencyId,
        senderName: `${currentUser.firstName} ${currentUser.surname}`,
        phone: currentUser.phone,
        state: currentUser.state,
        coordinates: { lat: location.lat, lng: location.lng, accuracy: location.accuracy },
        timestamp: Date.now(),
        trigger: type,
        detail,
        emergencyContactsNotified: contacts.map(c => c.emergencyId),
      };

      const encrypted = await encryptEmergencyPayload(payload);

      const alertRecord: DistressAlert = {
        id: 'alt-' + Date.now(),
        senderEmergencyId: currentUser.emergencyId,
        senderName: `${currentUser.firstName} ${currentUser.surname}`,
        senderPhone: currentUser.phone,
        timestamp: Date.now(),
        triggerType: type,
        triggerDetail: detail,
        location,
        status: 'active',
        acknowledgedBy: [],
        respondersNotified: contacts.map(c => c.emergencyId),
        encryptedPayload: encrypted.ciphertext,
        encryptionHash: encrypted.hash,
        encryptionAlgorithm: encrypted.algorithm,
        notes: `Duress protocol executed: ${detail}`,
      };

      StorageService.dispatchDistressAlert(alertRecord);
      onAlertDispatched(alertRecord);

      setAlertFeedback(`🚨 Alert successfully dispatched to ${contacts.length} Emergency IDs with real-time location (${location.city || location.state})!`);
      setTimeout(() => setAlertFeedback(''), 6000);

    } catch (err) {
      console.error('Trigger error:', err);
    }
  };

  const handleSimulateVoice = () => {
    if (!simulatedVoiceInput.trim()) return;
    const testText = simulatedVoiceInput.trim();
    if (testText.toLowerCase().includes(safeWord.toLowerCase())) {
      triggerEmergency('safe_word', `Simulated Voice Safe Word: "${safeWord}"`);
    } else {
      setVoiceStatusMsg(`Heard: "${testText}" — did not match safe word "${safeWord}".`);
    }
    setSimulatedVoiceInput('');
  };

  const handleTestSafeText = () => {
    if (!testTextInput.trim()) return;
    const cleanInput = testTextInput.trim().toLowerCase();
    const cleanTarget = safeText.trim().toLowerCase();

    if (cleanInput.includes(cleanTarget)) {
      triggerEmergency('safe_text', `Safe Text Trigger Verified: "${safeText}"`);
    } else {
      setAlertFeedback(`Entered text did not match safe text ("${safeText}").`);
      setTimeout(() => setAlertFeedback(''), 4000);
    }
    setTestTextInput('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 sm:py-6 px-3 sm:px-6">
      
      {/* Header */}
      <div className="mb-6 rounded-2xl bg-[#18181B] border border-[#27272A] p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">
                Safe Word & Safe Text Duress Protocols
              </h1>
            </div>
            <p className="text-xs text-[#71717A] mt-1">
              Configure your covert voice recognition safe word and typed safe text phrases. If the safe word is spoken or safe text is typed, an immediate silent alert with your live GPS location is dispatched to your emergency responders.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMicListening}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-md cursor-pointer ${
                isListening
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white animate-pulse'
                  : 'bg-[#27272A] hover:bg-[#3F3F46] text-[#E4E4E7] border border-[#3F3F46]'
              }`}
            >
              {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-[#71717A]" />}
              <span>{isListening ? 'Covert Mic: Active' : 'Enable Covert Mic'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alert Dispatch Feedback Toast */}
      {alertFeedback && (
        <div className="mb-4 p-4 rounded-xl bg-red-950/60 border border-red-500 text-white text-xs flex items-center gap-3 animate-in fade-in">
          <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 animate-bounce" />
          <div className="flex-1">
            <p className="font-bold text-sm text-red-200">Duress Trigger Executed</p>
            <p className="mt-0.5 text-[#E4E4E7]">{alertFeedback}</p>
          </div>
        </div>
      )}

      {saveSuccess && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Safe Word and Safe Text settings updated successfully!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: Configuration Form */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] p-5 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              Configure Duress Credentials
            </h2>

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              
              {/* Covert Calculator Unlock PIN */}
              <div className="p-3.5 rounded-xl bg-[#09090B] border border-amber-500/30">
                <label className="block text-[#E4E4E7] font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    Calculator Unlock PIN <span className="text-amber-400">*</span>
                  </span>
                  <span className="text-[10px] text-amber-300 font-mono">4–8 digits</span>
                </label>
                <input
                  type="text"
                  maxLength={8}
                  required
                  value={unlockPin}
                  onChange={(e) => setUnlockPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g., 829104 or set your own"
                  className="w-full bg-[#18181B] border border-[#27272A] rounded-lg px-3 py-2 text-white font-mono text-base font-bold placeholder-[#71717A] focus:outline-none focus:border-amber-500 tracking-wider"
                />
                {pinError && (
                  <p className="text-[11px] text-red-400 mt-1 font-medium">{pinError}</p>
                )}
                <p className="text-[10px] text-[#71717A] mt-1.5 leading-relaxed">
                  Type this exact numeric PIN on the covert calculator keypad at any time to unlock your full safety dashboard.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-[10px] text-[#71717A]">Quick reset:</span>
                  <button
                    type="button"
                    onClick={() => setUnlockPin(defaultEmergencyDigits)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-[#27272A] hover:bg-[#3F3F46] text-amber-300 border border-[#3F3F46] cursor-pointer"
                  >
                    Reset to Emergency ID Digits ({defaultEmergencyDigits})
                  </button>
                </div>
              </div>

              {/* Safe Word (Voice Trigger) */}
              <div>
                <label className="block text-[#E4E4E7] font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Mic className="w-3.5 h-3.5 text-purple-400" />
                    Safe Word (Voice Trigger) <span className="text-red-400">*</span>
                  </span>
                  <span className="text-[10px] text-[#71717A] font-normal">Spoken aloud</span>
                </label>
                <input
                  type="text"
                  required
                  value={safeWord}
                  onChange={(e) => setSafeWord(e.target.value)}
                  placeholder="e.g., Red Umbrella"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2.5 text-white font-medium placeholder-[#71717A] focus:outline-none focus:border-purple-500 text-sm"
                />
                <p className="text-[10px] text-[#71717A] mt-1">
                  When spoken into your microphone, the Web Speech engine detects this phrase and immediately transmits your current location.
                </p>

                {/* Preset suggestions */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-[#71717A] py-0.5">Suggestions:</span>
                  {SAFE_WORD_PRESETS.map((word) => (
                    <button
                      key={word}
                      type="button"
                      onClick={() => setSafeWord(word)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#27272A] hover:bg-[#3F3F46] text-purple-300 border border-[#3F3F46] transition-colors cursor-pointer"
                    >
                      {word}
                    </button>
                  ))}
                </div>
              </div>

              {/* Safe Text (Text Duress Code) */}
              <div className="pt-2 border-t border-[#27272A]">
                <label className="block text-[#E4E4E7] font-semibold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Type className="w-3.5 h-3.5 text-sky-400" />
                    Safe Text (Typed Duress Code) <span className="text-red-400">*</span>
                  </span>
                  <span className="text-[10px] text-[#71717A] font-normal">Typed secretly</span>
                </label>
                <input
                  type="text"
                  required
                  value={safeText}
                  onChange={(e) => setSafeText(e.target.value)}
                  placeholder="e.g., Bring the textbook"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2.5 text-white font-medium placeholder-[#71717A] focus:outline-none focus:border-sky-500 text-sm"
                />
                <p className="text-[10px] text-[#71717A] mt-1">
                  When typed into the covert calculator keypad or stealth box, the alert is sent without alerting anyone nearby.
                </p>

                {/* Preset suggestions */}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="text-[10px] text-[#71717A] py-0.5">Suggestions:</span>
                  {SAFE_TEXT_PRESETS.map((txt) => (
                    <button
                      key={txt}
                      type="button"
                      onClick={() => setSafeText(txt)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#27272A] hover:bg-[#3F3F46] text-sky-300 border border-[#3F3F46] transition-colors cursor-pointer"
                    >
                      {txt}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition-colors shadow-md cursor-pointer mt-2"
              >
                Save Safe Word & Safe Text
              </button>

            </form>
          </div>

          {/* Broadcast Payload Preview */}
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] p-4 text-xs shadow-xl">
            <div className="flex items-center gap-1.5 text-[#E4E4E7] font-bold mb-2">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
              <span>Emergency Dispatch Payload Preview</span>
            </div>
            <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] font-mono text-[11px] text-[#E4E4E7] space-y-1">
              <p className="text-red-400 font-bold">[EMERGENCY DISTRESS SOS]</p>
              <p>USER: {currentUser.firstName} {currentUser.surname} ({currentUser.emergencyId})</p>
              <p>STATUS: IMMEDIATE HELP NEEDED</p>
              <p className="text-amber-400">LOCATION: Real-Time GPS Fix ({currentUser.state})</p>
              <p className="text-[#71717A]">AES-256 ENCRYPTION HASH: SHA256-VERIFIED</p>
              <p className="text-sky-400 mt-1">DISPATCHED TO: {contacts.length} Configured Responders</p>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Interactive Testing Simulators & Mic Monitor */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          
          {/* Live Voice Monitoring Status Box */}
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] p-5 shadow-xl">
            
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" />
                Live Speech Engine Status
              </h2>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                isListening ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' : 'bg-[#27272A] text-[#71717A]'
              }`}>
                {isListening ? 'MIC ACTIVE' : 'MIC OFF'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#71717A]">
                <span>Listening for Phrase:</span>
                <span className="font-bold text-purple-400">&quot;{safeWord}&quot;</span>
              </div>
              <div className="flex items-center justify-between text-[#71717A]">
                <span>Audio Recognition Engine:</span>
                <span className="text-[#E4E4E7]">{globalVoiceDetector.isSupported() ? 'Web Speech API Ready' : 'Simulator Mode'}</span>
              </div>
              {liveTranscript && (
                <div className="pt-2 border-t border-[#27272A]">
                  <span className="text-[10px] text-[#71717A] block">Heard Transcript:</span>
                  <p className="font-mono text-xs text-amber-300 mt-0.5 italic">
                    &quot;{liveTranscript}&quot;
                  </p>
                </div>
              )}
              {voiceStatusMsg && (
                <p className="text-[11px] text-emerald-400 pt-1">
                  {voiceStatusMsg}
                </p>
              )}
            </div>

            {/* Test Voice Safe Word with Simulator Button */}
            <div className="mt-4 pt-3 border-t border-[#27272A]">
              <label className="block text-xs font-semibold text-[#E4E4E7] mb-1">
                Test Voice Safe Word Trigger (Speech Simulation):
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={simulatedVoiceInput}
                  onChange={(e) => setSimulatedVoiceInput(e.target.value)}
                  placeholder={`Speak or type "${safeWord}" to test`}
                  className="flex-1 bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={handleSimulateVoice}
                  className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-600 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Test Voice
                </button>
              </div>
              <div className="mt-2 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setSimulatedVoiceInput(safeWord);
                    triggerEmergency('safe_word', `Simulated Voice Safe Word: "${safeWord}"`);
                  }}
                  className="text-[10px] text-purple-400 hover:text-purple-300 underline cursor-pointer"
                >
                  ⚡ One-Click Simulate &quot;{safeWord}&quot; Spoken
                </button>
              </div>
            </div>

          </div>

          {/* Test Safe Text Trigger Box */}
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] p-5 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Type className="w-4 h-4 text-sky-400" />
              Test Safe Text Trigger
            </h2>

            <p className="text-xs text-[#71717A] mb-3">
              Verify that typing your configured safe text triggers the silent distress alert.
            </p>

            <div className="flex gap-2">
              <input
                type="text"
                value={testTextInput}
                onChange={(e) => setTestTextInput(e.target.value)}
                placeholder={`Type "${safeText}"`}
                className="flex-1 bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-1.5 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-sky-500"
              />
              <button
                type="button"
                onClick={handleTestSafeText}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Test Text
              </button>
            </div>

            <div className="mt-2 flex gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setTestTextInput(safeText);
                  triggerEmergency('safe_text', `Safe Text Trigger Verified: "${safeText}"`);
                }}
                className="text-[10px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
              >
                ⚡ One-Click Simulate Typing &quot;{safeText}&quot;
              </button>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
