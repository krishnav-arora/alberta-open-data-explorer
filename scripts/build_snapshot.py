"""Create the small, auditable municipality/year snapshot from Alberta's CSV.

Usage: python3 scripts/build_snapshot.py path/to/population.csv
"""
import csv
import hashlib
import sys
from collections import defaultdict
from decimal import Decimal
from pathlib import Path

SOURCE_URL = "https://open.alberta.ca/dataset/1bef4453-1dab-4f2a-bc63-2b3df318d47c/resource/6b20754e-5a8c-4d2d-9995-b137459c1210/download/population.csv"
OUTPUT = Path(__file__).resolve().parents[1] / "api/src/main/resources/municipality_totals.tsv"


def main(source: Path) -> None:
    totals = defaultdict(Decimal)
    counts = defaultdict(int)
    names = {}
    with source.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            if row["Indicator"] != "Population":
                continue
            key = (row["CSDUID"], int(row["Year"]))
            totals[key] += Decimal(row["Value"])
            counts[key] += 1
            names[key] = row["CSD Name"]

    excluded = [(key, count) for key, count in counts.items() if count != 182]
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with OUTPUT.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle, delimiter="\t", lineterminator="\n")
        writer.writerow(["csduid", "municipality", "year", "population", "source_rows"])
        for key in sorted(totals):
            if counts[key] != 182:
                continue
            value = totals[key]
            if value != value.to_integral_value():
                raise ValueError(f"Unexpected fractional total: {key}: {value}")
            writer.writerow([key[0], names[key], key[1], int(value), counts[key]])

    digest = hashlib.sha256(source.read_bytes()).hexdigest()
    print(f"Source: {SOURCE_URL}")
    print(f"SHA-256: {digest}")
    print(f"Wrote {len(totals) - len(excluded)} totals to {OUTPUT}")
    print(f"Excluded {len(excluded)} incomplete municipality/year groups: {excluded}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: python3 scripts/build_snapshot.py path/to/population.csv")
    main(Path(sys.argv[1]))
