#!/usr/bin/env python3
"""
Enrich a curated wordlist with frequency bands from a Kaggle word-frequency CSV.

Inputs:
- Curated wordlist: one entry per line
- Kaggle CSV: header row with at least columns: word,count

Normalization for matching:
- lowercase
- strip accents/diacritics
- remove everything except ASCII letters a-z

Special rule:
- any curated entry containing a digit is excluded from the output

Output:
- TSV with columns:
    entry    lookup_key    freq_band    freq_rank    freq_count

Frequency bands:
- 5: rank 1..1000
- 4: rank 1001..10000
- 3: rank 10001..50000
- 2: rank > 50000 and present in Kaggle
- 1: not present in Kaggle

Python: 3.8+
Standard library only.
"""

import argparse
import csv
import re
import sys
import unicodedata
from pathlib import Path
from typing import Dict, Iterable, Optional, Tuple


DIGIT_RE = re.compile(r"\d")
ASCII_LETTER_RE = re.compile(r"[a-z]")


def contains_digit(text: str) -> bool:
    return bool(DIGIT_RE.search(text))


def strip_accents(text: str) -> str:
    """
    Convert accented Latin characters to their base letters by removing combining marks.
    Example: 'ÉLAN' -> 'ELAN'
    """
    normalized = unicodedata.normalize("NFKD", text)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def make_lookup_key(text: str) -> str:
    """
    Aggressive normalization:
    - lowercase
    - strip accents
    - keep only ASCII letters a-z

    Examples:
    - "ÉLAN" -> "elan"
    - "mother-in-law" -> "motherinlaw"
    - "rock 'n' roll" -> "rocknroll"
    """
    text = strip_accents(text).lower()
    return "".join(ch for ch in text if "a" <= ch <= "z")


def band_from_rank(rank: Optional[int]) -> int:
    if rank is None:
        return 1
    if 1 <= rank <= 1000:
        return 5
    if 1001 <= rank <= 10000:
        return 4
    if 10001 <= rank <= 50000:
        return 3
    return 2


def detect_csv_dialect(sample_text: str) -> csv.Dialect:
    """
    Try to sniff the CSV dialect; fall back to excel if sniffing fails.
    """
    try:
        return csv.Sniffer().sniff(sample_text)
    except csv.Error:
        return csv.excel


def find_column_name(fieldnames: Iterable[str], target_names: Iterable[str]) -> Optional[str]:
    """
    Find a matching column name case-insensitively.
    """
    lowered = {name.strip().lower(): name for name in fieldnames if name is not None}
    for target in target_names:
        if target.lower() in lowered:
            return lowered[target.lower()]
    return None


def load_kaggle_frequency_map(
    kaggle_csv_path: Path,
) -> Tuple[Dict[str, Tuple[int, str]], Dict[str, int]]:
    """
    Load Kaggle CSV into a mapping:
        lookup_key -> (best_rank, best_count)

    If multiple Kaggle rows normalize to the same lookup key, keep the one with the
    best (lowest) rank.

    Returns:
    - freq_map: dict of lookup_key -> (rank, count_as_string)
    - stats: summary counts
    """
    freq_map: Dict[str, Tuple[int, str]] = {}
    stats = {
        "rows_read": 0,
        "rows_skipped_empty_key": 0,
        "duplicate_normalized_keys": 0,
    }

    with kaggle_csv_path.open("r", encoding="utf-8-sig", newline="") as f:
        sample = f.read(4096)
        f.seek(0)

        dialect = detect_csv_dialect(sample)
        reader = csv.DictReader(f, dialect=dialect)

        if not reader.fieldnames:
            raise ValueError("Kaggle CSV appears to have no header row.")

        word_col = find_column_name(reader.fieldnames, ["word"])
        count_col = find_column_name(reader.fieldnames, ["count"])

        if word_col is None or count_col is None:
            raise ValueError(
                f"Kaggle CSV must contain 'word' and 'count' columns. "
                f"Found columns: {reader.fieldnames}"
            )

        rank = 0
        for row in reader:
            stats["rows_read"] += 1

            raw_word = (row.get(word_col) or "").strip()
            raw_count = (row.get(count_col) or "").strip()

            rank += 1
            key = make_lookup_key(raw_word)

            if not key:
                stats["rows_skipped_empty_key"] += 1
                continue

            if key in freq_map:
                stats["duplicate_normalized_keys"] += 1
                existing_rank, _existing_count = freq_map[key]
                if rank < existing_rank:
                    freq_map[key] = (rank, raw_count)
            else:
                freq_map[key] = (rank, raw_count)

    return freq_map, stats


