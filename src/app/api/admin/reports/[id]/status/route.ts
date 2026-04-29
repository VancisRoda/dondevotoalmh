import { updateIrregularityStatus } from "@/lib/analytics";
import { hasAdminSession } from "@/lib/admin-auth";
import type { ApiMessageResponse, ApiOkResponse, ReportStatus } from "@/lib/types";

function isReportStatus(value: string): value is ReportStatus {
  return value === "new" || value === "in_progress" || value === "closed";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  if (!(await hasAdminSession())) {
    const response: ApiMessageResponse = { message: "No autorizado." };
    return Response.json(response, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const numericId = Number(id);
    const payload = (await request.json()) as { status?: string };

    if (!Number.isInteger(numericId) || numericId <= 0 || !payload.status || !isReportStatus(payload.status)) {
      const response: ApiMessageResponse = { message: "Solicitud inválida." };
      return Response.json(response, { status: 400 });
    }

    await updateIrregularityStatus(numericId, payload.status);
    const response: ApiOkResponse = { ok: true };
    return Response.json(response);
  } catch {
    const response: ApiMessageResponse = {
      message: "No pudimos actualizar el estado.",
    };
    return Response.json(response, { status: 500 });
  }
}
