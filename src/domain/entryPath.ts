import type { Cell } from "./types";

export type GridDirection =
  | "east"
  | "south"
  | "southeast"
  | "northeast"
  | "southwest"
  | "northwest"
  | "west"
  | "north";

export type ExtraEntryReadingAxis =
  | "downward"
  | "rightward"
  | "upward"
  | "leftward";

export type ExtraEntryReadingPolicy =
  | "downward-then-rightward"
  | "downward-then-upward"
  | "downward-then-leftward"
  | "rightward-then-downward"
  | "rightward-then-upward"
  | "rightward-then-leftward"
  | "upward-then-downward"
  | "upward-then-rightward"
  | "upward-then-leftward"
  | "leftward-then-downward"
  | "leftward-then-rightward"
  | "leftward-then-upward";

export const DEFAULT_EXTRA_ENTRY_READING_POLICY: ExtraEntryReadingPolicy =
  "downward-then-rightward";

export const EXTRA_ENTRY_READING_POLICIES: readonly ExtraEntryReadingPolicy[] = [
  "downward-then-rightward",
  "downward-then-upward",
  "downward-then-leftward",
  "rightward-then-downward",
  "rightward-then-upward",
  "rightward-then-leftward",
  "upward-then-downward",
  "upward-then-rightward",
  "upward-then-leftward",
  "leftward-then-downward",
  "leftward-then-rightward",
  "leftward-then-upward",
];

export function isExtraEntryReadingPolicy(
  value: unknown,
): value is ExtraEntryReadingPolicy {
  return (
    typeof value === "string" &&
    EXTRA_ENTRY_READING_POLICIES.includes(value as ExtraEntryReadingPolicy)
  );
}

export interface CellCoord {
  row: number;
  col: number;
}

export interface ParametricValue {
  kind: "sizeAffine";
  sizeMultiplier: number;
  offset: number;
}

export type EntryScalar = number | ParametricValue;

export interface EntryLine {
  kind: "line";
  start: CellCoord;
  direction: GridDirection;
  length: number;
}

export interface ParametricCellCoord {
  row: EntryScalar;
  col: EntryScalar;
}

export interface ParametricEntryLine {
  kind: "parametricLine";
  start: ParametricCellCoord;
  direction: GridDirection;
  length: EntryScalar;
}

export type EntryPath =
  | {
      kind: "line";
      id: string;
      label?: string;
      segment: EntryLine;
    }
  | {
      kind: "polyline";
      id: string;
      label?: string;
      segments: EntryLine[];
    }
  | {
      kind: "parametricLine";
      id: string;
      label?: string;
      segment: ParametricEntryLine;
    };

export interface EntryPathExpansionContext {
  size?: number;
}

export const DIRECTION_STEPS: Record<GridDirection, { row: number; col: number }> = {
  east: { row: 0, col: 1 },
  south: { row: 1, col: 0 },
  southeast: { row: 1, col: 1 },
  northeast: { row: -1, col: 1 },
  southwest: { row: 1, col: -1 },
  northwest: { row: -1, col: -1 },
  west: { row: 0, col: -1 },
  north: { row: -1, col: 0 },
};

function coordKey(coord: CellCoord): string {
  return `${coord.row},${coord.col}`;
}

export function cellIdFromCoord(coord: CellCoord): string {
  return `r${coord.row}c${coord.col}`;
}

export function coordFromCellId(cellId: string): CellCoord | null {
  const match = /^r(-?\d+)c(-?\d+)$/.exec(cellId);
  if (!match) {
    return null;
  }

  return {
    row: Number(match[1]),
    col: Number(match[2]),
  };
}

function getDirectionBetween(left: CellCoord, right: CellCoord): GridDirection | null {
  const rowDelta = right.row - left.row;
  const colDelta = right.col - left.col;

  return (
    (Object.entries(DIRECTION_STEPS).find(
      ([, step]) => step.row === rowDelta && step.col === colDelta,
    )?.[0] as GridDirection | undefined) ?? null
  );
}

function evaluateEntryScalar(
  value: EntryScalar,
  context: EntryPathExpansionContext | undefined,
): number {
  if (typeof value === "number") {
    return value;
  }

  if (value.kind !== "sizeAffine") {
    throw new Error("Unsupported parametric entry value.");
  }

  if (!context?.size || !Number.isInteger(context.size) || context.size < 1) {
    throw new Error("Parametric entry paths require a positive primitive size.");
  }

  return value.sizeMultiplier * context.size + value.offset;
}

