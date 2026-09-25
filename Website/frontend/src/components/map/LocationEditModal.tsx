import React, { useState, useEffect } from 'react';
import { Location, LocationType } from '../../types';
import { X, Save, Trash2, MapPin, QrCode } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  location: Partial<Location> | null;
  onSave: (data: Partial<Location>) => void;
  onDelete?: () => void;
}

export const LocationEditModal: React.FC<Props> = ({
  isOpen,
  onClose,
  location,
  onSave,
  onDelete,
}) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<LocationType>('WAYPOINT');
  const [qrId, setQrId] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (location) {
      setName(location.name || '');
      setType(location.type || 'WAYPOINT');
      setQrId(location.qrId || '');
      setDescription(location.description || '');
    }
  }, [location]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      ...location,
      name: name.trim(),
      type,
      qrId: qrId.trim() || null,
      description: description.trim() || null,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-campus-400" />
            <h3 className="font-bold text-white text-base">
              {location?.id ? 'Edit Location' : 'New Location'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Location Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Central Library, Block A"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-campus-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Location Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['START', 'DESTINATION', 'WAYPOINT'] as LocationType[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setType(t)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                    type === t
                      ? 'bg-campus-600/30 text-campus-300 border-campus-500'
                      : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:bg-slate-800'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Associated QR Code Identifier
            </label>
            <div className="relative">
              <QrCode className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={qrId}
                onChange={(e) => setQrId(e.target.value)}
                placeholder="e.g. QR-LIBRARY-01"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white font-mono placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-campus-500 text-sm"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Used by the robot camera for arrival and starting position cross-verification.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Description & Campus Notes
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this location..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-campus-500 text-sm resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-between gap-3">
            {onDelete ? (
              <button
                type="button"
                onClick={onDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            ) : <div />}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-campus-600 hover:bg-campus-500 text-white text-xs font-bold shadow-lg shadow-campus-900/40 transition-all"
              >
                <Save className="w-4 h-4" />
                Apply Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
