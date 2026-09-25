import React, { useState } from 'react';
import { useRobotStore } from '../store/robotStore';
import { useMapStore } from '../store/mapStore';
import { RobotStatusCard } from '../components/dashboard/RobotStatus';
import { NavigationRoute } from '../components/dashboard/NavigationRoute';
import { EventLog } from '../components/dashboard/EventLog';
import { CameraFeed } from '../components/dashboard/CameraFeed';
import { RobotMap } from '../components/dashboard/RobotMap';
import { Send, Octagon, RotateCcw, Play, Navigation } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { robot, logs, sendCommand } = useRobotStore();
  const { currentMap } = useMapStore();
  const [selectedDest, setSelectedDest] = useState('Library');
  const [isDispatching, setIsDispatching] = useState(false);

  const destinationOptions = currentMap?.locations.filter(
    (l) => l.type === 'DESTINATION' || l.type === 'WAYPOINT'
  ) || [];

  const handleDispatch = async () => {
    if (!selectedDest) return;
    setIsDispatching(true);
    try {
      await sendCommand('GOTO', selectedDest);
    } finally {
      setIsDispatching(false);
    }
  };

  const handleStop = async () => {
    await sendCommand('STOP');
  };

  const handleReturnHome = async () => {
    await sendCommand('RETURN_HOME');
  };

  return (
    <div className="space-y-6">
      {/* Top Status Bar */}
      <RobotStatusCard robot={robot} />

      {/* Quick Remote Dispatch Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-campus-600/20 text-campus-400 border border-campus-500/30">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Manual Mission Dispatch</h3>
            <p className="text-xs text-slate-400">Override autonomous voice input and dispatch robot remotely</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <select
            value={selectedDest}
            onChange={(e) => setSelectedDest(e.target.value)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-sm text-white focus:outline-none focus:ring-2 focus:ring-campus-500"
          >
            {destinationOptions.map((d) => (
              <option key={d.name} value={d.name}>
                {d.name} ({d.type})
              </option>
            ))}
          </select>

          <button
            onClick={handleDispatch}
            disabled={isDispatching}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-campus-600 hover:bg-campus-500 text-white font-bold text-xs shadow-md shadow-campus-900/40 transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            Dispatch Robot
          </button>

          <button
            onClick={handleReturnHome}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Return to Start
          </button>

          <button
            onClick={handleStop}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-900/40 transition-all"
          >
            <Octagon className="w-3.5 h-3.5" />
            Emergency Stop
          </button>
        </div>
      </div>

      {/* Middle Grid: Live Map & Live Route Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[420px]">
          <RobotMap map={currentMap} robot={robot} />
        </div>
        <div className="h-[420px]">
          <NavigationRoute
            startLocation={currentMap?.locations.find((l) => l.type === 'START')?.name || 'Main Entrance'}
            waypoints={currentMap?.locations.filter((l) => l.type === 'WAYPOINT').map((l) => l.name) || ['Block A']}
            destination={robot?.currentDestination}
            currentLocation={robot?.currentLocation?.name || 'Main Entrance'}
            state={robot?.currentState || 'IDLE'}
          />
        </div>
      </div>

      {/* Bottom Grid: Live Camera Stream & Event Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[360px]">
          <CameraFeed />
        </div>
        <div className="h-[360px]">
          <EventLog logs={logs} />
        </div>
      </div>
    </div>
  );
};