def enrich_wordlist(
    wordlist_path: Path,
    kaggle_map: Dict[str, Tuple[int, str]],
    output_path: Path,
) -> Dict[str, int]:
    """
    Read the curated wordlist and write the enriched TSV.
    """
    stats = {
        "input_lines": 0,
        "blank_lines_skipped": 0,
        "digit_entries_excluded": 0,
        "empty_key_entries_skipped": 0,
        "rows_written": 0,
        "matched_in_kaggle": 0,
        "not_found_in_kaggle": 0,
    }

    with wordlist_path.open("r", encoding="utf-8-sig") as fin, \
         output_path.open("w", encoding="utf-8", newline="") as fout:

        writer = csv.writer(fout, delimiter="\t", lineterminator="\n")
        writer.writerow(["entry", "lookup_key", "freq_band", "freq_rank", "freq_count"])

        for raw_line in fin:
            stats["input_lines"] += 1
            entry = raw_line.rstrip("\r\n")

            if not entry.strip():
                stats["blank_lines_skipped"] += 1
                continue

            if contains_digit(entry):
                stats["digit_entries_excluded"] += 1
                continue

            lookup_key = make_lookup_key(entry)
            if not lookup_key:
                stats["empty_key_entries_skipped"] += 1
                continue

            if lookup_key in kaggle_map:
                freq_rank, freq_count = kaggle_map[lookup_key]
                freq_band = band_from_rank(freq_rank)
                stats["matched_in_kaggle"] += 1
            else:
                freq_rank, freq_count = "", ""
                freq_band = 1
                stats["not_found_in_kaggle"] += 1

            writer.writerow([entry, lookup_key, freq_band, freq_rank, freq_count])
            stats["rows_written"] += 1

    return stats


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Enrich a curated wordlist with frequency bands from Kaggle word frequencies."
    )
    parser.add_argument(
        "--wordlist",
        required=True,
        help="Path to curated wordlist (one entry per line).",
    )
    parser.add_argument(
        "--kaggle",
        required=True,
        help="Path to Kaggle CSV with columns word,count.",
    )
    parser.add_argument(
        "--out",
        required=True,
        help="Path to output TSV.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    wordlist_path = Path(args.wordlist)
    kaggle_path = Path(args.kaggle)
    output_path = Path(args.out)

    if not wordlist_path.is_file():
        print(f"ERROR: wordlist file not found: {wordlist_path}", file=sys.stderr)
        return 1

    if not kaggle_path.is_file():
        print(f"ERROR: Kaggle CSV file not found: {kaggle_path}", file=sys.stderr)
        return 1

    print(f"Loading Kaggle frequencies from: {kaggle_path}")
    kaggle_map, kaggle_stats = load_kaggle_frequency_map(kaggle_path)
    print(f"Kaggle rows read: {kaggle_stats['rows_read']}")
    print(f"Kaggle normalized keys loaded: {len(kaggle_map)}")
    print(f"Kaggle rows skipped (empty normalized key): {kaggle_stats['rows_skipped_empty_key']}")
    print(f"Kaggle duplicate normalized keys: {kaggle_stats['duplicate_normalized_keys']}")

    print(f"\nEnriching wordlist: {wordlist_path}")
    enrich_stats = enrich_wordlist(wordlist_path, kaggle_map, output_path)

    print("\nDone.")
    print(f"Output written to: {output_path}")
    print(f"Input lines: {enrich_stats['input_lines']}")
    print(f"Blank lines skipped: {enrich_stats['blank_lines_skipped']}")
    print(f"Digit entries excluded: {enrich_stats['digit_entries_excluded']}")
    print(f"Entries skipped (empty normalized key): {enrich_stats['empty_key_entries_skipped']}")
    print(f"Rows written: {enrich_stats['rows_written']}")
    print(f"Matched in Kaggle: {enrich_stats['matched_in_kaggle']}")
    print(f"Not found in Kaggle: {enrich_stats['not_found_in_kaggle']}")

    return 0


if __name__ == "__main__":
    sys.exit(main())