import { Queue } from "bullmq";
import { Redis } from "ioredis";

const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });
};

const connection = getRedisConnection();

export const inspectionQueue = new Queue("inspection-analysis", {
  connection,
});

export class BullMQService {
  /**
   * Adds an inspection analysis job to the queue
   */
  static async addInspectionJob(inspectionId: string): Promise<void> {
    await inspectionQueue.add(
      "analyze-inspection",
      {
        inspectionId,
      },
      {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
      }
    );
  }

  /**
   * Returns the queue instance if needed
   */
  static getQueue(): Queue {
    return inspectionQueue;
  }
}
