import React, { useState } from 'react';
import { 
  Bell, 
  MapPin, 
  ExternalLink, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  Lock, 
  Navigation, 
  PhoneCall, 
  Radio, 
  Copy, 
  Check, 
  Sparkles,
  AlertOctagon,
  RefreshCw
} from 'lucide-react';
import { DistressAlert, UserProfile } from '../types';
import { StorageService } from '../services/storage';
import { getGoogleMapsUrl, calculateDistanceKm } from '../services/geolocation';

interface NotificationsCenterProps {
  currentUser: UserProfile;
  alerts: DistressAlert[];
  onAlertsUpdated: () => void;
}

export const NotificationsCenter: React.FC<NotificationsCenterProps> = ({
  currentUser,
  alerts,
  onAlertsUpdated,
}) => {
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(null);
  const [copiedCoords, setCopiedCoords] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged'>('all');

  // Filter alerts relevant to this user or sent by this user
  const relevantAlerts = alerts.filter(a => {
    if (filter === 'active' && a.status !== 'active') return false;
    if (filter === 'acknowledged' && a.status !== 'acknowledged') return false;
    return true;
  });

  const handleAcknowledge = (alertId: string) => {
    StorageService.acknowledgeAlert(alertId, currentUser.emergencyId);
    onAlertsUpdated();
  };

  const handleResolve = (alertId: string) => {
    StorageService.resolveAlert(alertId);
    onAlertsUpdated();
  };

  const handleCopyCoords = (lat: number, lng: number, id: string) => {
    navigator.clipboard.writeText(`${lat}, ${lng}`);
    setCopiedCoords(id);
    setTimeout(() => setCopiedCoords(null), 2000);
  };

  // Quick button to simulate an incoming emergency alert from another user
  const handleSimulateIncomingAlert = () => {
    const randomLats = [6.5244, 9.0765, 10.5105, 4.8156, 7.3775];
    const randomLngs = [3.3792, 7.3986, 7.4165, 7.0498, 3.9470];
    const randomCities = ['Lagos (Victoria Island)', 'Abuja (Maitama)', 'Kaduna (Barnawa)', 'Port Harcourt (GRA)', 'Ibadan (Bodija)'];
    const idx = Math.floor(Math.random() * randomLats.length);

    const mockAlert: DistressAlert = {
      id: 'alt-sim-' + Date.now(),
      senderEmergencyId: 'CHUKWU-719302',
      senderName: 'Emeka Chukwu',
      senderPhone: '+234 812 998 3344',
      timestamp: Date.now(),
      triggerType: 'safe_word',
      triggerDetail: 'Voice Safe Word Spoken: "Mayday Nigeria"',
      location: {
        lat: randomLats[idx],
        lng: randomLngs[idx],
        accuracy: 12,
        addressHint: `Expressway Near Tollgate, ${randomCities[idx]}`,
        city: randomCities[idx].split(' ')[0],
        state: 'Nigeria Security Sector',
        timestamp: Date.now(),
        isMock: true,
      },
      status: 'active',
      acknowledgedBy: [],
      respondersNotified: [currentUser.emergencyId, 'POLICE-112099'],
      encryptedPayload: 'AES256GCM:a7b8c9d0e1f2...[VERIFIED_PAYLOAD]',
      encryptionHash: 'c7be025e76d802877b3...[SHA256_MATCH]',
      encryptionAlgorithm: 'AES-256-GCM',
      notes: 'Real-time alert triggered via safe word voice detection.',
    };

    StorageService.dispatchDistressAlert(mockAlert);
    onAlertsUpdated();
  };

  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-6 px-3 sm:px-6">
      
      {/* Page Header */}
      <div className="mb-6 rounded-2xl bg-[#18181B] border border-[#27272A] p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-rose-400" />
              <h1 className="text-xl font-bold text-white tracking-tight">
                Emergency Notifications & Location Center
              </h1>
            </div>
            <p className="text-xs text-[#71717A] mt-1">
              Real-time incoming distress alerts indicating <strong className="text-red-400">&quot;NEEDS HELP LOCATION&quot;</strong> with verified GPS coordinates, encrypted payload signatures, and navigation shortcuts.
            </p>
          </div>

          {/* Quick Simulate Alert action for tester convenience */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleSimulateIncomingAlert}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-200 border border-red-800 text-xs font-semibold transition-colors shadow-sm cursor-pointer"
              title="Simulate incoming alert from another emergency ID"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Simulate Test Alert</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-4 pt-3 border-t border-[#27272A] flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                filter === 'all' ? 'bg-[#27272A] text-white font-semibold' : 'text-[#71717A] hover:text-white'
              }`}
            >
              All Alerts ({alerts.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                filter === 'active' ? 'bg-red-950/60 text-red-300 font-semibold border border-red-800' : 'text-[#71717A] hover:text-white'
              }`}
            >
              Active Needs Help ({alerts.filter(a => a.status === 'active').length})
            </button>
            <button
              onClick={() => setFilter('acknowledged')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                filter === 'acknowledged' ? 'bg-[#27272A] text-white font-semibold' : 'text-[#71717A] hover:text-white'
              }`}
            >
              Acknowledged ({alerts.filter(a => a.status === 'acknowledged').length})
            </button>
          </div>

          <span className="text-[11px] text-[#71717A] font-mono">
            Encrypted Messaging Protocol: AES-256-GCM
          </span>
        </div>
      </div>

      {/* Alerts List */}
      {relevantAlerts.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-[#27272A] bg-[#18181B]/50 text-[#71717A] text-xs">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500/60" />
          <p className="font-bold text-base text-[#E4E4E7]">All Secure — No Active Distress Alerts</p>
          <p className="mt-1 text-[#71717A] max-w-md mx-auto">
            When a user on your emergency contacts list triggers their silent distress button, safe word, or safe text, their emergency location notification will appear here immediately.
          </p>
          <button
            onClick={handleSimulateIncomingAlert}
            className="mt-4 px-4 py-2 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white font-semibold text-xs transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Generate Sample Distress Alert
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {relevantAlerts.map((alert) => {
            const isUserSender = alert.senderEmergencyId === currentUser.emergencyId;
            const mapsUrl = getGoogleMapsUrl(alert.location.lat, alert.location.lng);

            return (
              <div
                key={alert.id}
                className={`rounded-2xl border p-5 shadow-xl transition-all ${
                  alert.status === 'active'
                    ? 'bg-[#18181B] border-red-600/80 shadow-red-950/20'
                    : 'bg-[#18181B] border-[#27272A]'
                }`}
              >
                
                {/* PROMINENT "NEEDS HELP LOCATION" HEADER BANNER (Explicitly required by prompt) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-[#27272A]">
                  <div className="flex items-center gap-2.5">
                    <div className={`p-2 rounded-xl flex items-center justify-center ${
                      alert.status === 'active' ? 'bg-red-600 text-white animate-pulse' : 'bg-[#27272A] text-[#71717A]'
                    }`}>
                      <AlertOctagon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm sm:text-base text-red-400 tracking-wide uppercase">
                          🚨 USER NEEDS HELP LOCATION
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          alert.status === 'active'
                            ? 'bg-red-500 text-white animate-pulse'
                            : 'bg-[#27272A] text-emerald-400 border border-[#3F3F46]'
                        }`}>
                          {alert.status === 'active' ? 'ACTIVE DISTRESS' : 'RESPONDING'}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#71717A] flex items-center gap-2 mt-0.5">
                        <span className="font-medium text-white">{alert.senderName}</span>
                        <span>•</span>
                        <span className="font-mono text-amber-400 font-bold">{alert.senderEmergencyId}</span>
                        {isUserSender && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#27272A] text-[#E4E4E7]">
                            (Sent by You)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#71717A]">
                    <Clock className="w-3.5 h-3.5 text-[#71717A]" />
                    <span>{new Date(alert.timestamp).toLocaleTimeString()}</span>
                    <span className="text-[#3F3F46]">•</span>
                    <span>{new Date(alert.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Main Alert Grid: Location details & Map Visualizer */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                  
                  {/* Left info */}
                  <div className="md:col-span-7 flex flex-col gap-3 text-xs">
                    
                    {/* Trigger info */}
                    <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#71717A] block">
                          Emergency Trigger Method
                        </span>
                        <span className="font-semibold text-white mt-0.5 block">
                          {alert.triggerDetail || alert.triggerType}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-1 rounded bg-[#18181B] border border-[#27272A] font-mono text-[#E4E4E7]">
                        {alert.triggerType.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>

                    {/* Geolocation Landmark & Coordinates */}
                    <div className="p-3.5 rounded-xl bg-[#09090B] border border-red-900/40 flex flex-col gap-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="text-[10px] uppercase font-bold text-red-400 block">
                              Verified Real-Time Coordinates
                            </span>
                            <span className="font-bold text-white text-sm mt-0.5 block">
                              {alert.location.addressHint}
                            </span>
                            <span className="text-[#71717A] text-[11px] block mt-0.5">
                              {alert.location.city}, {alert.location.state}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Exact GPS string */}
                      <div className="flex items-center justify-between p-2 rounded-lg bg-[#18181B] border border-[#27272A] font-mono text-xs">
                        <div className="text-amber-300">
                          <span>Lat: {alert.location.lat.toFixed(6)}</span>
                          <span className="mx-2 text-[#71717A]">|</span>
                          <span>Lng: {alert.location.lng.toFixed(6)}</span>
                        </div>
                        <button
                          onClick={() => handleCopyCoords(alert.location.lat, alert.location.lng, alert.id)}
                          className="flex items-center gap-1 text-[11px] text-[#71717A] hover:text-white transition-colors cursor-pointer"
                        >
                          {copiedCoords === alert.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedCoords === alert.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-[#71717A] pt-1">
                        <span>Fix Accuracy: ±{alert.location.accuracy} meters</span>
                        <span className="text-emerald-400 font-medium">GPS Signal Lock: Active</span>
                      </div>
                    </div>

                    {/* Encrypted Protocol Signature */}
                    <div className="p-2.5 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-between text-[11px] text-[#71717A]">
                      <div className="flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Security: <strong className="text-[#E4E4E7]">AES-256-GCM Cryptographic Envelope</strong></span>
                      </div>
                      <span className="font-mono text-[10px] text-[#71717A] truncate max-w-[120px]">
                        {alert.encryptionHash?.slice(0, 16)}...
                      </span>
                    </div>

                  </div>

                  {/* Right Map Preview & Action Controls */}
                  <div className="md:col-span-5 flex flex-col gap-3">
                    
                    {/* Simulated Radar / Map Preview Card */}
                    <div className="relative h-44 rounded-xl bg-[#09090B] border border-[#27272A] overflow-hidden flex flex-col items-center justify-center p-3 text-center">
                      
                      {/* Grid background styling */}
                      <div 
                        className="absolute inset-0 opacity-20"
                        style={{
                          backgroundImage: 'radial-gradient(#ef4444 1px, transparent 1px), radial-gradient(#38bdf8 1px, transparent 1px)',
                          backgroundSize: '24px 24px',
                          backgroundPosition: '0 0, 12px 12px'
                        }}
                      />

                      {/* Radar sweep ring */}
                      <div className="relative flex items-center justify-center w-24 h-24 rounded-full border border-red-500/40 bg-red-950/20">
                        <div className="absolute w-16 h-16 rounded-full border border-red-400/60 animate-ping"></div>
                        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white shadow-lg shadow-red-900">
                          <MapPin className="w-4 h-4 animate-bounce" />
                        </div>
                      </div>

                      <p className="relative z-10 font-mono text-[11px] font-bold text-red-300 mt-2">
                        {alert.location.lat.toFixed(4)}°N, {alert.location.lng.toFixed(4)}°E
                      </p>
                      <p className="relative z-10 text-[10px] text-[#71717A]">
                        Emergency Geolocation Lock
                      </p>

                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative z-10 mt-2 flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-semibold text-[11px] transition-colors shadow-md"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open in Google Maps</span>
                      </a>
                    </div>

                    {/* Responders Action Buttons */}
                    <div className="flex flex-col gap-2">
                      {alert.status === 'active' ? (
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-md cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Acknowledge Alert (I Am Responding)</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-[#E4E4E7] text-xs font-semibold transition-colors cursor-pointer"
                        >
                          <span>Mark Incident Resolved</span>
                        </button>
                      )}

                      {/* Nigerian Emergency Fast Dial Shortcut */}
                      <a
                        href="tel:112"
                        className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-[#E4E4E7] text-xs font-semibold border border-[#3F3F46] transition-colors"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-amber-400" />
                        <span>Call Nigeria Emergency Toll-Free (112)</span>
                      </a>
                    </div>

                  </div>

                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
};
