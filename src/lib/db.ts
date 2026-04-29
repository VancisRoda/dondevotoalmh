import { neon } from "@neondatabase/serverless";

import { getDatabaseUrl } from "@/lib/env";

let cachedSql: ReturnType<typeof neon> | null = null;
let schemaReadyPromise: Promise<void> | null = null;

function getSql() {
  if (cachedSql) {
    return cachedSql;
  }

  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error("Database is not configured.");
  }

  cachedSql = neon(databaseUrl);
  return cachedSql;
}

export async function ensureDatabaseSchema(): Promise<void> {
  if (schemaReadyPromise) {
    return schemaReadyPromise;
  }

  schemaReadyPromise = (async () => {
    const sql = getSql();

    await sql`
      CREATE TABLE IF NOT EXISTS lookup_events (
        id BIGSERIAL PRIMARY KEY,
        dni TEXT NOT NULL,
        participation TEXT NOT NULL CHECK (participation IN ('centro_y_consejo', 'solo_centro', 'solo_consejo')),
        centro_found BOOLEAN NOT NULL,
        consejo_found BOOLEAN NOT NULL,
        centro_mesa TEXT,
        consejo_mesa TEXT,
        centro_orden TEXT,
        consejo_orden TEXT,
        anio_ingreso TEXT,
        consulted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS lookup_events_consulted_at_idx
      ON lookup_events (consulted_at DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS lookup_events_dni_idx
      ON lookup_events (dni)
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS irregularity_reports (
        id BIGSERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        dni TEXT,
        full_name TEXT,
        email TEXT,
        phone_raw TEXT,
        phone_whatsapp TEXT,
        status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'closed')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      ALTER TABLE irregularity_reports
      ADD COLUMN IF NOT EXISTS dni TEXT
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS irregularity_followups (
        id BIGSERIAL PRIMARY KEY,
        report_id BIGINT NOT NULL REFERENCES irregularity_reports(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS irregularity_reports_created_at_idx
      ON irregularity_reports (created_at DESC)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS irregularity_followups_report_id_idx
      ON irregularity_followups (report_id, created_at DESC)
    `;
  })();

  return schemaReadyPromise;
}

export async function withDatabase<T>(
  work: (sql: ReturnType<typeof neon>) => Promise<T>,
): Promise<T> {
  await ensureDatabaseSchema();
  return work(getSql());
}
