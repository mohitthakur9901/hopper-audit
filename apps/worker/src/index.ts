import { Worker, Job } from "bullmq";
import { Redis } from "ioredis";
// Import repositories/services when they are created, e.g.
// import { InspectionRepository, MediaRepository } from "@repo/services/repositories";

const getRedisConnection = () => {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  return new Redis(redisUrl, {
    maxRetriesPerRequest: null,
  });
};

const connection = getRedisConnection();

console.log("Worker starting, connecting to Redis...");

const worker = new Worker(
  "inspection-analysis",
  async (job: Job) => {
    console.log(`Processing job ${job.id} for inspection ${job.data.inspectionId}`);
    
    const { inspectionId } = job.data;
    if (!inspectionId) {
      throw new Error("Missing inspectionId in job data");
    }

    try {
      // 1. Retrieve inspection and media metadata
      // const inspection = await InspectionRepository.findById(inspectionId);
      // const media = await MediaRepository.findByInspectionId(inspectionId);
      console.log(`[Job ${job.id}] Retrieving metadata for inspection: ${inspectionId}`);

      // 2. Call AI Service (mock)
      console.log(`[Job ${job.id}] Calling AI service...`);
      // const aiResponse = await callAIService(media);

      // 3. Persist results through services / update inspection status
      console.log(`[Job ${job.id}] Persisting AI results...`);
      // await prisma.$transaction(async (tx) => { ... });

      console.log(`Job ${job.id} completed successfully.`);
      return { success: true, inspectionId };
    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      // Update inspection status to FAILED
      // await InspectionRepository.updateStatus(inspectionId, "FAILED");
      throw error;
    }
  },
  {
    connection,
    concurrency: 5,
  }
);

worker.on("completed", (job) => {
  console.log(`Job ${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.error(`Job ${job?.id} has failed with ${err.message}`);
});

process.on("SIGINT", async () => {
  console.log("Shutting down worker...");
  await worker.close();
  process.exit(0);
});
