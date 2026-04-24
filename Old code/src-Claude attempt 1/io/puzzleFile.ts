import type {
  GridPresentation,
  SavedPuzzle,
  SavedPuzzlePayload,
  SolutionState,
  SolveMode,
} from "../domain/types";

export type PuzzleFileBuildInput = {
  payload: SavedPuzzlePayload;
  includeSolution: boolean;
  solution?: SolutionState;
};

export type LoadedPuzzleFile = {
  payload: SavedPuzzlePayload;
  solution?: SolutionState;
  effectiveSolveMode: SolveMode;
};

export function buildPuzzleFile(input: PuzzleFileBuildInput): SavedPuzzle {
  const normalizedPayload: SavedPuzzlePayload = {
    ...input.payload,
    solveMode:
      input.includeSolution && input.payload.solveMode === "checkable"
        ? "checkable"
        : "strict",
    gridPresentation:
      input.payload.gridPresentation === "hex" ? "hex" : "square",
    dateAdded:
      typeof input.payload.dateAdded === "string" &&
      input.payload.dateAdded.trim() !== ""
        ? input.payload.dateAdded
        : new Date().toISOString().slice(0, 10),
  };

  const solutionToStore =
    input.includeSolution && input.solution ? input.solution : undefined;

  const obfuscatedSolution = solutionToStore
    ? obfuscateSolution(solutionToStore)
    : undefined;

  const unsigned: Omit<SavedPuzzle, "checksum"> = {
    version: 2,
    payload: normalizedPayload,
    includeSolution: Boolean(solutionToStore),
    obfuscatedSolution,
  };

  return {
    ...unsigned,
    checksum: computeChecksum(unsigned),
  };
}