function parametrizeCommonScalar(value: number, size: number): EntryScalar {
  const candidates: EntryScalar[] = [
    { kind: "sizeAffine", sizeMultiplier: 1, offset: -1 },
    { kind: "sizeAffine", sizeMultiplier: 1, offset: 0 },
    { kind: "sizeAffine", sizeMultiplier: 2, offset: -1 },
    { kind: "sizeAffine", sizeMultiplier: 2, offset: 0 },
    { kind: "sizeAffine", sizeMultiplier: 3, offset: -1 },
    { kind: "sizeAffine", sizeMultiplier: 3, offset: 0 },
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== "number" && evaluateEntryScalar(candidate, { size }) === value) {
      return candidate;
    }
  }

  return value;
}

function describeScalar(value: EntryScalar): string {
  if (typeof value === "number") {
    return String(value);
  }

  const multiplier = value.sizeMultiplier;
  const offset = value.offset;
  const sizeTerm = multiplier === 1 ? "size" : `${multiplier}*size`;

  if (offset === 0) {
    return sizeTerm;
  }

  return `${sizeTerm}${offset > 0 ? "+" : ""}${offset}`;
}

function normalizeLine(line: ParametricEntryLine, context?: EntryPathExpansionContext): EntryLine {
  const start = {
    row: evaluateEntryScalar(line.start.row, context),
    col: evaluateEntryScalar(line.start.col, context),
  };
  const length = evaluateEntryScalar(line.length, context);

  return {
    kind: "line",
    start,
    direction: line.direction,
    length,
  };
}

export function expandEntryLine(line: EntryLine): CellCoord[] {
  const step = DIRECTION_STEPS[line.direction];
  if (!step) {
    throw new Error(`Unsupported entry path direction: ${line.direction}`);
  }

  if (!Number.isInteger(line.length) || line.length < 1) {
    throw new Error("Entry path line length must be a positive integer.");
  }

  return Array.from({ length: line.length }, (_, index) => ({
    row: line.start.row + step.row * index,
    col: line.start.col + step.col * index,
  }));
}

export function expandEntryPath(
  path: EntryPath,
  context?: EntryPathExpansionContext,
): CellCoord[] {
  const segments =
    path.kind === "line"
      ? [path.segment]
      : path.kind === "parametricLine"
        ? [normalizeLine(path.segment, context)]
        : path.segments;
  const coords: CellCoord[] = [];

  segments.forEach((segment, segmentIndex) => {
    const segmentCoords = expandEntryLine(segment);
    if (segmentIndex === 0) {
      coords.push(...segmentCoords);
      return;
    }

    const previous = coords[coords.length - 1];
    const first = segmentCoords[0];
    if (!previous || !first || previous.row !== first.row || previous.col !== first.col) {
      throw new Error("Entry path segments must connect end-to-start.");
    }

    coords.push(...segmentCoords.slice(1));
  });

  const seen = new Set<string>();
  for (const coord of coords) {
    const key = coordKey(coord);
    if (seen.has(key)) {
      throw new Error("Entry path may not visit the same cell twice.");
    }
    seen.add(key);
  }

  return coords;
}

export function expandEntryPathToCellIds(
  path: EntryPath,
  context?: EntryPathExpansionContext,
): string[] {
  return expandEntryPath(path, context).map(cellIdFromCoord);
}

export function validateEntryPath(
  path: EntryPath,
  cells: Cell[],
  context?: EntryPathExpansionContext,
): void {
  const occupied = new Set(cells.map((cell) => coordKey(cell)));
  const coords = expandEntryPath(path, context);

  if (coords.length < 2) {
    throw new Error("An extra entry must include at least two cells.");
  }

  for (const coord of coords) {
    if (!occupied.has(coordKey(coord))) {
      throw new Error(
        `Extra entry ${path.label ?? path.id} includes an unoccupied cell at row ${coord.row + 1}, column ${coord.col + 1}.`,
      );
    }
  }
}

export function inferEntryPathFromCoords(
  id: string,
  coords: CellCoord[],
  label?: string,
): EntryPath {
  return inferEntryPathFromCellIds(id, coords.map(cellIdFromCoord), label);
}

function compareCoordByReadingAxis(
  left: CellCoord,
  right: CellCoord,
  axis: ExtraEntryReadingAxis,
): number {
  switch (axis) {
    case "downward":
      return left.row - right.row;
    case "upward":
      return right.row - left.row;
    case "rightward":
      return left.col - right.col;
    case "leftward":
      return right.col - left.col;
    default:
      return 0;
  }
}

