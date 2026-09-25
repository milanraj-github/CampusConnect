import React from 'react';
import { MapEditor } from '../components/map/MapEditor';

export const MapEditorPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">Visual Campus Map Editor</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Visually drag, place, and connect campus nodes and paths. Double-click any location to configure its QR Code, type, and description.
        </p>
      </div>

      <MapEditor />
    </div>
  );
};
