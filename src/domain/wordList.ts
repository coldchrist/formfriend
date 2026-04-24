import type { EntryRef } from "./types";

export interface LoadedWordList {
  name: string;
  isEnriched: boolean;
  allEntries: string[];
  eligibleEntries: string[];
  byLength: Map<number, string[]>;
  freqBandByEntry: Map<string, number>;
}

export interface WordListMatchResult {
  total: number;
  matches: string[];
}

const LETTERS_ONLY_RE = /^\p{L}+$/u;

function normalizeWordListEntry(value: string): string {
  return value.normalize("NFC").trim().toLocaleUpperCase();
}

function parseFrequencyBand(value: string | undefined): number {
  if (!value) {
    return 1;
  }

  const parsed = Number.parseInt(value.trim(), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

function looksLikeEnrichedHeader(line: string): boolean {
  const columns = line
    .split("\t")
    .map((part) => part.trim().toLocaleLowerCase());

  return columns.includes("entry") && columns.includes("freq_band");
}

function getEntryColumnIndex(header: string[]): number {
  return header.findIndex(
    (column) => column.trim().toLocaleLowerCase() === "entry",
  );
}

function getFreqBandColumnIndex(header: string[]): number {
  return header.findIndex(
    (column) => column.trim().toLocaleLowerCase() === "freq_band",
  );
}

export function getEntryFrequencyBand(
  wordList: LoadedWordList,
  entry: string,
): number {
  return wordList.freqBandByEntry.get(entry) ?? 1;
}

export function compareEntriesByPreference(
  wordList: LoadedWordList,
  left: string,
  right: string,
): number {
  const bandDiff =
    getEntryFrequencyBand(wordList, right) -
    getEntryFrequencyBand(wordList, left);

  if (bandDiff !== 0) {
    return bandDiff;
  }

  return left.localeCompare(right);
}

function isEligibleGridEntry(value: string): boolean {
  return LETTERS_ONLY_RE.test(value);
}

export function parseWordListText(
  text: string,
  name = "wordlist",
): LoadedWordList {
  const lines = text.split(/\r?\n/);
  const firstNonBlankLine = lines.find((line) => line.trim() !== "") ?? "";
  const isEnriched = looksLikeEnrichedHeader(firstNonBlankLine);

  console.log(
    "WORDLIST DEBUG firstNonBlankLine:",
    JSON.stringify(firstNonBlankLine),
  );
  console.log("WORDLIST DEBUG isEnriched:", isEnriched);

  const seen = new Set<string>();
  const allEntries: string[] = [];
  const eligibleEntries: string[] = [];
  const byLength = new Map<number, string[]>();
  const freqBandByEntry = new Map<string, number>();

  if (isEnriched) {
    const headerLineIndex = lines.findIndex((line) => line.trim() !== "");
    const header = lines[headerLineIndex].split("\t");
    const entryColumnIndex = getEntryColumnIndex(header);
    const freqBandColumnIndex = getFreqBandColumnIndex(header);

    if (entryColumnIndex < 0 || freqBandColumnIndex < 0) {
      throw new Error("Enriched word list is missing required columns.");
    }

    for (let i = headerLineIndex + 1; i < lines.length; i += 1) {
      const rawLine = lines[i];
      if (!rawLine.trim()) {
        continue;
      }

      const columns = rawLine.split("\t");
      const rawEntry = columns[entryColumnIndex] ?? "";
      const entry = normalizeWordListEntry(rawEntry);

      if (!entry || seen.has(entry)) {
        continue;
      }

      seen.add(entry);
      allEntries.push(entry);

      const freqBand = parseFrequencyBand(columns[freqBandColumnIndex]);
      freqBandByEntry.set(entry, freqBand);

      if (!isEligibleGridEntry(entry)) {
        continue;
      }

      eligibleEntries.push(entry);
      const len = entry.length;
      const bucket = byLength.get(len);
      if (bucket) {
        bucket.push(entry);
      } else {
        byLength.set(len, [entry]);
      }
    }
  } else {
    for (const rawLine of lines) {
      const entry = normalizeWordListEntry(rawLine);
      if (!entry || seen.has(entry)) {
        continue;
      }

      seen.add(entry);
      allEntries.push(entry);
      freqBandByEntry.set(entry, 1);

      if (!isEligibleGridEntry(entry)) {
        continue;
      }

      eligibleEntries.push(entry);
      const len = entry.length;
      const bucket = byLength.get(len);
      if (bucket) {
        bucket.push(entry);
      } else {
        byLength.set(len, [entry]);
      }
    }
  }

  const loadedWordList: LoadedWordList = {
    name,
    isEnriched,
    allEntries,
    eligibleEntries,
    byLength,
    freqBandByEntry,
  };

  for (const bucket of byLength.values()) {
    bucket.sort((a, b) => compareEntriesByPreference(loadedWordList, a, b));
  }

  return loadedWordList;
}

export function findMatchingWords(
  wordList: LoadedWordList,
  pattern: string,
  offset = 0,
  limit = Number.MAX_SAFE_INTEGER,
): WordListMatchResult {
  const normalizedPattern = normalizeWordListEntry(pattern);
  const source = wordList.byLength.get(normalizedPattern.length) ?? [];
  const matches = source.filter((entry) => {
    for (let i = 0; i < normalizedPattern.length; i += 1) {
      const ch = normalizedPattern[i];
      if (ch !== "." && ch !== "?" && ch !== "_" && entry[i] !== ch) {
        return false;
      }
    }
    return true;
  });

  matches.sort((a, b) => compareEntriesByPreference(wordList, a, b));

  const sliced = matches.slice(offset, offset + limit);

  return {
    total: matches.length,
    matches: sliced,
  };
}
