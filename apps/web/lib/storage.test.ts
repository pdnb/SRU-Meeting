import { describe, expect, it } from "vitest";
import { MAX_ATTACHMENT_BYTES, assertAttachmentAllowed } from "./storage";

describe("assertAttachmentAllowed", () => {
  it("rejects an oversized upload", () => {
    const result = assertAttachmentAllowed({
      size: MAX_ATTACHMENT_BYTES + 1,
      type: "application/pdf",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("FILE_TOO_LARGE");
    }
  });

  it("accepts an image under the cap", () => {
    expect(
      assertAttachmentAllowed({ size: 1024, type: "image/png" }).ok,
    ).toBe(true);
  });
});
