#!/usr/bin/env python3
"""
Compara dos CSV de padron centro y resume cambios relevantes.

Uso:
    python .tools/compare_padron_centro_csv.py
    python .tools/compare_padron_centro_csv.py --old data/Padron_centro_final.csv --new data/padron_centro_desde_txt.csv
"""

from __future__ import annotations

import argparse
import csv
import json
import unicodedata
from collections import Counter
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class MesaRule:
    mesa: str
    description: str
    location: str
    year_start: int
    year_end: int
    letter_start: str | None = None
    letter_end: str | None = None


def load_rules(path: Path) -> list[MesaRule]:
    data = json.loads(path.read_text(encoding="utf-8"))
    return [
        MesaRule(
            mesa=item["mesa"],
            description=item["description"],
            location=item["location"],
            year_start=item["yearStart"],
            year_end=item["yearEnd"],
            letter_start=item.get("letterStart"),
            letter_end=item.get("letterEnd"),
        )
        for item in data
    ]


def normalize_ascii_upper(value: str) -> str:
    normalized = unicodedata.normalize("NFD", value.upper())
    without_marks = "".join(
        char for char in normalized if unicodedata.category(char) != "Mn"
    )
    return " ".join(without_marks.split())


def apellido_initial(nombre: str) -> str | None:
    for char in normalize_ascii_upper(nombre):
        if "A" <= char <= "Z":
            return char
    return None


def expected_mesa(row: dict[str, str], rules: list[MesaRule]) -> MesaRule | None:
    year = int(row["año de ingreso"])
    initial = apellido_initial(row["apellido y nombre"])

    for rule in rules:
        if not (rule.year_start <= year <= rule.year_end):
            continue
        if rule.letter_start and rule.letter_end:
            if initial is None:
                return None
            if rule.letter_start <= initial <= rule.letter_end:
                return rule
            continue
        return rule

    return None


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def summarize_distribution(
    label: str,
    rows: list[dict[str, str]],
    rules: list[MesaRule],
) -> None:
    mismatches: list[tuple[dict[str, str], MesaRule | None]] = []
    for row in rows:
        rule = expected_mesa(row, rules)
        if rule is None or row["mesa de votación"].strip() != rule.mesa:
            mismatches.append((row, rule))

    print(f"\nValidacion de distribucion: {label}")
    print(f"- filas revisadas: {len(rows)}")
    print(f"- inconsistencias contra la regla oficial: {len(mismatches)}")
    for row, rule in mismatches[:10]:
        expected = "sin regla" if rule is None else f"mesa {rule.mesa} ({rule.location})"
        print(
            "  * "
            f"DNI {row['dni']} | {row['apellido y nombre']} | ingreso {row['año de ingreso']} "
            f"| padron mesa {row['mesa de votación']} | esperado {expected}"
        )


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent

    parser = argparse.ArgumentParser(description="Compara dos CSV de padron centro")
    parser.add_argument(
        "--old",
        type=Path,
        default=repo_root / "data" / "Padron_centro_final.csv",
        help="CSV base/original",
    )
    parser.add_argument(
        "--new",
        type=Path,
        default=repo_root / "data" / "padron_centro_desde_txt.csv",
        help="CSV nuevo/normalizado",
    )
    parser.add_argument(
        "--rules",
        type=Path,
        default=repo_root / "data" / "mesa_distribucion_centro.json",
        help="JSON con reglas oficiales de distribucion",
    )
    args = parser.parse_args()

    old_rows = load_rows(args.old.resolve())
    new_rows = load_rows(args.new.resolve())
    rules = load_rules(args.rules.resolve())

    old_by_dni = {row["dni"]: row for row in old_rows}
    new_by_dni = {row["dni"]: row for row in new_rows}
    old_dnis = set(old_by_dni)
    new_dnis = set(new_by_dni)

    added = sorted(new_dnis - old_dnis)
    removed = sorted(old_dnis - new_dnis)

    changed_by_field = Counter()
    non_order_changes: list[tuple[str, dict[str, tuple[str, str]]]] = []
    order_shift_count = 0
    max_shift = 0

    for dni in sorted(old_dnis & new_dnis):
        old_row = old_by_dni[dni]
        new_row = new_by_dni[dni]
        diff = {
            key: (old_row[key], new_row[key])
            for key in old_row
            if old_row[key] != new_row[key]
        }
        if not diff:
            continue

        for key in diff:
            changed_by_field[key] += 1

        if "Nº de orden" in diff:
            order_shift_count += 1
            max_shift = max(
                max_shift,
                abs(int(diff["Nº de orden"][0]) - int(diff["Nº de orden"][1])),
            )

        filtered_diff = {key: value for key, value in diff.items() if key != "Nº de orden"}
        if filtered_diff:
            non_order_changes.append((dni, filtered_diff))

    print("Comparacion de padrones centro")
    print(f"- base: {args.old}")
    print(f"- nuevo: {args.new}")
    print(f"- filas base: {len(old_rows)}")
    print(f"- filas nuevas: {len(new_rows)}")
    print(f"- DNIs agregados: {len(added)}")
    for dni in added:
        row = new_by_dni[dni]
        print(
            "  * "
            f"{dni} | {row['apellido y nombre']} | ingreso {row['año de ingreso']} "
            f"| mesa {row['mesa de votación']} | orden {row['Nº de orden']}"
        )
    print(f"- DNIs removidos: {len(removed)}")
    for dni in removed:
        row = old_by_dni[dni]
        print(
            "  * "
            f"{dni} | {row['apellido y nombre']} | ingreso {row['año de ingreso']} "
            f"| mesa {row['mesa de votación']} | orden {row['Nº de orden']}"
        )
    print(f"- filas compartidas con cambio de orden: {order_shift_count}")
    print(f"- mayor desplazamiento de orden: {max_shift}")
    print(f"- cambios por campo: {dict(changed_by_field)}")
    print(f"- cambios fuera del numero de orden: {len(non_order_changes)}")
    for dni, diff in non_order_changes:
        print(f"  * {dni}: {diff}")

    summarize_distribution("base", old_rows, rules)
    summarize_distribution("nuevo", new_rows, rules)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
