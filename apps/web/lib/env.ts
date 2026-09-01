import "server-only";

export type ServerEnv = {
  DATABASE_URL: string | undefined;
  LIVEKIT_URL: string | undefined;
  LIVEKIT_API_KEY: string | undefined;
  LIVEKIT_API_SECRET: string | undefined;
  AUTH_SECRET: string | undefined;
  S3_ENDPOINT: string | undefined;
  S3_INTERNAL_ENDPOINT: string | undefined;
  S3_ACCESS_KEY: string | undefined;
  S3_SECRET_KEY: string | undefined;
  S3_BUCKET: string | undefined;
  S3_RECORDINGS_BUCKET: string | undefined;
  S3_REGION: string | undefined;
  INTERNAL_CRON_SECRET: string | undefined;
  ORG_ADMIN_EMAILS: string | undefined;
  EMBED_ALLOWED_ORIGINS: string | undefined;
};

export function getServerEnv(): ServerEnv {
  return {
    DATABASE_URL: process.env.DATABASE_URL,
    LIVEKIT_URL: process.env.LIVEKIT_URL,
    LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
    LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
    AUTH_SECRET: process.env.AUTH_SECRET,
    S3_ENDPOINT: process.env.S3_ENDPOINT,
    S3_INTERNAL_ENDPOINT: process.env.S3_INTERNAL_ENDPOINT,
    S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
    S3_SECRET_KEY: process.env.S3_SECRET_KEY,
    S3_BUCKET: process.env.S3_BUCKET,
    S3_RECORDINGS_BUCKET: process.env.S3_RECORDINGS_BUCKET,
    S3_REGION: process.env.S3_REGION,
    INTERNAL_CRON_SECRET: process.env.INTERNAL_CRON_SECRET,
    ORG_ADMIN_EMAILS: process.env.ORG_ADMIN_EMAILS,
    EMBED_ALLOWED_ORIGINS: process.env.EMBED_ALLOWED_ORIGINS,
  };
}

export function recordingsBucket(): string | undefined {
  const env = getServerEnv();
  return env.S3_RECORDINGS_BUCKET || env.S3_BUCKET;
}
