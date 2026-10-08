import { mediaRepository } from "../repositories/media.repository.js";
import { Prisma } from "@repo/database";
import { S3Service } from "../infra/storage/s3.service.js";
import { randomUUID } from "crypto";

export class MediaService {
  async requestUpload(inspectionId: string, filename: string, contentType: string) {
    const mediaId = randomUUID();
    const key = `inspections/${inspectionId}/media/${mediaId}/original/${filename}`;
    const uploadUrl = await S3Service.generateUploadUrl(key, contentType);
    
    return {
      mediaId,
      uploadUrl,
      key
    };
  }

  async completeUpload(mediaId: string, inspectionId: string, key: string, type: any) {
    const exists = await S3Service.objectExists(key);
    if (!exists) {
      throw new Error("Object does not exist in S3");
    }

    return this.create({
      id: mediaId,
      originalUrl: key,
      type,
      inspection: {
        connect: { id: inspectionId }
      }
    });
  }
  async getById(id: string) {
    const media = await mediaRepository.findById(id);
    if (!media) {
      throw new Error(`Media with ID '${id}' not found`);
    }
    return media;
  }

  async getByInspectionId(inspectionId: string) {
    return mediaRepository.findMany({
      where: { inspectionId },
      include: { detections: true },
    });
  }

  async create(data: Prisma.MediaCreateInput) {
    return mediaRepository.create(data);
  }

  async update(id: string, data: Prisma.MediaUpdateInput) {
    return mediaRepository.update(id, data);
  }

  async delete(id: string) {
    return mediaRepository.delete(id);
  }
}

export const mediaService = new MediaService();
