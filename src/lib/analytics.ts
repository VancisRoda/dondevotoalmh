import { randomInt } from "node:crypto";

import { withDatabase } from "@/lib/db";
import { getTimezone } from "@/lib/env";
import { getTodayDateString, participationLabel } from "@/lib/format";
import {
  normalizeOptionalDni,
  normalizeOptionalText,
  normalizeWhatsappPhone,
} from "@/lib/phone";
import type {
  AdminStatsResponse,
  IrregularityFollowup,
  IrregularityReport,
  IrregularityReportReceipt,
  LookupEvent,
  LookupResponse,
  ReportStatus,
  StatsRange,
} from "@/lib/types";

type SqlClient = Parameters<Parameters<typeof withDatabase>[0]>[0];

interface CountRow {
  count: number;
}

interface DailyRow {
  day: string;
  count: number;
}

interface HourlyRow {
  hour: number;
  count: number;
}

interface ParticipationRow {
  participation: "centro_y_consejo" | "solo_centro" | "solo_consejo";
  count: number;
}

interface TopDniRow {
  dni: string;
  count: number;
  last_consulted_at: string;
}

interface LookupEventRow {
  id: number;
  dni: string;
  participation: "centro_y_consejo" | "solo_centro" | "solo_consejo";
  centro_found: boolean;
  consejo_found: boolean;
  centro_mesa: string | null;
  consejo_mesa: string | null;
  centro_orden: string | null;
  consejo_orden: string | null;
  anio_ingreso: string | null;
  consulted_at: string;
}

interface ReportRow {
  id: number;
  public_code: string | null;
  message: string;
  submission_token?: string | null;
  dni: string | null;
  full_name: string | null;
  email: string | null;
  phone_raw: string | null;
  phone_whatsapp: string | null;
  status: ReportStatus;
  created_at: string;
  updated_at: string;
}

interface FollowupRow {
  id: number;
  report_id: number;
  message: string;
  created_at: string;
}

function mapLookupEventRow(row: LookupEventRow): LookupEvent {
  return {
    id: row.id,
    dni: row.dni,
    participation: row.participation,
    centroFound: row.centro_found,
    consejoFound: row.consejo_found,
    centroMesa: row.centro_mesa,
    consejoMesa: row.consejo_mesa,
    centroOrden: row.centro_orden,
    consejoOrden: row.consejo_orden,
    anioIngreso: row.anio_ingreso,
    consultedAt: row.consulted_at,
  };
}

function getRangeFilter(
  range: StatsRange,
  selectedDate: string,
  columnName: "consulted_at" | "created_at",
) {
  if (range === "total") {
    return {
      sql: "TRUE",
      params: [] as string[],
    };
  }

  if (range === "day") {
    return {
      sql: `timezone('${getTimezone()}', ${columnName})::date = $1::date`,
      params: [selectedDate],
    };
  }

  return {
    sql: `timezone('${getTimezone()}', ${columnName})::date BETWEEN ($1::date - INTERVAL '6 day') AND $1::date`,
    params: [selectedDate],
  };
}

interface CreatedReportRow {
  id: number;
  public_code: string | null;
  message: string;
  dni: string | null;
  full_name: string | null;
  email: string | null;
  phone_raw: string | null;
  created_at: string;
}

function ensureSelectedDate(value: string | null | undefined): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : getTodayDateString();
}

function mapReportReceiptRow(row: CreatedReportRow): IrregularityReportReceipt {
  if (!row.public_code) {
    throw new Error("La denuncia fue creada sin código público.");
  }

  return {
    id: row.id,
    publicCode: row.public_code,
    message: row.message,
    dni: row.dni,
    fullName: row.full_name,
    email: row.email,
    phoneRaw: row.phone_raw,
    createdAt: row.created_at,
  };
}

