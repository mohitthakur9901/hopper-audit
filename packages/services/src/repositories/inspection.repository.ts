import { prisma, Prisma } from "@repo/database"

export class InspectionRepository {
  async create(data: Prisma.InspectionCreateInput) {
    return prisma.inspection.create({ data });
  }

  async findById(id: string) {
    return prisma.inspection.findUnique({ where: { id } });
  }

  async findMany(args?: Prisma.InspectionFindManyArgs) {
    return prisma.inspection.findMany(args);
  }

  async update(id: string, data: Prisma.InspectionUpdateInput) {
    return prisma.inspection.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.inspection.delete({ where: { id } });
  }
}

export const inspectionRepository = new InspectionRepository();