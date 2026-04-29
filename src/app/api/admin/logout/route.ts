import { clearAdminSession, hasAdminSession } from "@/lib/admin-auth";
import type { ApiOkResponse } from "@/lib/types";

export async function POST(): Promise<Response> {
  if (await hasAdminSession()) {
    await clearAdminSession();
  }

  const response: ApiOkResponse = { ok: true };
  return Response.json(response);
}
