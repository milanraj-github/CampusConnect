import { prisma } from '../utils/prisma';
import { getSocketServer } from '../websocket/socketServer';

export interface CreateLocationDto {
  mapId?: number;
  name: string;
  type: 'START' | 'DESTINATION' | 'WAYPOINT';
  x: number;
  y: number;
  qrId?: string | null;
  description?: string | null;
}

export interface UpdateLocationDto {
  name?: string;
  type?: 'START' | 'DESTINATION' | 'WAYPOINT';
  x?: number;
  y?: number;
  qrId?: string | null;
  description?: string | null;
}

export class LocationService {
  static async getAll(mapId?: number) {
    const where = mapId ? { mapId } : {};
    return prisma.location.findMany({
      where,
      include: {
        destinationInfo: true,
        pathsFrom: true,
        pathsTo: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  static async getById(id: number) {
    const loc = await prisma.location.findUnique({
      where: { id },
      include: {
        destinationInfo: true,
        pathsFrom: { include: { toLocation: true } },
        pathsTo: { include: { fromLocation: true } },
      },
    });
    if (!loc) throw new Error('Location not found');
    return loc;
  }

  static async getByQrId(qrId: string) {
    return prisma.location.findUnique({
      where: { qrId },
      include: { destinationInfo: true },
    });
  }

  static async create(dto: CreateLocationDto) {
    let mapId = dto.mapId;
    if (!mapId) {
      const activeMap = await prisma.campusMap.findFirst({ where: { isActive: true } });
      if (!activeMap) throw new Error('No active campus map found');
      mapId = activeMap.id;
    }

    if (dto.qrId) {
      const existingQr = await prisma.location.findUnique({ where: { qrId: dto.qrId } });
      if (existingQr) throw new Error(`QR ID '${dto.qrId}' is already assigned to '${existingQr.name}'`);
    }

    const loc = await prisma.location.create({
      data: {
        mapId,
        name: dto.name,
        type: dto.type,
        x: dto.x,
        y: dto.y,
        qrId: dto.qrId || null,
        description: dto.description || null,
      },
    });

    return loc;
  }

  static async update(id: number, dto: UpdateLocationDto) {
    if (dto.qrId) {
      const existingQr = await prisma.location.findUnique({ where: { qrId: dto.qrId } });
      if (existingQr && existingQr.id !== id) {
        throw new Error(`QR ID '${dto.qrId}' is already assigned to '${existingQr.name}'`);
      }
    }

    return prisma.location.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.x !== undefined && { x: dto.x }),
        ...(dto.y !== undefined && { y: dto.y }),
        ...(dto.qrId !== undefined && { qrId: dto.qrId || null }),
        ...(dto.description !== undefined && { description: dto.description || null }),
      },
      include: { destinationInfo: true },
    });
  }

  static async delete(id: number) {
    return prisma.location.delete({ where: { id } });
  }
}
