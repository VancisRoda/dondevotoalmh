import { withDatabase } from "@/lib/db";
import { getTimezone } from "@/lib/env";
import { getTodayDateString, participationLabel } from "@/lib/format";
import { normalizeOptionalText, normalizeWhatsappPhone } from "@/lib/phone";
import type {
  AdminStatsResponse,
  IrregularityFollowup,
  IrregularityReport,
  LookupEvent,
  LookupResponse,
  ReportStatus,
  StatsRange,
} from "@/lib/types";

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
  message: string;
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

function getRangeFilter(range: StatsRange, selectedDate: string) {
  if (range === "total") {
    return {
      sql: "TRUE",
      params: [] as string[],
    };
  }

  if (range === "day") {
    return {
      sql: `timezone('${getTimezone()}', consulted_at)::date = $1::date`,
      params: [selectedDate],
    };
  }

  return {
    sql: `timezone('${getTimezone()}', consulted_at)::date BETWEEN ($1::date - INTERVAL '6 day') AND $1::date`,
    params: [selectedDate],
  };
}

function ensureSelectedDate(value: string | null | undefined): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : getTodayDateString();
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
  fullName?: string;
  email?: string;
  phone?: string;
}): Promise<void> {
  const message = input.message.trim();
  if (!message) {
    throw new Error("Debes ingresar un mensaje.");
  }

  await withDatabase(async (sql) => {
    await sql`
      INSERT INTO irregularity_reports (
        message,
        full_name,
        email,
        phone_raw,
        phone_whatsapp
      ) VALUES (
        ${message},
        ${normalizeOptionalText(input.fullName)},
        ${normalizeOptionalText(input.email)},
        ${normalizeOptionalText(input.phone)},
        ${normalizeWhatsappPhone(input.phone)}
      )
    `;
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

export async function getIrregularityReports(): Promise<IrregularityReport[]> {
  return withDatabase(async (sql) => {
    const reportRows = (await sql.query<false, false>(
      `
      SELECT
        id,
        message,
        full_name,
        email,
        phone_raw,
        phone_whatsapp,
        status,
        created_at,
        updated_at
      FROM irregularity_reports
      ORDER BY created_at DESC
      `,
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
      message: row.message,
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

export async function getAdminStats(
  range: StatsRange,
  selectedDateInput?: string | null,
): Promise<AdminStatsResponse> {
  const selectedDate = ensureSelectedDate(selectedDateInput);
  const { sql: filterSql, params } = getRangeFilter(range, selectedDate);

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
