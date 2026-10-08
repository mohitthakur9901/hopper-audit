import { detectionRepository } from "../repositories/detection.repository.js";
import { Prisma } from "@repo/database";

export class DetectionService {
  async getById(id: string) {
    const detection = await detectionRepository.findById(id);
    if (!detection) {
      throw new Error(`Detection with ID '${id}' not found`);
    }
    return detection;
  }

  async getByMediaId(mediaId: string) {
    return detectionRepository.findMany({
      where: { mediaId },
    });
  }

  async create(data: Prisma.DetectionCreateInput) {
    return detectionRepository.create(data);
  }

  async delete(id: string) {
    return detectionRepository.delete(id);
  }
}

export const detectionService = new DetectionService();
