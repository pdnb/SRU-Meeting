import {
  E2EE_KEY_DATA_TOPIC,
  E2eeKeyPacketSchema,
  type E2eeKeyPacket,
} from "@sru/shared";
import {
  BaseKeyProvider,
  createE2EEKey,
  createKeyMaterialFromBuffer,
} from "livekit-client";

export { E2EE_KEY_DATA_TOPIC };

/** Per-participant keys distributed over the LiveKit data channel (v1). */
export class ParticipantKeyProvider extends BaseKeyProvider {
  constructor() {
    super({
      sharedKey: false,
      ratchetWindowSize: 0,
      failureTolerance: -1,
    });
  }

  async setParticipantKey(
    keyMaterial: ArrayBuffer,
    participantIdentity: string,
  ): Promise<void> {
    const material = await createKeyMaterialFromBuffer(keyMaterial);
    this.onSetEncryptionKey(material, participantIdentity);
  }
}

export function generateParticipantKeyMaterial(): Uint8Array {
  return createE2EEKey();
}

export function encodeKeyPacket(
  identity: string,
  keyMaterial: Uint8Array,
): Uint8Array {
  const packet: E2eeKeyPacket = {
    type: "sru-e2ee-key",
    identity,
    keyMaterial: bytesToBase64(keyMaterial),
  };
  return Uint8Array.from(new TextEncoder().encode(JSON.stringify(packet)));
}

export function parseKeyPacket(raw: Uint8Array): E2eeKeyPacket | null {
  try {
    const text = new TextDecoder().decode(raw);
    const json: unknown = JSON.parse(text);
    const parsed = E2eeKeyPacketSchema.safeParse(json);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function keyMaterialFromPacket(packet: E2eeKeyPacket): ArrayBuffer {
  const bytes = base64ToBytes(packet.keyMaterial);
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
}

export { toArrayBuffer };

function bytesToBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(encoded: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(encoded, "base64"));
  }
  const binary = atob(encoded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
