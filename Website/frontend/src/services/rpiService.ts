import { api } from './api';
import { RpiConfig, RpiTelemetry } from '../types';

const RPI_CONFIG_KEY = 'campusconnect_rpi_config';

export const DEFAULT_RPI_CONFIG: RpiConfig = {
  baseUrl: 'http://10.78.161.184:5000',
  streamPath: '/video_feed',
  statusPath: '/',
  pollIntervalSec: 2,
  autoPoll: true,
};

export const rpiService = {
  getConfig(): RpiConfig {
    try {
      const stored = localStorage.getItem(RPI_CONFIG_KEY);
      if (stored) {
        return { ...DEFAULT_RPI_CONFIG, ...JSON.parse(stored) };
      }
    } catch {}
    return DEFAULT_RPI_CONFIG;
  },

  saveConfig(config: Partial<RpiConfig>): RpiConfig {
    const current = this.getConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(RPI_CONFIG_KEY, JSON.stringify(updated));

    // Also inform backend
    api.post('/robot/rpi/config', { url: updated.baseUrl }).catch(() => {});

    return updated;
  },

  getStreamUrl(config?: RpiConfig): string {
    const cfg = config || this.getConfig();
    const base = cfg.baseUrl.replace(/\/$/, '');
    const path = cfg.streamPath.startsWith('/') ? cfg.streamPath : `/${cfg.streamPath}`;
    return `${base}${path}`;
  },

  /**
   * Normalize any JSON/object response from Raspberry Pi into unified RpiTelemetry
   */
  normalizeData(raw: any, baseUrl: string, latencyMs: number): RpiTelemetry {
    if (!raw || typeof raw !== 'object') {
      return {
        connected: true,
        url: baseUrl,
        latencyMs,
        lastUpdated: new Date().toLocaleTimeString(),
        raw,
      };
    }

    // Battery
    let battery = 100;
    if (typeof raw.battery === 'number') battery = raw.battery;
    else if (typeof raw.battery_level === 'number') battery = raw.battery_level;
    else if (typeof raw.voltage === 'number') {
      battery = Math.min(100, Math.max(0, ((raw.voltage - 10.5) / 2.1) * 100));
    }

    // State
    let state = 'IDLE';
    if (raw.state) state = String(raw.state).toUpperCase();
    else if (raw.currentState) state = String(raw.currentState).toUpperCase();
    else if (raw.status) state = String(raw.status).toUpperCase();
    else if (raw.mode) state = String(raw.mode).toUpperCase();

    // Location
    let location = raw.location || raw.current_location || raw.currentLocation || raw.node || 'Main Entrance';
    if (typeof location === 'object' && location?.name) location = location.name;

    // Obstacle & distance
    const dist = raw.distance ?? raw.sonar ?? raw.ultrasonic ?? raw.obstacle_distance;
    let obstacleStatus: 'CLEAR' | 'DETECTED' = 'CLEAR';
    if (
      raw.obstacle === true ||
      raw.obstacle_detected === true ||
      raw.obstacleStatus === 'DETECTED' ||
      raw.obstacle === 'DETECTED' ||
      (typeof dist === 'number' && dist > 0 && dist < 25)
    ) {
      obstacleStatus = 'DETECTED';
    }

    // QR
    let qrStatus: 'VERIFIED' | 'NOT_VERIFIED' = 'NOT_VERIFIED';
    if (raw.qr_verified || raw.qrStatus === 'VERIFIED' || raw.qr || raw.qr_id) {
      qrStatus = 'VERIFIED';
    }

    // Heading
    const heading = raw.heading ?? raw.yaw ?? raw.imu_heading ?? (raw.direction === 'NORTH' ? 0 : raw.direction === 'EAST' ? 90 : raw.direction === 'SOUTH' ? 180 : raw.direction === 'WEST' ? 270 : undefined);

    return {
      connected: true,
      url: baseUrl,
      latencyMs,
      lastUpdated: new Date().toLocaleTimeString(),
      battery: Math.round(battery),
      state,
      location: String(location),
      destination: raw.destination || raw.target || raw.currentDestination || undefined,
      direction: raw.direction || raw.currentDirection || undefined,
      obstacleStatus,
      distance: typeof dist === 'number' ? Math.round(dist) : undefined,
      qrStatus,
      speed: raw.speed || raw.pwm || raw.motor_speed,
      cpuTemp: raw.cpu_temp || raw.temperature || raw.temp,
      heading: typeof heading === 'number' ? Math.round(heading) : undefined,
      raw,
    };
  },

  /**
   * Fetch telemetry from Raspberry Pi (first tries direct browser fetch, then falls back to backend proxy)
   */
  async fetchTelemetry(): Promise<RpiTelemetry> {
    const cfg = this.getConfig();
    const start = Date.now();
    const statusUrl = `${cfg.baseUrl.replace(/\/$/, '')}${cfg.statusPath.startsWith('/') ? cfg.statusPath : `/${cfg.statusPath}`}`;

    // 1. Try Direct Browser Fetch with 2s timeout
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(statusUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json, text/plain, */*' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - start;

      if (res.ok) {
        let data: any;
        const text = await res.text();
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
        return this.normalizeData(data, cfg.baseUrl, latencyMs);
      }
    } catch {
      // Direct fetch failed (e.g. CORS or network difference) - fall through to backend proxy
    }

    // 2. Try Backend Server-Side Proxy
    try {
      const proxyRes = await api.get(`/robot/rpi/fetch?path=${encodeURIComponent(cfg.statusPath)}`);
      const payload = proxyRes.data;
      if (payload && payload.connected) {
        return this.normalizeData(payload.data || payload.normalized, cfg.baseUrl, payload.latencyMs || (Date.now() - start));
      }
    } catch {}

    // Offline result
    return {
      connected: false,
      url: cfg.baseUrl,
      latencyMs: Date.now() - start,
      lastUpdated: new Date().toLocaleTimeString(),
    };
  },

  /**
   * Send control / motion command to Raspberry Pi
   */
  async sendCommand(command: string, destination?: string, parameters?: any): Promise<any> {
    const cfg = this.getConfig();
    const cmdUrl = `${cfg.baseUrl.replace(/\/$/, '')}/command`;

    // 1. Try Direct POST
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      const res = await fetch(cmdUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command, destination, parameters }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json().catch(() => ({ status: 'ok' }));
      }
    } catch {}

    // 2. Fallback to Backend Proxy
    return await api.post('/robot/rpi/command', { command, destination, parameters }).then(r => r.data);
  },
};
