import React from 'react';
import { useAuthStore } from '../../store/authStore';
import { useRobotStore } from '../../store/robotStore';
import { LogOut, Bot, Wifi, WifiOff, Battery, ShieldAlert } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout } = useAuthStore();
  const { robot, isConnected } = useRobotStore();

  const isRobotOnline = robot?.status === 'ONLINE';

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <div className="bg-campus-600/20 p-2 rounded-lg border border-campus-500/30 text-campus-500">
          <Bot className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-lg font-bold text-white leading-none">CampusConnect</h1>
          <p className="text-xs text-slate-400 mt-1">Autonomous Assistance Robot Control Portal</p>
        </div>
      </div>

      {/* Real-time status indicators */}
      <div className="flex items-center gap-6">
        {/* Robot Connection */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs">
          {isRobotOnline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <Wifi className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-medium">ROBOT ONLINE</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              <WifiOff className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-rose-400 font-medium">ROBOT OFFLINE</span>
            </>
          )}
        </div>

        {/* Battery Indicator */}
        {robot && (
          <div className="flex items-center gap-2 text-xs text-slate-300">
            <Battery className={`w-4 h-4 ${robot.battery > 30 ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>{robot.battery}%</span>
          </div>
        )}

        {/* Obstacle Alert */}
        {robot?.obstacleStatus === 'DETECTED' && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-semibold animate-pulse">
            <ShieldAlert className="w-3.5 h-3.5" />
            OBSTACLE DETECTED
          </div>
        )}

        {/* User Profile & Logout */}
        <div className="flex items-center gap-4 pl-4 border-l border-slate-800">
          <div className="text-right">
            <p className="text-xs font-medium text-slate-200">{user?.name || 'Administrator'}</p>
            <p className="text-[10px] text-slate-400">{user?.role || 'admin'}</p>
          </div>
          <button
            onClick={logout}
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
