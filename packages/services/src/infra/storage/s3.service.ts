import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3Client = new S3Client({
  region: process.env.AWS_DEFAULT_REGION || "us-east-1",
  endpoint: process.env.AWS_ENDPOINT_URL, // e.g. http://localhost:4566
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "test",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "test",
  },
  forcePathStyle: true, // Required for LocalStack / Floci
});

const getBucketName = () => {
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) {
    throw new Error("AWS_S3_BUCKET is not configured in environment");
  }
  return bucket;
};

export class S3Service {
  /**
   * Generates a presigned URL for uploading directly to S3 from the browser
   */
  static async generateUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      ContentType: contentType,
    });
    
    return getSignedUrl(s3Client, command, { expiresIn });
  }

  /**
   * Generates a presigned URL for downloading/viewing an object from S3
   */
  static async generateDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn });
  }

  /**
   * Checks if an object exists in S3
   */
  static async objectExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: getBucketName(),
        Key: key,
      });
      await s3Client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Deletes an object from S3
   */
  static async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    });
    
    await s3Client.send(command);
  }
}
