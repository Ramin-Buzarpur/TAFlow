import "server-only";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

type StorageConfig = {
  bucket: string;
  endpoint?: string;
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  forcePathStyle: boolean;
};

const globalForStorage = globalThis as unknown as {
  s3Client?: S3Client;
  s3BucketChecked?: boolean;
};

function getStorageConfig(): StorageConfig {
  const bucket = process.env.S3_BUCKET;
  if (!bucket) {
    throw new Error("S3_BUCKET is required for file storage");
  }

  const accessKeyId = process.env.S3_ACCESS_KEY_ID || undefined;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY || undefined;
  if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
    throw new Error("S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must be configured together");
  }

  return {
    bucket,
    endpoint: process.env.S3_ENDPOINT || undefined,
    region: process.env.S3_REGION || "us-east-1",
    accessKeyId,
    secretAccessKey,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false"
  };
}

function getClient() {
  const config = getStorageConfig();
  if (globalForStorage.s3Client) return { client: globalForStorage.s3Client, config };

  globalForStorage.s3Client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    forcePathStyle: config.forcePathStyle,
    credentials:
      config.accessKeyId && config.secretAccessKey
        ? {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey
          }
        : undefined
  });

  return { client: globalForStorage.s3Client, config };
}

async function ensureBucket(client: S3Client, config: StorageConfig) {
  if (globalForStorage.s3BucketChecked) return;
  try {
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    globalForStorage.s3BucketChecked = true;
    return;
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
    await client.send(new CreateBucketCommand({ Bucket: config.bucket }));
    globalForStorage.s3BucketChecked = true;
  }
}

export async function putObject(key: string, body: Buffer, contentType: string) {
  const { client, config } = getClient();
  await ensureBucket(client, config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  );
}

export async function getSignedDownloadUrl(key: string, expiresInSeconds = 5 * 60) {
  const { client, config } = getClient();
  const command = new GetObjectCommand({
    Bucket: config.bucket,
    Key: key
  });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

export async function deleteObject(key: string) {
  const { client, config } = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: key
    })
  );
}

export async function checkStorageHealth(): Promise<boolean> {
  try {
    const { client, config } = getClient();
    await client.send(new HeadBucketCommand({ Bucket: config.bucket }));
    return true;
  } catch {
    return false;
  }
}
