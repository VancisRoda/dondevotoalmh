import { createIrregularityReport } from "@/lib/analytics";
import type {
  ApiMessageResponse,
  IrregularityReportCreateResponse,
  IrregularityReportCreatePayload,
} from "@/lib/types";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = (await request.json()) as IrregularityReportCreatePayload;
    const report = await createIrregularityReport({
      message: payload.message ?? "",
      dni: payload.dni,
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
    });

    const response: IrregularityReportCreateResponse = { ok: true, report };
    return Response.json(response);
  } catch (error) {
    const response: ApiMessageResponse = {
      message:
        error instanceof Error
          ? error.message
          : "No pudimos guardar la denuncia. Intenta nuevamente.",
    };
    return Response.json(response, { status: 400 });
  }
}
