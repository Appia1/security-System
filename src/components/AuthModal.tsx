import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  LogIn, 
  ShieldCheck, 
  KeyRound, 
  AlertCircle, 
  Check, 
  Sparkles,
  MapPin
} from 'lucide-react';
import { UserProfile } from '../types';
import { StorageService, generateEmergencyId } from '../services/storage';

interface AuthModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onUserLoggedIn: (user: UserProfile) => void;
  isGate?: boolean;
}

const NIGERIAN_STATES = [
  'Lagos State',
  'Abuja (FCT)',
  'Kaduna State',
  'Rivers State',
  'Oyo State',
  'Kano State',
  'Enugu State',
  'Edo State',
  'Delta State',
  'Anambra State',
  'Plateau State',
  'Ogun State',
  'Cross River State',
  'Borno State',
  'Akwa Ibom State',
  'Imo State',
  'Ondo State',
  'Benue State',
];

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onUserLoggedIn,
  isGate = false,
}) => {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');

  // Signup fields
  const [surname, setSurname] = useState('');
  const [firstName, setFirstName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState('Lagos State');
  const [safeWord, setSafeWord] = useState('Red Umbrella');
  const [safeText, setSafeText] = useState('Bring the textbook');

  // Signin fields
  const [signinId, setSigninId] = useState('');

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  // Live preview of generated Emergency ID (Surname + 6 digits)
  const previewEmergencyId = surname.trim()
    ? `${surname.trim().toUpperCase().replace(/[^A-Z]/g, '') || 'USER'}-******`
    : 'SURNAME-XXXXXX';

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!surname.trim()) {
      setErrorMsg('Surname is required to generate your Emergency ID.');
      return;
    }
    if (!firstName.trim()) {
      setErrorMsg('First name is required.');
      return;
    }
    if (!phone.trim()) {
      setErrorMsg('Valid phone number is required.');
      return;
    }

    try {
      const newUser = StorageService.registerUser({
        surname,
        firstName,
        phone,
        email: email || `${surname.toLowerCase()}@safeword.ng`,
        state,
        safeWord,
        safeText,
      });

      setSuccessMsg(`Welcome ${newUser.firstName}! Your Emergency ID is ${newUser.emergencyId}`);
      setTimeout(() => {
        onUserLoggedIn(newUser);
        if (onClose) onClose();
      }, 1200);
    } catch {
      setErrorMsg('Registration failed. Please try again.');
    }
  };

  const handleSignin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanInput = signinId.trim().toUpperCase();
    if (!cleanInput) {
      setErrorMsg('Please enter your Emergency ID or registered phone number.');
      return;
    }

    const allUsers = StorageService.getAllUsers();
    const found = allUsers.find(
      u => u.emergencyId.toUpperCase() === cleanInput || 
           u.phone.replace(/[^0-9]/g, '').includes(cleanInput.replace(/[^0-9]/g, ''))
    );

    if (found) {
      StorageService.setCurrentUser(found);
      onUserLoggedIn(found);
      if (onClose) onClose();
    } else {
      setErrorMsg('No account found with that Emergency ID. If you have not created an ID yet, please switch to "New User Registration" above.');
    }
  };

  const existingUsers = StorageService.getAllUsers();

  const handleSelectExistingUser = (user: UserProfile) => {
    StorageService.setCurrentUser(user);
    onUserLoggedIn(user);
    if (onClose) onClose();
  };

  return (
    <div className={isGate ? "min-h-screen py-8 px-4 flex items-center justify-center bg-[#0A0A0B]" : "fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-in fade-in duration-200"}>
      <div className="relative w-full max-w-lg rounded-3xl bg-[#18181B] border border-[#27272A] shadow-2xl p-5 sm:p-7 overflow-y-auto max-h-[92vh]">
        
        {/* Close Button (only shown in popup modal mode, not during mandatory gate) */}
        {!isGate && onClose && (
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-[#71717A] hover:text-white hover:bg-[#27272A] transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Brand header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr from-red-600 via-amber-600 to-orange-500 text-white shadow-lg shadow-red-950/40">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                SafeWord Security Portal
              </h2>
              {isGate && (
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-red-950 text-red-400 border border-red-800/60">
                  REQUIRED
                </span>
              )}
            </div>
            <p className="text-xs text-[#A1A1AA]">
              {isGate 
                ? 'Sign up or sign in to obtain your unique Emergency ID' 
                : 'Nigeria Emergency Geolocation Communication Protocol'}
            </p>
          </div>
        </div>

        {/* Mandatory Gate Notice */}
        {isGate && (
          <div className="mb-4 p-3 rounded-xl bg-amber-950/30 border border-amber-800/50 text-amber-200 text-xs flex items-start gap-2.5">
            <KeyRound className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">Identity Protocol Required</p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                Each user must sign up or sign in before receiving their official encrypted Emergency ID (<span className="font-mono text-white">SURNAME-XXXXXX</span>) and accessing the covert security suite.
              </p>
            </div>
          </div>
        )}

        {/* Mode Selector */}
        <div className="flex rounded-xl bg-[#09090B] p-1 mb-5 border border-[#27272A] text-xs">
          <button
            onClick={() => setMode('signup')}
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'signup'
                ? 'bg-[#27272A] text-white shadow-sm'
                : 'text-[#71717A] hover:text-white'
            }`}
          >
            <UserPlus className="w-4 h-4 text-red-400" />
            <span>New User Registration</span>
          </button>
          <button
            onClick={() => setMode('signin')}
            className={`flex-1 py-2 rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
              mode === 'signin'
                ? 'bg-[#27272A] text-white shadow-sm'
                : 'text-[#71717A] hover:text-white'
            }`}
          >
            <LogIn className="w-4 h-4 text-amber-400" />
            <span>Sign In</span>
          </button>
        </div>

        {/* Messages */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* SIGNUP FORM */}
        {mode === 'signup' ? (
          <form onSubmit={handleSignup} className="space-y-3.5 text-xs">
            
            {/* Generated Emergency ID Preview Box */}
            <div className="p-3 rounded-xl bg-[#09090B] border border-amber-500/40 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#71717A] block">
                  Automatic Emergency ID Generation
                </span>
                <span className="font-mono text-base font-extrabold text-amber-400 tracking-wider">
                  {previewEmergencyId}
                </span>
              </div>
              <span className="text-[10px] text-[#71717A] text-right max-w-[120px]">
                Generated from Surname + 6 random digits
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#A1A1AA] font-medium mb-1">
                  Surname <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={surname}
                  onChange={(e) => setSurname(e.target.value)}
                  placeholder="e.g., ADEBAYO"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-white placeholder-[#71717A] focus:outline-none focus:border-red-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-[#A1A1AA] font-medium mb-1">
                  First Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g., Victor"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-white placeholder-[#71717A] focus:outline-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#A1A1AA] font-medium mb-1">
                  Phone (Nigeria) <span className="text-red-400">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., 0803 123 4567"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-white placeholder-[#71717A] focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-[#A1A1AA] font-medium mb-1">
                  State of Residence
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-red-500"
                >
                  {NIGERIAN_STATES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2 border-t border-[#27272A]">
              <span className="text-[11px] font-bold text-[#71717A] uppercase tracking-wider block mb-2">
                Initial Duress Security Credentials
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[#71717A] mb-0.5">Voice Safe Word</label>
                  <input
                    type="text"
                    value={safeWord}
                    onChange={(e) => setSafeWord(e.target.value)}
                    placeholder="Red Umbrella"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-white placeholder-[#71717A] focus:outline-none focus:border-purple-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block text-[#71717A] mb-0.5">Covert Safe Text</label>
                  <input
                    type="text"
                    value={safeText}
                    onChange={(e) => setSafeText(e.target.value)}
                    placeholder="Bring the textbook"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-2.5 py-1.5 text-white placeholder-[#71717A] focus:outline-none focus:border-sky-500 text-xs"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs transition-colors shadow-lg cursor-pointer mt-2"
            >
              Generate Emergency ID & Create Account
            </button>

          </form>
        ) : (
          /* SIGNIN FORM */
          <form onSubmit={handleSignin} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#A1A1AA] font-medium mb-1">
                Emergency ID or Registered Phone
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={signinId}
                  onChange={(e) => setSigninId(e.target.value.toUpperCase())}
                  placeholder="e.g., ADEBAYO-482910 or phone number"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2.5 text-white font-mono placeholder-[#71717A] focus:outline-none focus:border-amber-500 text-sm uppercase"
                />
                <KeyRound className="w-4 h-4 text-[#71717A] absolute right-3 top-3" />
              </div>
              <p className="text-[10px] text-[#71717A] mt-1">
                Enter the Emergency ID generated during registration.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-colors shadow-md cursor-pointer"
            >
              Sign In to SafeWord Portal
            </button>
          </form>
        )}

        {/* Previously Registered Accounts on this Device */}
        {existingUsers.length > 0 && (
          <div className="mt-5 pt-4 border-t border-[#27272A]">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#A1A1AA] mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Registered Profiles on this Device:</span>
            </div>

            <div className="space-y-2">
              {existingUsers.map(user => (
                <button
                  key={user.emergencyId}
                  type="button"
                  onClick={() => handleSelectExistingUser(user)}
                  className="w-full p-2.5 rounded-xl bg-[#09090B] hover:bg-[#27272A] border border-[#27272A] text-left transition-colors flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-lg bg-gradient-to-tr ${user.avatarColor} flex items-center justify-center text-xs font-bold text-white`}>
                      {user.surname.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-white block text-xs">{user.firstName} {user.surname}</span>
                      <span className="text-[10px] text-[#71717A]">{user.state}</span>
                    </div>
                  </div>
                  <span className="font-mono text-xs text-amber-400 font-bold bg-[#18181B] px-2 py-1 rounded-lg border border-[#27272A]">
                    {user.emergencyId}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
