import { create } from 'zustand';
import { RobotStatus, NavigationLog, RpiTelemetry, RpiConfig } from '../types';
import { robotService } from '../services/robotService';
import { rpiService, DEFAULT_RPI_CONFIG } from '../services/rpiService';
import { getDashboardSocket } from '../services/socketService';

interface RobotState {
  robot: RobotStatus | null;
  logs: NavigationLog[];
  isConnected: boolean;
  isLoading: boolean;
  
  // Raspberry Pi specific state
  rpiTelemetry: RpiTelemetry | null;
  rpiConfig: RpiConfig;
  isPollingRpi: boolean;
  
  fetchInitialStatus: () => Promise<void>;
  initSocketListeners: () => void;
  sendCommand: (cmd: 'GOTO' | 'STOP' | 'RETURN_HOME' | 'PAUSE' | 'RESUME', dest?: string) => Promise<void>;
  
  // RPi actions
  fetchRpiTelemetry: () => Promise<RpiTelemetry>;
  updateRpiConfig: (cfg: Partial<RpiConfig>) => void;
  startRpiPolling: () => void;
  stopRpiPolling: () => void;
  sendRpiManualMotion: (direction: 'FORWARD' | 'BACKWARD' | 'LEFT' | 'RIGHT' | 'STOP', speed?: number) => Promise<void>;
}

let pollingIntervalTimer: any = null;

export const useRobotStore = create<RobotState>((set, get) => ({
  robot: null,
  logs: [],
  isConnected: false,
  isLoading: false,
  
  rpiTelemetry: null,
  rpiConfig: rpiService.getConfig(),
  isPollingRpi: false,

  fetchInitialStatus: async () => {
    set({ isLoading: true });
    try {
      const [robot, logs] = await Promise.all([
        robotService.getStatus().catch(() => null),
        robotService.getLogs(50).catch(() => []),
      ]);
      set({ robot, logs, isLoading: false });
    } catch {
      set({ isLoading: false });
    }

    // Auto-poll Raspberry Pi on init
    get().fetchRpiTelemetry();
    if (get().rpiConfig.autoPoll) {
      get().startRpiPolling();
    }
  },

  initSocketListeners: () => {
    const socket = getDashboardSocket();

    socket.on('connect', () => {
      set({ isConnected: true });
    });

    socket.on('disconnect', () => {
      set({ isConnected: false });
    });

    socket.on('initial:state', (data) => {
      set({
        robot: data.robot,
        logs: data.logs || [],
        isConnected: true,
      });
    });

    socket.on('robot:status', (updatedRobot: RobotStatus) => {
      set({ robot: updatedRobot });
    });

    socket.on('robot:log', (newLog: NavigationLog) => {
      set((state) => ({
        logs: [newLog, ...state.logs.slice(0, 99)],
      }));
    });
  },

  sendCommand: async (cmd, dest) => {
    // 1. Send to backend command dispatcher
    await robotService.sendCommand(cmd, dest);
    // 2. Also send directly to Raspberry Pi if active
    rpiService.sendCommand(cmd, dest).catch(() => {});
  },

  fetchRpiTelemetry: async () => {
    const telemetry = await rpiService.fetchTelemetry();
    set({ rpiTelemetry: telemetry });

    // If Raspberry Pi returned valid data, merge into current robot state
    if (telemetry.connected) {
      set((state) => {
        const existing = state.robot;
        const updatedRobot: RobotStatus = {
          id: existing?.id || 1,
          name: existing?.name || 'CampusBot-01 (Raspberry Pi)',
          status: 'ONLINE',
          currentLocationId: existing?.currentLocationId || null,
          currentLocation: existing?.currentLocation || {
            id: 1,
            mapId: 1,
            name: telemetry.location || 'Main Entrance',
            type: 'START',
            x: 100,
            y: 300,
          },
          currentDirection: (telemetry.direction as any) || existing?.currentDirection || 'NORTH',
          currentDestination: telemetry.destination || existing?.currentDestination || null,
          currentState: telemetry.state || existing?.currentState || 'IDLE',
          battery: telemetry.battery !== undefined ? telemetry.battery : (existing?.battery ?? 100),
          obstacleStatus: telemetry.obstacleStatus || existing?.obstacleStatus || 'CLEAR',
          qrStatus: telemetry.qrStatus || existing?.qrStatus || 'NOT_VERIFIED',
          lastHeartbeat: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return { robot: updatedRobot };
      });
    }

    return telemetry;
  },

  updateRpiConfig: (cfg) => {
    const updated = rpiService.saveConfig(cfg);
    set({ rpiConfig: updated });

    if (updated.autoPoll) {
      get().startRpiPolling();
    } else {
      get().stopRpiPolling();
    }
  },

  startRpiPolling: () => {
    if (pollingIntervalTimer) clearInterval(pollingIntervalTimer);
    
    const intervalMs = Math.max(1, get().rpiConfig.pollIntervalSec || 2) * 1000;
    pollingIntervalTimer = setInterval(() => {
      get().fetchRpiTelemetry();
    }, intervalMs);

    set({ isPollingRpi: true });
  },

  stopRpiPolling: () => {
    if (pollingIntervalTimer) {
      clearInterval(pollingIntervalTimer);
      pollingIntervalTimer = null;
    }
    set({ isPollingRpi: false });
  },

  sendRpiManualMotion: async (direction, speed = 160) => {
    await rpiService.sendCommand(direction, undefined, { speed });
  },
}));
