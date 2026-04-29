import { getIrregularityReports } from "@/lib/analytics";
import { hasAdminSession } from "@/lib/admin-auth";
import type { ApiMessageResponse } from "@/lib/types";

export async function GET(): Promise<Response> {
  if (!(await hasAdminSession())) {
    const response: ApiMessageResponse = { message: "No autorizado." };
    return Response.json(response, { status: 401 });
  }

  try {
    const reports = await getIrregularityReports();
    return Response.json(reports);
  } catch {
    const response: ApiMessageResponse = {
      message: "No pudimos cargar las denuncias.",
    };
    return Response.json(response, { status: 500 });
  }
}
