#!/usr/bin/env python3
"""
Normaliza un padron de centro desde un TXT exportado/OCR y genera un CSV final.

Uso rapido:
    python .tools/normalize_padron_centro.py archivo.txt

Opcionalmente:
    python .tools/normalize_padron_centro.py archivo.txt -o data/padron_centro_nuevo.csv
    python .tools/normalize_padron_centro.py archivo.txt --no-mesa
"""

from __future__ import annotations

import argparse
import csv
import re
import sys
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path


HEADER_PATTERNS = (
    "UNIVERSIDAD NACIONAL DE TUCUMAN",
    "UNIVERSIDAD NACIONAL DE TUCUMÁN",
    "ELECCIONES DE RENOVACION",
    "ELECCIONES DE RENOVACIÓN",
    "CENTRO UNICO DE ESTUDIANTES",
    "CENTRO ÚNICO DE ESTUDIANTES",
    "FACULTAD DE DERECHO Y CS. SOCIALES",
    "FACULTAD DE DERECHO Y CIENCIAS SOCIALES",
)

HEADER_EXACT = {
    "N°",
    "Nº",
    "ORDEN",
    "AÑO DE",
    "ANO DE",
    "INGRESO",
    "APELLIDO Y",
    "NOMBRE",
    "DNI",
    "OBSERVACIONES",
    "FIRMA",
    "NOMBRE DNI OBSERVACIONES FIRMA",
    "DNI OBSERVACIONES FIRMA",
    "OBSERVACIONES FIRMA",
}

START_RE = re.compile(r"^(\d{1,6})\s+((?:19|20)\d{2})(?:\s+(.*))?$")
DNI_AT_END_RE = re.compile(r"^(.*?)(\d[\d\.\-\s]{5,})$")


@dataclass
class SourceRecord:
    source_order: int
    year: int
    name: str
    dni: str


def strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value)
    return "".join(char for char in normalized if unicodedata.category(char) != "Mn")


