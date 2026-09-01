import "server-only";

import { prisma } from "@/lib/db";

export const ORG_SHOW_BUILTIN_BACKGROUNDS_KEY =
  "showBuiltinBackgrounds" as const;

export async function getOrgShowBuiltinBackgrounds(): Promise<boolean> {
  const row = await prisma.orgSetting.findUnique({
    where: { key: ORG_SHOW_BUILTIN_BACKGROUNDS_KEY },
  });
  if (!row) {
    return true;
  }
  return row.value !== false;
}

export async function setOrgShowBuiltinBackgrounds(
  enabled: boolean,
): Promise<void> {
  await prisma.orgSetting.upsert({
    where: { key: ORG_SHOW_BUILTIN_BACKGROUNDS_KEY },
    update: { value: enabled },
    create: { key: ORG_SHOW_BUILTIN_BACKGROUNDS_KEY, value: enabled },
  });
}
