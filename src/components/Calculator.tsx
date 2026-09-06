import React, { useState } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  ShieldAlert, 
  Radio, 
  Lock, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Copy, 
  Check, 
  ExternalLink,
  Zap,
  Navigation,
  Sparkles
} from 'lucide-react';
import { UserProfile, EmergencyContact, DistressAlert } from '../types';
import { getCurrentDeviceLocation, getGoogleMapsUrl } from '../services/geolocation';
import { encryptEmergencyPayload } from '../services/crypto';
import { StorageService } from '../services/storage';

interface CalculatorProps {
  currentUser: UserProfile;
  contacts: EmergencyContact[];
  alerts?: DistressAlert[];
  onAlertDispatched: (alert: DistressAlert) => void;
  onOpenSafeSettings: () => void;
  onOpenContacts: () => void;
  onOpenNotifications?: () => void;
  onContactsUpdated?: (contacts: EmergencyContact[]) => void;
}

export const Calculator: React.FC<CalculatorProps> = ({
  currentUser,
  contacts,
  alerts = [],
  onAlertDispatched,
  onOpenSafeSettings,
  onOpenContacts,
  onOpenNotifications,
  onContactsUpdated,
}) => {
  // Calculator state
  const [display, setDisplay] = useState<string>('0');
  const [equation, setEquation] = useState<string>('');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [typedBuffer, setTypedBuffer] = useState<string>('');

  // Duress / Emergency triggering states
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [lastDispatchedAlert, setLastDispatchedAlert] = useState<DistressAlert | null>(null);
  const [showNotificationToast, setShowNotificationToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [stealthInput, setStealthInput] = useState<string>('');
  const [showStealthInput, setShowStealthInput] = useState<boolean>(false);
  const [idCopied, setIdCopied] = useState<boolean>(false);

  // Calculator button handler
  const inputDigit = (digit: string) => {
    // Append to typed buffer to check for secret number code
    const newBuffer = (typedBuffer + digit).slice(-20);
    setTypedBuffer(newBuffer);

    // Check if user's safe text matches the typed buffer
    checkSafeTextMatch(newBuffer);

    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay('0.');
      setWaitingForOperand(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clearCalculator = () => {
    setDisplay('0');
    setEquation('');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  };

  const toggleSign = () => {
    const val = parseFloat(display);
    setDisplay((val * -1).toString());
  };

  const inputPercent = () => {
    const val = parseFloat(display);
    setDisplay((val / 100).toString());
  };

  const performOperation = (nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
      setEquation(`${inputValue} ${nextOperator}`);
    } else if (operator) {
      const currentValue = prevValue || 0;
      let result = 0;
      switch (operator) {
        case '+': result = currentValue + inputValue; break;
        case '-': result = currentValue - inputValue; break;
        case '×': result = currentValue * inputValue; break;
        case '÷': result = inputValue !== 0 ? currentValue / inputValue : 0; break;
        default: result = inputValue;
      }
      setPrevValue(result);
      setDisplay(String(Number(result.toFixed(8))));
      setEquation(`${result} ${nextOperator}`);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  };

  const handleEquals = () => {
    const inputValue = parseFloat(display);

    // Check if the current display or typed buffer matches emergency codes (e.g. 911, 112, 199)
    if (display === '911' || display === '112' || display === '199') {
      triggerSilentAlert('covert_calculator', `Emergency Code Entered on Calculator: ${display}`);
      clearCalculator();
      return;
    }

    if (operator && prevValue !== null) {
      const currentValue = prevValue;
      let result = 0;
      switch (operator) {
        case '+': result = currentValue + inputValue; break;
        case '-': result = currentValue - inputValue; break;
        case '×': result = currentValue * inputValue; break;
        case '÷': result = inputValue !== 0 ? currentValue / inputValue : 0; break;
        default: result = inputValue;
      }
      setDisplay(String(Number(result.toFixed(8))));
      setEquation(`${prevValue} ${operator} ${inputValue} =`);
      setPrevValue(null);
      setOperator(null);
      setWaitingForOperand(true);
    }
  };

  // Safe Text Trigger Checker
  const checkSafeTextMatch = (text: string) => {
    if (!currentUser.safeText) return;
    const cleanText = text.trim().toLowerCase();
    const cleanTarget = currentUser.safeText.trim().toLowerCase();

    if (cleanText.includes(cleanTarget)) {
      triggerSilentAlert('safe_text', `Safe Text Triggered: "${currentUser.safeText}"`);
      setTypedBuffer('');
      setStealthInput('');
    }
  };

  // Master Trigger for Silent Emergency Distress Alert
  const triggerSilentAlert = async (
    type: 'distress_button' | 'safe_word' | 'safe_text' | 'covert_calculator',
    detailMsg?: string
  ) => {
    if (isTriggering) return;
    setIsTriggering(true);

    try {
      // 1. Silent tactile vibration feedback if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate([150, 100, 150]);
      }

      // 2. Obtain real-time current geolocation
      const location = await getCurrentDeviceLocation(currentUser.state);

      // 3. Construct emergency payload
      const payload = {
        emergencyId: currentUser.emergencyId,
        senderName: `${currentUser.firstName} ${currentUser.surname}`,
        phone: currentUser.phone,
        state: currentUser.state,
        coordinates: { lat: location.lat, lng: location.lng, accuracy: location.accuracy },
        timestamp: Date.now(),
        trigger: type,
        detail: detailMsg || 'Distress SOS initiated',
        emergencyContactsNotified: contacts.map(c => c.emergencyId),
      };

      // 4. Encrypt with AES-256-GCM
      const encryptedPackage = await encryptEmergencyPayload(payload);

      // 5. Create Distress Alert record
      const alertRecord: DistressAlert = {
        id: 'alt-' + Date.now(),
        senderEmergencyId: currentUser.emergencyId,
        senderName: `${currentUser.firstName} ${currentUser.surname}`,
        senderPhone: currentUser.phone,
        timestamp: Date.now(),
        triggerType: type,
        triggerDetail: detailMsg || 'Silent Distress SOS Button Pressed',
        location,
        status: 'active',
        acknowledgedBy: [],
        respondersNotified: contacts.map(c => c.emergencyId),
        encryptedPayload: encryptedPackage.ciphertext,
        encryptionHash: encryptedPackage.hash,
        encryptionAlgorithm: encryptedPackage.algorithm,
        notes: `Silent emergency alert transmitted with verified GPS (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}).`,
      };

      // 6. Save to local storage & broadcast to responders
      StorageService.dispatchDistressAlert(alertRecord);
      setLastDispatchedAlert(alertRecord);
      onAlertDispatched(alertRecord);

      // 7. Toast feedback
      setToastMessage(
        `Silent alert sent to ${contacts.length} Emergency IDs with real-time location (${location.city || location.state})!`
      );
      setShowNotificationToast(true);
      setTimeout(() => setShowNotificationToast(false), 6000);

    } catch (err) {
      console.error('Error dispatching emergency alert:', err);
    } finally {
      setIsTriggering(false);
    }
  };

  const copyEmergencyId = () => {
    navigator.clipboard.writeText(currentUser.emergencyId);
    setIdCopied(true);
    setTimeout(() => setIdCopied(false), 2000);
  };

  const handleRemoveContact = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = StorageService.removeContact(currentUser.emergencyId, id);
    if (onContactsUpdated) {
      onContactsUpdated(updated);
    }
  };

  // Strict privacy filter:
  // Only show alerts where currentUser is the sender OR was designated as a responder by the sender
  const activeIncomingAlerts = alerts
    .filter(a => {
      if (a.status !== 'active') return false;
      const cleanCurrentId = currentUser.emergencyId?.trim().toUpperCase();
      const isSender = a.senderEmergencyId?.trim().toUpperCase() === cleanCurrentId;
      const isTargetedContact = Array.isArray(a.respondersNotified) &&
        a.respondersNotified.some(id => id?.trim().toUpperCase() === cleanCurrentId);
      return isSender || isTargetedContact;
    })
    .slice(0, 2);

  // Maximum 6 contact slots for High Density grid
  const contactSlots = Array.from({ length: 6 }).map((_, idx) => contacts[idx] || null);

  return (
    <div className="w-full max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6">
      
      {/* Toast Alert Notification */}
      {showNotificationToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md p-4 rounded-xl bg-red-950 border border-red-500 shadow-2xl text-white flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5 animate-bounce" />
          <div className="flex-1 text-xs">
            <p className="font-bold text-sm text-red-200">Emergency Protocol Dispatched</p>
            <p className="mt-1 text-neutral-200">{toastMessage}</p>
            <p className="mt-1.5 font-mono text-[10px] text-amber-300">
              AES-256 Encrypted • GPS Fix Acquired • Silent Mode Active
            </p>
          </div>
          <button 
            onClick={() => setShowNotificationToast(false)}
            className="text-neutral-400 hover:text-white p-1 text-sm font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main High Density Container: 2 Main Columns */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* LEFT COLUMN: Covert Calculator & Firebase Setup Guide */}
        <div className="w-full lg:w-[380px] xl:w-[400px] shrink-0 flex flex-col gap-4">
          
          {/* Covert Calculator Container */}
          <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-6 flex flex-col items-center shadow-xl">
            
            {/* Top Speaker Bezel Pill */}
            <div className="w-12 h-1 bg-[#3F3F46] rounded-full mb-6"></div>

            {/* Calculator Keypad Grid */}
            <div className="grid grid-cols-4 gap-2 w-full select-none">
              
              {/* LCD Display */}
              <div className="col-span-4 bg-[#09090B] text-right p-4 text-3xl font-mono text-emerald-500 rounded-lg mb-4 border border-[#27272A] shadow-inner min-h-[72px] flex flex-col justify-end">
                {equation && (
                  <div className="text-xs font-mono text-[#71717A] h-4 overflow-hidden mb-1">
                    {equation}
                  </div>
                )}
                <div className="overflow-x-auto whitespace-nowrap">
                  {display}
                </div>
              </div>

              {/* Row 1 */}
              <button
                onClick={clearCalculator}
                className="bg-[#27272A] h-14 flex items-center justify-center rounded-lg font-bold text-xl text-[#E4E4E7] hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
              >
                C
              </button>
              <button
                onClick={toggleSign}
                className="bg-[#27272A] h-14 flex items-center justify-center rounded-lg font-bold text-xl text-[#E4E4E7] hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
              >
                +/-
              </button>
              <button
                onClick={inputPercent}
                className="bg-[#27272A] h-14 flex items-center justify-center rounded-lg font-bold text-xl text-[#E4E4E7] hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
              >
                %
              </button>
              <button
                onClick={() => performOperation('÷')}
                className="bg-orange-600 h-14 flex items-center justify-center rounded-lg font-bold text-xl text-white hover:bg-orange-500 active:scale-95 transition-all cursor-pointer"
              >
                ÷
              </button>

              {/* Row 2 */}
              <button
                onClick={() => inputDigit('7')}
                className="bg-[#3F3F46] h-14 flex items-center justify-center rounded-lg font-bold text-xl text-white hover:bg-[#52525B] active:scale-95 transition-all cursor-pointer"
              >
                7
              </button>
              <button
                onClick={() => inputDigit('8')}
                className="bg-[#3F3F46] h-14 flex items-center justify-center rounded-lg font-bold text-xl text-white hover:bg-[#52525B] active:scale-95 transition-all cursor-pointer"
              >
                8
              </button>
              <button
                onClick={() => inputDigit('9')}
                className="bg-[#3F3F46] h-14 flex items-center justify-center rounded-lg font-bold text-xl text-white hover:bg-[#52525B] active:scale-95 transition-all cursor-pointer"
              >
                9
              </button>
              <button
                onClick={() => performOperation('×')}
                className="bg-orange-600 h-14 flex items-center justify-center rounded-lg font-bold text-xl text-white hover:bg-orange-500 active:scale-95 transition-all cursor-pointer"
              >
                ×
              </button>

              {/* Row 3 */}
              <button
                onClick={() => inputDigit('4')}
                className="bg-[#3F3F46] h-14 flex items-center justify-center rounded-lg font-bold text-xl text-white hover:bg-[#52525B] active:scale-95 transition-all cursor-pointer"
              >
                4
              </button>
              <button
                onClick={() => inputDigit('5')}
                className="bg-[#3F3F46] h-14 flex items-center justify-center rounded-lg font-bold text-xl text-white hover:bg-[#52525B] active:scale-95 transition-all cursor-pointer"
              >
                5
              </button>
              <button
                onClick={() => inputDigit('6')}
                className="bg-[#3F3F46] h-14 flex items-center justify-center rounded-lg font-bold text-xl text-white hover:bg-[#52525B] active:scale-95 transition-all cursor-pointer"
              >
                6
              </button>
              <button
                onClick={() => performOperation('-')}
                className="bg-orange-600 h-14 flex items-center justify-center rounded-lg font-bold text-xl text-white hover:bg-orange-500 active:scale-95 transition-all cursor-pointer"
              >
                -
              </button>

              {/* Row 4 */}
              <button
                onClick={() => inputDigit('1')}
                className="bg-[#3F3F46] h-14 flex items-center justify-center rounded-lg font-bold text-xl text-white hover:bg-[#52525B] active:scale-95 transition-all cursor-pointer"
              >
                1
              </button>
              <button
                onClick={() => inputDigit('2')}
                className="bg-[#3F3F46] h-14 flex items-center justify-center rounded-lg font-bold text-xl text-white hover:bg-[#52525B] active:scale-95 transition-all cursor-pointer"
              >
                2
              </button>
              <button
                onClick={() => inputDigit('3')}
                className="bg-[#3F3F46] h-14 flex items-center justify-center rounded-lg font-bold text-xl text-white hover:bg-[#52525B] active:scale-95 transition-all cursor-pointer"
              >
                3
              </button>
              <button
                onClick={() => performOperation('+')}
                className="bg-orange-600 h-14 flex items-center justify-center rounded-lg font-bold text-xl text-white hover:bg-orange-500 active:scale-95 transition-all cursor-pointer"
              >
                +
              </button>

              {/* Row 5 */}
              <button
                onClick={() => inputDigit('0')}
                className="col-span-2 bg-[#3F3F46] h-14 flex items-center justify-center rounded-lg font-bold text-xl text-white hover:bg-[#52525B] active:scale-95 transition-all cursor-pointer"
              >
                0
              </button>
              <button
                onClick={inputDecimal}
                className="bg-[#3F3F46] h-14 flex items-center justify-center rounded-lg font-bold text-xl text-white hover:bg-[#52525B] active:scale-95 transition-all cursor-pointer"
              >
                .
              </button>
              <button
                onClick={handleEquals}
                className="bg-orange-600 h-14 flex items-center justify-center rounded-lg font-bold text-xl text-white hover:bg-orange-500 active:scale-95 transition-all cursor-pointer"
              >
                =
              </button>

            </div>

            {/* THE LARGE TAPPABLE DISTRESS BUTTON (Required by Prompt & High Density Theme) */}
            <div className="mt-6 w-full">
              <button
                id="emergency-distress-button"
                onClick={() => triggerSilentAlert('distress_button', 'Distress Button Activated on Home Page')}
                disabled={isTriggering}
                className="w-full bg-red-600/20 border-2 border-red-500 text-red-500 py-4 rounded-xl font-black text-xl tracking-widest shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:bg-red-600/30 active:scale-95 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ShieldAlert className="w-6 h-6" />
                <span>{isTriggering ? 'DISPATCHING...' : 'SILENT DISTRESS'}</span>
              </button>
            </div>

            <p className="text-[10px] text-[#71717A] mt-4 uppercase tracking-widest italic text-center">
              Stealth Protection Mode Active
            </p>

            {/* Expandable Covert Safe Text Trigger */}
            <div className="w-full mt-3 pt-3 border-t border-[#27272A] flex items-center justify-between text-[11px]">
              <span className="text-[#71717A]">
                Duress Code: &quot;{currentUser.safeText || '911'}&quot;
              </span>
              <button
                onClick={() => setShowStealthInput(!showStealthInput)}
                className="text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                {showStealthInput ? 'Hide' : 'Covert Box'}
              </button>
            </div>

            {showStealthInput && (
              <div className="w-full mt-2 p-2.5 rounded-lg bg-[#09090B] border border-[#27272A] text-xs">
                <label className="block text-[10px] text-[#71717A] uppercase mb-1">
                  Type covert text to trigger alert:
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={stealthInput}
                    onChange={(e) => {
                      setStealthInput(e.target.value);
                      checkSafeTextMatch(e.target.value);
                    }}
                    placeholder={`e.g. "${currentUser.safeText}"`}
                    className="flex-1 bg-[#18181B] border border-[#27272A] rounded px-2.5 py-1.5 text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-red-500 font-mono"
                  />
                  <button
                    onClick={() => {
                      if (stealthInput.trim()) {
                        triggerSilentAlert('safe_text', `Duress Text: "${stealthInput}"`);
                        setStealthInput('');
                      }
                    }}
                    className="px-2.5 py-1.5 rounded bg-red-600/30 text-red-400 border border-red-500/40 hover:bg-red-600/50 font-semibold cursor-pointer"
                  >
                    Send
                  </button>
                </div>
              </div>
            )}

          </div>

        </div>

        {/* RIGHT COLUMN: High Density Tactical Dashboard */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Emergency Identity Banner (Required by prompt) */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-[#18181B] border border-[#27272A] p-6 rounded-2xl shadow-xl gap-4">
            <div>
              <h1 className="text-sm text-[#71717A] uppercase font-semibold tracking-wider">
                Emergency Identity
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-wider">
                  {currentUser.emergencyId}
                </p>
                <button
                  onClick={copyEmergencyId}
                  className="p-1.5 rounded-lg bg-[#09090B] border border-[#27272A] text-[#71717A] hover:text-white transition-colors cursor-pointer"
                  title="Copy Emergency ID"
                >
                  {idCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-[#71717A] mt-1">
                Registered To: <span className="text-[#E4E4E7] font-semibold">{currentUser.firstName} {currentUser.surname}</span>
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                System Secure
              </div>
              <p className="text-[10px] text-[#71717A] mt-2 font-mono uppercase">
                {currentUser.state.toUpperCase()}, NG • 6.5244° N, 3.3792° E
              </p>
            </div>
          </div>

          {/* High Density 2-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* COLUMN 1: Trusted Emergency Contacts (06) */}
            <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-4 border-b border-[#27272A] pb-2">
                <h2 className="text-xs font-bold uppercase text-[#A1A1AA]">
                  Trusted Emergency Contacts (06)
                </h2>
                <span className="text-[10px] font-mono text-[#71717A]">
                  {contacts.length} / 6
                </span>
              </div>

              {/* 6 Slots Grid */}
              <div className="grid grid-cols-2 gap-3 flex-1">
                {contactSlots.map((contact, index) => {
                  if (contact) {
                    return (
                      <div 
                        key={contact.id || contact.emergencyId} 
                        className="bg-[#09090B] p-3 rounded-lg border border-[#27272A] relative flex flex-col justify-between group"
                      >
                        <button 
                          onClick={(e) => handleRemoveContact(contact.emergencyId, e)}
                          title="Remove Contact"
                          className="absolute -top-1 -right-1 bg-red-500 hover:bg-red-600 text-white w-4 h-4 rounded-full text-[10px] flex items-center justify-center transition-colors cursor-pointer"
                        >
                          ×
                        </button>
                        <div>
                          <p className="text-[10px] text-[#71717A] font-mono truncate">
                            ID: {contact.emergencyId}
                          </p>
                          <p className="text-xs font-bold text-white mt-0.5 truncate">
                            {contact.name}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-[#71717A]">
                          <span className="truncate">{contact.relationship}</span>
                          <span className="text-emerald-400 font-mono text-[9px]">ACTIVE</span>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div 
                      key={`empty-slot-${index}`}
                      onClick={onOpenContacts}
                      className="bg-[#09090B] p-3 rounded-lg border border-[#27272A] flex flex-col items-center justify-center border-dashed opacity-50 hover:opacity-100 hover:border-amber-500/50 transition-all cursor-pointer min-h-[76px]"
                    >
                      <span className="text-xs text-[#71717A] group-hover:text-amber-400 font-medium">
                        + Add ID
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 pt-3 border-t border-[#27272A] flex items-center justify-between text-xs">
                <span className="text-[#71717A]">Add or remove responders</span>
                <button
                  onClick={onOpenContacts}
                  className="text-amber-400 hover:text-amber-300 font-semibold cursor-pointer underline text-[11px]"
                >
                  Manage IDs →
                </button>
              </div>

            </div>

            {/* COLUMN 2: Protocol Triggers & Live Incoming Alerts */}
            <div className="flex flex-col gap-4">
              
              {/* Protocol Triggers Card */}
              <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4 border-b border-[#27272A] pb-2">
                  <h2 className="text-xs font-bold uppercase text-[#A1A1AA]">
                    Protocol Triggers
                  </h2>
                  <button
                    onClick={onOpenSafeSettings}
                    className="text-[10px] text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                  >
                    Edit
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-[#71717A] uppercase block mb-1">
                      Silent Safe Word
                    </label>
                    <input 
                      type="text" 
                      value={currentUser.safeWord || 'COBALT'} 
                      readOnly 
                      className="w-full bg-[#09090B] border border-[#27272A] rounded px-3 py-2 text-sm text-emerald-400 font-mono focus:outline-none" 
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#71717A] uppercase block mb-1">
                      Emergency Safe Text
                    </label>
                    <input 
                      type="text" 
                      value={currentUser.safeText || 'Package arrived at 4pm'} 
                      readOnly 
                      className="w-full bg-[#09090B] border border-[#27272A] rounded px-3 py-2 text-sm text-emerald-400 font-mono focus:outline-none" 
                    />
                  </div>
                </div>
              </div>

              {/* Incoming Alerts Card */}
              <div className="bg-red-950/20 border border-red-900/50 rounded-2xl p-5 flex-1 shadow-xl flex flex-col justify-between">
                <div>
                  <h2 className="text-xs font-bold uppercase mb-4 text-red-400 flex justify-between items-center">
                    <span>Incoming Alerts</span>
                    <span className="animate-pulse flex items-center gap-1 text-[10px] text-red-400 font-mono">
                      ● Live
                    </span>
                  </h2>

                  <div className="space-y-3">
                    {activeIncomingAlerts.length > 0 ? (
                      activeIncomingAlerts.map(alert => (
                        <div key={alert.id} className="bg-[#09090B] p-3 rounded-lg border-l-4 border-red-500">
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-bold text-white truncate max-w-[190px]">
                              EMERGENCY: {alert.senderEmergencyId}
                            </p>
                            <span className="text-[10px] text-[#71717A] shrink-0 font-mono">
                              {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[10px] text-red-400 mt-1 font-mono truncate">
                            LOC: {alert.location.lat.toFixed(4)}° N, {alert.location.lng.toFixed(4)}° E ({alert.location.city || alert.location.state})
                          </p>
                          <div className="mt-2 flex items-center gap-2">
                            <button
                              onClick={() => {
                                const url = getGoogleMapsUrl(alert.location.lat, alert.location.lng);
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              className="text-[10px] bg-red-600 hover:bg-red-500 text-white font-semibold px-2.5 py-1 rounded transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Navigation className="w-3 h-3" />
                              TRACK NOW
                            </button>
                            {onOpenNotifications && (
                              <button
                                onClick={onOpenNotifications}
                                className="text-[10px] text-[#A1A1AA] hover:text-white underline cursor-pointer"
                              >
                                View Details
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-[#09090B] p-3 rounded-lg border-l-4 border-emerald-500/60">
                        <div className="flex justify-between">
                          <p className="text-xs font-bold text-[#E4E4E7]">Emergency Channel Clear</p>
                          <span className="text-[10px] text-emerald-400 font-mono">STANDBY</span>
                        </div>
                        <p className="text-[10px] text-[#71717A] mt-1 font-mono">
                          Ready to receive encrypted distress broadcasts from all 6 Emergency IDs.
                        </p>
                        {onOpenNotifications && (
                          <button
                            onClick={onOpenNotifications}
                            className="mt-2 text-[10px] bg-[#27272A] hover:bg-[#3F3F46] text-[#E4E4E7] px-2 py-1 rounded cursor-pointer transition-colors"
                          >
                            Open Alert Center
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-red-900/30 flex items-center justify-between text-[10px] text-[#71717A]">
                  <span>Encrypted AES-256 Protocol</span>
                  <span className="font-mono text-emerald-400">GPS Sync Active</span>
                </div>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
