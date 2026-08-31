import { describe, expect, it } from "vitest";
import { buildHealthPayload, healthContainsSecrets } from "./health";

describe("health payload", () => {
  it("does not include env secrets", () => {
    const payload = buildHealthPayload("ok");
    expect(
      healthContainsSecrets(payload, {
        LIVEKIT_API_SECRET: "super-secret-livekit",
        AUTH_SECRET: "super-secret-auth",
        S3_SECRET_KEY: "super-secret-s3",
        DATABASE_URL: "postgresql://sru:secret@localhost/sru",
      }),
    ).toBe(false);
    expect(JSON.stringify(payload)).not.toContain("super-secret");
  });
});
