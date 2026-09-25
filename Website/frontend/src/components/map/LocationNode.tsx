import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { MapPin, QrCode, Flag, Navigation, Compass } from 'lucide-react';
import { LocationType } from '../../types';

interface LocationNodeData {
  id?: number;
  name: string;
  type: LocationType;
  qrId?: string | null;
  description?: string | null;
  isCurrentRobotPosition?: boolean;
}

export const LocationNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const nodeData = data as unknown as LocationNodeData;
  const isStart = nodeData.type === 'START';
  const isDest = nodeData.type === 'DESTINATION';
  const isRobotHere = nodeData.isCurrentRobotPosition;

  let badgeColor = 'bg-slate-700 text-slate-200 border-slate-600';
  let borderColor = 'border-slate-700';

  if (isStart) {
    badgeColor = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    borderColor = 'border-emerald-500/60 shadow-emerald-900/30';
  } else if (isDest) {
    badgeColor = 'bg-sky-500/20 text-sky-400 border-sky-500/40';
    borderColor = 'border-sky-500/60 shadow-sky-900/30';
  } else {
    badgeColor = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
  }

  return (
    <div
      className={`px-4 py-3 rounded-xl bg-slate-900/95 border-2 min-w-[180px] shadow-lg transition-all ${
        selected ? 'ring-2 ring-campus-400 scale-105' : ''
      } ${borderColor} ${isRobotHere ? 'ring-4 ring-campus-500 ring-offset-2 ring-offset-slate-950 animate-pulse' : ''}`}
    >
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-campus-500 border-2 border-slate-900" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-campus-500 border-2 border-slate-900" />
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-campus-500 border-2 border-slate-900" />
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-campus-500 border-2 border-slate-900" />

      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {isStart ? (
            <Flag className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : isDest ? (
            <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
          ) : (
            <Compass className="w-4 h-4 text-amber-400 shrink-0" />
          )}
          <span className="font-bold text-sm text-slate-100 truncate">{nodeData.name}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>
          {nodeData.type}
        </span>
      </div>

      {nodeData.qrId && (
        <div className="mt-2.5 flex items-center gap-1.5 px-2 py-1 rounded bg-slate-800/80 border border-slate-700/60 text-[11px] text-slate-300">
          <QrCode className="w-3.5 h-3.5 text-campus-400 shrink-0" />
          <span className="font-mono truncate">{nodeData.qrId}</span>
        </div>
      )}

      {isRobotHere && (
        <div className="mt-2 text-center py-0.5 bg-campus-500/20 text-campus-400 rounded text-[10px] font-bold border border-campus-500/40">
          ROBOT HERE
        </div>
      )}
    </div>
  );
});
