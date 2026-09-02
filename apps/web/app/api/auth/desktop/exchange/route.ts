import { jsonError } from "@/lib/api";
import { peekAuthTicket } from "@/lib/auth-ticket";

export const runtime = "nodejs";

/** Validates a desktop ticket and returns the WebView session bootstrap path. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "VALIDATION_ERROR", "Invalid JSON body");
  }

  const ticket =
    typeof body === "object" &&
    body !== null &&
    "ticket" in body &&
    typeof body.ticket === "string"
      ? body.ticket
      : null;

  if (!ticket) {
    return jsonError(400, "VALIDATION_ERROR", "ticket is required");
  }

  const userId = peekAuthTicket(ticket);
  if (!userId) {
    return jsonError(401, "DESKTOP_TICKET_INVALID", "Desktop ticket is invalid or expired");
  }

  const sessionUrl = new URL("/api/auth/desktop/session", request.url);
  sessionUrl.searchParams.set("ticket", ticket);
  return Response.json({
    data: {
      sessionUrl: sessionUrl.pathname + sessionUrl.search,
      userId,
    },
  });
}
