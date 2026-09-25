import React, { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, EdgeProps, getSmoothStepPath } from '@xyflow/react';
import { DirectionType } from '../../types';

interface PathEdgeData {
  direction: DirectionType;
  distance: number;
  bidirectional?: boolean;
}

export const PathEdge: React.FC<EdgeProps> = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}) => {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  const edgeData = (data || {}) as unknown as PathEdgeData;
  const direction = edgeData.direction || 'NORTH';
  const distance = edgeData.distance || 10;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: selected ? '#14b8a6' : '#475569',
          strokeWidth: selected ? 3.5 : 2.5,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
            selected
              ? 'bg-campus-600 text-white border-campus-400 shadow-md scale-110'
              : 'bg-slate-800 text-slate-300 border-slate-700 shadow-sm'
          }`}
        >
          <span className="text-campus-400 font-mono">{direction}</span>
          <span className="text-slate-500">•</span>
          <span>{distance}m</span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
