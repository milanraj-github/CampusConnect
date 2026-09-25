import React from 'react';
import { useRobotStore } from '../store/robotStore';
import { ScrollText, Clock, RefreshCw } from 'lucide-react';

export const LogsPage: React.FC = () => {
  const { logs, fetchInitialStatus } = useRobotStore();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Autonomous Navigation Logs</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full chronological audit trail of state transitions, speech events, obstacle halts, and QR checkpoints.
          </p>
        </div>
        <button
          onClick={fetchInitialStatus}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Logs
        </button>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">State</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Direction</th>
                <th className="px-6 py-4">Event Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {logs.map((log) => {
                const isObs = log.message.toLowerCase().includes('obstacle');
                const isArrived = log.message.toLowerCase().includes('reached') || log.message.toLowerCase().includes('arrived');

                return (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-3.5 text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-campus-400 font-bold text-[10px]">
                        {log.state}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-300">
                      {log.location || '—'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-400">
                      {log.direction || '—'}
                    </td>
                    <td className={`px-6 py-3.5 ${isObs ? 'text-rose-400' : isArrived ? 'text-emerald-400 font-bold' : 'text-slate-200'}`}>
                      {log.message}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
