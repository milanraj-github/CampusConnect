import { api } from './api';
import { RobotStatus, NavigationLog } from '../types';

export const robotService = {
  async getStatus(): Promise<RobotStatus> {
    const res = await api.get('/robot/status');
    return res.data.data;
  },

  async getLogs(limit = 100): Promise<NavigationLog[]> {
    const res = await api.get(`/robot/logs?limit=${limit}`);
    return res.data.data;
  },

  async sendCommand(command: 'GOTO' | 'STOP' | 'RETURN_HOME' | 'PAUSE' | 'RESUME', destination?: string): Promise<any> {
    const res = await api.post('/navigation/command', { command, destination });
    return res.data;
  },
};
