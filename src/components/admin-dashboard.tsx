"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatDateLabel, formatDateTimeLabel, participationLabel, reportStatusLabel } from "@/lib/format";
import type {
  AdminStatsResponse,
  ApiMessageResponse,
  IrregularityReport,
  ReportStatus,
  StatsRange,
} from "@/lib/types";

import styles from "./admin-dashboard.module.css";

const PARTICIPATION_COLORS = ["#0b5f08", "#25a244", "#7bd389"];

const EMPTY_STATS: AdminStatsResponse = {
  range: "day",
  selectedDate: "",
  generatedAt: new Date().toISOString(),
  summary: {
    totalConsultas: 0,
    dnisUnicos: 0,
    centroYConsejo: 0,
    soloCentro: 0,
    soloConsejo: 0,
    diaPico: null,
    horaPico: null,
  },
  participationSeries: [],
  dailySeries: [],
  hourlySeries: [],
  topDnis: [],
  recentLookups: [],
};

interface AdminDashboardProps {
  initialDate: string;
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & ApiMessageResponse;
  if (!response.ok) {
    throw new Error("message" in payload ? payload.message : "Error inesperado.");
  }

  return payload;
}

export function AdminDashboard({ initialDate }: AdminDashboardProps) {
  const [range, setRange] = useState<StatsRange>("day");
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [stats, setStats] = useState<AdminStatsResponse>(EMPTY_STATS);
  const [reports, setReports] = useState<IrregularityReport[]>([]);
  const [error, setError] = useState("");
  const [reportsError, setReportsError] = useState("");
  const [loading, setLoading] = useState(true);
  const [followupDrafts, setFollowupDrafts] = useState<Record<number, string>>({});
  const [isPending, startTransition] = useTransition();

  const loadDashboard = useCallback(async () => {
    setError("");
    setReportsError("");

    const statsUrl = new URL("/api/admin/stats", window.location.origin);
    statsUrl.searchParams.set("range", range);
    if (selectedDate) {
      statsUrl.searchParams.set("date", selectedDate);
    }

    const reportsUrl = new URL("/api/admin/reports", window.location.origin);
    reportsUrl.searchParams.set("range", range);
    if (selectedDate) {
      reportsUrl.searchParams.set("date", selectedDate);
    }

    const [statsResult, reportsResult] = await Promise.allSettled([
      fetch(statsUrl.toString(), { cache: "no-store" }).then((response) =>
        parseJsonOrThrow<AdminStatsResponse>(response),
      ),
      fetch(reportsUrl.toString(), { cache: "no-store" }).then((response) =>
        parseJsonOrThrow<IrregularityReport[]>(response),
      ),
    ]);

    if (statsResult.status === "fulfilled") {
      setStats(statsResult.value);
    } else {
      setStats(EMPTY_STATS);
      setError(
        statsResult.reason instanceof Error
          ? statsResult.reason.message
          : "No pudimos cargar las estadísticas.",
      );
    }

    if (reportsResult.status === "fulfilled") {
      setReports(reportsResult.value);
    } else {
      setReports([]);
      setReportsError(
        reportsResult.reason instanceof Error
          ? reportsResult.reason.message
          : "No pudimos cargar las denuncias.",
      );
    }

    setLoading(false);
  }, [range, selectedDate]);

  useEffect(() => {
    void (async () => {
      await loadDashboard();
      setLoading(false);
    })();
  }, [loadDashboard]);

  const handleLogout = () => {
    startTransition(() => {
      void (async () => {
        await fetch("/api/admin/logout", { method: "POST" });
        window.location.reload();
      })();
    });
  };

  const handleStatusChange = (reportId: number, status: ReportStatus) => {
    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/admin/reports/${reportId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status }),
        });

        await parseJsonOrThrow(response);
        await loadDashboard();
      })().catch((caughtError) => {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "No pudimos actualizar el estado.",
        );
      });
    });
  };

  const handleFollowupSubmit = (reportId: number) => {
    const message = followupDrafts[reportId]?.trim() ?? "";
    if (!message) {
      setError("Debes escribir un seguimiento antes de guardarlo.");
      return;
    }

    startTransition(() => {
      void (async () => {
        const response = await fetch(`/api/admin/reports/${reportId}/followups`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ message }),
        });

        await parseJsonOrThrow(response);
        setFollowupDrafts((current) => ({
          ...current,
          [reportId]: "",
        }));
        await loadDashboard();
      })().catch((caughtError) => {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "No pudimos guardar el seguimiento.",
        );
      });
    });
  };

  const reportPdfUrl = `/api/admin/reports/pdf?range=${range}${
    selectedDate ? `&date=${selectedDate}` : ""
  }`;

  const emptyReportsMessage =
    range === "day"
      ? "No se registran denuncias en el día de hoy."
      : range === "week"
        ? "No se registran denuncias en los últimos 7 días."
        : "Todavía no hay denuncias registradas.";

  return (
    <section className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <span className={styles.kicker}>Panel administrador</span>
          <h1 className={styles.headerTitle}>Estadísticas y denuncias</h1>
          <p className={styles.headerLead}>
            Consultas válidas registradas, actividad por horario y seguimiento de irregularidades.
          </p>
        </div>

        <div className={styles.headerActions}>
          <a className={styles.secondaryButton} href={reportPdfUrl}>
            Descargar PDF
          </a>
          <button className={styles.logoutButton} onClick={handleLogout} type="button">
            {isPending ? "Saliendo..." : "Cerrar sesión"}
          </button>
        </div>
      </header>

      <section className={styles.panel}>
        <div className={styles.controls}>
          <div className={styles.rangeTabs}>
            {([
              ["day", "Día"],
              ["week", "Semana"],
              ["total", "Total"],
            ] as const).map(([value, label]) => (
              <button
                className={`${styles.rangeTab} ${
                  range === value ? styles.rangeTabActive : ""
                }`}
                key={value}
                onClick={() => {
                  setLoading(true);
                  setRange(value);
                }}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>

          <input
            className={styles.dateInput}
            disabled={range === "total"}
            onChange={(event) => {
              setLoading(true);
              setSelectedDate(event.target.value);
            }}
            type="date"
            value={selectedDate}
          />
          <button
            className={styles.secondaryButton}
            onClick={() => {
              setLoading(true);
              void loadDashboard().finally(() => setLoading(false));
            }}
            type="button"
          >
            Refrescar
          </button>
        </div>
      </section>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      {loading ? (
        <div className={styles.empty}>Cargando panel...</div>
      ) : (
        <div className={styles.grid}>
          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Resumen</h2>
            <div className={styles.kpiGrid}>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Consultas</span>
                <strong className={styles.kpiValue}>{stats.summary.totalConsultas}</strong>
              </div>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>DNIs únicos</span>
                <strong className={styles.kpiValue}>{stats.summary.dnisUnicos}</strong>
              </div>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Centro y Consejo</span>
                <strong className={styles.kpiValue}>{stats.summary.centroYConsejo}</strong>
              </div>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Solo Centro</span>
                <strong className={styles.kpiValue}>{stats.summary.soloCentro}</strong>
              </div>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Solo Consejo</span>
                <strong className={styles.kpiValue}>{stats.summary.soloConsejo}</strong>
              </div>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Día pico</span>
                <strong className={styles.kpiValue}>
                  {stats.summary.diaPico
                    ? formatDateLabel(stats.summary.diaPico.label)
                    : "Sin datos"}
                </strong>
                <span className={styles.subtle}>
                  {stats.summary.diaPico ? `${stats.summary.diaPico.count} consultas` : ""}
                </span>
              </div>
              <div className={styles.kpiCard}>
                <span className={styles.kpiLabel}>Hora pico</span>
                <strong className={styles.kpiValue}>
                  {stats.summary.horaPico?.label ?? "Sin datos"}
                </strong>
                <span className={styles.subtle}>
                  {stats.summary.horaPico ? `${stats.summary.horaPico.count} consultas` : ""}
                </span>
              </div>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Gráficos</h2>
            <div className={styles.chartGrid}>
              <article className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Consultas por día</h3>
                <ResponsiveContainer height={240} width="100%">
                  <LineChart data={stats.dailySeries}>
                    <CartesianGrid stroke="rgba(100,100,100,0.12)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tickFormatter={formatDateLabel} />
                    <YAxis allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [String(value), "Consultas"]}
                      labelFormatter={(value) => formatDateLabel(String(value))}
                    />
                    <Line dataKey="count" dot={false} stroke="#008808" strokeWidth={3} type="monotone" />
                  </LineChart>
                </ResponsiveContainer>
              </article>

              <article className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Horarios de consulta</h3>
                <ResponsiveContainer height={240} width="100%">
                  <BarChart data={stats.hourlySeries}>
                    <CartesianGrid stroke="rgba(100,100,100,0.12)" strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis allowDecimals={false} />
                    <Tooltip formatter={(value) => [String(value), "Consultas"]} />
                    <Bar dataKey="count" fill="#0b5f08" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </article>

              <article className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Participación</h3>
                <ResponsiveContainer height={240} width="100%">
                  <PieChart>
                    <Pie
                      cx="50%"
                      cy="50%"
                      data={stats.participationSeries}
                      dataKey="count"
                      nameKey="label"
                      outerRadius={80}
                    >
                      {stats.participationSeries.map((entry, index) => (
                        <Cell
                          fill={PARTICIPATION_COLORS[index % PARTICIPATION_COLORS.length]}
                          key={entry.key}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [String(value), "Consultas"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </article>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Top DNIs consultados</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>DNI</th>
                    <th>Consultas</th>
                    <th>Última consulta</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topDnis.map((item) => (
                    <tr key={item.dni}>
                      <td>{item.dni}</td>
                      <td>{item.count}</td>
                      <td>{formatDateTimeLabel(item.lastConsultedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Actividad</h2>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>DNI</th>
                    <th>Resultado</th>
                    <th>Mesa</th>
                    <th>Fecha y hora</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentLookups.map((item) => (
                    <tr key={item.id}>
                      <td>{item.dni}</td>
                      <td>{participationLabel(item.participation)}</td>
                      <td>{item.centroMesa ?? item.consejoMesa ?? "-"}</td>
                      <td>{formatDateTimeLabel(item.consultedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={styles.panel}>
            <h2 className={styles.panelTitle}>Denuncias</h2>
            {reportsError ? (
              <div className={styles.errorBox}>{reportsError}</div>
            ) : reports.length === 0 ? (
              <div className={styles.empty}>{emptyReportsMessage}</div>
            ) : (
              <div className={styles.reportsGrid}>
                {reports.map((report) => (
                  <article className={styles.reportCard} key={report.id}>
                    <div className={styles.reportTop}>
                      <div className={styles.reportMeta}>
                        <span className={styles.kicker}>
                          Denuncia #{report.id} · {formatDateTimeLabel(report.createdAt)}
                        </span>
                        <span className={styles.statusBadge}>
                          {reportStatusLabel(report.status)}
                        </span>
                      </div>
                    </div>

                    <p className={styles.reportMessage}>{report.message}</p>

                    <div className={styles.contactRow}>
                      {report.dni ? <span className={styles.chip}>DNI {report.dni}</span> : null}
                      {report.fullName ? <span className={styles.chip}>{report.fullName}</span> : null}
                      {report.email ? <span className={styles.chip}>{report.email}</span> : null}
                      {report.phoneRaw ? <span className={styles.chip}>{report.phoneRaw}</span> : null}
                      {report.phoneWhatsapp ? (
                        <a
                          className={styles.waButton}
                          href={`https://wa.me/${report.phoneWhatsapp}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Contactar por WhatsApp
                        </a>
                      ) : null}
                    </div>

                    <div className={styles.statusRow}>
                      <select
                        className={styles.select}
                        onChange={(event) =>
                          handleStatusChange(report.id, event.target.value as ReportStatus)
                        }
                        value={report.status}
                      >
                        <option value="new">Nueva</option>
                        <option value="in_progress">En seguimiento</option>
                        <option value="closed">Cerrada</option>
                      </select>
                    </div>

                    <div className={styles.followups}>
                      {report.followups.map((followup) => (
                        <div className={styles.followupItem} key={followup.id}>
                          <div className={styles.followupHeader}>
                            {formatDateTimeLabel(followup.createdAt)}
                          </div>
                          <p className={styles.followupMessage}>{followup.message}</p>
                        </div>
                      ))}
                    </div>

                    <div className={styles.followupForm}>
                      <textarea
                        onChange={(event) =>
                          setFollowupDrafts((current) => ({
                            ...current,
                            [report.id]: event.target.value,
                          }))
                        }
                        placeholder="Escribí el seguimiento realizado..."
                        value={followupDrafts[report.id] ?? ""}
                      />
                      <button
                        className={styles.primaryButton}
                        onClick={() => handleFollowupSubmit(report.id)}
                        type="button"
                      >
                        Guardar seguimiento
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </section>
  );
}