async function generateUniqueIrregularityPublicCode(
  sql: SqlClient,
): Promise<string> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const publicCode = String(randomInt(100000, 1000000));
    const existingRows = (await sql.query<false, false>(
      `
      SELECT id
      FROM irregularity_reports
      WHERE public_code = $1
      LIMIT 1
      `,
      [publicCode],
    )) as unknown as Array<{ id: number }>;

    if (existingRows.length === 0) {
      return publicCode;
    }
  }

  throw new Error("No pudimos generar un código de denuncia único.");
}

async function getIrregularityReceiptBySubmissionToken(
  sql: SqlClient,
  submissionToken: string,
): Promise<IrregularityReportReceipt | null> {
  const existingRows = (await sql.query<false, false>(
    `
    SELECT
      id,
      public_code,
      message,
      dni,
      full_name,
      email,
      phone_raw,
      created_at
    FROM irregularity_reports
    WHERE submission_token = $1
    LIMIT 1
    `,
    [submissionToken],
  )) as unknown as CreatedReportRow[];

  return existingRows[0] ? mapReportReceiptRow(existingRows[0]) : null;
}

export async function recordLookupEvent(result: LookupResponse): Promise<void> {
  if (result.participation === "no_encontrado") {
    return;
  }

  await withDatabase(async (sql) => {
    await sql`
      INSERT INTO lookup_events (
        dni,
        participation,
        centro_found,
        consejo_found,
        centro_mesa,
        consejo_mesa,
        centro_orden,
        consejo_orden,
        anio_ingreso
      ) VALUES (
        ${result.dni},
        ${result.participation},
        ${Boolean(result.centro)},
        ${Boolean(result.consejo)},
        ${result.centro?.mesa ?? null},
        ${result.consejo?.mesa ?? null},
        ${result.centro?.orden ?? null},
        ${result.consejo?.orden ?? null},
        ${result.centro?.anioIngreso ?? result.consejo?.anioIngreso ?? null}
      )
    `;
  });
}

export async function createIrregularityReport(input: {
  message: string;
  dni?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  submissionToken?: string;
}): Promise<IrregularityReportReceipt> {
  const message = input.message.trim();
  if (!message) {
    throw new Error("Debes ingresar un mensaje.");
  }

  return withDatabase(async (sql) => {
    const submissionToken = normalizeOptionalText(input.submissionToken);
    if (submissionToken) {
      const existingReceipt = await getIrregularityReceiptBySubmissionToken(
        sql,
        submissionToken,
      );
      if (existingReceipt) {
        return existingReceipt;
      }
    }

    const publicCode = await generateUniqueIrregularityPublicCode(sql);
    try {
      const insertedRows = (await sql`
        INSERT INTO irregularity_reports (
          public_code,
          message,
          submission_token,
          dni,
          full_name,
          email,
          phone_raw,
          phone_whatsapp
        ) VALUES (
          ${publicCode},
          ${message},
          ${submissionToken},
          ${normalizeOptionalDni(input.dni)},
          ${normalizeOptionalText(input.fullName)},
          ${normalizeOptionalText(input.email)},
          ${normalizeOptionalText(input.phone)},
          ${normalizeWhatsappPhone(input.phone)}
        )
        RETURNING
          id,
          public_code,
          message,
          dni,
          full_name,
          email,
          phone_raw,
          created_at
      `) as unknown as CreatedReportRow[];

      return mapReportReceiptRow(insertedRows[0]);
    } catch (error) {
      if (
        submissionToken &&
        error instanceof Error &&
        error.message.includes("irregularity_reports_submission_token_idx")
      ) {
        const existingReceipt = await getIrregularityReceiptBySubmissionToken(
          sql,
          submissionToken,
        );
        if (existingReceipt) {
          return existingReceipt;
        }
      }

      throw error;
    }
  });
}

export async function updateIrregularityStatus(
  reportId: number,
  status: ReportStatus,
): Promise<void> {
  await withDatabase(async (sql) => {
    await sql`
      UPDATE irregularity_reports
      SET status = ${status}, updated_at = NOW()
      WHERE id = ${reportId}
    `;
  });
}

