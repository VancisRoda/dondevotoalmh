import { createAdminSession, isAdminCredentialsValid } from "@/lib/admin-auth";
import type {
  AdminLoginPayload,
  ApiMessageResponse,
  ApiOkResponse,
} from "@/lib/types";

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = (await request.json()) as AdminLoginPayload;
    const username = payload.username?.trim() ?? "";
    const password = payload.password ?? "";

    if (!isAdminCredentialsValid(username, password)) {
      const response: ApiMessageResponse = {
        message: "Credenciales inválidas.",
      };
      return Response.json(response, { status: 401 });
    }

    await createAdminSession(username);
    const response: ApiOkResponse = { ok: true };
    return Response.json(response);
  } catch {
    const response: ApiMessageResponse = {
      message: "No pudimos iniciar sesión.",
    };
    return Response.json(response, { status: 500 });
  }
}
