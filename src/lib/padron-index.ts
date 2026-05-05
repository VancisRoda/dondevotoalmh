import { readFileSync } from "node:fs";
import path from "node:path";

import type { LookupResponse, PadronStats, VoteRecord } from "@/lib/types";

type PadronKind = "centro" | "consejo";

interface PadronIndex {
  centro: Map<string, VoteRecord>;
  consejo: Map<string, VoteRecord>;
  stats: PadronStats;
}

interface LoadedPadron {
  index: Map<string, VoteRecord>;
  rows: number;
}

let cachedIndex: PadronIndex | null = null;

const DATA_FILES: Record<PadronKind, string> = {
  centro: "padron_centro_desde_txt.csv",
  consejo: "padron_consejo_final.csv",
};

function sanitizePadronText(value: string): string {
  return value.replace(/\u0092/g, "'").replace(/\s+/g, " ").trim();
}

function parseCsvLine(line: string): string[] {
  const columns: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      columns.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  columns.push(current.trim());
  return columns;
}

function buildRecord(columns: string[]): VoteRecord | null {
  if (columns.length < 5) {
    return null;
  }

  const [orden, anioIngreso, nombre, dni, mesa] = columns;
  const normalizedDni = normalizeDni(dni);

  if (!isValidDni(normalizedDni)) {
    return null;
  }

  return {
    nombre: sanitizePadronText(nombre),
    orden: sanitizePadronText(orden),
    mesa: sanitizePadronText(mesa),
    anioIngreso: sanitizePadronText(anioIngreso),
    dni: normalizedDni,
  };
}

function loadPadron(kind: PadronKind): LoadedPadron {
  const filePath = path.join(process.cwd(), "data", DATA_FILES[kind]);
  const rawCsv = readFileSync(filePath, "utf-8");
  const rows = rawCsv.split(/\r?\n/).slice(1);
  const index = new Map<string, VoteRecord>();
  let rowCount = 0;

  for (const rawRow of rows) {
    const row = rawRow.trim();
    if (!row) {
      continue;
    }

    rowCount += 1;

    const record = buildRecord(parseCsvLine(row));
    if (!record) {
      continue;
    }

    index.set(record.dni, record);
  }

  return {
    index,
    rows: rowCount,
  };
}

function computeStats(
  centro: LoadedPadron,
  consejo: LoadedPadron,
): PadronStats {
  let ambos = 0;

  for (const dni of centro.index.keys()) {
    if (consejo.index.has(dni)) {
      ambos += 1;
    }
  }

  return {
    centro: centro.rows,
    consejo: consejo.rows,
    ambos,
    soloCentro: centro.rows - ambos,
    soloConsejo: consejo.rows - ambos,
  };
}

function getIndex(): PadronIndex {
  if (cachedIndex) {
    return cachedIndex;
  }

  const centro = loadPadron("centro");
  const consejo = loadPadron("consejo");

  cachedIndex = {
    centro: centro.index,
    consejo: consejo.index,
    stats: computeStats(centro, consejo),
  };

  return cachedIndex;
}

export function normalizeDni(rawDni: string): string {
  return rawDni.replace(/\D/g, "");
}

export function isValidDni(dni: string): boolean {
  return /^\d{7,8}$/.test(dni);
}

export function getPadronStats(): PadronStats {
  return getIndex().stats;
}

export function lookupDni(rawDni: string): LookupResponse {
  const dni = normalizeDni(rawDni);
  const { centro, consejo } = getIndex();

  const centroRecord = centro.get(dni);
  const consejoRecord = consejo.get(dni);

  if (centroRecord && consejoRecord) {
    return {
      dni,
      participation: "centro_y_consejo",
      centro: centroRecord,
      consejo: consejoRecord,
    };
  }

  if (centroRecord) {
    return {
      dni,
      participation: "solo_centro",
      centro: centroRecord,
    };
  }

  if (consejoRecord) {
    return {
      dni,
      participation: "solo_consejo",
      consejo: consejoRecord,
    };
  }

  return {
    dni,
    participation: "no_encontrado",
  };
}