function parseReadingPolicy(
  policy: ExtraEntryReadingPolicy,
): [ExtraEntryReadingAxis, ExtraEntryReadingAxis] {
  const [primary, secondary] = policy.split("-then-") as [
    ExtraEntryReadingAxis,
    ExtraEntryReadingAxis,
  ];

  if (primary === secondary) {
    throw new Error("Extra entry reading policy axes must be different.");
  }

  return [primary, secondary];
}

export function orientCellCoordsByReadingPolicy(
  coords: CellCoord[],
  policy: ExtraEntryReadingPolicy = DEFAULT_EXTRA_ENTRY_READING_POLICY,
): CellCoord[] {
  if (coords.length < 2) {
    return [...coords];
  }

  const [primary, secondary] = parseReadingPolicy(policy);
  const first = coords[0];
  const last = coords[coords.length - 1];
  const primaryComparison = compareCoordByReadingAxis(first, last, primary);
  const comparison =
    primaryComparison !== 0
      ? primaryComparison
      : compareCoordByReadingAxis(first, last, secondary);

  return comparison <= 0 ? [...coords] : [...coords].reverse();
}

export function orientEntryPathByReadingPolicy(
  path: EntryPath,
  policy: ExtraEntryReadingPolicy = DEFAULT_EXTRA_ENTRY_READING_POLICY,
  context?: EntryPathExpansionContext,
): EntryPath {
  const coords = orientCellCoordsByReadingPolicy(
    expandEntryPath(path, context),
    policy,
  );

  return inferEntryPathFromCoords(path.id, coords, path.label);
}

export function inferEntryPathFromCellIds(
  id: string,
  cellIds: string[],
  label?: string,
): EntryPath {
  const coords = cellIds.map((cellId) => {
    const coord = coordFromCellId(cellId);
    if (!coord) {
      throw new Error(`Invalid cell id in entry path: ${cellId}`);
    }
    return coord;
  });

  if (coords.length < 2) {
    throw new Error("An extra entry must include at least two cells.");
  }

  const segments: EntryLine[] = [];
  let segmentStart = coords[0];
  let segmentDirection = getDirectionBetween(coords[0], coords[1]);
  if (!segmentDirection) {
    throw new Error("Extra entry cells must be contiguous.");
  }
  let segmentLength = 2;

  for (let i = 2; i < coords.length; i += 1) {
    const direction = getDirectionBetween(coords[i - 1], coords[i]);
    if (!direction) {
      throw new Error("Extra entry cells must be contiguous.");
    }

    if (direction === segmentDirection) {
      segmentLength += 1;
      continue;
    }

    segments.push({
      kind: "line",
      start: segmentStart,
      direction: segmentDirection,
      length: segmentLength,
    });

    segmentStart = coords[i - 1];
    segmentDirection = direction;
    segmentLength = 2;
  }

  segments.push({
    kind: "line",
    start: segmentStart,
    direction: segmentDirection,
    length: segmentLength,
  });

  if (segments.length === 1) {
    return {
      kind: "line",
      id,
      label,
      segment: segments[0],
    };
  }

  return {
    kind: "polyline",
    id,
    label,
    segments,
  };
}

export function inferParametricEntryPathFromCellIds(
  id: string,
  cellIds: string[],
  size: number,
  label?: string,
): EntryPath {
  const inferred = inferEntryPathFromCellIds(id, cellIds, label);

  if (inferred.kind !== "line") {
    return inferred;
  }

  const segment = inferred.segment;
  return {
    kind: "parametricLine",
    id,
    label,
    segment: {
      kind: "parametricLine",
      start: {
        row: parametrizeCommonScalar(segment.start.row, size),
        col: parametrizeCommonScalar(segment.start.col, size),
      },
      direction: segment.direction,
      length: parametrizeCommonScalar(segment.length, size),
    },
  };
}

export function describeEntryPath(path: EntryPath, context?: EntryPathExpansionContext): string {
  if (path.kind === "parametricLine") {
    return `start (${describeScalar(path.segment.start.row)}, ${describeScalar(
      path.segment.start.col,
    )}), ${path.segment.direction}, length ${describeScalar(path.segment.length)}`;
  }

  const cellIds = expandEntryPathToCellIds(path, context);
  return cellIds.join(" → ");
}
