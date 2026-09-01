import { WebhookReceiver } from "livekit-server-sdk";
import { jsonError } from "@/lib/api";
import { getServerEnv } from "@/lib/env";
import { enqueueWebhook } from "@/lib/webhooks";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const env = getServerEnv();
  if (!env.LIVEKIT_API_KEY || !env.LIVEKIT_API_SECRET) {
    return jsonError(503, "MISCONFIGURED", "LiveKit is not configured");
  }
  const receiver = new WebhookReceiver(env.LIVEKIT_API_KEY, env.LIVEKIT_API_SECRET);
  const body = await request.text();
  const auth = request.headers.get("authorization") ?? "";
  try {
    const event = await receiver.receive(body, auth);
    if (event.event === "participant_left" && event.room && event.participant) {
      await enqueueWebhook("participant_left", {
        room: { id: event.room.name, name: event.room.name },
        participant: {
          id: event.participant.identity,
          name: event.participant.name,
        },
      });
    }
    if (event.event === "room_finished" && event.room) {
      await enqueueWebhook("room_finished", {
        room: { id: event.room.name, name: event.room.name },
      });
    }
    return new Response(null, { status: 204 });
  } catch {
    return jsonError(401, "UNAUTHORIZED", "Invalid LiveKit webhook");
  }
}
