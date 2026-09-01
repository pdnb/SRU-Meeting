import { requireSessionUser } from "@/lib/session";
import { deleteUserData } from "@/lib/deletion";
import { signOut } from "@/lib/auth";

export const runtime = "nodejs";

export async function DELETE() {
  const { user, response } = await requireSessionUser();
  if (!user) {
    return response;
  }
  await deleteUserData(user.id);
  await signOut({ redirect: false });
  return new Response(null, { status: 204 });
}
