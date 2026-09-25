import { prisma } from '../utils/prisma';

export interface CreatePathDto {
  mapId?: number;
  fromLocationId: number;
  toLocationId: number;
  direction: 'NORTH' | 'EAST' | 'SOUTH' | 'WEST';
  distance: number;
  bidirectional?: boolean;
}

export class PathService {
  static async getAll(mapId?: number) {
    const where = mapId ? { mapId } : {};
    return prisma.path.findMany({
      where,
      include: {
        fromLocation: true,
        toLocation: true,
      },
    });
  }

  static async create(dto: CreatePathDto) {
    let mapId = dto.mapId;
    if (!mapId) {
      const activeMap = await prisma.campusMap.findFirst({ where: { isActive: true } });
      if (!activeMap) throw new Error('No active campus map found');
      mapId = activeMap.id;
    }

    if (dto.fromLocationId === dto.toLocationId) {
      throw new Error('From and To locations cannot be the same');
    }

    return prisma.path.create({
      data: {
        mapId,
        fromLocationId: dto.fromLocationId,
        toLocationId: dto.toLocationId,
        direction: dto.direction,
        distance: dto.distance,
        bidirectional: dto.bidirectional ?? true,
      },
      include: {
        fromLocation: true,
        toLocation: true,
      },
    });
  }

  static async delete(id: number) {
    return prisma.path.delete({ where: { id } });
  }
}
