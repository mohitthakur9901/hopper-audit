import { inspectionRepository } from "../repositories/inspection.repository.js";
import { Prisma, type InspectionStatus, type InspectionDecision } from "@repo/database";

export class InspectionService {
  async getById(id: string) {
    const inspection = await inspectionRepository.findById(id);
    if (!inspection) {
      throw new Error(`Inspection with ID '${id}' not found`);
    }
    return inspection;
  }

  async getAll(params?: {
    userId?: string;
    status?: InspectionStatus;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.InspectionWhereInput = {};
    if (params?.userId) where.userId = params.userId;
    if (params?.status) where.status = params.status;

    return inspectionRepository.findMany({
      where,
      skip: params?.skip,
      take: params?.take,
      orderBy: { createdAt: "desc" },
    });
  }

  async create(data: Prisma.InspectionCreateInput) {
    return inspectionRepository.create(data);
  }

  async updateStatus(id: string, status: InspectionStatus, decision?: InspectionDecision) {
    return inspectionRepository.update(id, {
      status,
      decision,
      completedAt: status === "COMPLETED" ? new Date() : undefined,
    });
  }

  async delete(id: string) {
    return inspectionRepository.delete(id);
  }
}

export const inspectionService = new InspectionService();
