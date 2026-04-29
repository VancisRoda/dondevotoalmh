const FALLBACK_TIMEZONE = "America/Argentina/Buenos_Aires";

export function getTimezone(): string {
  return FALLBACK_TIMEZONE;
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

export function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

export function getAdminSlug(): string {
  return getRequiredEnv("ADMIN_PATH_SECRET");
}

export function getAdminUsername(): string {
  return process.env.ADMIN_USERNAME ?? "admin";
}

export function getAdminPassword(): string {
  return getRequiredEnv("ADMIN_PASSWORD");
}

export function getAdminSessionSecret(): string {
  return getRequiredEnv("ADMIN_SESSION_SECRET");
}
