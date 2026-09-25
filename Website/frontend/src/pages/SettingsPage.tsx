import React, { useState } from 'react';
import { Settings, Shield, Sliders, Cpu, Save, Wifi, RefreshCw, CheckCircle2, XCircle, Globe, Video, Activity } from 'lucide-react';
import { useRobotStore } from '../store/robotStore';
import { rpiService } from '../services/rpiService';

export const SettingsPage: React.FC = () => {
  const { rpiConfig, updateRpiConfig, fetchRpiTelemetry } = useRobotStore();

  // Local state for RPi configuration
  const [baseUrl, setBaseUrl] = useState(rpiConfig.baseUrl || 'http://10.78.161.184:5000');
  const [streamPath, setStreamPath] = useState(rpiConfig.streamPath || '/video_feed');
  const [statusPath, setStatusPath] = useState(rpiConfig.statusPath || '/');
  const [pollIntervalSec, setPollIntervalSec] = useState(rpiConfig.pollIntervalSec || 2);
  const [autoPoll, setAutoPoll] = useState(rpiConfig.autoPoll ?? true);

  // Motion & Safety Settings
  const [safeDistance, setSafeDistance] = useState(30);
  const [criticalDistance, setCriticalDistance] = useState(10);
  const [defaultSpeed, setDefaultSpeed] = useState(160);
  const [turnSpeed, setTurnSpeed] = useState(150);

  // UI state
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    tested: boolean;
    success: boolean;
    latencyMs?: number;
    message?: string;
    payload?: any;
  } | null>(null);
  const [saved, setSaved] = useState(false);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    // Save temporary config for testing
    rpiService.saveConfig({ baseUrl, statusPath, streamPath });

    try {
      const telemetry = await rpiService.fetchTelemetry();
      if (telemetry.connected) {
        setTestResult({
          tested: true,
          success: true,
          latencyMs: telemetry.latencyMs,
          message: `Successfully connected to Raspberry Pi at ${baseUrl}!`,
          payload: telemetry.raw || telemetry,
        });
      } else {
        setTestResult({
          tested: true,
          success: false,
          latencyMs: telemetry.latencyMs,
          message: `Could not reach ${baseUrl}. Please check if Raspberry Pi is powered on and running your web server.`,
        });
      }
    } catch (err: any) {
      setTestResult({
        tested: true,
        success: false,
        message: err.message || 'Connection failed',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    updateRpiConfig({
      baseUrl,
      streamPath,
      statusPath,
      pollIntervalSec,
      autoPoll,
    });

    setSaved(true);
    setTimeout(() => setSaved(false), 3500);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight">System & Hardware Configuration</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Configure Raspberry Pi host connection, camera stream endpoints, and autonomous navigation parameters.
        </p>
      </div>

      {saved && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold animate-in fade-in flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          Configuration parameters and Raspberry Pi target saved successfully!
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Raspberry Pi Hardware Link Settings */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-campus-400" />
              <div>
                <h3 className="font-bold text-white text-sm">Raspberry Pi Server Integration</h3>
                <p className="text-[11px] text-slate-400">
                  Target host for live telemetry, video streaming, and motor commands.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin' : ''}`} />
              Test Connection
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Raspberry Pi Base URL
              </label>
              <div className="relative">
                <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="http://10.78.161.184:5000"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-campus-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Your Raspberry Pi IP and port (e.g., <code className="text-slate-400 font-mono">http://10.78.161.184:5000</code>).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Camera Stream Endpoint
              </label>
              <div className="relative">
                <Video className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={streamPath}
                  onChange={(e) => setStreamPath(e.target.value)}
                  placeholder="/video_feed"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-campus-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                MJPEG path (e.g. <code className="text-slate-400 font-mono">/video_feed</code> or <code className="text-slate-400 font-mono">/stream</code>).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Status / Telemetry Endpoint
              </label>
              <div className="relative">
                <Activity className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={statusPath}
                  onChange={(e) => setStatusPath(e.target.value)}
                  placeholder="/"
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-campus-500"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                JSON telemetry path (e.g. <code className="text-slate-400 font-mono">/</code> or <code className="text-slate-400 font-mono">/api/status</code>).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Telemetry Refresh Interval ({pollIntervalSec} seconds)
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={pollIntervalSec}
                onChange={(e) => setPollIntervalSec(parseInt(e.target.value, 10))}
                className="w-full accent-campus-500 mt-2"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoPoll}
                    onChange={(e) => setAutoPoll(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-campus-500 focus:ring-campus-500"
                  />
                  <span>Enable Auto Background Polling</span>
                </label>
                <span>{pollIntervalSec}s</span>
              </div>
            </div>
          </div>

          {/* Connection Test Result Banner */}
          {testResult && (
            <div
              className={`p-4 rounded-xl border text-xs space-y-2 animate-in fade-in ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2 font-bold">
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
                <span>{testResult.message}</span>
                {testResult.latencyMs !== undefined && (
                  <span className="font-mono font-normal">({testResult.latencyMs}ms)</span>
                )}
              </div>

              {testResult.payload && (
                <div className="mt-2 p-2.5 rounded bg-slate-950 font-mono text-[11px] overflow-auto max-h-40 border border-slate-800 text-slate-300">
                  <pre>{JSON.stringify(testResult.payload, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Safety & Distances */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Shield className="w-5 h-5 text-campus-400" />
            <h3 className="font-bold text-white text-sm">Obstacle Avoidance & Safety Thresholds</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Safe Obstacle Warning Distance ({safeDistance} cm)
              </label>
              <input
                type="range"
                min="15"
                max="60"
                value={safeDistance}
                onChange={(e) => setSafeDistance(parseInt(e.target.value, 10))}
                className="w-full accent-campus-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Distance at which robot pauses and announces waiting message.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Critical Emergency Stop Distance ({criticalDistance} cm)
              </label>
              <input
                type="range"
                min="5"
                max="20"
                value={criticalDistance}
                onChange={(e) => setCriticalDistance(parseInt(e.target.value, 10))}
                className="w-full accent-rose-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Hardware-level immediate motor halt on Arduino.
              </p>
            </div>
          </div>
        </div>

        {/* Speed Controls */}
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Sliders className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-white text-sm">Motor PWM Speeds (0-255)</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Forward Cruise PWM: {defaultSpeed}
              </label>
              <input
                type="range"
                min="100"
                max="255"
                value={defaultSpeed}
                onChange={(e) => setDefaultSpeed(parseInt(e.target.value, 10))}
                className="w-full accent-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Turn PWM (MPU6050 feedback): {turnSpeed}
              </label>
              <input
                type="range"
                min="100"
                max="255"
                value={turnSpeed}
                onChange={(e) => setTurnSpeed(parseInt(e.target.value, 10))}
                className="w-full accent-sky-500"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-campus-600 hover:bg-campus-500 text-white font-bold text-xs shadow-lg shadow-campus-900/40 transition-all"
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
};
