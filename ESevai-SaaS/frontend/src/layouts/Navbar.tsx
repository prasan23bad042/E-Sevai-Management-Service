import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useNotificationStore } from '../store/notificationStore';
import { useToast } from '../app/toastProvider';
import { Bell, User, LogOut, Shield, Wifi, WifiOff } from 'lucide-react';
import { cn } from '../utils/cn';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const { user, clearSession } = useAuthStore();
  const { notifications, unreadCount, fetchNotifications, markAsRead, softDelete } = useNotificationStore();
  const toast = useToast();
  
  const [bellOpen, setBellOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Fetch initial notifications
    if (user) {
      fetchNotifications();
      // Poll notifications feed every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(interval);
      };
    }
  }, [user, fetchNotifications]);

  const handleLogout = () => {
    clearSession();
    toast.success('Successfully logged out.');
    navigate('/login');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/25 border-red-500/30 text-red-400';
      case 'high': return 'bg-amber-500/25 border-amber-500/30 text-amber-400';
      case 'medium': return 'bg-blue-500/25 border-blue-500/30 text-blue-400';
      default: return 'bg-slate-800 border-slate-700 text-slate-300';
    }
  };

  return (
    <header className="sticky top-0 z-30 h-16 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-6 flex items-center justify-between text-slate-100">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold tracking-wide m-0 text-slate-200">
          E-Sevai SaaS
        </h1>
        
        {/* Offline / Online state indicator */}
        {!isOnline ? (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-950/60 border border-red-800/40 text-red-400 animate-pulse">
            <WifiOff className="w-3.5 h-3.5" /> Offline
          </span>
        ) : (
          <span className="flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/40 border border-emerald-800/20 text-emerald-400">
            <Wifi className="w-3.5 h-3.5" /> Connected
          </span>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell popover */}
        <div className="relative">
          <button
            onClick={() => {
              setBellOpen(!bellOpen);
              setProfileOpen(false);
            }}
            className="p-2 hover:bg-slate-900 rounded-lg text-slate-400 hover:text-slate-100 transition-colors relative cursor-pointer"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4.5 h-4.5 bg-blue-600 rounded-full text-[10px] font-bold text-white flex items-center justify-center border border-slate-950 animate-bounce">
                {unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div className="absolute right-0 mt-2 w-80 rounded-lg border border-slate-800 bg-slate-950 p-4 shadow-xl z-50 text-slate-100 flex flex-col gap-2 max-h-96 overflow-y-auto animate-scale-up">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-semibold bg-blue-600/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded">
                    {unreadCount} New
                  </span>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  No active notifications.
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {notifications.slice(0, 5).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markAsRead(n.id)}
                      className={cn(
                        'p-2.5 rounded-md border text-xs cursor-pointer flex flex-col gap-1 transition-all hover:bg-slate-900',
                        n.read_at ? 'bg-slate-950/20 border-slate-900 text-slate-400' : 'bg-slate-900/50 border-slate-850 text-slate-200'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn('text-[9px] font-bold uppercase px-1 rounded border', getPriorityColor(n.priority))}>
                          {n.priority}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            softDelete(n.id);
                          }}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          Dismiss
                        </button>
                      </div>
                      <p className="line-clamp-2">{n.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User profile actions */}
        <div className="relative">
          <button
            onClick={() => {
              setProfileOpen(!profileOpen);
              setBellOpen(false);
            }}
            className="flex items-center gap-2 p-1.5 hover:bg-slate-900 rounded-lg transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-200 max-w-28 truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 capitalize">{user?.role.replace('_', ' ')}</p>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-lg border border-slate-800 bg-slate-950 p-2 shadow-xl z-50 animate-scale-up">
              <div className="px-3 py-2 border-b border-slate-850 mb-1">
                <p className="text-xs font-semibold text-slate-200">{user?.name}</p>
                <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
              </div>
              
              <button
                onClick={() => navigate('/settings')}
                className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-slate-900 rounded-md text-xs font-medium text-slate-350 hover:text-slate-100 transition-colors cursor-pointer"
              >
                <Shield className="w-4 h-4 text-slate-550" /> Settings
              </button>

              <button
                onClick={handleLogout}
                className="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-red-950/20 rounded-md text-xs font-medium text-red-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
