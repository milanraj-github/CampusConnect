import React from 'react';
import { Plus, Save, RotateCcw, HelpCircle } from 'lucide-react';

interface Props {
  onAddLocation: () => void;
  onSaveMap: () => void;
  onResetMap: () => void;
  isSaving: boolean;
}

export const MapToolbar: React.FC<Props> = ({
  onAddLocation,
  onSaveMap,
  onResetMap,
  isSaving,
}) => {
  return (
    <div className="absolute top-4 left-4 z-10 flex items-center gap-2.5 bg-slate-900/90 backdrop-blur border border-slate-800 p-2 rounded-2xl shadow-xl">
      <button
        onClick={onAddLocation}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-campus-600 hover:bg-campus-500 text-white text-xs font-bold transition-all shadow-md shadow-campus-900/40"
      >
        <Plus className="w-4 h-4" />
        Add Location
      </button>

      <div className="h-6 w-px bg-slate-800" />

      <button
        onClick={onSaveMap}
        disabled={isSaving}
        className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md shadow-emerald-900/40"
      >
        <Save className="w-4 h-4" />
        {isSaving ? 'Saving to DB...' : 'Save Campus Map'}
      </button>

      <button
        onClick={onResetMap}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all"
        title="Reload from Database"
      >
        <RotateCcw className="w-3.5 h-3.5" />
        Reload
      </button>
    </div>
  );
};
