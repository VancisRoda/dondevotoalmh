import { getAdminStats } from "@/lib/analytics";
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
    const range: StatsRange = isStatsRange(requestedRange) ? requestedRange : "day";
    const selectedDate = searchParams.get("date");

    const stats = await getAdminStats(range, selectedDate);
    return Response.json(stats);
  } catch (error) {
    console.error("Failed to load admin stats:", error);
    return Response.json({
      range: "day",
      selectedDate: new Date().toISOString().slice(0, 10),
      generatedAt: new Date().toISOString(),
      summary: {
        totalConsultas: 0,
        dnisUnicos: 0,
        centroYConsejo: 0,
        soloCentro: 0,
        soloConsejo: 0,
        diaPico: null,
        horaPico: null,
      },
      participationSeries: [],
      dailySeries: [],
      hourlySeries: [],
      topDnis: [],
      recentLookups: [],
    });
  }
}
