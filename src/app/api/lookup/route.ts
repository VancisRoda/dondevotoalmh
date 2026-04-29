import { isValidDni, lookupDni, normalizeDni } from "@/lib/padron-index";
import type { LookupErrorResponse, LookupResponse } from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as { dni?: unknown };
    const rawDni = typeof body.dni === "string" ? body.dni : "";
    const dni = normalizeDni(rawDni);

    if (!isValidDni(dni)) {
      const errorResponse: LookupErrorResponse = {
        error: "Ingresa un DNI valido de 7 u 8 digitos.",
      };

      return Response.json(errorResponse, { status: 400 });
    }

    const response: LookupResponse = lookupDni(dni);
    return Response.json(response);
  } catch {
    const errorResponse: LookupErrorResponse = {
      error: "No pudimos procesar la consulta. Intenta nuevamente.",
    };

    return Response.json(errorResponse, { status: 500 });
  }
}
