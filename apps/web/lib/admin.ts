import "server-only";

import { jsonError } from "@/lib/api";
import { requireSessionUser, type SessionUser } from "@/lib/session";
import { isOrgAdmin } from "@/lib/rbac";

export async function requireOrgAdmin(): Promise<
  { user: SessionUser; response: null } | { user: null; response: Response }
> {
  const { user, response } = await requireSessionUser();
  if (!user) {
    return { user: null, response };
  }
  if (!isOrgAdmin(user.orgRole)) {
    return {
      user: null,
      response: jsonError(403, "FORBIDDEN", "Organization admin required"),
    };
  }
  return { user, response: null };
}
