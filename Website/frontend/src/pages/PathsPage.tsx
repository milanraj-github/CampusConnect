import React, { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { Path, DirectionType } from '../types';
import { Route, ArrowRight, ArrowLeftRight, Trash2, Plus } from 'lucide-react';
import { mapService } from '../services/mapService';

export const PathsPage: React.FC = () => {
  const { currentMap, loadActiveMap } = useMapStore();
  const [fromLocId, setFromLocId] = useState<number>(0);
  const [toLocId, setToLocId] = useState<number>(0);
  const [direction, setDirection] = useState<DirectionType>('NORTH');
  const [distance, setDistance] = useState<number>(10);
  const [bidirectional, setBidirectional] = useState(true);
  const [isCreating, setIsCreating] = useState(false);

  const locations = currentMap?.locations || [];
  const paths = currentMap?.paths || [];

  const handleCreatePath = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromLocId || !toLocId || fromLocId === toLocId) {
      alert('Please select two different locations.');
      return;
    }

    try {
      await mapService.createPath({
        mapId: currentMap?.id,
        fromLocationId: fromLocId,
        toLocationId: toLocId,
        direction,
        distance,
        bidirectional,
      });
      await loadActiveMap();
      setIsCreating(false);
    } catch (err: any) {
      alert(`Error creating path: ${err.message}`);
    }
  };

  const handleDeletePath = async (id: number) => {
    if (window.confirm('Delete this path segment?')) {
      await mapService.deletePath(id);
      await loadActiveMap();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Paths & Corridors</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Define graph edges, cardinal directions, and physical distance between campus nodes.
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-campus-600 hover:bg-campus-500 text-white text-xs font-bold shadow-lg shadow-campus-900/40 transition-all"
        >
          <Plus className="w-4 h-4" />
          {isCreating ? 'Cancel' : 'Add Path Segment'}
        </button>
      </div>

      {isCreating && (
        <form
          onSubmit={handleCreatePath}
          className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4 animate-in fade-in"
        >
          <h3 className="text-sm font-bold text-white">Create New Path Segment</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                From Location
              </label>
              <select
                value={fromLocId}
                onChange={(e) => setFromLocId(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
              >
                <option value={0}>Select source node...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                To Location
              </label>
              <select
                value={toLocId}
                onChange={(e) => setToLocId(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
              >
                <option value={0}>Select destination node...</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Path Direction
              </label>
              <select
                value={direction}
                onChange={(e) => setDirection(e.target.value as DirectionType)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
              >
                <option value="NORTH">NORTH</option>
                <option value="EAST">EAST</option>
                <option value="SOUTH">SOUTH</option>
                <option value="WEST">WEST</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Distance (meters)
              </label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={distance}
                onChange={(e) => setDistance(parseFloat(e.target.value) || 10)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-sm"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={bidirectional}
                onChange={(e) => setBidirectional(e.target.checked)}
                className="rounded text-campus-500"
              />
              <span>Allow Two-Way Movement (Bidirectional Path)</span>
            </label>

            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-campus-600 hover:bg-campus-500 text-white font-bold text-xs shadow-md shadow-campus-900/40"
            >
              Save Path Segment
            </button>
          </div>
        </form>
      )}

      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-800/80 text-slate-400 font-semibold border-b border-slate-800 uppercase text-[10px] tracking-wider">
            <tr>
              <th className="px-6 py-4">From</th>
              <th className="px-6 py-4">Direction</th>
              <th className="px-6 py-4">To</th>
              <th className="px-6 py-4">Distance</th>
              <th className="px-6 py-4">Type</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            {paths.map((p) => {
              const fromName = p.fromLocation?.name || 'Unknown';
              const toName = p.toLocation?.name || 'Unknown';

              return (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="px-6 py-4 font-bold text-white">{fromName}</td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-campus-400 px-2 py-0.5 rounded bg-campus-500/10 border border-campus-500/20">
                      {p.direction}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-bold text-white">{toName}</td>
                  <td className="px-6 py-4 font-mono">{p.distance} meters</td>
                  <td className="px-6 py-4">
                    {p.bidirectional ? (
                      <span className="flex items-center gap-1 text-slate-400">
                        <ArrowLeftRight className="w-3.5 h-3.5" /> Bidirectional
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-slate-500">
                        <ArrowRight className="w-3.5 h-3.5" /> One-Way
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeletePath(p.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                      title="Delete Path"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
