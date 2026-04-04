/**
 * ProximityNotificationContext
 * 
 * Watches the user's GPS position every 10 s.
 * Every 30 s (or on meaningful position change) fetches /hazards/nearby?lat=&long=&radius=50
 * Fires an in-app toast notification the FIRST time a hazard is within 50 m.
 * Already-notified hazard IDs are kept in a session-scoped Set (lost on page refresh — intentional,
 * so the user is reminded again on a new visit).
 */

import React, {
  createContext, useContext, useEffect, useRef,
  useState, useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin, X, ChevronRight, Bell, BellOff } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

// ─── Haversine helper (client-side double-check) ─────────────────────────────
function haversineMetres(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ─── Type badge colours ───────────────────────────────────────────────────────
const TYPE_COLORS = {
  pothole:  { bg: 'bg-orange-500',  text: 'POTHOLE'   },
  crack:    { bg: 'bg-yellow-500',  text: 'CRACK'     },
  debris:   { bg: 'bg-red-500',     text: 'DEBRIS'    },
  flooding: { bg: 'bg-blue-500',    text: 'FLOODING'  },
  signage:  { bg: 'bg-purple-500',  text: 'SIGNAGE'   },
  other:    { bg: 'bg-zinc-500',    text: 'HAZARD'    },
};

// ─── Context ─────────────────────────────────────────────────────────────────
const ProximityContext = createContext(null);
export const useProximity = () => useContext(ProximityContext);

const PROXIMITY_RADIUS = 50;   // metres
const POLL_INTERVAL_MS = 30000; // re-fetch every 30 s
const MIN_MOVE_METRES  = 10;    // only re-fetch if user moved >10 m

// ─── Single Toast Notification ────────────────────────────────────────────────
function HazardToast({ hazard, onDismiss, onNavigate }) {
  const meta = TYPE_COLORS[hazard.type] || TYPE_COLORS.other;

  // Auto-dismiss after 8 s
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div className="
      flex items-start gap-3 w-full max-w-sm
      bg-[#131313] border border-[#FF8C00]/60
      shadow-[0_0_30px_rgba(255,140,0,0.2)]
      p-4 pointer-events-auto
      animate-in slide-in-from-right-4 duration-300
    ">
      {/* Icon */}
      <div className="mt-0.5 shrink-0 w-8 h-8 bg-[#FF8C00]/10 border border-[#FF8C00]/30 flex items-center justify-center">
        <AlertTriangle size={16} className="text-[#FF8C00]" />
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-[8px] font-black text-black px-1.5 py-0.5 ${meta.bg}`}>
            {meta.text}
          </span>
          <span className="text-[8px] font-mono text-[#FF8C00]">
            {hazard.distance_metres}M AWAY
          </span>
        </div>

        <p className="text-[11px] font-black uppercase tracking-wide text-[#e5e2e1] leading-tight truncate">
          {hazard.description || 'Road hazard ahead'}
        </p>

        <div className="flex items-center gap-1 mt-0.5 text-[9px] text-[#564334] uppercase font-bold">
          <MapPin size={9} />
          <span className="truncate">
            {hazard.lat.toFixed(5)}, {hazard.long.toFixed(5)}
          </span>
        </div>

        <button
          onClick={() => onNavigate(hazard._id)}
          className="
            mt-2 flex items-center gap-1
            text-[9px] font-black uppercase tracking-widest
            text-[#FF8C00] hover:text-white transition-colors
          "
        >
          View Details <ChevronRight size={10} />
        </button>
      </div>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        className="shrink-0 text-[#564334] hover:text-[#e5e2e1] transition-colors mt-0.5"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ─── Provider ────────────────────────────────────────────────────────────────
export function ProximityNotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Toast queue — array of hazard objects to show
  const [toasts, setToasts] = useState([]);

  // User's current position
  const positionRef = useRef(null);

  // Set of hazard IDs we've already notified this session
  const notifiedRef = useRef(new Set());

  // Whether the user has granted location
  const [locationGranted, setLocationGranted] = useState(null); // null=unknown, true, false
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  const watchIdRef  = useRef(null);
  const pollTimerRef = useRef(null);
  const lastFetchPosRef = useRef(null); // position at last fetch

  // ── Dismiss a toast ────────────────────────────────────────────────────────
  const dismissToast = useCallback((hazardId) => {
    setToasts((prev) => prev.filter((h) => h._id !== hazardId));
  }, []);

  // ── Navigate to hazard detail ───────────────────────────────────────────────
  const handleNavigate = useCallback((hazardId) => {
    dismissToast(hazardId);
    navigate(`/hazard/${hazardId}`);
  }, [dismissToast, navigate]);

  // ── Fetch nearby hazards and fire toasts for new ones ─────────────────────
  const fetchNearby = useCallback(async (lat, long) => {
    if (!notificationsEnabled) return;
    try {
      const { data } = await api.get('/hazards/nearby', {
        params: { lat, long, radius: PROXIMITY_RADIUS },
      });

      if (!data.success || !data.hazards?.length) return;

      const fresh = data.hazards.filter(
        (h) => !notifiedRef.current.has(h._id)
      );

      if (fresh.length === 0) return;

      // Mark all as notified immediately so duplicate polls don't re-fire
      fresh.forEach((h) => notifiedRef.current.add(h._id));

      // Add to toast queue (cap at 3 simultaneous toasts)
      setToasts((prev) => {
        const combined = [...prev, ...fresh];
        return combined.slice(0, 3);
      });
    } catch (err) {
      // Silent — don't spam console on network hiccups
    }
  }, [notificationsEnabled]);

  // ── On position update ─────────────────────────────────────────────────────
  const onPositionUpdate = useCallback((pos) => {
    const { latitude: lat, longitude: long } = pos.coords;
    setLocationGranted(true);
    positionRef.current = { lat, long };

    const last = lastFetchPosRef.current;
    const movedEnough =
      !last ||
      haversineMetres(last.lat, last.long, lat, long) > MIN_MOVE_METRES;

    if (movedEnough) {
      lastFetchPosRef.current = { lat, long };
      fetchNearby(lat, long);
    }
  }, [fetchNearby]);

  const onPositionError = useCallback((err) => {
    setLocationGranted(false);
    console.warn('[ProximityNotification] Geolocation error:', err.message);
  }, []);

  // ── Start / stop watching ─────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    if (!navigator.geolocation) {
      setLocationGranted(false);
      return;
    }

    // Start continuous watch
    watchIdRef.current = navigator.geolocation.watchPosition(
      onPositionUpdate,
      onPositionError,
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 15000 }
    );

    // Periodic poll even if user doesn't move (in case new hazards are added)
    pollTimerRef.current = setInterval(() => {
      if (positionRef.current) {
        fetchNearby(positionRef.current.lat, positionRef.current.long);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      navigator.geolocation.clearWatch(watchIdRef.current);
      clearInterval(pollTimerRef.current);
    };
  }, [isAuthenticated, onPositionUpdate, onPositionError, fetchNearby]);

  // ── Context value ─────────────────────────────────────────────────────────
  const value = {
    locationGranted,
    notificationsEnabled,
    setNotificationsEnabled,
    nearbyCount: toasts.length,
  };

  return (
    <ProximityContext.Provider value={value}>
      {children}

      {/* ── Toast container (fixed, top-right, below header) ── */}
      {toasts.length > 0 && (
        <div
          className="fixed top-20 right-4 z-[500] flex flex-col gap-2 pointer-events-none"
          aria-live="polite"
          aria-label="Hazard proximity alerts"
        >
          {toasts.map((hazard) => (
            <HazardToast
              key={hazard._id}
              hazard={hazard}
              onDismiss={() => dismissToast(hazard._id)}
              onNavigate={handleNavigate}
            />
          ))}
        </div>
      )}
    </ProximityContext.Provider>
  );
}