export function downloadPuzzleFile(file: SavedPuzzle): void {
  const json = JSON.stringify(file, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = buildDownloadFileName(file);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function readPuzzleFile(file: File): Promise<LoadedPuzzleFile> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<SavedPuzzle>;
  validateSavedPuzzle(parsed);

  const unsigned: Omit<SavedPuzzle, "checksum"> = {
    version: 2,
    payload: parsed.payload!,
    includeSolution: parsed.includeSolution!,
    obfuscatedSolution: parsed.obfuscatedSolution,
  };

  const expectedChecksum = computeChecksum(unsigned);
  if (parsed.checksum !== expectedChecksum) {
    throw new Error("Puzzle file checksum is invalid.");
  }

  const solution =
    parsed.includeSolution && parsed.obfuscatedSolution
      ? deobfuscateSolution(parsed.obfuscatedSolution)
      : undefined;

  const effectiveSolveMode: SolveMode =
    solution && parsed.payload?.solveMode === "checkable"
      ? "checkable"
      : "strict";

  return {
    payload: normalizePayload(parsed.payload!),
    solution,
    effectiveSolveMode,
  };
}

function normalizePayload(payload: SavedPuzzlePayload): SavedPuzzlePayload {
  return {
    ...payload,
    solveMode: payload.solveMode === "checkable" ? "checkable" : "strict",
    gridPresentation: payload.gridPresentation === "hex" ? "hex" : "square",
    dateAdded:
      typeof payload.dateAdded === "string" && payload.dateAdded.trim() !== ""
        ? payload.dateAdded
        : new Date().toISOString().slice(0, 10),
  };
}

function buildDownloadFileName(file: SavedPuzzle): string {
  const rawTitle =
    file.payload.content.metadata.title?.trim() || "formfriend-puzzle";
  const safeTitle = rawTitle
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${safeTitle || "formfriend-puzzle"}.json`;
}

function validateSavedPuzzle(puzzle: Partial<SavedPuzzle>): void {
  if (!puzzle || typeof puzzle !== "object") {
    throw new Error("Puzzle file is not a valid object.");
  }

  if (puzzle.version !== 2) {
    throw new Error(`Unsupported puzzle version: ${String(puzzle.version)}`);
  }

  if (!puzzle.payload || typeof puzzle.payload !== "object") {
    throw new Error("Puzzle file is missing payload.");
  }

  const { payload } = puzzle;

  if (!payload.spec || payload.spec.shapeFamily !== "composed") {
    throw new Error("Only composed-shape puzzles are currently supported.");
  }

  if (
    typeof payload.spec.composedLayout !== "string" ||
    payload.spec.composedLayout.trim() === ""
  ) {
    throw new Error("Puzzle file is missing composedLayout.");
  }

  if (!Number.isInteger(payload.spec.size) || payload.spec.size < 2) {
    throw new Error("Puzzle file has an invalid size.");
  }

  if (
    payload.spec.formStyle !== undefined &&
    payload.spec.formStyle !== "double" &&
    payload.spec.formStyle !== "single"
  ) {
    throw new Error("Puzzle file has an invalid form style.");
  }

  if (
    payload.spec.inverted !== undefined &&
    typeof payload.spec.inverted !== "boolean"
  ) {
    throw new Error("Puzzle file has an invalid inverted flag.");
  }

  if (
    !payload.topology ||
    !Array.isArray(payload.topology.cells) ||
    !Array.isArray(payload.topology.entries)
  ) {
    throw new Error("Puzzle file is missing topology.");
  }

  if (!payload.content || !Array.isArray(payload.content.clues)) {
    throw new Error("Puzzle file is missing clues.");
  }

  if (payload.solveMode !== "strict" && payload.solveMode !== "checkable") {
    throw new Error("Puzzle file has an invalid solveMode.");
  }

  if (
    payload.gridPresentation !== undefined &&
    payload.gridPresentation !== "square" &&
    payload.gridPresentation !== "hex"
  ) {
    throw new Error("Puzzle file has an invalid gridPresentation.");
  }

  if (
    payload.dateAdded !== undefined &&
    (typeof payload.dateAdded !== "string" || payload.dateAdded.trim() === "")
  ) {
    throw new Error("Puzzle file has an invalid dateAdded.");
  }

  if (payload.comment !== undefined && typeof payload.comment !== "string") {
    throw new Error("Puzzle file has an invalid comment.");
  }

  if (
    payload.enigmaIssue !== undefined &&
    typeof payload.enigmaIssue !== "string"
  ) {
    throw new Error("Puzzle file has an invalid enigmaIssue.");
  }

  if (
    payload.formNumber !== undefined &&
    typeof payload.formNumber !== "string"
  ) {
    throw new Error("Puzzle file has an invalid formNumber.");
  }

  if (typeof puzzle.includeSolution !== "boolean") {
    throw new Error("Puzzle file has an invalid includeSolution flag.");
  }

  if (
    puzzle.obfuscatedSolution !== undefined &&
    typeof puzzle.obfuscatedSolution !== "string"
  ) {
    throw new Error("Puzzle file has an invalid obfuscatedSolution.");
  }

  if (typeof puzzle.checksum !== "string" || puzzle.checksum.trim() === "") {
    throw new Error("Puzzle file is missing checksum.");
  }

  if (puzzle.includeSolution && !puzzle.obfuscatedSolution) {
    throw new Error(
      "Puzzle file indicates a solution is included, but none was found.",
    );
  }

  if (!puzzle.includeSolution && puzzle.obfuscatedSolution !== undefined) {
    throw new Error("Puzzle file has an unexpected obfuscated solution.");
  }
}

function obfuscateSolution(solution: SolutionState): string {
  const json = JSON.stringify(solution);
  const reversed = json.split("").reverse().join("");
  return btoa(reversed);
}

function deobfuscateSolution(value: string): SolutionState {
  try {
    const reversed = atob(value);
    const json = reversed.split("").reverse().join("");
    return JSON.parse(json) as SolutionState;
  } catch {
    throw new Error("Puzzle file solution could not be decoded.");
  }
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  return `{${keys
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(",")}}`;
}

function computeChecksum(value: Omit<SavedPuzzle, "checksum">): string {
  const text = stableStringify(value);
  let hash = 2166136261;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}
