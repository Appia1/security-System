import React, { useState } from 'react';
import { 
  Bell, 
  MapPin, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  ShieldCheck, 
  Copy, 
  Check, 
  Navigation,
  Lock,
  Radio
} from 'lucide-react';
import { DistressAlert, UserProfile } from '../types';
import { getGoogleMapsUrl } from '../services/geolocation';
import { StorageService } from '../services/storage';

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
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged'>('all');
  const [copiedCoords, setCopiedCoords] = useState<string | null>(null);

  // Strict privacy filter:
  // Show alerts ONLY if currentUser is the sender OR was designated as a responder by the sender
  const userPermittedAlerts = alerts.filter(alert => {
    const cleanCurrentId = currentUser.emergencyId?.trim().toUpperCase();
    const isSender = alert.senderEmergencyId?.trim().toUpperCase() === cleanCurrentId;
    const isTargetedContact = Array.isArray(alert.respondersNotified) &&
      alert.respondersNotified.some(id => id?.trim().toUpperCase() === cleanCurrentId);
    return isSender || isTargetedContact;
  });

  const relevantAlerts = userPermittedAlerts.filter(alert => {
    if (filter === 'active') return alert.status === 'active';
    if (filter === 'acknowledged') return alert.status === 'acknowledged' || alert.status === 'resolved';
    return true;
  });

  const handleAcknowledge = (alertId: string) => {
    StorageService.acknowledgeAlert(alertId, `${currentUser.firstName} (${currentUser.emergencyId})`);
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

  return (
    <div className="w-full max-w-5xl mx-auto py-4 sm:py-6 px-4 sm:px-6 font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Page Header */}
      <div className="mb-6 rounded-2xl bg-[#18181B] border border-[#27272A] p-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-400" />
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Emergency Notifications
              </h1>
            </div>
            <p className="text-xs text-[#71717A] mt-1">
              Encrypted distress alerts and verified GPS location for your emergency network.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-[#09090B] border border-[#27272A] text-emerald-400">
              ID: {currentUser.emergencyId}
            </span>
          </div>
        </div>

        {/* Targeted Dispatch Banner */}
        <div className="mt-3.5 p-3 rounded-xl bg-[#09090B] border border-[#27272A] text-xs text-[#A1A1AA] flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>
            Targeted privacy active: Location coordinates are only transmitted to designated emergency contacts.
          </span>
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
              All Alerts ({userPermittedAlerts.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                filter === 'active' ? 'bg-[#27272A] text-amber-400 font-semibold border border-[#3F3F46]' : 'text-[#71717A] hover:text-white'
              }`}
            >
              Active ({userPermittedAlerts.filter(a => a.status === 'active').length})
            </button>
            <button
              onClick={() => setFilter('acknowledged')}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                filter === 'acknowledged' ? 'bg-[#27272A] text-white font-semibold' : 'text-[#71717A] hover:text-white'
              }`}
            >
              Resolved ({userPermittedAlerts.filter(a => a.status !== 'active').length})
            </button>
          </div>

          <span className="text-[11px] text-[#71717A] font-mono">
            AES-256-GCM
          </span>
        </div>
      </div>

      {/* Alerts List */}
      {relevantAlerts.length === 0 ? (
        <div className="text-center py-16 px-4 rounded-2xl border border-dashed border-[#27272A] bg-[#18181B]/50 text-[#71717A] text-xs">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2.5 text-emerald-500/60" />
          <p className="font-semibold text-sm text-[#E4E4E7]">No Active Distress Alerts</p>
          <p className="mt-1 text-[#71717A] max-w-sm mx-auto">
            Your emergency channel is clear. Alerts will appear here when an emergency contact signals for help.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {relevantAlerts.map((alert) => {
            const isUserSender = alert.senderEmergencyId === currentUser.emergencyId;
            const mapsUrl = getGoogleMapsUrl(alert.location.lat, alert.location.lng);

            return (
              <div
                key={alert.id}
                className="rounded-2xl border border-[#27272A] bg-[#18181B] p-5 shadow-xl transition-all"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-4 border-b border-[#27272A]">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      alert.status === 'active' ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                    }`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-white">
                          {alert.status === 'active' ? 'Distress Alert: Needs Help' : 'Alert Resolved'}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-[#09090B] text-[#A1A1AA] border border-[#27272A]">
                          {alert.status === 'active' ? 'ACTIVE' : 'RESOLVED'}
                        </span>
                      </div>
                      <p className="text-xs text-[#71717A] mt-0.5">
                        Sender: <strong className="text-white">{alert.senderName}</strong> ({alert.senderEmergencyId})
                        {isUserSender && <span className="ml-1 text-emerald-400 font-mono">(You)</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-[#71717A] font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span>•</span>
                    <span>{new Date(alert.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Location Grid */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 text-xs">
                  
                  {/* Left Column: Coordinates & Trigger */}
                  <div className="md:col-span-8 flex flex-col gap-2.5">
                    <div className="p-3 rounded-xl bg-[#09090B] border border-[#27272A] flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-[#71717A]">
                          GPS Coordinates
                        </span>
                        <button
                          onClick={() => handleCopyCoords(alert.location.lat, alert.location.lng, alert.id)}
                          className="flex items-center gap-1 text-[11px] text-[#71717A] hover:text-white cursor-pointer"
                        >
                          {copiedCoords === alert.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedCoords === alert.id ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>

                      <p className="font-bold text-sm text-white">
                        {alert.location.addressHint || `${alert.location.city || ''}, ${alert.location.state}`}
                      </p>

                      <p className="font-mono text-xs text-amber-300">
                        {alert.location.lat.toFixed(6)}° N, {alert.location.lng.toFixed(6)}° E (±{alert.location.accuracy}m)
                      </p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#09090B] border border-[#27272A] flex items-center justify-between text-[#71717A]">
                      <span>Trigger: <strong className="text-white">{alert.triggerDetail || alert.triggerType}</strong></span>
                      <span className="font-mono text-[10px] text-emerald-400">Encrypted Payload</span>
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="md:col-span-4 flex flex-col justify-between gap-2.5">
                    <button
                      onClick={() => window.open(mapsUrl, '_blank', 'noopener,noreferrer')}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#27272A] hover:bg-[#3F3F46] text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Navigation className="w-3.5 h-3.5 text-sky-400" />
                      <span>Open Live GPS Map</span>
                      <ExternalLink className="w-3 h-3 text-[#71717A]" />
                    </button>

                    {alert.status === 'active' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAcknowledge(alert.id)}
                          className="flex-1 py-2 px-2.5 rounded-xl bg-[#18181B] hover:bg-[#27272A] border border-[#27272A] text-xs text-white font-medium transition-colors cursor-pointer"
                        >
                          Acknowledge
                        </button>
                        <button
                          onClick={() => handleResolve(alert.id)}
                          className="flex-1 py-2 px-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-800/40 text-emerald-300 text-xs font-medium transition-colors cursor-pointer"
                        >
                          Resolve
                        </button>
                      </div>
                    ) : (
                      <div className="py-2 px-3 rounded-xl bg-[#09090B] border border-[#27272A] text-center text-xs text-[#71717A]">
                        Resolved & Safely Handled
                      </div>
                    )}
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
