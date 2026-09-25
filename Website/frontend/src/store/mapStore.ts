import { create } from 'zustand';
import { CampusMap, Location, Path } from '../types';
import { mapService } from '../services/mapService';

interface MapState {
  currentMap: CampusMap | null;
  selectedLocation: Location | null;
  isLoading: boolean;
  error: string | null;
  loadActiveMap: () => Promise<void>;
  saveMap: (name?: string, locations?: any[], paths?: any[]) => Promise<void>;
  setSelectedLocation: (loc: Location | null) => void;
  deleteLocation: (id: number) => Promise<void>;
  deletePath: (id: number) => Promise<void>;
}

export const useMapStore = create<MapState>((set, get) => ({
  currentMap: null,
  selectedLocation: null,
  isLoading: false,
  error: null,

  loadActiveMap: async () => {
    set({ isLoading: true, error: null });
    try {
      const map = await mapService.getActiveMap();
      set({ currentMap: map, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
    }
  },

  saveMap: async (name, locations, paths) => {
    set({ isLoading: true });
    try {
      const active = get().currentMap;
      const updated = await mapService.saveVisualMap({
        name: name || active?.name || 'Main Campus',
        locations: locations || (active?.locations as any) || [],
        paths: paths || (active?.paths as any) || [],
      });
      set({ currentMap: updated, isLoading: false });
    } catch (err: any) {
      set({ error: err.message, isLoading: false });
      throw err;
    }
  },

  setSelectedLocation: (loc) => set({ selectedLocation: loc }),

  deleteLocation: async (id: number) => {
    await mapService.deleteLocation(id);
    await get().loadActiveMap();
  },

  deletePath: async (id: number) => {
    await mapService.deletePath(id);
    await get().loadActiveMap();
  },
}));
