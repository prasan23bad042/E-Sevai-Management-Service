import { NavLink, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { menuConfig } from './menuConfig';
import { cn } from '../utils/cn';
import { ShieldCheck } from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { user } = useAuthStore();
  const location = useLocation();

  if (!user) return null;

  const menuItems = menuConfig[user.role] || [];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-slate-950 border-r border-slate-800 text-slate-100 min-h-screen">
      {/* Brand logo container */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-blue-500 shrink-0" />
        <span className="text-sm font-bold tracking-wider uppercase text-slate-200">E-Sevai Portal</span>
      </div>

      {/* Roster of dynamic navigation menus */}
      <nav className="flex-1 px-4 py-6 flex flex-col gap-1.5">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                isActive
                  ? 'bg-blue-600/10 border border-blue-500/20 text-blue-400'
                  : 'text-slate-450 hover:text-slate-200 hover:bg-slate-900/60'
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom context user indicator */}
      <div className="p-4 border-t border-slate-900 bg-slate-950/40">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Center Access Context</p>
        <p className="text-xs font-semibold text-slate-300 truncate">
          {user.tenant_id ? `ID: ${user.tenant_id}` : 'Global Administration'}
        </p>
      </div>
    </aside>
  );
};
