import React, { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { Location, LocationType } from '../types';
import { MapPin, QrCode, Plus, Trash2, Edit2, Flag, Compass } from 'lucide-react';
import { LocationEditModal } from '../components/map/LocationEditModal';
import { mapService } from '../services/mapService';

export const LocationsPage: React.FC = () => {
  const { currentMap, loadActiveMap } = useMapStore();
  const [editingLoc, setEditingLoc] = useState<Partial<Location> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const locations = currentMap?.locations || [];

  const handleCreate = () => {
    setEditingLoc({
      name: '',
      type: 'WAYPOINT',
      x: 300,
      y: 200,
      qrId: '',
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleEdit = (loc: Location) => {
    setEditingLoc(loc);
    setIsModalOpen(true);
  };

  const handleSave = async (data: Partial<Location>) => {
    if (data.id) {
      await mapService.updateLocation(data.id, data);
    } else {
      await mapService.createLocation({
        name: data.name!,
        type: data.type || 'WAYPOINT',
        x: data.x || 200,
        y: data.y || 200,
        qrId: data.qrId || null,
        description: data.description || null,
      });
    }
    await loadActiveMap();
    setIsModalOpen(false);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Delete this location and associated paths?')) {
      await mapService.deleteLocation(id);
      await loadActiveMap();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Campus Locations</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage campus buildings, start docks, destination waypoints, and assigned QR markers.
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-campus-600 hover:bg-campus-500 text-white text-xs font-bold shadow-lg shadow-campus-900/40 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.map((loc) => {
          const isStart = loc.type === 'START';
          const isDest = loc.type === 'DESTINATION';

          return (
            <div
              key={loc.id}
              className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl ${
                        isStart
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : isDest
                          ? 'bg-sky-500/20 text-sky-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {isStart ? (
                        <Flag className="w-4 h-4" />
                      ) : isDest ? (
                        <MapPin className="w-4 h-4" />
                      ) : (
                        <Compass className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base leading-tight">{loc.name}</h3>
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mt-1 ${
                          isStart
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                            : isDest
                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        {loc.type}
                      </span>
                    </div>
                  </div>
                </div>

                {loc.description && (
                  <p className="text-xs text-slate-400 mb-4 line-clamp-2">{loc.description}</p>
                )}

                <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-800 flex items-center justify-between text-xs mb-4">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-campus-400" /> QR Marker:
                  </span>
                  <span className="font-mono text-slate-200 font-bold">
                    {loc.qrId || 'None assigned'}
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleEdit(loc)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(loc.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <LocationEditModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        location={editingLoc}
        onSave={handleSave}
      />
    </div>
  );
};