def clean_spaces(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def normalize_for_compare(value: str) -> str:
    return clean_spaces(strip_accents(value).upper())


def is_header_line(line: str) -> bool:
    normalized = normalize_for_compare(line)
    if not normalized:
        return True
    if normalized in HEADER_EXACT:
        return True
    if normalized.startswith("SOCIALES") and "ANO" in normalized:
        return True
    if (
        "INGRESO" in normalized
        and "APELLIDO Y" in normalized
        and "NOMBRE" in normalized
        and "DNI" in normalized
    ):
        return True
    return any(pattern in normalized for pattern in HEADER_PATTERNS)


def extract_dni(fragment: str) -> str | None:
    digits = re.sub(r"\D", "", fragment)
    if re.fullmatch(r"\d{7,8}", digits):
        return digits
    return None


def extract_dni_relaxed(fragment: str) -> str | None:
    digits = re.sub(r"\D", "", fragment)
    if 7 <= len(digits) <= 12:
        return digits
    return None


def normalize_dni_value(raw_dni: str) -> tuple[str, str | None]:
    digits = re.sub(r"\D", "", raw_dni)
    if re.fullmatch(r"\d{7,8}", digits):
        return digits, None

    if len(digits) == 11 and digits[:2] in {"20", "23", "24", "27", "30", "33", "34"}:
        return digits[2:10], f"CUIL detectado: {digits} -> {digits[2:10]}"

    if len(digits) == 10 and digits[:2] in {"20", "23", "24", "27", "30", "33", "34"}:
        return digits[2:10], f"Prefijo tipo CUIL detectado: {digits} -> {digits[2:10]}"

    if len(digits) == 9:
        return digits[:8], f"DNI de 9 digitos recortado: {digits} -> {digits[:8]}"

    if len(digits) > 8:
        return digits[:8], f"DNI largo recortado: {digits} -> {digits[:8]}"

    return digits, f"DNI corto o invalido conservado: {digits}"


def try_finish_record(parts: list[str]) -> tuple[str, str] | None:
    if not parts:
        return None

    joined = clean_spaces(" ".join(parts))
    match = DNI_AT_END_RE.match(joined)
    if not match:
        return None

    possible_name, possible_dni = match.groups()
    dni = extract_dni(possible_dni)
    if not dni:
        return None

    name = clean_spaces(possible_name)
    if not name:
        return None

    return name, dni


def try_finish_record_fallback(parts: list[str]) -> tuple[str, str] | None:
    tokens = clean_spaces(" ".join(parts)).split(" ")
    if not tokens:
        return None

    dni_indexes: list[int] = []
    dni_values: list[str] = []

    for index, token in enumerate(tokens):
        dni = extract_dni_relaxed(token)
        if dni:
            dni_indexes.append(index)
            dni_values.append(dni)

    if len(dni_values) != 1:
        return None

    name_tokens = [token for index, token in enumerate(tokens) if index not in dni_indexes]
    name = clean_spaces(" ".join(name_tokens))
    if not name:
        return None

    return name, dni_values[0]


def parse_source_txt(raw_text: str) -> list[SourceRecord]:
    records: list[SourceRecord] = []
    current_order: int | None = None
    current_year: int | None = None
    current_parts: list[str] = []

    lines = [clean_spaces(line) for line in raw_text.splitlines()]

    for raw_line in lines:
        if not raw_line or is_header_line(raw_line):
            continue

        start_match = START_RE.match(raw_line)
        if start_match:
            if current_order is not None:
                parsed = try_finish_record(current_parts) or try_finish_record_fallback(current_parts)
                if not parsed:
                    raise ValueError(
                        f"Registro incompleto antes del orden {start_match.group(1)}: "
                        f"{current_order}"
                    )
                name, dni = parsed
                records.append(
                    SourceRecord(
                        source_order=current_order,
                        year=current_year or 0,
                        name=name,
                        dni=dni,
                    )
                )

            current_order = int(start_match.group(1))
            current_year = int(start_match.group(2))
            current_parts = []
            trailing = clean_spaces(start_match.group(3) or "")
            if trailing:
                current_parts.append(trailing)
            continue

        if current_order is None:
            continue

        current_parts.append(raw_line)

    if current_order is not None:
        parsed = try_finish_record(current_parts) or try_finish_record_fallback(current_parts)
        if not parsed:
            raise ValueError(f"Registro incompleto al final del archivo: {current_order}")
        name, dni = parsed
        records.append(
            SourceRecord(
                source_order=current_order,
                year=current_year or 0,
                name=name,
                dni=dni,
            )
        )

    return records


def load_mesa_template(template_path: Path) -> list[tuple[str, int]]:
    with template_path.open("r", encoding="utf-8-sig", newline="") as handle:
        rows = list(csv.DictReader(handle))

    counter = Counter(row["mesa de votación"].strip() for row in rows if row.get("mesa de votación"))
    mesas = sorted(counter.items(), key=lambda item: int(item[0]))
    if not mesas:
        raise ValueError(f"No se pudieron leer mesas desde {template_path}")
    return mesas


def build_mesa_values(total_rows: int, mesa_blocks: list[tuple[str, int]]) -> list[str]:
    template_total = sum(count for _, count in mesa_blocks)
    mesas: list[str] = []
    for mesa, count in mesa_blocks:
        remaining = total_rows - len(mesas)
        if remaining <= 0:
            break
        mesas.extend([mesa] * min(count, remaining))

    if len(mesas) < total_rows:
        last_mesa = mesa_blocks[-1][0]
        mesas.extend([last_mesa] * (total_rows - len(mesas)))

    if len(mesas) != total_rows:
        raise ValueError("No se pudieron asignar mesas para todos los registros")

    return mesas


def default_output_path(input_path: Path) -> Path:
    return input_path.with_name(f"{input_path.stem}_normalizado.csv")


def write_csv(
    output_path: Path,
    records: list[SourceRecord],
    mesa_values: list[str] | None,
) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    with output_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.writer(handle)
        writer.writerow(
            [
                "Nº de orden",
                "año de ingreso",
                "apellido y nombre",
                "dni",
                "mesa de votación",
            ]
        )

        for index, record in enumerate(records, start=1):
            writer.writerow(
                [
                    index,
                    record.year,
                    clean_spaces(record.name),
                    normalize_dni_value(record.dni)[0],
                    "" if mesa_values is None else mesa_values[index - 1],
                ]
            )


def build_parser() -> argparse.ArgumentParser:
    repo_root = Path(__file__).resolve().parent.parent
    parser = argparse.ArgumentParser(
        description=(
            "Normaliza un TXT de padron centro y genera un CSV listo para usar."
        )
    )
    parser.add_argument("input_txt", type=Path, help="TXT de entrada")
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        help="CSV de salida. Si no se indica, se genera junto al TXT.",
    )
    parser.add_argument(
        "--mesa-template",
        type=Path,
        default=repo_root / "data" / "Padron_centro_final.csv",
        help="CSV usado como plantilla para repartir mesas",
    )
    parser.add_argument(
        "--no-mesa",
        action="store_true",
        help="Genera el CSV sin completar la columna de mesa de votacion",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    input_path: Path = args.input_txt.resolve()
    output_path = (args.output or default_output_path(input_path)).resolve()

    raw_text = input_path.read_text(encoding="utf-8-sig", errors="replace")
    records = parse_source_txt(raw_text)
    if not records:
        raise ValueError("No se encontro ningun registro en el TXT")

    warnings: list[str] = []
    normalized_records: list[SourceRecord] = []
    for record in records:
        normalized_dni, warning = normalize_dni_value(record.dni)
        if warning:
            warnings.append(
                f"orden fuente {record.source_order}: {record.name} | {warning}"
            )
        normalized_records.append(
            SourceRecord(
                source_order=record.source_order,
                year=record.year,
                name=record.name,
                dni=normalized_dni,
            )
        )

    records = normalized_records

    records.sort(
        key=lambda record: (
            record.year,
            normalize_for_compare(record.name),
            record.dni,
            record.source_order,
        )
    )

    mesa_values: list[str] | None = None
    if not args.no_mesa:
        mesa_values = build_mesa_values(
            total_rows=len(records),
            mesa_blocks=load_mesa_template(args.mesa_template.resolve()),
        )

    write_csv(output_path, records, mesa_values)

    print(f"Registros procesados: {len(records)}")
    if mesa_values is None:
        print("Mesas: no asignadas")
    else:
        print(f"Mesas: asignadas usando {args.mesa_template}")
    if warnings:
        print(f"Avisos de normalizacion DNI: {len(warnings)}")
    print(f"Salida: {output_path}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:  # pragma: no cover
        print(f"Error: {exc}", file=sys.stderr)
        raise SystemExit(1)
