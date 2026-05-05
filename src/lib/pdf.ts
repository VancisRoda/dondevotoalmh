import { jsPDF } from "jspdf";

import { getCentroDistributionForLookup } from "@/lib/mesa-distribution";
import type { LookupResponse } from "@/lib/types";

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
  const mesaLocationLine = centroDistribution
    ? `Mesa ${displayMesa}, ${centroDistribution.rule.location}`
    : `Mesa ${displayMesa}`;

  let currentY = 68 + introLines.length * 6 + 8;

  pdf.setFillColor(245, 247, 242);
  pdf.roundedRect(16, currentY, 178, 32, 4, 4, "F");
  pdf.setTextColor(18, 61, 18);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(14);
  pdf.text(mesaLocationLine, 22, currentY + 9);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(11);
  pdf.text(`Apellido y nombre: ${displayName}`, 22, currentY + 18);
  pdf.text(`Año de ingreso: ${displayYear}`, 22, currentY + 25);

  currentY += 42;
  if (result.centro) {
    currentY = drawOrderBlock(pdf, "Centro de Estudiantes", result.centro.orden, currentY);
  }

  if (result.consejo) {
    currentY = drawOrderBlock(pdf, "Consejo Directivo", result.consejo.orden, currentY);
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
