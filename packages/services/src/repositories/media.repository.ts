import { prisma, Prisma } from "@repo/database"

export class MediaRepository {
  async create(data: Prisma.MediaCreateInput) {
    return prisma.media.create({ data });
  }

  async findById(id: string) {
    return prisma.media.findUnique({ where: { id } });
  }

  async findMany(args?: Prisma.MediaFindManyArgs) {
    return prisma.media.findMany(args);
  }

  async update(id: string, data: Prisma.MediaUpdateInput) {
    return prisma.media.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.media.delete({ where: { id } });
  }
}

export const mediaRepository = new MediaRepository()