import { describe, expect, it } from "vitest";
import { defaultServerUrl } from "./config";

describe("desktop config", () => {
  it("defaults to local dev server", () => {
    const prev = process.env.SRU_SERVER_URL;
    delete process.env.SRU_SERVER_URL;
    expect(defaultServerUrl()).toBe("http://127.0.0.1:3000");
    if (prev) {
      process.env.SRU_SERVER_URL = prev;
    }
  });
});
