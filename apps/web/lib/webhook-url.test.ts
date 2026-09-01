import { describe, expect, it } from "vitest";
import { assertSafeWebhookUrl } from "./webhook-url";

describe("webhook URL allowlist", () => {
  it("rejects non-HTTPS destinations in production", async () => {
    const result = await assertSafeWebhookUrl("http://hooks.example.com/hook", {
      NODE_ENV: "production",
    });
    expect(result.ok).toBe(false);
  });

  it("allows localhost HTTP outside production", async () => {
    const result = await assertSafeWebhookUrl("http://127.0.0.1:9999/hook", {
      NODE_ENV: "test",
    });
    expect(result.ok).toBe(true);
  });

  it("blocks cloud metadata hosts in production", async () => {
    const result = await assertSafeWebhookUrl(
      "https://metadata.google.internal/",
      { NODE_ENV: "production" },
    );
    expect(result.ok).toBe(false);
  });
});
