import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Map,
  MapPin,
  Route,
  HelpCircle,
  Activity,
  ScrollText,
  Settings,
} from 'lucide-react';

const navItems = [
  { to: '/', label: 'Live Dashboard', icon: LayoutDashboard },
  { to: '/map-editor', label: 'Visual Map Editor', icon: Map },
  { to: '/locations', label: 'Locations', icon: MapPin },
  { to: '/paths', label: 'Paths & Routes', icon: Route },
  { to: '/destinations', label: 'Destination Q&A', icon: HelpCircle },
  { to: '/robot-monitor', label: 'Robot Monitor', icon: Activity },
  { to: '/logs', label: 'Navigation Logs', icon: ScrollText },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/60 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between">
      <nav className="space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Navigation & Controls
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-campus-600/20 text-campus-400 border border-campus-500/30 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 text-xs text-slate-400">
        <p className="font-semibold text-slate-300">CampusConnect v1.0</p>
        <p className="text-[11px] mt-0.5 text-slate-400">Dual Controller: Pi + Uno</p>
      </div>
    </aside>
  );
};
