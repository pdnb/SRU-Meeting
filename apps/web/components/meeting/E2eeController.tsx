"use client";

import { useRoomContext } from "@livekit/components-react";
import { ConnectionState, RoomEvent } from "livekit-client";
import { useEffect, useRef } from "react";
import {
  E2EE_KEY_DATA_TOPIC,
  encodeKeyPacket,
  generateParticipantKeyMaterial,
  keyMaterialFromPacket,
  parseKeyPacket,
  toArrayBuffer,
  type ParticipantKeyProvider,
} from "@/lib/e2ee/keys";
import { enableRoomE2eeMedia } from "@/lib/e2ee/audio";

function asPublishableData(bytes: Uint8Array): Uint8Array<ArrayBuffer> {
  const copy = new Uint8Array(bytes.length);
  copy.set(bytes);
  return copy as Uint8Array<ArrayBuffer>;
}

export function E2eeController({
  enabled,
  identity,
  keyProvider,
}: {
  enabled: boolean;
  identity: string;
  keyProvider: ParticipantKeyProvider;
}) {
  const room = useRoomContext();
  const announcedRef = useRef(false);
  const localKeyRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const announceLocalKey = async () => {
      if (announcedRef.current) {
        return;
      }
      const keyMaterial = generateParticipantKeyMaterial();
      localKeyRef.current = keyMaterial;
      await keyProvider.setParticipantKey(toArrayBuffer(keyMaterial), identity);
      const payload = asPublishableData(encodeKeyPacket(identity, keyMaterial));
      await room.localParticipant.publishData(payload, {
        reliable: true,
        topic: E2EE_KEY_DATA_TOPIC,
      });
      announcedRef.current = true;
    };

    const onData = (
      payload: Uint8Array,
      participant?: { identity?: string },
      _?: unknown,
      topic?: string,
    ) => {
      if (topic !== E2EE_KEY_DATA_TOPIC) {
        return;
      }
      const packet = parseKeyPacket(payload);
      if (!packet || packet.identity === identity) {
        return;
      }
      if (participant?.identity && participant.identity !== packet.identity) {
        return;
      }
      void keyProvider.setParticipantKey(
        keyMaterialFromPacket(packet),
        packet.identity,
      );
    };

    const onConnected = () => {
      void announceLocalKey().then(() => enableRoomE2eeMedia(room));
    };

    room.on(RoomEvent.DataReceived, onData);
    room.on(RoomEvent.Connected, onConnected);
    room.on(RoomEvent.Reconnected, onConnected);

    if (room.state === ConnectionState.Connected) {
      void onConnected();
    }

    for (const participant of room.remoteParticipants.values()) {
      void participant.identity;
    }

    return () => {
      room.off(RoomEvent.DataReceived, onData);
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.Reconnected, onConnected);
    };
  }, [enabled, identity, keyProvider, room]);

  return null;
}
