import { config } from '../config';
import { logger } from '../utils/logger';
import { RobotService } from './robotService';

export interface RpiStatusResponse {
  connected: boolean;
  url: string;
  latencyMs?: number;
  data?: any;
  error?: string;
  normalized?: {
    state: string;
    battery: number;
    location: string;
    destination?: string;
    direction?: string;
    obstacleStatus: 'CLEAR' | 'DETECTED';
    distance?: number;
    qrStatus: 'VERIFIED' | 'NOT_VERIFIED';
    speed?: number;
    cpuTemp?: number;
  };
}

export class RpiService {
  private static activeUrl = config.rpiUrl;

  static getActiveUrl(): string {
    return this.activeUrl;
  }

  static setActiveUrl(url: string): void {
    if (url && url.startsWith('http')) {
      this.activeUrl = url.replace(/\/$/, '');
      logger.info(`Updated Raspberry Pi Target URL to: ${this.activeUrl}`);
    }
  }

  /**
   * Normalize various JSON structures commonly produced by Raspberry Pi Python/Flask servers
   */
  static normalizeRpiData(raw: any) {
    if (!raw || typeof raw !== 'object') {
      return {
        state: 'IDLE',
        battery: 100,
        location: 'Main Entrance',
        obstacleStatus: 'CLEAR' as const,
        qrStatus: 'NOT_VERIFIED' as const,
      };
    }

    // Battery extraction
    let battery = 100;
    if (typeof raw.battery === 'number') battery = raw.battery;
    else if (typeof raw.battery_level === 'number') battery = raw.battery_level;
    else if (typeof raw.voltage === 'number') battery = Math.min(100, Math.max(0, ((raw.voltage - 10.5) / 2.1) * 100));

    // State extraction
    let state = 'IDLE';
    if (raw.state) state = String(raw.state).toUpperCase();
    else if (raw.currentState) state = String(raw.currentState).toUpperCase();
    else if (raw.status) state = String(raw.status).toUpperCase();
    else if (raw.mode) state = String(raw.mode).toUpperCase();

    // Location extraction
    let location = raw.location || raw.current_location || raw.currentLocation || raw.node || 'Main Entrance';
    if (typeof location === 'object' && location?.name) location = location.name;

    // Obstacle extraction
    let obstacleStatus: 'CLEAR' | 'DETECTED' = 'CLEAR';
    if (
      raw.obstacle === true ||
      raw.obstacle_detected === true ||
      raw.obstacleStatus === 'DETECTED' ||
      raw.obstacle === 'DETECTED' ||
      (typeof raw.distance === 'number' && raw.distance > 0 && raw.distance < 20) ||
      (typeof raw.sonar === 'number' && raw.sonar > 0 && raw.sonar < 20)
    ) {
      obstacleStatus = 'DETECTED';
    }

    // QR status extraction
    let qrStatus: 'VERIFIED' | 'NOT_VERIFIED' = 'NOT_VERIFIED';
    if (raw.qr_verified || raw.qrStatus === 'VERIFIED' || raw.qr || raw.qr_id) {
      qrStatus = 'VERIFIED';
    }

    return {
      state,
      battery: Math.round(battery),
      location: String(location),
      destination: raw.destination || raw.target || raw.currentDestination || undefined,
      direction: raw.direction || raw.currentDirection || raw.heading_cardinal || undefined,
      obstacleStatus,
      distance: raw.distance || raw.sonar || raw.ultrasonic || undefined,
      qrStatus,
      speed: raw.speed || raw.pwm || raw.motor_speed || undefined,
      cpuTemp: raw.cpu_temp || raw.temperature || raw.temp || undefined,
    };
  }

  /**
   * Fetch status & sensor info directly from Raspberry Pi with timeout & multi-path fallback
   */
  static async fetchFromRpi(subpath: string = ''): Promise<RpiStatusResponse> {
    const startTime = Date.now();
    const candidatePaths = subpath ? [subpath] : ['/', '/api/status', '/status', '/telemetry', '/data'];

    let lastError = 'Could not reach Raspberry Pi server';

    for (const path of candidatePaths) {
      const targetUrl = `${this.activeUrl}${path.startsWith('/') ? path : `/${path}`}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);

        const response = await fetch(targetUrl, {
          method: 'GET',
          headers: { 'Accept': 'application/json, text/plain, */*' },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        const latencyMs = Date.now() - startTime;

        if (response.ok) {
          let data: any = null;
          const contentType = response.headers.get('content-type') || '';

          if (contentType.includes('application/json')) {
            data = await response.json();
          } else {
            const text = await response.text();
            try {
              data = JSON.parse(text);
            } catch {
              data = { message: text, rawHtml: text.slice(0, 500) };
            }
          }

          const normalized = this.normalizeRpiData(data);

          // Update database & dashboard broadcast
          try {
            await RobotService.updateStatus({
              status: 'ONLINE',
              currentState: normalized.state,
              currentLocationName: normalized.location,
              currentDirection: normalized.direction,
              currentDestination: normalized.destination,
              battery: normalized.battery,
              obstacleStatus: normalized.obstacleStatus,
              qrStatus: normalized.qrStatus,
            });
          } catch (dbErr) {
            logger.warn('Failed to sync RPi status to DB:', dbErr);
          }

          return {
            connected: true,
            url: targetUrl,
            latencyMs,
            data,
            normalized,
          };
        }
      } catch (err: any) {
        lastError = err.message || 'Connection timed out';
      }
    }

    return {
      connected: false,
      url: this.activeUrl,
      error: lastError,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Forward navigation or motor command to Raspberry Pi
   */
  static async sendCommandToRpi(command: string, destination?: string, parameters?: any): Promise<any> {
    const candidatePaths = ['/command', '/api/command', '/control', '/move'];
    const payload = { command, destination, parameters, timestamp: Date.now() };

    for (const path of candidatePaths) {
      const targetUrl = `${this.activeUrl}${path}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const response = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const resData = await response.json().catch(() => ({ status: 'ok' }));
          return { success: true, forwardedTo: targetUrl, response: resData };
        }
      } catch (err: any) {
        // continue trying next path
      }
    }

    return {
      success: false,
      message: `Failed to forward command to Raspberry Pi at ${this.activeUrl}`,
      command,
      destination,
    };
  }
}
