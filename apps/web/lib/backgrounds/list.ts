import "server-only";

import type { OrgBackgroundPreset } from "@prisma/client";
import { BACKGROUND_PRESETS } from "@/lib/livekit/track-preferences";
import { getOrgShowBuiltinBackgrounds } from "@/lib/backgrounds/org-settings";
import { prisma } from "@/lib/db";

export type BackgroundPresetDto = {
  id: string;
  label: string;
  imageUrl: string;
};

export async function listBackgroundPresets(origin: string): Promise<{
  showBuiltinBackgrounds: boolean;
  builtIn: BackgroundPresetDto[];
  org: BackgroundPresetDto[];
}> {
  const [showBuiltinBackgrounds, orgRows] = await Promise.all([
    getOrgShowBuiltinBackgrounds(),
    prisma.orgBackgroundPreset.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    }),
  ]);

  const builtIn = showBuiltinBackgrounds
    ? BACKGROUND_PRESETS.map((preset) => ({
        id: preset.id,
        label: preset.label,
        imageUrl: new URL(preset.path, origin).href,
      }))
    : [];

  const org = orgRows.map((row: OrgBackgroundPreset) => ({
    id: row.id,
    label: row.label,
    imageUrl: new URL(
      `/api/v1/backgrounds/org/${encodeURIComponent(row.id)}/image`,
      origin,
    ).href,
  }));

  return { showBuiltinBackgrounds, builtIn, org };
}
