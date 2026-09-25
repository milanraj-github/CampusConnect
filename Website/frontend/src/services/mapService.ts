import { api } from './api';
import { CampusMap, Location, Path, DestinationInfo } from '../types';

export const mapService = {
  async getActiveMap(): Promise<CampusMap> {
    const res = await api.get('/map');
    return res.data.data;
  },

  async saveVisualMap(payload: { name?: string; locations: any[]; paths: any[] }): Promise<CampusMap> {
    const res = await api.post('/map/save', payload);
    return res.data.data;
  },

  // Locations CRUD
  async createLocation(location: Partial<Location>): Promise<Location> {
    const res = await api.post('/locations', location);
    return res.data.data;
  },

  async updateLocation(id: number, location: Partial<Location>): Promise<Location> {
    const res = await api.put(`/locations/${id}`, location);
    return res.data.data;
  },

  async deleteLocation(id: number): Promise<void> {
    await api.delete(`/locations/${id}`);
  },

  // Paths CRUD
  async createPath(path: Partial<Path>): Promise<Path> {
    const res = await api.post('/paths', path);
    return res.data.data;
  },

  async deletePath(id: number): Promise<void> {
    await api.delete(`/paths/${id}`);
  },

  // Destination Q&A
  async addDestinationInfo(locationId: number, question: string, answer: string): Promise<DestinationInfo> {
    const res = await api.post(`/destinations/${locationId}/info`, { question, answer });
    return res.data.data;
  },

  async updateDestinationInfo(id: number, question: string, answer: string): Promise<DestinationInfo> {
    const res = await api.put(`/destinations/info/${id}`, { question, answer });
    return res.data.data;
  },

  async deleteDestinationInfo(id: number): Promise<void> {
    await api.delete(`/destinations/info/${id}`);
  },
};
