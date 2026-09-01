import { describe, expect, it } from "vitest";
import {
  encodeKeyPacket,
  keyMaterialFromPacket,
  parseKeyPacket,
} from "./keys";

describe("e2ee key packets", () => {
  it("round-trips key material over the data channel payload", () => {
    const material = new Uint8Array(32);
    material.fill(7);
    const encoded = encodeKeyPacket("user-a", material);
    const packet = parseKeyPacket(encoded);
    expect(packet?.identity).toBe("user-a");
    expect(new Uint8Array(keyMaterialFromPacket(packet!))).toEqual(material);
  });

  it("rejects invalid packets", () => {
    expect(parseKeyPacket(new TextEncoder().encode("{}"))).toBeNull();
  });
});
