import { auth } from "@/lib/auth";
import { issueAuthTicket } from "@/lib/auth-ticket";

export const runtime = "nodejs";

/** After OIDC in the system browser, issue a one-time ticket and deep-link back to the desktop app. */
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return Response.redirect(new URL("/login", request.url));
  }

  const ticket = issueAuthTicket(session.user.id);
  return Response.redirect(`sru-meeting://auth/callback?ticket=${encodeURIComponent(ticket)}`);
}
