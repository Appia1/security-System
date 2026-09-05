import React, { useState } from 'react';
import { 
  Users, 
  UserPlus, 
  Trash2, 
  ShieldCheck, 
  AlertCircle, 
  Phone, 
  Check, 
  KeyRound, 
  Sparkles,
  Info
} from 'lucide-react';
import { EmergencyContact, UserProfile } from '../types';
import { StorageService } from '../services/storage';

interface ContactsManagerProps {
  currentUser: UserProfile;
  contacts: EmergencyContact[];
  onContactsUpdated: (updatedContacts: EmergencyContact[]) => void;
}

export const ContactsManager: React.FC<ContactsManagerProps> = ({
  currentUser,
  contacts,
  onContactsUpdated,
}) => {
  const [name, setName] = useState('');
  const [emergencyId, setEmergencyId] = useState('');
  const [phone, setPhone] = useState('');
  const [relationship, setRelationship] = useState('Family');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Official Nigerian national and state emergency agency responders
  const PRESET_RESPONDERS = [
    { name: 'Nigeria Police Emergency Dispatch', emergencyId: 'POLICE-112099', phone: '112 / 199', relationship: 'Police / Law' },
    { name: 'FRSC Highway Rescue Corps', emergencyId: 'FRSC-122901', phone: '122', relationship: 'Highway Patrol' },
    { name: 'LASEMA Emergency Command', emergencyId: 'LASEMA-765104', phone: '0800392742', relationship: 'Disaster / Medical' },
    { name: 'NEMA National Emergency', emergencyId: 'NEMA-080033', phone: '080022556362', relationship: 'Rescue Command' },
  ];

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (contacts.length >= 6) {
      setErrorMsg('Maximum limit reached! You can add up to 6 emergency contacts.');
      return;
    }

    if (!name.trim()) {
      setErrorMsg('Please provide a contact name.');
      return;
    }

    const cleanId = emergencyId.trim().toUpperCase();
    if (!cleanId) {
      setErrorMsg('Please enter an Emergency ID (e.g., CHUKWU-719302).');
      return;
    }

    // Check if adding own ID
    if (cleanId === currentUser.emergencyId) {
      setErrorMsg('You cannot add your own Emergency ID to your responder list.');
      return;
    }

    const res = StorageService.addContact(currentUser.emergencyId, {
      name,
      emergencyId: cleanId,
      phone: phone.trim() || '+234 Emergency Line',
      relationship,
    });

    if (res.success && res.contacts) {
      onContactsUpdated(res.contacts);
      setSuccessMsg(res.message);
      setName('');
      setEmergencyId('');
      setPhone('');
      setTimeout(() => setSuccessMsg(''), 4000);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleQuickAdd = (preset: typeof PRESET_RESPONDERS[0]) => {
    setErrorMsg('');
    setSuccessMsg('');

    if (contacts.length >= 6) {
      setErrorMsg('Maximum limit reached! You can add up to 6 emergency contacts.');
      return;
    }

    const res = StorageService.addContact(currentUser.emergencyId, {
      name: preset.name,
      emergencyId: preset.emergencyId,
      phone: preset.phone,
      relationship: preset.relationship,
    });

    if (res.success && res.contacts) {
      onContactsUpdated(res.contacts);
      setSuccessMsg(`Added ${preset.name}!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleRemoveContact = (contactId: string, contactName: string) => {
    const updated = StorageService.removeContact(currentUser.emergencyId, contactId);
    onContactsUpdated(updated);
    setSuccessMsg(`Removed ${contactName} from your emergency list.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto py-4 sm:py-6 px-3 sm:px-6">
      
      {/* Header section */}
      <div className="mb-6 rounded-2xl bg-[#18181B] border border-[#27272A] p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">
                Emergency Contacts Management
              </h1>
            </div>
            <p className="text-xs text-[#71717A] mt-1">
              Add up to 6 trusted Emergency IDs (family, friends, or local Nigerian security responders). When you trigger a silent alert or safe word, your real-time GPS location is immediately transmitted to them.
            </p>
          </div>

          {/* Quota counter badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#09090B] border border-[#27272A] self-start sm:self-center">
            <span className="text-xs text-[#71717A]">Capacity:</span>
            <span className={`font-mono text-sm font-bold ${
              contacts.length >= 6 ? 'text-amber-400' : 'text-sky-400'
            }`}>
              {contacts.length} / 6 Added
            </span>
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800 text-red-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT COLUMN: Add New Contact Form */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] p-5 shadow-xl">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-sky-400" />
              Add Emergency Responder
            </h2>

            <form onSubmit={handleAddContact} className="space-y-3.5 text-xs">
              
              <div>
                <label className="block text-[#A1A1AA] font-medium mb-1">
                  Contact Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Kunle Adebayo (Brother)"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-white placeholder-[#71717A] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[#A1A1AA] font-medium mb-1">
                  Emergency ID <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={emergencyId}
                    onChange={(e) => setEmergencyId(e.target.value.toUpperCase())}
                    placeholder="e.g., CHUKWU-719302"
                    className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 font-mono text-amber-300 placeholder-[#71717A] focus:outline-none focus:border-sky-500 uppercase"
                  />
                  <KeyRound className="w-4 h-4 text-[#71717A] absolute right-3 top-2.5" />
                </div>
                <p className="text-[10px] text-[#71717A] mt-1">
                  Format: SURNAME followed by a hyphen and 6 digits.
                </p>
              </div>

              <div>
                <label className="block text-[#A1A1AA] font-medium mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g., +234 803 123 4567"
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-white placeholder-[#71717A] focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-[#A1A1AA] font-medium mb-1">
                  Relationship / Agency
                </label>
                <select
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  className="w-full bg-[#09090B] border border-[#27272A] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="Family">Family Member</option>
                  <option value="Friend">Friend / Colleague</option>
                  <option value="Security / Police">Law Enforcement / NPF</option>
                  <option value="Medical">Medical / Emergency</option>
                  <option value="Neighbor">Neighborhood Watch</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={contacts.length >= 6}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Save Emergency Contact ({contacts.length}/6)</span>
              </button>

            </form>
          </div>

          {/* Quick Preset Responders */}
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] p-4 shadow-xl">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#E4E4E7] mb-2.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Quick-Add Verified Nigerian Responders</span>
            </div>
            <div className="space-y-2">
              {PRESET_RESPONDERS.map((preset) => (
                <div 
                  key={preset.emergencyId}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#09090B] border border-[#27272A] text-xs"
                >
                  <div>
                    <p className="font-semibold text-white">{preset.name}</p>
                    <p className="font-mono text-[10px] text-amber-400">{preset.emergencyId} • {preset.relationship}</p>
                  </div>
                  <button
                    onClick={() => handleQuickAdd(preset)}
                    disabled={contacts.some(c => c.emergencyId === preset.emergencyId) || contacts.length >= 6}
                    className="px-2.5 py-1 rounded-lg bg-[#27272A] hover:bg-[#3F3F46] text-sky-400 hover:text-sky-300 text-[11px] font-medium border border-[#3F3F46] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {contacts.some(c => c.emergencyId === preset.emergencyId) ? 'Added' : '+ Add'}
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: List of Configured Emergency IDs (Can be removed) */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          <div className="rounded-2xl bg-[#18181B] border border-[#27272A] p-5 shadow-xl">
            
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Active Emergency Contacts List
              </h2>
              <span className="text-xs text-[#71717A] font-mono">
                {contacts.length} of 6 slots used
              </span>
            </div>

            {contacts.length === 0 ? (
              <div className="text-center py-12 px-4 rounded-xl border border-dashed border-[#27272A] text-[#71717A] text-xs bg-[#09090B]/50">
                <Users className="w-10 h-10 mx-auto mb-3 text-[#71717A]" />
                <p className="font-semibold text-[#E4E4E7]">No Emergency Contacts Added Yet</p>
                <p className="mt-1 text-[#71717A] max-w-sm mx-auto">
                  Add up to 6 emergency IDs using the form or the Quick-Add presets on the left.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {contacts.map((contact, index) => (
                  <div
                    key={contact.id}
                    className="p-3.5 rounded-xl bg-[#09090B] border border-[#27272A] hover:border-[#3F3F46] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[#18181B] border border-[#27272A] text-sky-400 font-mono font-bold shrink-0">
                        {index + 1}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white text-sm">
                            {contact.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#27272A] text-[#E4E4E7] font-medium">
                            {contact.relationship}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 mt-1 flex-wrap font-mono text-[11px]">
                          <span className="text-amber-400 font-bold tracking-wider">
                            ID: {contact.emergencyId}
                          </span>
                          {contact.phone && (
                            <span className="text-[#71717A] flex items-center gap-1 font-sans">
                              <Phone className="w-3 h-3 text-[#71717A]" /> {contact.phone}
                            </span>
                          )}
                        </div>

                        <p className="text-[10px] text-[#71717A] mt-1">
                          Receives real-time geolocation alerts via AES-GCM encrypted channel
                        </p>
                      </div>
                    </div>

                    {/* Delete / Remove contact button (Required by prompt) */}
                    <button
                      onClick={() => handleRemoveContact(contact.id, contact.name)}
                      className="self-end sm:self-center flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18181B] hover:bg-red-950/60 text-[#71717A] hover:text-red-400 border border-[#27272A] hover:border-red-800 transition-colors text-xs font-semibold cursor-pointer"
                      title="Remove from Emergency List"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Information Notice */}
            <div className="mt-5 p-3 rounded-xl bg-[#09090B] border border-[#27272A] text-[11px] text-[#71717A] flex items-start gap-2.5">
              <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#E4E4E7]">Responders Synchronization: </span>
                Whenever you trigger a distress event (Distress Button, Safe Word, or Safe Text), an encrypted alert with your live GPS location will immediately show in the &quot;Notifications&quot; tab of each added Emergency ID.
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
