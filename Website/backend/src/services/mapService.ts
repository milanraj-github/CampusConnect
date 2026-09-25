import { prisma } from '../utils/prisma';
import { getSocketServer } from '../websocket/socketServer';

export interface LocationInput {
  id?: number;
  name: string;
  type: 'START' | 'DESTINATION' | 'WAYPOINT';
  x: number;
  y: number;
  qrId?: string | null;
  description?: string | null;
}

export interface PathInput {
  id?: number;
  fromLocationName: string;
  toLocationName: string;
  direction: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';
  distance: number;
  bidirectional?: boolean;
}

export interface SaveMapPayload {
  name?: string;
  locations: LocationInput[];
  paths: PathInput[];
}

export class MapService {
  static async getActiveMap() {
    let map = await prisma.campusMap.findFirst({
      where: { isActive: true },
      include: {
        locations: {
          include: {
            destinationInfo: true,
          },
        },
        paths: {
          include: {
            fromLocation: true,
            toLocation: true,
          },
        },
      },
    });

    if (!map) {
      // Create a default map if none exists
      map = await prisma.campusMap.create({
        data: {
          name: 'Main Campus',
          version: 1,
          isActive: true,
        },
        include: {
          locations: {
            include: {
              destinationInfo: true,
            },
          },
          paths: {
            include: {
              fromLocation: true,
              toLocation: true,
            },
          },
        },
      });
    }

    return map;
  }

  static async getMapById(id: number) {
    const map = await prisma.campusMap.findUnique({
      where: { id },
      include: {
        locations: {
          include: {
            destinationInfo: true,
          },
        },
        paths: {
          include: {
            fromLocation: true,
            toLocation: true,
          },
        },
      },
    });
    if (!map) throw new Error('Map not found');
    return map;
  }

  static async saveVisualMap(payload: SaveMapPayload) {
    let activeMap = await prisma.campusMap.findFirst({
      where: { isActive: true },
    });

    if (!activeMap) {
      activeMap = await prisma.campusMap.create({
        data: {
          name: payload.name || 'Main Campus',
          version: 1,
          isActive: true,
        },
      });
    }

    // Execute within transaction
    const updatedMap = await prisma.$transaction(async (tx) => {
      // 1. Clear existing paths for this map
      await tx.path.deleteMany({
        where: { mapId: activeMap.id },
      });

      // 2. Fetch existing locations
      const existingLocations = await tx.location.findMany({
        where: { mapId: activeMap.id },
        include: { destinationInfo: true },
      });

      const existingLocMap = new Map(existingLocations.map((l) => [l.name, l]));
      const inputLocNames = new Set(payload.locations.map((l) => l.name));

      // Remove locations that are no longer in the payload
      for (const loc of existingLocations) {
        if (!inputLocNames.has(loc.name)) {
          await tx.location.delete({ where: { id: loc.id } });
        }
      }

      // Upsert locations
      const savedLocMap = new Map<string, number>();
      for (const loc of payload.locations) {
        const existing = existingLocMap.get(loc.name);
        if (existing) {
          const updated = await tx.location.update({
            where: { id: existing.id },
            data: {
              type: loc.type,
              x: loc.x,
              y: loc.y,
              qrId: loc.qrId || null,
              description: loc.description || null,
            },
          });
          savedLocMap.set(loc.name, updated.id);
        } else {
          const created = await tx.location.create({
            data: {
              mapId: activeMap.id,
              name: loc.name,
              type: loc.type,
              x: loc.x,
              y: loc.y,
              qrId: loc.qrId || null,
              description: loc.description || null,
            },
          });
          savedLocMap.set(loc.name, created.id);
        }
      }

      // Create paths
      for (const p of payload.paths) {
        const fromId = savedLocMap.get(p.fromLocationName);
        const toId = savedLocMap.get(p.toLocationName);

        if (!fromId || !toId) {
          continue;
        }

        await tx.path.create({
          data: {
            mapId: activeMap.id,
            fromLocationId: fromId,
            toLocationId: toId,
            direction: p.direction,
            distance: p.distance,
            bidirectional: p.bidirectional ?? true,
          },
        });
      }

      // Increment map version
      const mapResult = await tx.campusMap.update({
        where: { id: activeMap.id },
        data: {
          version: activeMap.version + 1,
          name: payload.name || activeMap.name,
        },
        include: {
          locations: {
            include: { destinationInfo: true },
          },
          paths: {
            include: {
              fromLocation: true,
              toLocation: true,
            },
          },
        },
      });

      return mapResult;
    });

    // Notify connected robots and dashboard via Socket.IO
    try {
      const io = getSocketServer();
      if (io) {
        io.of('/robot').emit('map:updated', { version: updatedMap.version, mapId: updatedMap.id });
        io.of('/dashboard').emit('map:updated', updatedMap);
      }
    } catch (e) {
      // socket server might not be initialized yet in tests
    }

    return updatedMap;
  }
}
