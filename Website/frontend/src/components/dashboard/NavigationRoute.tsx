import React from 'react';
import { Route, ArrowDown, Check, Circle, Navigation } from 'lucide-react';

interface Props {
  startLocation?: string;
  waypoints?: string[];
  destination?: string | null;
  currentLocation?: string | null;
  state: string;
}

export const NavigationRoute: React.FC<Props> = ({
  startLocation = 'Main Entrance',
  waypoints = ['Block A'],
  destination,
  currentLocation,
  state,
}) => {
  const steps = [
    { name: startLocation, type: 'START' },
    ...waypoints.map((w) => ({ name: w, type: 'WAYPOINT' })),
    ...(destination ? [{ name: destination, type: 'DESTINATION' }] : []),
  ];

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-campus-400" />
            <h3 className="font-bold text-sm text-white">Active Route Tracking</h3>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {state}
          </span>
        </div>

        {destination ? (
          <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-800">
            {steps.map((step, idx) => {
              const isCurrent = currentLocation === step.name;
              const isCompleted = idx < steps.findIndex((s) => s.name === currentLocation);

              return (
                <div key={idx} className="flex items-center gap-3 relative z-10">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border transition-all ${
                      isCurrent
                        ? 'bg-campus-600 text-white border-campus-400 ring-4 ring-campus-500/20 shadow-md shadow-campus-900/40'
                        : isCompleted
                        ? 'bg-emerald-950 text-emerald-400 border-emerald-500/40'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : isCurrent ? (
                      <Navigation className="w-3.5 h-3.5 animate-bounce" />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  <div className="flex-1">
                    <p
                      className={`text-xs font-bold leading-none ${
                        isCurrent ? 'text-campus-400' : 'text-slate-300'
                      }`}
                    >
                      {step.name}
                    </p>
                    <span className="text-[10px] text-slate-500">{step.type}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-slate-500">
            <p>Robot is currently stationary at {currentLocation || 'Main Entrance'}.</p>
            <p className="text-[11px] mt-1 text-slate-600">Speak a destination or dispatch from controls.</p>
          </div>
        )}
      </div>

      <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span>Path algorithm:</span>
        <span className="font-mono text-campus-400 font-semibold">Dijkstra Shortest Path</span>
      </div>
    </div>
  );
};
