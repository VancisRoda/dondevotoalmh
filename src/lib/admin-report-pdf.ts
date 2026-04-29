import autoTable from "jspdf-autotable";
import { jsPDF } from "jspdf";

import { formatDateLabel, formatDateTimeLabel, reportStatusLabel } from "@/lib/format";
import type { AdminStatsResponse, IrregularityReport, StatsRange } from "@/lib/types";

function rangeLabel(range: StatsRange, selectedDate: string): string {
  switch (range) {
    case "day":
      return `Día ${formatDateLabel(selectedDate)}`;
    case "week":
      return `Últimos 7 días al ${formatDateLabel(selectedDate)}`;
    default:
      return "Histórico total";
  }
}

export function buildAdminReportPdf(
  stats: AdminStatsResponse,
  reports: IrregularityReport[],
): ArrayBuffer {
  const pdf = new jsPDF({
    format: "a4",
    unit: "mm",
  });

  pdf.setFillColor(0, 107, 9);
  pdf.rect(0, 0, 210, 36, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(20);
  pdf.text("Reporte admin - ¿Dónde voto al MH?", 16, 16);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(rangeLabel(stats.range, stats.selectedDate), 16, 24);
  pdf.text(`Generado ${formatDateTimeLabel(stats.generatedAt)}`, 16, 30);

  pdf.setTextColor(18, 61, 18);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text("Resumen", 16, 46);

  autoTable(pdf, {
    head: [["Métrica", "Valor"]],
    body: [
      ["Consultas totales", String(stats.summary.totalConsultas)],
      ["DNIs únicos", String(stats.summary.dnisUnicos)],
      ["Centro y Consejo", String(stats.summary.centroYConsejo)],
      ["Solo Centro", String(stats.summary.soloCentro)],
      ["Solo Consejo", String(stats.summary.soloConsejo)],
      ["Día pico", stats.summary.diaPico ? `${formatDateLabel(stats.summary.diaPico.label)} (${stats.summary.diaPico.count})` : "Sin datos"],
      ["Hora pico", stats.summary.horaPico ? `${stats.summary.horaPico.label} (${stats.summary.horaPico.count})` : "Sin datos"],
    ],
    margin: { left: 16, right: 16, top: 50 },
    styles: {
      fontSize: 10,
    },
    headStyles: {
      fillColor: [0, 136, 8],
    },
  });

  autoTable(pdf, {
    head: [["Participación", "Consultas"]],
    body: stats.participationSeries.map((item) => [item.label, String(item.count)]),
    startY: (pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY
      ? ((pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 0) + 8
      : 98,
    margin: { left: 16, right: 16 },
    styles: {
      fontSize: 10,
    },
    headStyles: {
      fillColor: [11, 95, 8],
    },
  });

  autoTable(pdf, {
    head: [["Día", "Consultas"]],
    body: stats.dailySeries.map((item) => [formatDateLabel(item.label), String(item.count)]),
    startY: ((pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 0) + 8,
    margin: { left: 16, right: 16 },
    styles: {
      fontSize: 9,
    },
    headStyles: {
      fillColor: [0, 136, 8],
    },
  });

  autoTable(pdf, {
    head: [["Hora", "Consultas"]],
    body: stats.hourlySeries.map((item) => [item.label, String(item.count)]),
    startY: ((pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 0) + 8,
    margin: { left: 16, right: 16 },
    styles: {
      fontSize: 9,
    },
    headStyles: {
      fillColor: [0, 136, 8],
    },
  });

  autoTable(pdf, {
    head: [["DNI", "Cantidad", "Última consulta"]],
    body: stats.topDnis.map((item) => [
      item.dni,
      String(item.count),
      formatDateTimeLabel(item.lastConsultedAt),
    ]),
    startY: ((pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 0) + 8,
    margin: { left: 16, right: 16 },
    styles: {
      fontSize: 9,
    },
    headStyles: {
      fillColor: [11, 95, 8],
    },
  });

  if (reports.length > 0) {
    autoTable(pdf, {
      head: [["Fecha", "Estado", "Contacto", "Mensaje"]],
      body: reports.slice(0, 30).map((report) => [
        formatDateTimeLabel(report.createdAt),
        reportStatusLabel(report.status),
        report.phoneWhatsapp ?? report.email ?? report.fullName ?? "Anónimo",
        report.message,
      ]),
      startY: ((pdf as jsPDF & { lastAutoTable?: { finalY?: number } }).lastAutoTable?.finalY ?? 0) + 8,
      margin: { left: 16, right: 16 },
      styles: {
        fontSize: 8,
      },
      headStyles: {
        fillColor: [0, 136, 8],
      },
    });
  }

  return pdf.output("arraybuffer");
}
