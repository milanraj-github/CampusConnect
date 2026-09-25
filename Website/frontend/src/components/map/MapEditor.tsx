import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  Node,
  Edge,
  Connection,
  NodeChange,
  EdgeChange,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { LocationNode } from './LocationNode';
import { PathEdge } from './PathEdge';
import { MapToolbar } from './MapToolbar';
import { LocationEditModal } from './LocationEditModal';
import { useMapStore } from '../../store/mapStore';
import { Location, Path, DirectionType } from '../../types';

const nodeTypes = {
  locationNode: LocationNode,
};

const edgeTypes = {
  pathEdge: PathEdge,
};

export const MapEditor: React.FC = () => {
  const { currentMap, loadActiveMap, saveMap } = useMapStore();

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [editingNode, setEditingNode] = useState<Partial<Location> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Convert currentMap to React Flow nodes and edges
  useEffect(() => {
    if (!currentMap) return;

    const flowNodes: Node[] = currentMap.locations.map((loc) => ({
      id: String(loc.id || loc.name),
      type: 'locationNode',
      position: { x: loc.x, y: loc.y },
      data: {
        id: loc.id,
        name: loc.name,
        type: loc.type,
        qrId: loc.qrId,
        description: loc.description,
      },
    }));

    const flowEdges: Edge[] = currentMap.paths.map((p, idx) => {
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

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [currentMap]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (params: Connection) => {
      // Prompt for path direction and distance
      const dirInput = window.prompt('Enter path direction (NORTH, EAST, SOUTH, WEST):', 'NORTH');
      const distInput = window.prompt('Enter path distance in meters:', '10');

      let dir: DirectionType = 'NORTH';
      if (dirInput && ['NORTH', 'EAST', 'SOUTH', 'WEST'].includes(dirInput.toUpperCase())) {
        dir = dirInput.toUpperCase() as DirectionType;
      }
      const dist = parseFloat(distInput || '10') || 10;

      const newEdge: Edge = {
        ...params,
        id: `edge-${params.source}-${params.target}-${Date.now()}`,
        type: 'pathEdge',
        data: {
          direction: dir,
          distance: dist,
          bidirectional: true,
        },
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    []
  );

  const handleNodeDoubleClick = (_: React.MouseEvent, node: Node) => {
    const data = node.data as any;
    setEditingNode({
      id: data.id,
      name: data.name,
      type: data.type,
      qrId: data.qrId,
      description: data.description,
      x: node.position.x,
      y: node.position.y,
    });
    setIsModalOpen(true);
  };

  const handleAddLocation = () => {
    const newLoc: Partial<Location> = {
      name: `Location-${nodes.length + 1}`,
      type: nodes.length === 0 ? 'START' : 'DESTINATION',
      x: 250 + Math.random() * 100,
      y: 200 + Math.random() * 100,
      qrId: `QR-LOC-${nodes.length + 1}`,
      description: '',
    };
    setEditingNode(newLoc);
    setIsModalOpen(true);
  };

  const handleSaveLocationModal = (data: Partial<Location>) => {
    if (editingNode?.id || nodes.some((n) => (n.data as any).name === editingNode?.name)) {
      // Update existing node
      setNodes((nds) =>
        nds.map((n) => {
          if ((n.data as any).id === editingNode?.id || (n.data as any).name === editingNode?.name) {
            return {
              ...n,
              data: {
                ...n.data,
                name: data.name,
                type: data.type,
                qrId: data.qrId,
                description: data.description,
              },
            };
          }
          return n;
        })
      );
    } else {
      // Add new node
      const newNode: Node = {
        id: `node-${Date.now()}`,
        type: 'locationNode',
        position: { x: data.x || 300, y: data.y || 250 },
        data: {
          name: data.name,
          type: data.type,
          qrId: data.qrId,
          description: data.description,
        },
      };
      setNodes((nds) => [...nds, newNode]);
    }
  };

  const handleDeleteLocationModal = () => {
    if (!editingNode) return;
    setNodes((nds) => nds.filter((n) => (n.data as any).name !== editingNode.name && (n.data as any).id !== editingNode.id));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== String(editingNode.id) && e.target !== String(editingNode.id)
      )
    );
    setIsModalOpen(false);
  };

  const handleSaveToDatabase = async () => {
    setIsSaving(true);
    try {
      // Convert React Flow state to backend SaveMapPayload
      const locationPayload = nodes.map((n) => {
        const d = n.data as any;
        return {
          id: d.id,
          name: d.name,
          type: d.type,
          x: Math.round(n.position.x),
          y: Math.round(n.position.y),
          qrId: d.qrId || null,
          description: d.description || null,
        };
      });

      // Build node id -> name lookup map
      const nodeNameMap = new Map<string, string>();
      nodes.forEach((n) => {
        const d = n.data as any;
        nodeNameMap.set(n.id, d.name);
        if (d.id) nodeNameMap.set(String(d.id), d.name);
      });

      const pathPayload = edges
        .map((e) => {
          const fromName = nodeNameMap.get(e.source);
          const toName = nodeNameMap.get(e.target);
          const d = (e.data || {}) as any;

          if (!fromName || !toName) return null;

          return {
            fromLocationName: fromName,
            toLocationName: toName,
            direction: d.direction || 'NORTH',
            distance: d.distance || 10,
            bidirectional: d.bidirectional ?? true,
          };
        })
        .filter(Boolean);

      await saveMap(currentMap?.name || 'Main Campus', locationPayload, pathPayload as any);
      showToast('Map saved & synchronized to database and connected robots!');
    } catch (err: any) {
      showToast(`Error saving map: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-8rem)] rounded-2xl border border-slate-800 bg-slate-950 overflow-hidden shadow-2xl">
      <MapToolbar
        onAddLocation={handleAddLocation}
        onSaveMap={handleSaveToDatabase}
        onResetMap={loadActiveMap}
        isSaving={isSaving}
      />

      {toastMessage && (
        <div className="absolute top-4 right-4 z-50 px-4 py-2.5 rounded-xl bg-emerald-500/90 text-slate-950 font-bold text-xs shadow-lg animate-in fade-in slide-in-from-top-4">
          {toastMessage}
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={handleNodeDoubleClick}
        fitView
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#334155" />
        <Controls className="bg-slate-900 border border-slate-800 text-white fill-white rounded-xl overflow-hidden" />
      </ReactFlow>

      <LocationEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        location={editingNode}
        onSave={handleSaveLocationModal}
        onDelete={editingNode?.id ? handleDeleteLocationModal : undefined}
      />
    </div>
  );
};
