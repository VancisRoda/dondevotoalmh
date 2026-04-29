import { notFound } from "next/navigation";

import { hasAdminSession } from "@/lib/admin-auth";
import { getAdminSlug } from "@/lib/env";
import { getTodayDateString } from "@/lib/format";
import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminLogin } from "@/components/admin-login";

export default async function AdminSecretPage({
  params,
}: {
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = await params;

  if (adminPath !== getAdminSlug()) {
    notFound();
  }

  const authenticated = await hasAdminSession();

  if (!authenticated) {
    return <AdminLogin />;
  }

  return <AdminDashboard initialDate={getTodayDateString()} />;
}
