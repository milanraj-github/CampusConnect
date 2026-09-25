export type LocationType = 'START' | 'DESTINATION' | 'WAYPOINT';
export type DirectionType = 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';

export interface DestinationInfo {
  id: number;
  locationId: number;
  question: string;
  answer: string;
}

export interface Location {
  id: number;
  mapId: number;
  name: string;
  type: LocationType;
  x: number;
  y: number;
  qrId?: string | null;
  description?: string | null;
  destinationInfo?: DestinationInfo[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Path {
  id: number;
  mapId: number;
  fromLocationId: number;
  toLocationId: number;
  direction: DirectionType;
  distance: number;
  bidirectional: boolean;
  fromLocation?: Location;
  toLocation?: Location;
}

export interface CampusMap {
  id: number;
  name: string;
  version: number;
  isActive: boolean;
  locations: Location[];
  paths: Path[];
  createdAt: string;
  updatedAt: string;
}

export interface RobotStatus {
  id: number;
  name: string;
  status: 'ONLINE' | 'OFFLINE';
  currentLocationId: number | null;
  currentLocation?: Location | null;
  currentDirection: DirectionType | null;
  currentDestination: string | null;
  currentState: string;
  battery: number;
  obstacleStatus: 'CLEAR' | 'DETECTED';
  qrStatus: 'VERIFIED' | 'NOT_VERIFIED';
  lastHeartbeat: string | null;
  updatedAt: string;
}

export interface NavigationLog {
  id: number;
  robotId: number;
  timestamp: string;
  state: string;
  location: string | null;
  direction: string | null;
  message: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'viewer';
}

export interface RpiTelemetry {
  connected: boolean;
  url: string;
  latencyMs?: number;
  lastUpdated?: string;
  battery?: number;
  state?: string;
  location?: string;
  destination?: string;
  direction?: string;
  obstacleStatus?: 'CLEAR' | 'DETECTED';
  distance?: number; // cm
  qrStatus?: 'VERIFIED' | 'NOT_VERIFIED';
  speed?: number;
  cpuTemp?: number;
  heading?: number; // degrees
  raw?: any;
}

export interface RpiConfig {
  baseUrl: string;
  streamPath: string;
  statusPath: string;
  pollIntervalSec: number;
  autoPoll: boolean;
}
