import React, { useState } from 'react';
import { 
  AlertTriangle, 
  MapPin, 
  ShieldAlert, 
  Lock, 
  CheckCircle2, 
  Copy, 
  Check, 
  Navigation,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { UserProfile, EmergencyContact, DistressAlert } from '../types';
import { getCurrentDeviceLocation, getGoogleMapsUrl } from '../services/geolocation';
import { encryptEmergencyPayload } from '../services/crypto';
import { StorageService } from '../services/storage';

interface CalculatorProps {
  currentUser: UserProfile;
  contacts: EmergencyContact[];
  alerts?: DistressAlert[];
  isUnlocked?: boolean;
  onUnlock?: () => void;
  onLock?: () => void;
  onAlertDispatched: (alert: DistressAlert) => void;
  onOpenSafeSettings: () => void;
  onOpenContacts: () => void;
  onOpenNotifications?: () => void;
  onOpenAuth?: () => void;
  onContactsUpdated?: (contacts: EmergencyContact[]) => void;
}

export const Calculator: React.FC<CalculatorProps> = ({
  currentUser,
  contacts,
  alerts = [],
  isUnlocked = false,
  onUnlock,
  onLock,
  onAlertDispatched,
  onOpenSafeSettings,
  onOpenContacts,
  onOpenNotifications,
  onOpenAuth,
  onContactsUpdated,
}) => {
  // Calculator arithmetic state
  const [display, setDisplay] = useState<string>('0');
  const [equation, setEquation] = useState<string>('');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [typedBuffer, setTypedBuffer] = useState<string>('');

  // Duress / Emergency triggering states
  const [isTriggering, setIsTriggering] = useState<boolean>(false);
  const [showNotificationToast, setShowNotificationToast] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [idCopied, setIdCopied] = useState<boolean>(false);

  // Active Unlock PIN: prioritize custom PIN, fallback to 6 digits added to surname
  const emergencyDigits = currentUser?.emergencyId
    ? (currentUser.emergencyId.split('-')[1]?.trim() || currentUser.emergencyId.replace(/\D/g, '') || '829104')
    : '829104';
  const activeUnlockPin = currentUser?.unlockPin?.trim() || emergencyDigits;

  // Calculator button handler
  const inputDigit = (digit: string) => {
    const newBuffer = (typedBuffer + digit).slice(-20);
    setTypedBuffer(newBuffer);

    // Check if the typed sequence ends with active unlock PIN or backup emergency ID digits
    if (!isUnlocked && onUnlock && (newBuffer.endsWith(activeUnlockPin) || newBuffer.endsWith(emergencyDigits))) {
      onUnlock();
      clearCalculator();
      return;
    }

    // Check if user entered '0000' to open new user registration / setup
    if (!isUnlocked && onOpenAuth && newBuffer.endsWith('0000')) {
      onOpenAuth();
      clearCalculator();
      return;
    }

    // Check if user's safe text matches typed digits
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
    // Check if entered value or buffer matches active unlock PIN or backup emergency digits
    if (!isUnlocked && onUnlock && (
      display === activeUnlockPin || 
      display === emergencyDigits || 
      typedBuffer.endsWith(activeUnlockPin) ||
      typedBuffer.endsWith(emergencyDigits)
    )) {
      onUnlock();
      clearCalculator();
      return;
    }

    // Check if user entered 0000 to open new user registration
    if (!isUnlocked && onOpenAuth && (display === '0000' || typedBuffer.endsWith('0000'))) {
      onOpenAuth();
      clearCalculator();
      return;
    }

    // Check emergency numbers like 112, 911
    if (display === '112' || display === '911') {
      triggerSilentAlert('covert_calculator', `Emergency Code Entered: ${display}`);
      clearCalculator();
      return;
    }

    const inputValue = parseFloat(display);
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
    if (!currentUser?.safeText) return;
    const cleanText = text.trim().toLowerCase();
    const cleanTarget = currentUser.safeText.trim().toLowerCase();

    if (cleanText.includes(cleanTarget)) {
      triggerSilentAlert('safe_text', `Safe Text Triggered: "${currentUser.safeText}"`);
      setTypedBuffer('');
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
        navigator.vibrate([120, 80, 120]);
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
        detail: detailMsg || 'Silent distress SOS initiated',
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
        triggerDetail: detailMsg || 'Silent Distress SOS Activated',
        location,
        status: 'active',
        acknowledgedBy: [],
        respondersNotified: contacts.map(c => c.emergencyId),
        encryptedPayload: encryptedPackage.ciphertext,
        encryptionHash: encryptedPackage.hash,
        encryptionAlgorithm: encryptedPackage.algorithm,
        notes: `Silent alert transmitted with GPS (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}).`,
      };

      // 6. Save to local storage & broadcast to responders
      StorageService.dispatchDistressAlert(alertRecord);
      onAlertDispatched(alertRecord);

      // 7. Toast feedback
      setToastMessage(
        `Silent alert dispatched to ${contacts.length} saved emergency contacts with real-time location.`
      );
      setShowNotificationToast(true);
      setTimeout(() => setShowNotificationToast(false), 5000);

    } catch (err) {
      console.error('Error dispatching silent alert:', err);
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

  // Maximum 6 contact slots
  const contactSlots = Array.from({ length: 6 }).map((_, idx) => contacts[idx] || null);

  // Reusable Keypad Component
  const renderCalculatorKeypad = () => (
    <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 sm:p-6 flex flex-col items-center shadow-xl w-full max-w-[360px]">
      
      {/* Top Speaker Bezel Pill */}
      <div className="w-12 h-1 bg-[#3F3F46] rounded-full mb-5"></div>

      {/* LCD Display */}
      <div className="w-full bg-[#09090B] text-right p-4 text-3xl font-mono text-emerald-400 rounded-xl mb-4 border border-[#27272A] shadow-inner min-h-[76px] flex flex-col justify-end">
        {equation && (
          <div className="text-xs font-mono text-[#71717A] h-4 overflow-hidden mb-1">
            {equation}
          </div>
        )}
        <div className="overflow-x-auto whitespace-nowrap">
          {display}
        </div>
      </div>

      {/* Keypad Grid */}
      <div className="grid grid-cols-4 gap-2 w-full select-none">
        {/* Row 1 */}
        <button
          onClick={clearCalculator}
          className="bg-[#27272A] h-13 flex items-center justify-center rounded-xl font-bold text-lg text-[#E4E4E7] hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
        >
          C
        </button>
        <button
          onClick={toggleSign}
          className="bg-[#27272A] h-13 flex items-center justify-center rounded-xl font-bold text-lg text-[#E4E4E7] hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
        >
          +/-
        </button>
        <button
          onClick={inputPercent}
          className="bg-[#27272A] h-13 flex items-center justify-center rounded-xl font-bold text-lg text-[#E4E4E7] hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
        >
          %
        </button>
        <button
          onClick={() => performOperation('÷')}
          className="bg-zinc-700 h-13 flex items-center justify-center rounded-xl font-bold text-xl text-white hover:bg-zinc-600 active:scale-95 transition-all cursor-pointer"
        >
          ÷
        </button>

        {/* Row 2 */}
        <button
          onClick={() => inputDigit('7')}
          className="bg-[#27272A] h-13 flex items-center justify-center rounded-xl font-bold text-lg text-white hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
        >
          7
        </button>
        <button
          onClick={() => inputDigit('8')}
          className="bg-[#27272A] h-13 flex items-center justify-center rounded-xl font-bold text-lg text-white hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
        >
          8
        </button>
        <button
          onClick={() => inputDigit('9')}
          className="bg-[#27272A] h-13 flex items-center justify-center rounded-xl font-bold text-lg text-white hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
        >
          9
        </button>
        <button
          onClick={() => performOperation('×')}
          className="bg-zinc-700 h-13 flex items-center justify-center rounded-xl font-bold text-xl text-white hover:bg-zinc-600 active:scale-95 transition-all cursor-pointer"
        >
          ×
        </button>

        {/* Row 3 */}
        <button
          onClick={() => inputDigit('4')}
          className="bg-[#27272A] h-13 flex items-center justify-center rounded-xl font-bold text-lg text-white hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
        >
          4
        </button>
        <button
          onClick={() => inputDigit('5')}
          className="bg-[#27272A] h-13 flex items-center justify-center rounded-xl font-bold text-lg text-white hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
        >
          5
        </button>
        <button
          onClick={() => inputDigit('6')}
          className="bg-[#27272A] h-13 flex items-center justify-center rounded-xl font-bold text-lg text-white hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
        >
          6
        </button>
        <button
          onClick={() => performOperation('-')}
          className="bg-zinc-700 h-13 flex items-center justify-center rounded-xl font-bold text-xl text-white hover:bg-zinc-600 active:scale-95 transition-all cursor-pointer"
        >
          -
        </button>

        {/* Row 4 */}
        <button
          onClick={() => inputDigit('1')}
          className="bg-[#27272A] h-13 flex items-center justify-center rounded-xl font-bold text-lg text-white hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
        >
          1
        </button>
        <button
          onClick={() => inputDigit('2')}
          className="bg-[#27272A] h-13 flex items-center justify-center rounded-xl font-bold text-lg text-white hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
        >
          2
        </button>
        <button
          onClick={() => inputDigit('3')}
          className="bg-[#27272A] h-13 flex items-center justify-center rounded-xl font-bold text-lg text-white hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
        >
          3
        </button>
        <button
          onClick={() => performOperation('+')}
          className="bg-zinc-700 h-13 flex items-center justify-center rounded-xl font-bold text-xl text-white hover:bg-zinc-600 active:scale-95 transition-all cursor-pointer"
        >
          +
        </button>

        {/* Row 5 */}
        <button
          onClick={() => inputDigit('0')}
          className="col-span-2 bg-[#27272A] h-13 flex items-center justify-center rounded-xl font-bold text-lg text-white hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
        >
          0
        </button>
        <button
          onClick={inputDecimal}
          className="bg-[#27272A] h-13 flex items-center justify-center rounded-xl font-bold text-lg text-white hover:bg-[#3F3F46] active:scale-95 transition-all cursor-pointer"
        >
          .
        </button>
        <button
          onClick={handleEquals}
          className="bg-amber-600 h-13 flex items-center justify-center rounded-xl font-bold text-xl text-white hover:bg-amber-500 active:scale-95 transition-all cursor-pointer"
        >
          =
        </button>
      </div>
    </div>
  );

  // ==========================================
  // 1. COVERT INITIAL SCREEN (when not unlocked)
  // Only shows calculator UI and silent distress button at the down part (not noticeable or very big)
  // ==========================================
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-[#E4E4E7] flex flex-col items-center justify-between p-4 sm:p-8 font-['Plus_Jakarta_Sans',sans-serif]">
        
        {/* Toast Alert Notification */}
        {showNotificationToast && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-sm p-3.5 rounded-xl bg-[#18181B] border border-[#3F3F46] shadow-2xl text-white flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
            <p className="text-xs text-[#E4E4E7] flex-1">{toastMessage}</p>
            <button 
              onClick={() => setShowNotificationToast(false)}
              className="text-[#71717A] hover:text-white text-xs cursor-pointer p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Spacer to visually balance the center layout */}
        <div className="h-6"></div>

        {/* Centered Covert Calculator */}
        <div className="flex flex-col items-center w-full">
          {renderCalculatorKeypad()}
        </div>

        {/* DOWN PART: Subtle Silent Distress Button & New User / PIN Access */}
        <div className="w-full max-w-sm flex flex-col items-center gap-3 pt-6 pb-4">
          <button
            id="covert-silent-distress-button"
            onClick={() => triggerSilentAlert('distress_button', 'Silent Distress dispatched from Covert Keypad')}
            disabled={isTriggering}
            className="px-4 py-2 rounded-full bg-[#18181B] hover:bg-[#27272A] active:scale-95 border border-[#27272A] hover:border-[#3F3F46] text-xs text-[#71717A] hover:text-[#A1A1AA] transition-all cursor-pointer flex items-center gap-2 select-none"
            title="Send silent distress alert"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isTriggering ? 'bg-amber-400 animate-ping' : 'bg-[#52525B]'}`} />
            <span>{isTriggering ? 'Dispatching...' : 'Silent Distress'}</span>
          </button>

          {/* Discreet Unlock Indicator & New User Registration Flow */}
          <div className="flex flex-col items-center gap-1.5 text-xs select-none text-center">
            <div className="flex items-center gap-1.5 text-[11px] text-[#52525B]">
              <Lock className="w-3 h-3 text-[#52525B]" />
              <span>Type unlock PIN <span className="font-mono text-[#71717A] font-semibold">({activeUnlockPin})</span> to unlock</span>
            </div>

            {onOpenAuth && (
              <button
                onClick={onOpenAuth}
                className="text-[11px] text-amber-400/80 hover:text-amber-300 underline underline-offset-2 transition-colors cursor-pointer mt-0.5"
              >
                New user? Register to get Emergency ID & PIN (or enter 0000)
              </button>
            )}
          </div>
        </div>

      </div>
    );
  }

  // ==========================================
  // 2. UNLOCKED INTERFACE
  // Every other feature displays with clean neutrals, reduced red, and straight-to-the-point layout
  // ==========================================
  return (
    <div className="w-full max-w-7xl mx-auto py-4 sm:py-6 px-4 sm:px-6 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Toast Alert Notification */}
      {showNotificationToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md p-3.5 rounded-xl bg-[#18181B] border border-[#3F3F46] shadow-2xl text-white flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
          <div className="flex-1 text-xs">
            <p className="font-semibold text-white">Emergency Protocol Dispatched</p>
            <p className="text-[#A1A1AA] mt-0.5">{toastMessage}</p>
          </div>
          <button 
            onClick={() => setShowNotificationToast(false)}
            className="text-[#71717A] hover:text-white p-1 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Unlocked Top Action Strip */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[#18181B] border border-[#27272A]">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-[#A1A1AA]">
            Unlocked with PIN: <strong className="text-white font-mono">{activeUnlockPin}</strong> ({currentUser.surname})
          </span>
          <button
            onClick={onOpenSafeSettings}
            className="text-[11px] text-amber-400 hover:text-amber-300 underline cursor-pointer ml-1"
            title="Configure your custom calculator unlock PIN"
          >
            Change PIN
          </button>
        </div>

        {onLock && (
          <button
            onClick={onLock}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer self-start sm:self-auto"
            title="Lock and hide interface immediately"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock to Calculator</span>
          </button>
        )}
      </div>

      {/* Main 2-Column Tactical Layout */}
      <div className="flex flex-col lg:flex-row gap-6">

        {/* LEFT COLUMN: Covert Calculator & Subtle Distress Button */}
        <div className="w-full lg:w-[360px] shrink-0 flex flex-col items-center">
          {renderCalculatorKeypad()}

          {/* Subtle Distress Button at bottom of keypad */}
          <div className="mt-4 w-full max-w-[360px]">
            <button
              id="emergency-distress-button"
              onClick={() => triggerSilentAlert('distress_button', 'Distress Button Activated on Home Page')}
              disabled={isTriggering}
              className="w-full py-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] hover:border-[#3F3F46] text-xs font-semibold text-[#A1A1AA] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span className={`w-2 h-2 rounded-full ${isTriggering ? 'bg-amber-400 animate-ping' : 'bg-rose-500'}`} />
              <span>{isTriggering ? 'Dispatching Alert...' : 'Silent Distress'}</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Straight-to-the-point Tactical Details */}
        <div className="flex-1 flex flex-col gap-6">
          
          {/* Identity & Status Card */}
          <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-[#18181B] border border-[#27272A] p-5 rounded-2xl shadow-xl gap-4">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#71717A] tracking-wider block">
                Your Emergency Identity
              </span>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-2xl font-mono font-bold text-white tracking-wider">
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
                <span className="mx-2">•</span>
                Unlock PIN: <span className="text-amber-400 font-mono font-bold">{activeUnlockPin}</span>
              </p>
            </div>

            <div className="text-left sm:text-right">
              <div className="text-xs px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                System Active
              </div>
              <p className="text-[10px] text-[#71717A] mt-2 font-mono uppercase">
                {currentUser.state.toUpperCase()}, NG
              </p>
            </div>
          </div>

          {/* 2-Column Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* COLUMN 1: Emergency Contacts (up to 6) */}
            <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 border-b border-[#27272A] pb-2">
                  <h2 className="text-xs font-bold uppercase text-[#A1A1AA]">
                    Emergency Contacts ({contacts.length}/6)
                  </h2>
                  <button
                    onClick={onOpenContacts}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                  >
                    Manage →
                  </button>
                </div>

                {/* 6 Slots Grid */}
                <div className="grid grid-cols-2 gap-2.5">
                  {contactSlots.map((contact, index) => {
                    if (contact) {
                      return (
                        <div 
                          key={contact.id || contact.emergencyId} 
                          className="bg-[#09090B] p-2.5 rounded-xl border border-[#27272A] relative flex flex-col justify-between"
                        >
                          <button 
                            onClick={(e) => handleRemoveContact(contact.emergencyId, e)}
                            title="Remove"
                            className="absolute top-1.5 right-1.5 text-[#71717A] hover:text-rose-400 text-xs cursor-pointer p-0.5"
                          >
                            ✕
                          </button>
                          <div>
                            <p className="text-[10px] text-[#71717A] font-mono truncate pr-4">
                              {contact.emergencyId}
                            </p>
                            <p className="text-xs font-semibold text-white mt-0.5 truncate">
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
                        className="bg-[#09090B] p-2.5 rounded-xl border border-[#27272A] border-dashed opacity-60 hover:opacity-100 hover:border-[#3F3F46] flex items-center justify-center cursor-pointer min-h-[68px] transition-all"
                      >
                        <span className="text-xs text-[#71717A]">
                          + Add Contact
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-[11px] text-[#71717A] mt-4 pt-2 border-t border-[#27272A]">
                Alerts and location are only shared with these verified IDs.
              </p>
            </div>

            {/* COLUMN 2: Triggers & Recent Alerts */}
            <div className="flex flex-col gap-4">
              
              {/* Protocol Triggers Card */}
              <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 shadow-xl">
                <div className="flex items-center justify-between mb-3 border-b border-[#27272A] pb-2">
                  <h2 className="text-xs font-bold uppercase text-[#A1A1AA]">
                    Protocol Triggers
                  </h2>
                  <button
                    onClick={onOpenSafeSettings}
                    className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                  >
                    Edit →
                  </button>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#09090B] border border-[#27272A]">
                    <span className="text-[#71717A]">Unlock PIN (Keypad)</span>
                    <span className="text-amber-400 font-mono font-semibold">{activeUnlockPin}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#09090B] border border-[#27272A]">
                    <span className="text-[#71717A]">Safe Word (Voice)</span>
                    <span className="text-emerald-400 font-mono font-semibold">{currentUser.safeWord || 'Red Umbrella'}</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#09090B] border border-[#27272A]">
                    <span className="text-[#71717A]">Safe Text</span>
                    <span className="text-emerald-400 font-mono font-semibold truncate max-w-[150px]">{currentUser.safeText || 'Bring the textbook'}</span>
                  </div>
                </div>
              </div>

              {/* Incoming Alerts Card */}
              <div className="bg-[#18181B] border border-[#27272A] rounded-2xl p-5 shadow-xl flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3 border-b border-[#27272A] pb-2">
                    <div className="flex items-center gap-1.5">
                      <h2 className="text-xs font-bold uppercase text-[#A1A1AA]">
                        Incoming Alerts
                      </h2>
                      {activeIncomingAlerts.length > 0 && (
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      )}
                    </div>
                    {onOpenNotifications && (
                      <button
                        onClick={onOpenNotifications}
                        className="text-xs text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                      >
                        All Alerts →
                      </button>
                    )}
                  </div>

                  <div className="space-y-2.5">
                    {activeIncomingAlerts.length > 0 ? (
                      activeIncomingAlerts.map(alert => (
                        <div key={alert.id} className="bg-[#09090B] p-3 rounded-xl border border-[#27272A]">
                          <div className="flex justify-between items-start">
                            <p className="text-xs font-semibold text-white">
                              {alert.senderEmergencyId}
                            </p>
                            <span className="text-[10px] text-[#71717A] font-mono">
                              {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#A1A1AA] mt-1 truncate">
                            {alert.location.city || alert.location.state} ({alert.location.lat.toFixed(4)}, {alert.location.lng.toFixed(4)})
                          </p>
                          <div className="mt-2.5 flex items-center gap-2">
                            <button
                              onClick={() => {
                                const url = getGoogleMapsUrl(alert.location.lat, alert.location.lng);
                                window.open(url, '_blank', 'noopener,noreferrer');
                              }}
                              className="text-[10px] bg-[#27272A] hover:bg-[#3F3F46] text-white px-2.5 py-1 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Navigation className="w-3 h-3 text-sky-400" />
                              Open Map
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="bg-[#09090B] p-3 rounded-xl border border-[#27272A] text-xs text-[#71717A]">
                        <p className="text-white font-medium">Channel Clear</p>
                        <p className="mt-0.5 text-[11px]">Ready to receive encrypted alerts from your saved contacts.</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-[#27272A] flex items-center justify-between text-[10px] text-[#71717A]">
                  <span>AES-256 Protocol</span>
                  <span className="text-emerald-400 font-mono">GPS Sync Active</span>
                </div>
              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
