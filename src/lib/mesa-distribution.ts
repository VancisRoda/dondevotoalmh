import distributionRulesData from "../../data/mesa_distribucion_centro.json";

import type { LookupResponse, VoteRecord } from "@/lib/types";

export interface MesaDistributionRule {
  mesa: string;
  description: string;
  location: string;
  yearStart: number;
  yearEnd: number;
  letterStart?: string;
  letterEnd?: string;
}

export interface MesaDistributionMatch {
  rule: MesaDistributionRule;
  recordedMesa: string;
  matchesRecordedMesa: boolean;
}

const DISTRIBUTION_RULES = distributionRulesData as MesaDistributionRule[];

function normalizeAsciiUpper(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Mark}/gu, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

function getApellidoInitial(nombre: string): string | null {
  const normalized = normalizeAsciiUpper(nombre);
  for (const char of normalized) {
    if (char >= "A" && char <= "Z") {
      return char;
    }
  }

  return null;
}

export function getMesaDistributionRules(): MesaDistributionRule[] {
  return DISTRIBUTION_RULES;
}

export function getMesaDistributionForRecord(
  record: Pick<VoteRecord, "anioIngreso" | "mesa" | "nombre">,
): MesaDistributionMatch | null {
  const year = Number.parseInt(record.anioIngreso, 10);
  if (!Number.isFinite(year)) {
    return null;
  }

  const initial = getApellidoInitial(record.nombre);
  const rule = DISTRIBUTION_RULES.find((candidate) => {
    if (year < candidate.yearStart || year > candidate.yearEnd) {
      return false;
    }

    if (candidate.letterStart && candidate.letterEnd) {
      if (!initial) {
        return false;
      }

      return initial >= candidate.letterStart && initial <= candidate.letterEnd;
    }

    return true;
  });

  if (!rule) {
    return null;
  }

  return {
    rule,
    recordedMesa: record.mesa,
    matchesRecordedMesa: record.mesa === rule.mesa,
  };
}

export function getCentroDistributionForLookup(
  result: LookupResponse,
): MesaDistributionMatch | null {
  if (!result.centro) {
    return null;
  }

  return getMesaDistributionForRecord(result.centro);
}

export function distributionSummaryLabel(match: MesaDistributionMatch): string {
  return `Mesa ${match.rule.mesa} - ${match.rule.location}`;
}

export function distributionStatusMessage(match: MesaDistributionMatch): string {
  if (match.matchesRecordedMesa) {
    return (
      `Según el año de ingreso y la inicial del apellido, la distribución oficial ` +
      `te ubica en la mesa ${match.rule.mesa}, ${match.rule.location}.`
    );
  }

  return (
    `Según la distribución oficial te corresponde la mesa ${match.rule.mesa}, ` +
    `${match.rule.location}. En el padrón cargado figura la mesa ${match.recordedMesa}.`
  );
}
