import React from 'react';
import { NavigationLog } from '../../types';
import { ScrollText, Clock, AlertCircle } from 'lucide-react';

interface Props {
  logs: NavigationLog[];
}

export const EventLog: React.FC<Props> = ({ logs }) => {
  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
        <div className="flex items-center gap-2">
          <ScrollText className="w-4 h-4 text-campus-400" />
          <h3 className="font-bold text-sm text-white">Live Event Log</h3>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {logs.length} events logged
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[320px] font-mono text-xs">
        {logs.length === 0 ? (
          <p className="text-slate-500 text-center py-6 text-xs font-sans">
            No navigation events recorded yet.
          </p>
        ) : (
          logs.map((log) => {
            const timeStr = new Date(log.timestamp).toLocaleTimeString();
            const isObstacle = log.message.toLowerCase().includes('obstacle');
            const isArrival = log.message.toLowerCase().includes('reached') || log.message.toLowerCase().includes('arrived');

            return (
              <div
                key={log.id}
                className={`p-2.5 rounded-xl border transition-colors flex items-start gap-2.5 ${
                  isObstacle
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : isArrival
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : 'bg-slate-800/60 border-slate-800 text-slate-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
                <div className="flex-1 overflow-hidden">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-400">{timeStr}</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-900/80 text-campus-400 uppercase">
                      {log.state}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-200 text-xs break-words">{log.message}</p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
