import "server-only";

import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getServerEnv, recordingsBucket } from "@/lib/env";

export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;
export const SIGNED_URL_EXPIRES_SECONDS = 15 * 60;
export const ALLOWED_ATTACHMENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

export function assertAttachmentAllowed(file: {
  size: number;
  type: string;
}): { ok: true } | { ok: false; code: string; message: string } {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: "Attachments must be 10 MB or smaller",
    };
  }
  if (!ALLOWED_ATTACHMENT_TYPES.has(file.type)) {
    return {
      ok: false,
      code: "FILE_TYPE",
      message: "Only JPEG, PNG, WebP, or PDF files are allowed",
    };
  }
  return { ok: true };
}

function requireS3() {
  const env = getServerEnv();
  if (
    !env.S3_ENDPOINT ||
    !env.S3_ACCESS_KEY ||
    !env.S3_SECRET_KEY ||
    !env.S3_BUCKET
  ) {
    throw new Error("Object storage is not configured");
  }
  const client = new S3Client({
    region: env.S3_REGION ?? "us-east-1",
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
    },
  });
  return { client, bucket: env.S3_BUCKET };
}

let bucketReady = false;

async function ensureBucket(): Promise<{ client: S3Client; bucket: string }> {
  const { client, bucket } = requireS3();
  if (bucketReady) {
    return { client, bucket };
  }
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    await client.send(
      new PutBucketPolicyCommand({
        Bucket: bucket,
        Policy: JSON.stringify({
          Version: "2012-10-17",
          Statement: [
            {
              Sid: "DenyListBucket",
              Effect: "Deny",
              Principal: "*",
              Action: "s3:ListBucket",
              Resource: `arn:aws:s3:::${bucket}`,
            },
          ],
        }),
      }),
    );
  }
  bucketReady = true;
  return { client, bucket };
}

export async function uploadAttachment(input: {
  roomId: string;
  userId: string;
  filename: string;
  contentType: string;
  body: Uint8Array;
}): Promise<string> {
  const { client, bucket } = await ensureBucket();
  const safeName = input.filename.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 80);
  const key = `${input.roomId}/${input.userId}/${crypto.randomUUID()}-${safeName}`;
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
    }),
  );
  return key;
}

export async function putObject(
  key: string,
  body: Uint8Array,
  contentType: string,
): Promise<void> {
  const { client, bucket } = await ensureBucket();
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function signDownloadUrl(
  key: string,
  expiresIn = SIGNED_URL_EXPIRES_SECONDS,
): Promise<string> {
  const { client, bucket } = requireS3();
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn },
  );
}

export async function signRecordingDownloadUrl(
  key: string,
  expiresIn = SIGNED_URL_EXPIRES_SECONDS,
): Promise<string> {
  const env = getServerEnv();
  const bucket = recordingsBucket();
  if (
    !env.S3_ENDPOINT ||
    !env.S3_ACCESS_KEY ||
    !env.S3_SECRET_KEY ||
    !bucket
  ) {
    throw new Error("Object storage is not configured");
  }
  const client = new S3Client({
    region: env.S3_REGION ?? "us-east-1",
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
    },
  });
  return getSignedUrl(
    client,
    new GetObjectCommand({ Bucket: bucket, Key: key }),
    { expiresIn },
  );
}

export async function getRecordingObject(key: string): Promise<{
  body: Uint8Array;
  contentType: string;
}> {
  const env = getServerEnv();
  const bucket = recordingsBucket();
  if (
    !env.S3_ENDPOINT ||
    !env.S3_ACCESS_KEY ||
    !env.S3_SECRET_KEY ||
    !bucket
  ) {
    throw new Error("Object storage is not configured");
  }
  const client = new S3Client({
    region: env.S3_REGION ?? "us-east-1",
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY,
      secretAccessKey: env.S3_SECRET_KEY,
    },
  });
  const result = await client.send(
    new GetObjectCommand({ Bucket: bucket, Key: key }),
  );
  const bytes = result.Body ? await result.Body.transformToByteArray() : new Uint8Array();
  return {
    body: bytes,
    contentType: result.ContentType ?? "application/octet-stream",
  };
}
