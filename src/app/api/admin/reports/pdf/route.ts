import { buildAdminReportPdf } from "@/lib/admin-report-pdf";
import { getAdminStats, getIrregularityReports } from "@/lib/analytics";
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

    const [stats, reports] = await Promise.all([
      getAdminStats(range, selectedDate),
      getIrregularityReports(range, selectedDate),
    ]);

    const pdfBytes = buildAdminReportPdf(stats, reports);

    return new Response(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reporte-admin-${range}.pdf"`,
      },
    });
  } catch {
    const response: ApiMessageResponse = {
      message: "No pudimos generar el PDF.",
    };
    return Response.json(response, { status: 500 });
  }
}
