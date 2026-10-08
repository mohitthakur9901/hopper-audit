import { prisma, Prisma } from "@repo/database"

class UserRepository {
  async create(data: Prisma.UserCreateInput) {
    return prisma.user.create({ data });
  }

  async findById(id: string, include?: Prisma.UserInclude) {
    return prisma.user.findUnique({
      where: { id },
      ...(include && { include }),
    });
  }

  async findByEmail(email: string, include?: Prisma.UserInclude) {
    return prisma.user.findUnique({
      where: { email },
      ...(include && { include }),
    });
  }

  async findMany(args?: Prisma.UserFindManyArgs) {
    return prisma.user.findMany(args);
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  async delete(id: string) {
    return prisma.user.delete({ where: { id } });
  }
}

export const userRepository = new UserRepository()