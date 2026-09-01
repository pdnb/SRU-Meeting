import { requireOrgAdmin } from "@/lib/admin";
import { jsonError } from "@/lib/api";
import {
  getAnalyticsOverview,
  validateAnalyticsDateRange,
} from "@/lib/analytics/rollup";
import { AnalyticsOverviewSchema } from "@sru/shared";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { user, response } = await requireOrgAdmin();
  if (!user) {
    return response;
  }

  const url = new URL(request.url);
  const range = validateAnalyticsDateRange(
    url.searchParams.get("from"),
    url.searchParams.get("to"),
  );
  if (!range.ok) {
    return jsonError(422, "VALIDATION_ERROR", range.message);
  }

  const overview = await getAnalyticsOverview(range.from, range.to);
  return Response.json(AnalyticsOverviewSchema.parse(overview));
}
