import React from 'react';
import { RobotStatus as IRobotStatus } from '../../types';
import { useRobotStore } from '../../store/robotStore';
import {
  Compass,
  MapPin,
  Activity,
  Battery,
  ShieldCheck,
  ShieldAlert,
  QrCode,
  CheckCircle2,
  Cpu,
} from 'lucide-react';

interface Props {
  robot: IRobotStatus | null;
}

export const RobotStatusCard: React.FC<Props> = ({ robot }) => {
  const { rpiTelemetry, rpiConfig } = useRobotStore();

  if (!robot) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 animate-pulse text-slate-500 text-sm">
        Connecting to Raspberry Pi ({rpiConfig.baseUrl})...
      </div>
    );
  }

  const isNavigating = [
    'NAVIGATING',
    'MOVING FORWARD',
    'TURNING LEFT',
    'TURNING RIGHT',
    'FORWARD',
  ].includes(robot.currentState);

  const isObstacle = robot.obstacleStatus === 'DETECTED';
  const isQrVerified = robot.qrStatus === 'VERIFIED';

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {/* Current State */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Robot State</span>
          <Activity className="w-4 h-4 text-campus-400" />
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isNavigating
                ? 'bg-sky-400 animate-ping'
                : isObstacle
                ? 'bg-rose-500 animate-pulse'
                : 'bg-emerald-400'
            }`}
          />
          <p className="font-bold text-base text-white tracking-wide truncate">
            {robot.currentState}
          </p>
        </div>
        <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
          <span>Autonomous FSM</span>
          {rpiTelemetry?.cpuTemp && (
            <span className="text-slate-400 font-mono text-[10px]">{rpiTelemetry.cpuTemp}°C</span>
          )}
        </p>
      </div>

      {/* Location & Heading */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Current Location</span>
          <MapPin className="w-4 h-4 text-sky-400" />
        </div>
        <p className="font-bold text-base text-white truncate">
          {robot.currentLocation?.name || 'Main Entrance'}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] text-campus-400 mt-1">
          <Compass className="w-3.5 h-3.5" />
          <span>
            Facing {robot.currentDirection || 'NORTH'}
            {rpiTelemetry?.heading !== undefined ? ` (${rpiTelemetry.heading}°)` : ''}
          </span>
        </div>
      </div>

      {/* Destination & Target */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Destination Target</span>
          <QrCode className="w-4 h-4 text-amber-400" />
        </div>
        <p className="font-bold text-base text-white truncate">
          {robot.currentDestination || 'None (Stationary)'}
        </p>
        <div className="flex items-center gap-1.5 text-[11px] mt-1">
          {isQrVerified ? (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> QR Verified
            </span>
          ) : (
            <span className="text-slate-500">QR Not Verified</span>
          )}
        </div>
      </div>

      {/* Obstacle Status */}
      <div
        className={`p-4 rounded-2xl border shadow-md transition-all ${
          isObstacle
            ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
            : 'bg-slate-900/90 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Obstacle Sonar</span>
          {isObstacle ? (
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          ) : (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          )}
        </div>
        <p className={`font-bold text-base ${isObstacle ? 'text-rose-400' : 'text-emerald-400'}`}>
          {isObstacle ? 'OBSTACLE DETECTED' : 'PATH CLEAR'}
        </p>
        <p className="text-[11px] text-slate-500 mt-1">
          {rpiTelemetry?.distance !== undefined
            ? `Distance: ${rpiTelemetry.distance} cm`
            : 'HC-SR04 Ultrasonic Sonar'}
        </p>
      </div>
    </div>
  );
};
