import { jsonError } from "@/lib/api";
import { peekAuthTicket } from "@/lib/auth-ticket";

export const runtime = "nodejs";

/** Redirects the desktop WebView to login with a one-time desktop ticket. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticket = url.searchParams.get("ticket");
  if (!ticket) {
    return jsonError(400, "VALIDATION_ERROR", "ticket query parameter is required");
  }

  if (!peekAuthTicket(ticket)) {
    return jsonError(401, "DESKTOP_TICKET_INVALID", "Desktop ticket is invalid or expired");
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("desktopTicket", ticket);
  return Response.redirect(loginUrl);
}
