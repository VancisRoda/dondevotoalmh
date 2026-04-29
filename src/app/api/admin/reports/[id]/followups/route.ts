import { addIrregularityFollowup } from "@/lib/analytics";
import { hasAdminSession } from "@/lib/admin-auth";
import type { ApiMessageResponse, ApiOkResponse } from "@/lib/types";

export async function POST(
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
    const payload = (await request.json()) as { message?: string };

    if (!Number.isInteger(numericId) || numericId <= 0 || !payload.message) {
      const response: ApiMessageResponse = { message: "Solicitud inválida." };
      return Response.json(response, { status: 400 });
    }

    await addIrregularityFollowup(numericId, payload.message);
    const response: ApiOkResponse = { ok: true };
    return Response.json(response);
  } catch (error) {
    const response: ApiMessageResponse = {
      message:
        error instanceof Error
          ? error.message
          : "No pudimos guardar el seguimiento.",
    };
    return Response.json(response, { status: 500 });
  }
}
