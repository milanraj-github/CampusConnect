import React, { useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  Node,
  Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { LocationNode } from '../map/LocationNode';
import { PathEdge } from '../map/PathEdge';
import { CampusMap, RobotStatus } from '../../types';

interface Props {
  map: CampusMap | null;
  robot: RobotStatus | null;
}

const nodeTypes = {
  locationNode: LocationNode,
};

const edgeTypes = {
  pathEdge: PathEdge,
};

export const RobotMap: React.FC<Props> = ({ map, robot }) => {
  const nodes: Node[] = useMemo(() => {
    if (!map) return [];
    return map.locations.map((loc) => {
      const isRobotHere = robot?.currentLocation?.name === loc.name ||
        (robot?.currentLocationId === loc.id) ||
        (!robot?.currentLocation && loc.type === 'START');

      return {
        id: String(loc.id || loc.name),
        type: 'locationNode',
        position: { x: loc.x, y: loc.y },
        data: {
          id: loc.id,
          name: loc.name,
          type: loc.type,
          qrId: loc.qrId,
          description: loc.description,
          isCurrentRobotPosition: isRobotHere,
        },
      };
    });
  }, [map, robot]);

  const edges: Edge[] = useMemo(() => {
    if (!map) return [];
    return map.paths.map((p, idx) => {
      const sourceId = String(p.fromLocationId || p.fromLocation?.id || p.fromLocation?.name);
      const targetId = String(p.toLocationId || p.toLocation?.id || p.toLocation?.name);

      return {
        id: `e-${sourceId}-${targetId}-${idx}`,
        source: sourceId,
        target: targetId,
        type: 'pathEdge',
        data: {
          direction: p.direction,
          distance: p.distance,
          bidirectional: p.bidirectional,
        },
      };
    });
  }, [map]);

  return (
    <div className="w-full h-full min-h-[360px] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden relative shadow-xl">
      <div className="absolute top-3 left-3 z-10 px-3 py-1.5 rounded-xl bg-slate-900/80 backdrop-blur border border-slate-800 text-xs font-bold text-slate-200">
        Live Topological Campus Map
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
        <Controls className="bg-slate-900 border border-slate-800 text-white fill-white rounded-xl" />
      </ReactFlow>
    </div>
  );
};
