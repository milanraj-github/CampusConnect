import { prisma } from '../utils/prisma';

export interface CreateDestinationInfoDto {
  locationId: number;
  question: string;
  answer: string;
}

export class DestinationService {
  static async getInfoByLocationId(locationId: number) {
    const loc = await prisma.location.findUnique({
      where: { id: locationId },
      include: { destinationInfo: true },
    });
    if (!loc) throw new Error('Location not found');
    return loc;
  }

  static async addInfo(dto: CreateDestinationInfoDto) {
    const loc = await prisma.location.findUnique({ where: { id: dto.locationId } });
    if (!loc) throw new Error('Location not found');

    return prisma.destinationInfo.create({
      data: {
        locationId: dto.locationId,
        question: dto.question.trim(),
        answer: dto.answer.trim(),
      },
    });
  }

  static async updateInfo(id: number, question: string, answer: string) {
    return prisma.destinationInfo.update({
      where: { id },
      data: {
        question: question.trim(),
        answer: answer.trim(),
      },
    });
  }

  static async deleteInfo(id: number) {
    return prisma.destinationInfo.delete({ where: { id } });
  }
}
