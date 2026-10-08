import { prisma, Prisma } from "@repo/database"

export class DetectionRepository {
  async create(data: Prisma.DetectionCreateInput) {
    return prisma.detection.create({ data });
  }

  async findById(id: string) {
    return prisma.detection.findUnique({ where: { id } });
  }

  async findMany(args?: Prisma.DetectionFindManyArgs) {
    return prisma.detection.findMany(args);
  }

  async update(id: string, data: Prisma.DetectionUpdateInput) {
    return prisma.detection.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.detection.delete({ where: { id } });
  }
}

export const detectionRepository = new DetectionRepository();
