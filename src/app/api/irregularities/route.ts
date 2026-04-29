import { createIrregularityReport } from "@/lib/analytics";
import type {
  ApiMessageResponse,
  ApiOkResponse,
  IrregularityReportCreatePayload,
} from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = (await request.json()) as IrregularityReportCreatePayload;
    await createIrregularityReport({
      message: payload.message ?? "",
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
    });

    const response: ApiOkResponse = { ok: true };
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
