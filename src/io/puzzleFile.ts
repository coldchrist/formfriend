import type { SavedPuzzle, SolutionState } from "../domain/types";
import type { FormModel } from "../domain/formModel";
import { getMappingsForCell } from "../domain/formModel";

type PuzzleFileBuildInput = {
  spec: SavedPuzzle["spec"];
  topology: SavedPuzzle["topology"];
  content: SavedPuzzle["content"];
  state: SavedPuzzle["state"];
  solution?: SolutionState;
  formModel: FormModel;
  gridPresentation: "square" | "hex";
  dateAdded: string;
  comment?: string;
  enigmaIssue?: string;
  formNumber?: string;
};

export function buildSolutionGrid(
  solution: SolutionState,
  topology: SavedPuzzle["topology"],
  formModel: FormModel,
): string[] {
  if (topology.cells.length === 0) return [];

  const maxRow = Math.max(...topology.cells.map((c) => c.row));
  const maxCol = Math.max(...topology.cells.map((c) => c.col));
  const cellSet = new Set(topology.cells.map((c) => c.id));

  // Build a per-cell letter lookup from fillsByFormWordId
  const letterByCellId = new Map<string, string>();
  for (const cell of topology.cells) {
    const mappings = getMappingsForCell(formModel, cell.id);
    // Use the first mapping (across for double, either for single)
    const mapping = mappings[0];
    if (!mapping) continue;
    const fill = solution.fillsByFormWordId[mapping.formWordId] ?? "";
    const letter = fill[mapping.formWordOffset] ?? " ";
    letterByCellId.set(cell.id, letter === "_" ? " " : letter);
  }

  const rows: string[] = [];
  for (let row = 0; row <= maxRow; row++) {
    let rowStr = "";
    for (let col = 0; col <= maxCol; col++) {
      const id = `r${row}c${col}`;
      rowStr += cellSet.has(id) ? (letterByCellId.get(id) ?? " ") : " ";
    }
    rows.push(rowStr);
  }
  return rows;
}

export function buildPuzzleFile(input: PuzzleFileBuildInput): SavedPuzzle {
  const hasSolution = Boolean(input.solution);

  return {
    version: 2,
    spec: input.spec,
    topology: input.topology,
    content: input.content,
    state: input.state,
    obfuscatedSolution: input.solution
      ? obfuscateSolutionGrid(
          buildSolutionGrid(input.solution, input.topology, input.formModel),
        )
      : undefined,
    gridPresentation: input.gridPresentation,
    dateAdded: input.dateAdded,
    comment: input.comment?.trim() || undefined,
    enigmaIssue: input.enigmaIssue?.trim() || undefined,
    formNumber: input.formNumber?.trim() || undefined,
  };
}

export function downloadPuzzleFile(
  puzzle: SavedPuzzle,
  filename?: string,
): void {
  const json = JSON.stringify(puzzle, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename
      ? `${filename.replace(/\.json$/i, "")}.json`
      : buildDownloadFileName(puzzle);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function readPuzzleFile(file: File): Promise<{
  puzzle: SavedPuzzle;
}> {
  const text = await file.text();
  const parsed = JSON.parse(text) as Partial<SavedPuzzle>;
  validateSavedPuzzle(parsed);

  const puzzle: SavedPuzzle = {
    version: 2,
    spec: parsed.spec!,
    topology: parsed.topology!,
    content: parsed.content!,
    state: parsed.state!,
    obfuscatedSolution: parsed.obfuscatedSolution,
    gridPresentation: parsed.gridPresentation === "hex" ? "hex" : "square",
    dateAdded:
      typeof parsed.dateAdded === "string" && parsed.dateAdded.trim() !== ""
        ? parsed.dateAdded
        : new Date().toISOString().slice(0, 10),
    comment: parsed.comment,
    enigmaIssue: parsed.enigmaIssue,
    formNumber: parsed.formNumber,
  };

  return { puzzle };
}

function buildDownloadFileName(puzzle: SavedPuzzle): string {
  const rawTitle = puzzle.content.metadata.title?.trim() || "formfriend-puzzle";
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

  const parsedVersion = (puzzle as Record<string, unknown>)["version"];
  if (parsedVersion !== 1 && parsedVersion !== 2) {
    throw new Error(`Unsupported puzzle version: ${String(parsedVersion)}`);
  }

  if (!puzzle.spec || puzzle.spec.shapeFamily !== "composed") {
    throw new Error("Only composed-shape puzzles are currently supported.");
  }

  if (
    typeof puzzle.spec.composedLayout !== "string" ||
    puzzle.spec.composedLayout.trim() === ""
  ) {
    throw new Error("Puzzle file is missing composedLayout.");
  }

  if (!Number.isInteger(puzzle.spec.size) || puzzle.spec.size < 2) {
    throw new Error("Puzzle file has an invalid size.");
  }

  if (
    puzzle.spec.inverted !== undefined &&
    typeof puzzle.spec.inverted !== "boolean"
  ) {
    throw new Error("Puzzle file has an invalid inverted flag.");
  }

  if (
    !puzzle.topology ||
    !Array.isArray(puzzle.topology.cells) ||
    !Array.isArray(puzzle.topology.entries)
  ) {
    throw new Error("Puzzle file is missing topology.");
  }

  if (!puzzle.content || !Array.isArray(puzzle.content.clues)) {
    throw new Error("Puzzle file is missing clues.");
  }

  if (!puzzle.state || typeof puzzle.state.fillsByFormWordId !== "object") {
    throw new Error("Puzzle file is missing state.");
  }

  if (
    puzzle.gridPresentation !== undefined &&
    puzzle.gridPresentation !== "square" &&
    puzzle.gridPresentation !== "hex"
  ) {
    throw new Error("Puzzle file has an invalid gridPresentation.");
  }

  if (
    puzzle.dateAdded !== undefined &&
    (typeof puzzle.dateAdded !== "string" || puzzle.dateAdded.trim() === "")
  ) {
    throw new Error("Puzzle file has an invalid dateAdded.");
  }

  if (puzzle.comment !== undefined && typeof puzzle.comment !== "string") {
    throw new Error("Puzzle file has an invalid comment.");
  }

  if (
    puzzle.enigmaIssue !== undefined &&
    typeof puzzle.enigmaIssue !== "string"
  ) {
    throw new Error("Puzzle file has an invalid enigmaIssue.");
  }

  if (
    puzzle.formNumber !== undefined &&
    typeof puzzle.formNumber !== "string"
  ) {
    throw new Error("Puzzle file has an invalid formNumber.");
  }

  if (
    puzzle.obfuscatedSolution !== undefined &&
    typeof puzzle.obfuscatedSolution !== "string"
  ) {
    throw new Error("Puzzle file has an invalid solution payload.");
  }
}

function obfuscateSolutionGrid(grid: string[]): string {
  const json = JSON.stringify(grid);
  const reversed = json.split("").reverse().join("");
  return btoa(reversed);
}

export function deobfuscateSolutionGrid(value: string): string[] {
  try {
    const reversed = atob(value);
    const json = reversed.split("").reverse().join("");
    return JSON.parse(json) as string[];
  } catch {
    throw new Error("Puzzle file solution could not be decoded.");
  }
}
