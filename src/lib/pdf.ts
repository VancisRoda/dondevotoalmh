import { jsPDF } from "jspdf";

import { getCentroDistributionForLookup } from "@/lib/mesa-distribution";
import type { IrregularityReportReceipt, LookupResponse } from "@/lib/types";

function drawOrderBlock(
  pdf: jsPDF,
  title: string,
  orden: string,
  startY: number,
): number {
  pdf.setFillColor(0, 136, 8);
  pdf.roundedRect(16, startY, 178, 12, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(13);
  pdf.text(title, 22, startY + 8);

  const detailLines = [`Número de orden: ${orden}`];

  let currentY = startY + 20;
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(18, 61, 18);
  pdf.setFontSize(11);

  for (const line of detailLines) {
    const wrapped = pdf.splitTextToSize(line, 166);
    pdf.text(wrapped, 22, currentY);
    currentY += wrapped.length * 6;
  }

  return currentY + 6;
}

function participationMessage(result: LookupResponse): string {
  switch (result.participation) {
    case "centro_y_consejo":
      return "Este 6 de mayo de 8 a 18hs participás en las elecciones del Centro de Estudiantes y Consejo Directivo de la Facultad. ¡Te esperamos!";
    case "solo_centro":
      return "Este 6 de mayo de 8 a 18hs participás en las elecciones del Centro de Estudiantes de la Facultad. ¡Te esperamos!";
    case "solo_consejo":
      return "Este 6 de mayo de 8 a 18hs participás en las elecciones del Consejo Directivo de la Facultad. ¡Te esperamos!";
    default:
      return "No encontramos ese DNI en el padrón definitivo.";
  }
}

export function downloadLookupPdf(result: LookupResponse): void {
  if (result.participation === "no_encontrado") {
    return;
  }

  const pdf = new jsPDF({
    format: "a4",
    unit: "mm",
  });

  pdf.setFillColor(0, 107, 9);
  pdf.rect(0, 0, 210, 44, "F");

  pdf.setDrawColor(255, 255, 255, 0.15);
  for (let x = 12; x < 210; x += 18) {
    pdf.line(x, 0, x, 44);
  }
  for (let y = 6; y < 44; y += 10) {
    pdf.line(0, y, 210, y);
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(26);
  pdf.text("¿DÓNDE VOTO AL MH?", 16, 20);

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text("Consulta del padrón definitivo", 16, 30);

  pdf.setTextColor(18, 61, 18);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text(`DNI consultado: ${result.dni}`, 16, 58);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const introLines = pdf.splitTextToSize(participationMessage(result), 178);
  pdf.text(introLines, 16, 68);

  const displayName = result.centro?.nombre ?? result.consejo?.nombre ?? "";
  const displayYear = result.centro?.anioIngreso ?? result.consejo?.anioIngreso ?? "";
  const displayMesa = result.centro?.mesa ?? result.consejo?.mesa ?? "";
  const centroDistribution = getCentroDistributionForLookup(result);
  const mesaLocationLines = centroDistribution
    ? [
        `Mesa ${displayMesa}, ${centroDistribution.rule.location.split(", ")[0]}`,
        centroDistribution.rule.location.split(", ").slice(1).join(", "),
      ].filter(Boolean)
    : [`Mesa ${displayMesa}`];

  let currentY = 68 + introLines.length * 6 + 8;
  const summaryHeight = 16 + mesaLocationLines.length * 7 + 8;

  pdf.setFillColor(245, 247, 242);
  pdf.roundedRect(16, currentY, 178, summaryHeight, 4, 4, "F");
  pdf.setTextColor(18, 61, 18);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(mesaLocationLines, 22, currentY + 10);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const detailsStartY = currentY + 10 + mesaLocationLines.length * 7 + 2;
  pdf.text(`Apellido y nombre: ${displayName}`, 22, detailsStartY);
  pdf.text(`Año de ingreso: ${displayYear}`, 22, detailsStartY + 7);

  currentY += summaryHeight + 10;
  if (result.centro) {
    currentY = drawOrderBlock(
      pdf,
      "Centro de Estudiantes",
      result.centro.orden,
      currentY,
    );
  }

  if (result.consejo) {
    currentY = drawOrderBlock(
      pdf,
      "Consejo Directivo",
      result.consejo.orden,
      currentY,
    );
  }

  pdf.setDrawColor(0, 136, 8);
  pdf.line(16, currentY + 4, 194, currentY + 4);
  pdf.setTextColor(70, 70, 70);
  pdf.setFontSize(10);
  pdf.text(`Generado el ${new Date().toLocaleString("es-AR")}`, 16, currentY + 12);

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `donde-voto-mh-${result.dni}.pdf`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadIrregularityReceiptPdf(
  receipt: IrregularityReportReceipt,
): void {
  const pdf = new jsPDF({
    format: "a4",
    unit: "mm",
  });

  pdf.setFillColor(0, 107, 9);
  pdf.rect(0, 0, 210, 44, "F");

  pdf.setDrawColor(255, 255, 255, 0.15);
  for (let x = 12; x < 210; x += 18) {
    pdf.line(x, 0, x, 44);
  }
  for (let y = 6; y < 44; y += 10) {
    pdf.line(0, y, 210, y);
  }

  pdf.setTextColor(255, 255, 255);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(24);
  pdf.text("COMPROBANTE DE DENUNCIA", 16, 20);

  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.text("Movimiento Humanista - Sistema de denuncias", 16, 30);

  pdf.setTextColor(18, 61, 18);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.text(`Denuncia N° ${receipt.publicCode}`, 16, 58);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(`Fecha de registro: ${new Date(receipt.createdAt).toLocaleString("es-AR")}`, 16, 68);

  const detailLines = [
    `DNI: ${receipt.dni || "No informado"}`,
    `Nombre completo: ${receipt.fullName || "No informado"}`,
    `Mail: ${receipt.email || "No informado"}`,
    `Teléfono: ${receipt.phoneRaw || "No informado"}`,
  ];

  let currentY = 82;
  pdf.setFillColor(245, 247, 242);
  pdf.roundedRect(16, currentY, 178, 38, 4, 4, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.text("Datos de la denuncia", 22, currentY + 9);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);

  let detailY = currentY + 18;
  for (const line of detailLines) {
    pdf.text(line, 22, detailY);
    detailY += 6;
  }

  currentY += 50;
  pdf.setFillColor(0, 136, 8);
  pdf.roundedRect(16, currentY, 178, 12, 2, 2, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(13);
  pdf.text("Mensaje informado", 22, currentY + 8);

  pdf.setTextColor(18, 61, 18);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  const wrappedMessage = pdf.splitTextToSize(receipt.message, 166);
  pdf.text(wrappedMessage, 22, currentY + 20);

  const footerY = currentY + 20 + wrappedMessage.length * 6 + 10;
  pdf.setDrawColor(0, 136, 8);
  pdf.line(16, footerY, 194, footerY);
  pdf.setTextColor(70, 70, 70);
  pdf.setFontSize(10);
  pdf.text(
    "Conservá este comprobante para cualquier seguimiento posterior.",
    16,
    footerY + 8,
  );

  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `denuncia-mh-${receipt.publicCode}.pdf`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
