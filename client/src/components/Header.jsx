import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, Map, Rss, AlertTriangle, Shield, 
  LogOut, Activity, Bell, BellOff, MapPin, MapPinOff
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useProximity } from '../contexts/ProximityNotificationContext';

const navItems = [
  { label: 'Home', icon: Home, path: '/' },
  { label: 'Map', icon: Map, path: '/map' },
  { label: 'Feed', icon: Rss, path: '/feed' },
  { label: 'Report', icon: AlertTriangle, path: '/report' },
];

export const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const proximity = useProximity();

  const [showProfile, setShowProfile] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setShowProfile(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Notification bell state ──────────────────────────────────────────────
  const notifEnabled  = proximity?.notificationsEnabled ?? true;
  const locationOk    = proximity?.locationGranted;
  const nearbyCount   = proximity?.nearbyCount ?? 0;

  const toggleNotifications = () => {
    if (proximity?.setNotificationsEnabled) {
      proximity.setNotificationsEnabled((prev) => !prev);
    }
  };

  // Bell icon + colour logic
  const BellIcon = notifEnabled ? Bell : BellOff;
  const bellColor =
    !notifEnabled        ? 'text-zinc-600'  :
    locationOk === false ? 'text-red-500'   :
    locationOk === true  ? 'text-[#00FF41]' :
                           'text-zinc-400';

  const bellTitle =
    !notifEnabled        ? 'Proximity alerts off — click to enable' :
    locationOk === false ? 'Location denied — proximity alerts unavailable' :
    locationOk === true  ? 'Proximity alerts active' :
                           'Requesting location…';

  return (
    <header className="fixed top-0 left-0 w-full z-[100] bg-[#0D0D0D] border-b-2 border-[#1A1A1A] text-white">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay" />

      <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between relative z-10">
        <Link to="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="bg-[#FF8C00] p-1.5 transform -skew-x-12 group-hover:rotate-6 transition-transform">
            <Shield size={20} className="text-black fill-black" />
          </div>
          <h1 className="text-2xl font-black italic tracking-tighter uppercase text-[#FF8C00]">
            RoadRash
          </h1>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] transition-all pb-1 border-b-2 ${
                  isActive
                    ? 'text-[#FF8C00] border-[#FF8C00]'
                    : 'text-zinc-500 border-transparent hover:text-white'
                }`}
              >
                <item.icon size={14} strokeWidth={3} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4 relative" ref={profileRef}>

          {/* ── System status ── */}
          <div className="hidden lg:flex flex-col items-end text-[8px] font-mono leading-none">
            <span className="text-[#00FF41] animate-pulse font-black uppercase">● SYSTEM_ONLINE</span>
            <span className="text-zinc-600 uppercase mt-1">LATENCY: 14MS</span>
          </div>

          {/* ── Proximity Notification Bell ── */}
          <button
            onClick={toggleNotifications}
            title={bellTitle}
            className="relative flex items-center justify-center w-9 h-9 border border-[#1A1A1A] bg-[#0D0D0D] hover:border-[#FF8C00]/40 transition-all"
          >
            <BellIcon size={16} className={bellColor} />

            {/* Badge: how many toasts are active */}
            {notifEnabled && nearbyCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF8C00] text-black text-[8px] font-black flex items-center justify-center rounded-full leading-none">
                {nearbyCount}
              </span>
            )}

            {/* Location denied indicator */}
            {notifEnabled && locationOk === false && (
              <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full border border-[#0D0D0D]" />
            )}
          </button>

          {/* ── Profile avatar ── */}
          <div
            onClick={() => setShowProfile(!showProfile)}
            className={`w-10 h-10 border-2 p-0.5 bg-[#1A1A1A] transition-all cursor-pointer overflow-hidden ${
              showProfile ? 'border-[#00eefc] rotate-3' : 'border-[#FF8C00] hover:scale-105'
            }`}
          >
            <img
              src={user?.picture || 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=100&h=100'}
              alt="Operator"
              className="w-full h-full object-cover grayscale brightness-90"
            />
          </div>

          {showProfile && (
            <div className="absolute top-14 right-0 w-64 bg-[#131313] border-2 border-[#564334]/50 shadow-[0_10px_40px_rgba(0,0,0,0.8)] animate-in slide-in-from-top-2 duration-200 z-[110]">
              <div className="p-5 bg-[#0a0a0a]">
                <p className="text-[8px] font-black text-[#FF8C00] uppercase tracking-[0.3em] mb-1">
                  {user ? 'Authenticated_Agent' : 'Guest_Observer'}
                </p>
                <h3 className="text-sm font-black text-[#e5e2e1] uppercase italic">
                  {user?.name || 'Field_Agent_Alpha'}
                </h3>
                <div className="flex items-center gap-2 mt-2">
                  <div className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-[#00FF41]' : 'bg-zinc-600'}`} />
                  <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">
                    {user ? 'Verified_Sector' : 'Access_Restricted'}
                  </span>
                </div>

                {/* ── Proximity status in profile ── */}
                <div className="mt-3 pt-3 border-t border-[#564334]/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {locationOk === true
                        ? <MapPin size={10} className="text-[#00FF41]" />
                        : <MapPinOff size={10} className="text-red-500" />
                      }
                      <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">
                        {locationOk === true  ? 'Location Active'  :
                         locationOk === false ? 'Location Denied'  :
                                               'Requesting…'}
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleNotifications(); }}
                      className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border transition-all ${
                        notifEnabled
                          ? 'border-[#00FF41]/40 text-[#00FF41] hover:bg-[#00FF41]/10'
                          : 'border-zinc-600 text-zinc-600 hover:border-zinc-400 hover:text-zinc-400'
                      }`}
                    >
                      {notifEnabled ? 'Alerts ON' : 'Alerts OFF'}
                    </button>
                  </div>
                  {locationOk === false && (
                    <p className="text-[8px] text-red-400/70 mt-1 leading-tight">
                      Enable location in browser settings to receive proximity alerts.
                    </p>
                  )}
                </div>
              </div>

              <div className="p-2 border-t border-[#564334]/20">
                <button
                  onClick={() => { logout(); setShowProfile(false); }}
                  className="w-full flex items-center justify-center gap-3 p-4 text-[11px] font-black text-red-500 hover:bg-red-500/10 transition-all uppercase italic tracking-[0.2em] group"
                >
                  <LogOut size={16} className="group-hover:translate-x-1 transition-transform" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export const BottomBar = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 md:hidden bg-[#0D0D0D] border-t-2 border-[#1A1A1A]">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay" />

      <div className="grid grid-cols-4 h-20 relative z-10">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center gap-1.5 transition-all relative ${
                isActive
                  ? 'bg-[#FF8C00] text-black shadow-[inset_0_4px_10px_rgba(0,0,0,0.15)]'
                  : 'text-zinc-500'
              }`}
            >
              <item.icon
                size={isActive ? 22 : 18}
                strokeWidth={isActive ? 3 : 2}
              />
              <span className="text-[8px] font-black uppercase tracking-widest leading-none">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-1.5 w-1 h-1 rounded-full bg-black/30" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Header;