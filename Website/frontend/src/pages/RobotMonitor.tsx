import React, { useState } from 'react';
import { useRobotStore } from '../store/robotStore';
import { RobotStatusCard } from '../components/dashboard/RobotStatus';
import { CameraFeed } from '../components/dashboard/CameraFeed';
import { EventLog } from '../components/dashboard/EventLog';
import {
  Cpu,
  Radio,
  Shield,
  Gauge,
  Wifi,
  WifiOff,
  RefreshCw,
  Zap,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Square,
  Thermometer,
  Activity,
  Code,
} from 'lucide-react';

export const RobotMonitor: React.FC = () => {
  const {
    robot,
    logs,
    rpiTelemetry,
    rpiConfig,
    fetchRpiTelemetry,
    isPollingRpi,
    startRpiPolling,
    stopRpiPolling,
    sendRpiManualMotion,
  } = useRobotStore();

  const [isFetching, setIsFetching] = useState(false);
  const [activeMotionCmd, setActiveMotionCmd] = useState<string | null>(null);

  const handleManualFetch = async () => {
    setIsFetching(true);
    try {
      await fetchRpiTelemetry();
    } finally {
      setIsFetching(false);
    }
  };

  const handleMotion = async (dir: 'FORWARD' | 'BACKWARD' | 'LEFT' | 'RIGHT' | 'STOP') => {
    setActiveMotionCmd(dir);
    try {
      await sendRpiManualMotion(dir);
    } finally {
      setTimeout(() => setActiveMotionCmd(null), 400);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header with Raspberry Pi Link & Live Status */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-campus-600/20 border border-campus-500/30 text-campus-400">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-tight">Raspberry Pi Hardware Monitor</h2>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${
                  rpiTelemetry?.connected
                    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                    : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                }`}
              >
                {rpiTelemetry?.connected ? (
                  <>
                    <Wifi className="w-3 h-3" /> ONLINE ({rpiTelemetry.latencyMs || 0}ms)
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" /> OFFLINE
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Target Link: <span className="text-campus-400">{rpiConfig.baseUrl}</span>
            </p>
          </div>
        </div>

        {/* Polling & Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={isPollingRpi ? stopRpiPolling : startRpiPolling}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isPollingRpi
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
            }`}
          >
            {isPollingRpi ? '● Auto-Polling Active (2s)' : '○ Auto-Polling Paused'}
          </button>

          <button
            onClick={handleManualFetch}
            disabled={isFetching}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-campus-600 hover:bg-campus-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Fetch Telemetry
          </button>
        </div>
      </div>

      <RobotStatusCard robot={robot} />

      {/* Real-time Hardware Telemetry Gauges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Ultrasonic Sonar */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Ultrasonic HC-SR04</span>
            <Shield className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {rpiTelemetry?.distance !== undefined ? rpiTelemetry.distance : '--'}
            </span>
            <span className="text-xs text-slate-400">cm obstacle clearance</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                (rpiTelemetry?.distance || 100) < 25 ? 'bg-rose-500' : 'bg-emerald-400'
              }`}
              style={{ width: `${Math.min(100, ((rpiTelemetry?.distance || 100) / 150) * 100)}%` }}
            />
          </div>
        </div>

        {/* IMU Heading */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>MPU6050 Gyro Yaw</span>
            <Gauge className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {rpiTelemetry?.heading !== undefined ? `${rpiTelemetry.heading}°` : robot?.currentDirection || 'NORTH'}
            </span>
            <span className="text-xs text-slate-400">heading</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Continuous IMU angular orientation</p>
        </div>

        {/* Motor PWM Speed */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Motor Speed PWM</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {rpiTelemetry?.speed !== undefined ? rpiTelemetry.speed : '160'}
            </span>
            <span className="text-xs text-slate-400">/ 255 PWM</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">L298N Dual H-Bridge Driver</p>
        </div>

        {/* CPU Temp */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Raspberry Pi CPU Temp</span>
            <Thermometer className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white font-mono">
              {rpiTelemetry?.cpuTemp !== undefined ? `${rpiTelemetry.cpuTemp}°C` : '42.5°C'}
            </span>
            <span className="text-xs text-emerald-400 font-semibold">Normal</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">Broadcom Quad-Core SoC</p>
        </div>
      </div>

      {/* Middle Row: Camera & Live Manual Control D-Pad */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-[390px]">
          <CameraFeed />
        </div>

        {/* Manual Teleoperation D-Pad */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-sm text-white">Manual Teleoperation</h3>
              <span className="text-[10px] text-slate-400 font-mono">Direct RPi Link</span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Send immediate low-level motion commands directly to the Raspberry Pi motor controller.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center gap-2 my-2">
            <button
              onClick={() => handleMotion('FORWARD')}
              className={`p-3.5 rounded-xl border font-bold transition-all ${
                activeMotionCmd === 'FORWARD'
                  ? 'bg-campus-500 text-white scale-95'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Drive Forward"
            >
              <ArrowUp className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleMotion('LEFT')}
                className={`p-3.5 rounded-xl border font-bold transition-all ${
                  activeMotionCmd === 'LEFT'
                    ? 'bg-campus-500 text-white scale-95'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title="Turn Left"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              <button
                onClick={() => handleMotion('STOP')}
                className="p-3.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold border border-rose-500 shadow-lg shadow-rose-900/40"
                title="Halt Motors"
              >
                <Square className="w-5 h-5 fill-current" />
              </button>

              <button
                onClick={() => handleMotion('RIGHT')}
                className={`p-3.5 rounded-xl border font-bold transition-all ${
                  activeMotionCmd === 'RIGHT'
                    ? 'bg-campus-500 text-white scale-95'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                }`}
                title="Turn Right"
              >
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => handleMotion('BACKWARD')}
              className={`p-3.5 rounded-xl border font-bold transition-all ${
                activeMotionCmd === 'BACKWARD'
                  ? 'bg-campus-500 text-white scale-95'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
              }`}
              title="Drive Backward"
            >
              <ArrowDown className="w-5 h-5" />
            </button>
          </div>

          <p className="text-[10px] text-center text-slate-500">
            Commands dispatched to <code className="text-slate-400 font-mono">{rpiConfig.baseUrl}/command</code>
          </p>
        </div>
      </div>

      {/* Bottom Grid: Live Event Log & Raw JSON Telemetry Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[360px]">
          <EventLog logs={logs} />
        </div>

        {/* Raw Live JSON Inspector */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col h-[360px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center gap-2">
              <Code className="w-4 h-4 text-sky-400" />
              <h3 className="font-bold text-sm text-white">Live Raspberry Pi JSON Telemetry</h3>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Updated: {rpiTelemetry?.lastUpdated || 'Never'}
            </span>
          </div>

          <div className="flex-1 overflow-auto rounded-xl bg-slate-950 p-4 border border-slate-800 font-mono text-xs text-emerald-400">
            <pre>
              {JSON.stringify(
                {
                  connection: {
                    connected: rpiTelemetry?.connected ?? false,
                    targetUrl: rpiConfig.baseUrl,
                    latencyMs: rpiTelemetry?.latencyMs,
                    lastSync: rpiTelemetry?.lastUpdated,
                  },
                  normalized: {
                    state: rpiTelemetry?.state || robot?.currentState,
                    battery: rpiTelemetry?.battery ?? robot?.battery,
                    location: rpiTelemetry?.location || robot?.currentLocation?.name,
                    destination: rpiTelemetry?.destination || robot?.currentDestination,
                    obstacle: rpiTelemetry?.obstacleStatus || robot?.obstacleStatus,
                    distanceCm: rpiTelemetry?.distance,
                    heading: rpiTelemetry?.heading,
                    qrStatus: rpiTelemetry?.qrStatus || robot?.qrStatus,
                  },
                  rawResponse: rpiTelemetry?.raw || 'Awaiting live response from Raspberry Pi...',
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
