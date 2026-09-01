import { describe, expect, it } from "vitest";
import {
  MAX_ATTACHMENT_BYTES,
  assertAttachmentAllowed,
  assertBackgroundImageAllowed,
} from "./storage";
import { MAX_BACKGROUND_IMAGE_BYTES } from "@/lib/backgrounds/constants";

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

describe("assertBackgroundImageAllowed", () => {
  it("rejects an oversized background image", () => {
    const result = assertBackgroundImageAllowed({
      size: MAX_BACKGROUND_IMAGE_BYTES + 1,
      type: "image/png",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe("FILE_TOO_LARGE");
    }
  });

  it("accepts a webp background under the cap", () => {
    expect(
      assertBackgroundImageAllowed({ size: 1024, type: "image/webp" }).ok,
    ).toBe(true);
  });
});