export async function addIrregularityFollowup(
  reportId: number,
  message: string,
): Promise<void> {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) {
    throw new Error("Debes ingresar un mensaje de seguimiento.");
  }

  await withDatabase(async (sql) => {
    await sql`
      INSERT INTO irregularity_followups (report_id, message)
      VALUES (${reportId}, ${normalizedMessage})
    `;

    await sql`
      UPDATE irregularity_reports
      SET updated_at = NOW()
      WHERE id = ${reportId}
    `;
  });
}

export async function getIrregularityReports(
  range: StatsRange = "total",
  selectedDateInput?: string | null,
): Promise<IrregularityReport[]> {
  const selectedDate = ensureSelectedDate(selectedDateInput);
  const { sql: filterSql, params } = getRangeFilter(range, selectedDate, "created_at");

  return withDatabase(async (sql) => {
    const reportRows = (await sql.query<false, false>(
      `
      SELECT
        id,
        public_code,
        message,
        dni,
        full_name,
        email,
        phone_raw,
        phone_whatsapp,
        status,
        created_at,
        updated_at
      FROM irregularity_reports
      WHERE ${filterSql}
      ORDER BY created_at DESC
      `,
      params,
    )) as unknown as ReportRow[];

    const followupRows = (await sql.query<false, false>(
      `
      SELECT
        id,
        report_id,
        message,
        created_at
      FROM irregularity_followups
      ORDER BY created_at ASC
      `,
    )) as unknown as FollowupRow[];

    const followupsByReport = new Map<number, IrregularityFollowup[]>();
    for (const row of followupRows) {
      const bucket = followupsByReport.get(row.report_id) ?? [];
      bucket.push({
        id: row.id,
        reportId: row.report_id,
        message: row.message,
        createdAt: row.created_at,
      });
      followupsByReport.set(row.report_id, bucket);
    }

    return reportRows.map((row) => ({
      id: row.id,
      publicCode: row.public_code,
      message: row.message,
      dni: row.dni,
      fullName: row.full_name,
      email: row.email,
      phoneRaw: row.phone_raw,
      phoneWhatsapp: row.phone_whatsapp,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      followups: followupsByReport.get(row.id) ?? [],
    }));
  });
}

export async function backfillIrregularityWhatsappPhones(): Promise<void> {
  await withDatabase(async (sql) => {
    const reportRows = (await sql.query<false, false>(
      `
      SELECT id, phone_raw, phone_whatsapp
      FROM irregularity_reports
      ORDER BY id ASC
      `,
    )) as unknown as Array<{
      id: number;
      phone_raw: string | null;
      phone_whatsapp: string | null;
    }>;

    for (const row of reportRows) {
      const normalized = normalizeWhatsappPhone(row.phone_raw);
      if (!normalized || normalized === row.phone_whatsapp) {
        continue;
      }

      await sql`
        UPDATE irregularity_reports
        SET phone_whatsapp = ${normalized}, updated_at = NOW()
        WHERE id = ${row.id}
      `;
    }
  });
}

