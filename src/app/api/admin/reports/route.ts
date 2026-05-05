import { getIrregularityReports } from "@/lib/analytics";
import { hasAdminSession } from "@/lib/admin-auth";
import type { ApiMessageResponse, StatsRange } from "@/lib/types";

function isStatsRange(value: string | null): value is StatsRange {
  return value === "day" || value === "week" || value === "total";
}

export async function GET(request: Request): Promise<Response> {
  if (!(await hasAdminSession())) {
    const response: ApiMessageResponse = { message: "No autorizado." };
    return Response.json(response, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const requestedRange = searchParams.get("range");
    const range: StatsRange = isStatsRange(requestedRange) ? requestedRange : "total";
    const selectedDate = searchParams.get("date");

    const reports = await getIrregularityReports(range, selectedDate);
    return Response.json(reports);
  } catch {
    const response: ApiMessageResponse = {
      message: "No pudimos cargar las denuncias.",
    };
    return Response.json(response, { status: 500 });
  }
}
