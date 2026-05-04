import type { LetterFilterMode } from "./types";

const VOWELS = new Set(["A", "E", "I", "O", "U"]);

export function normalizeLettersOnly(value: string): string {
  return value.toUpperCase().replace(/[^A-Z]/g, "");
}

export function isLetterAllowedForFilterMode(
  letter: string,
  mode: LetterFilterMode | undefined,
): boolean {
  const normalized = letter.toUpperCase();
  if (!/^[A-Z]$/.test(normalized)) {
    return false;
  }

  if (mode === "vowelless") {
    return !VOWELS.has(normalized);
  }

  if (mode === "consonantless") {
    return VOWELS.has(normalized);
  }

  return true;
}

export function filterTextForLetterFilterMode(
  value: string,
  mode: LetterFilterMode | undefined,
): string {
  const letters = normalizeLettersOnly(value);

  if (!mode || mode === "all") {
    return letters;
  }

  return letters
    .split("")
    .filter((letter) => isLetterAllowedForFilterMode(letter, mode))
    .join("");
}

export function describeLetterFilterMode(mode: LetterFilterMode | undefined): string {
  if (mode === "vowelless") {
    return "Vowelless entry mode enabled.";
  }

  if (mode === "consonantless") {
    return "Consonantless entry mode enabled.";
  }

  return "All-letter entry mode enabled.";
}