export async function getAdminStats(
  range: StatsRange,
  selectedDateInput?: string | null,
): Promise<AdminStatsResponse> {
  const selectedDate = ensureSelectedDate(selectedDateInput);
  const { sql: filterSql, params } = getRangeFilter(range, selectedDate, "consulted_at");

  return withDatabase(async (sql) => {
    const totalRows = (await sql.query<false, false>(
      `SELECT COUNT(*)::int AS count FROM lookup_events WHERE ${filterSql}`,
      params,
    )) as unknown as CountRow[];

    const uniqueRows = (await sql.query<false, false>(
      `SELECT COUNT(DISTINCT dni)::int AS count FROM lookup_events WHERE ${filterSql}`,
      params,
    )) as unknown as CountRow[];

    const participationRows = (await sql.query<false, false>(
      `SELECT participation, COUNT(*)::int AS count
       FROM lookup_events
       WHERE ${filterSql}
       GROUP BY participation
       ORDER BY participation`,
      params,
    )) as unknown as ParticipationRow[];

    const dailyRows = (await sql.query<false, false>(
      `SELECT timezone('${getTimezone()}', consulted_at)::date::text AS day, COUNT(*)::int AS count
       FROM lookup_events
       WHERE ${filterSql}
       GROUP BY day
       ORDER BY day ASC`,
      params,
    )) as unknown as DailyRow[];

    const hourlyRows = (await sql.query<false, false>(
      `SELECT EXTRACT(HOUR FROM timezone('${getTimezone()}', consulted_at))::int AS hour, COUNT(*)::int AS count
       FROM lookup_events
       WHERE ${filterSql}
       GROUP BY hour
       ORDER BY hour ASC`,
      params,
    )) as unknown as HourlyRow[];

    const topDniRows = (await sql.query<false, false>(
      `SELECT dni, COUNT(*)::int AS count, MAX(consulted_at)::text AS last_consulted_at
       FROM lookup_events
       WHERE ${filterSql}
       GROUP BY dni
       ORDER BY count DESC, last_consulted_at DESC
       LIMIT 15`,
      params,
    )) as unknown as TopDniRow[];

    const recentLookupRows = (await sql.query<false, false>(
      `SELECT
         id,
         dni,
         participation,
         centro_found,
         consejo_found,
         centro_mesa,
         consejo_mesa,
         centro_orden,
         consejo_orden,
         anio_ingreso,
         consulted_at::text
       FROM lookup_events
       WHERE ${filterSql}
       ORDER BY consulted_at DESC
       LIMIT 100`,
      params,
    )) as unknown as LookupEventRow[];

    const participationCounts = {
      centro_y_consejo: 0,
      solo_centro: 0,
      solo_consejo: 0,
    };

    for (const row of participationRows) {
      participationCounts[row.participation] = row.count;
    }

    const dayPeak = dailyRows
      .slice()
      .sort((a, b) => b.count - a.count || a.day.localeCompare(b.day))[0];

    const hourPeak = hourlyRows
      .slice()
      .sort((a, b) => b.count - a.count || a.hour - b.hour)[0];

    return {
      range,
      selectedDate,
      generatedAt: new Date().toISOString(),
      summary: {
        totalConsultas: totalRows[0]?.count ?? 0,
        dnisUnicos: uniqueRows[0]?.count ?? 0,
        centroYConsejo: participationCounts.centro_y_consejo,
        soloCentro: participationCounts.solo_centro,
        soloConsejo: participationCounts.solo_consejo,
        diaPico: dayPeak
          ? {
              label: dayPeak.day,
              count: dayPeak.count,
            }
          : null,
        horaPico: hourPeak
          ? {
              label: `${String(hourPeak.hour).padStart(2, "0")}:00`,
              count: hourPeak.count,
            }
          : null,
      },
      participationSeries: [
        {
          key: "centro_y_consejo",
          label: participationLabel("centro_y_consejo"),
          count: participationCounts.centro_y_consejo,
        },
        {
          key: "solo_centro",
          label: participationLabel("solo_centro"),
          count: participationCounts.solo_centro,
        },
        {
          key: "solo_consejo",
          label: participationLabel("solo_consejo"),
          count: participationCounts.solo_consejo,
        },
      ],
      dailySeries: dailyRows.map((row) => ({
        label: row.day,
        count: row.count,
      })),
      hourlySeries: hourlyRows.map((row) => ({
        label: `${String(row.hour).padStart(2, "0")}:00`,
        count: row.count,
      })),
      topDnis: topDniRows.map((row) => ({
        dni: row.dni,
        count: row.count,
        lastConsultedAt: row.last_consulted_at,
      })),
      recentLookups: recentLookupRows.map(mapLookupEventRow),
    };
  });
}
