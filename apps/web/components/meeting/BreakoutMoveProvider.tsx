"use client";

import {
  createContext,
  useCallback,
  useContext,
  type ReactNode,
} from "react";
import { useLocalParticipant } from "@livekit/components-react";
import { moveToPreparedMeeting } from "@/lib/breakout-move";

const BreakoutMoveContext = createContext<
  ((destinationRoomId: string) => Promise<void>) | null
>(null);

export function BreakoutMoveProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const { localParticipant } = useLocalParticipant();

  const moveToRoom = useCallback(
    async (destinationRoomId: string) => {
      const result = await moveToPreparedMeeting({
        destinationRoomId,
        identity: userId,
        name: localParticipant.name || undefined,
        audio: localParticipant.isMicrophoneEnabled,
        video: localParticipant.isCameraEnabled,
      });
      if (!result.ok) {
        throw new Error(result.message);
      }
    },
    [localParticipant, userId],
  );

  return (
    <BreakoutMoveContext.Provider value={moveToRoom}>
      {children}
    </BreakoutMoveContext.Provider>
  );
}

export function useBreakoutMove() {
  const move = useContext(BreakoutMoveContext);
  if (!move) {
    throw new Error("useBreakoutMove must be used inside BreakoutMoveProvider");
  }
  return move;
}
