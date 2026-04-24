import { buildFormModelFromTopology } from "./formModel";
import type {
  Cell,
  Clue,
  EntryDirection,
  EntryRef,
  PuzzleContent,
  PuzzleSpec,
  Topology,
} from "./types";
import { parseSerializedLayout } from "./shapeLayout";
import { buildTopologyFromComposedShapeDefinition } from "./shapeTopology";

function cellId(row: number, col: number): string {
  return `r${row}c${col}`;
}

function sortCellsReadingOrder(cells: Cell[]): Cell[] {
  return [...cells].sort((a, b) => {
    if (a.row !== b.row) {
      return a.row - b.row;
    }
    return a.col - b.col;
  });
}

function buildEntriesFromCells(cells: Cell[]): EntryRef[] {
  const sortedCells = sortCellsReadingOrder(cells);
  const cellSet = new Set(cells.map((cell) => cell.id));
  const numberingByCellId = new Map<string, number>();
  let nextNumber = 1;

  function hasCell(row: number, col: number): boolean {
    return cellSet.has(cellId(row, col));
  }

  function isAcrossStart(cell: Cell): boolean {
    return !hasCell(cell.row, cell.col - 1);
  }

  function isDownStart(cell: Cell): boolean {
    return !hasCell(cell.row - 1, cell.col);
  }

  for (const cell of sortedCells) {
    if (isAcrossStart(cell) || isDownStart(cell)) {
      numberingByCellId.set(cell.id, nextNumber);
      nextNumber += 1;
    }
  }

  function buildEntryCells(
    startCell: Cell,
    direction: EntryDirection,
  ): string[] {
    const cellsInEntry: string[] = [];
    let row = startCell.row;
    let col = startCell.col;

    while (hasCell(row, col)) {
      cellsInEntry.push(cellId(row, col));
      if (direction === "across") {
        col += 1;
      } else {
        row += 1;
      }
    }

    return cellsInEntry;
  }

  const acrossEntries: EntryRef[] = [];
  const downEntries: EntryRef[] = [];

  for (const cell of sortedCells) {
    if (isAcrossStart(cell)) {
      const number = numberingByCellId.get(cell.id);
      if (number === undefined) {
        throw new Error(`Missing clue number for cell ${cell.id}`);
      }

      acrossEntries.push({
        id: `A${number}`,
        number,
        label: `${number}A`,
        direction: "across",
        cells: buildEntryCells(cell, "across"),
      });
    }

    if (isDownStart(cell)) {
      const number = numberingByCellId.get(cell.id);
      if (number === undefined) {
        throw new Error(`Missing clue number for cell ${cell.id}`);
      }

      downEntries.push({
        id: `D${number}`,
        number,
        label: `${number}D`,
        direction: "down",
        cells: buildEntryCells(cell, "down"),
      });
    }
  }

  return [...acrossEntries, ...downEntries];
}

function reflectCoordAcrossLeadingDiagonal(row: number, col: number) {
  return { row: col, col: row };
}

export function isTopologyReflectableAcrossLeadingDiagonal(
  topology: Topology,
): boolean {
  const cellSet = new Set(
    topology.cells.map((cell) => `${cell.row},${cell.col}`),
  );

  for (const cell of topology.cells) {
    const reflected = reflectCoordAcrossLeadingDiagonal(cell.row, cell.col);
    if (!cellSet.has(`${reflected.row},${reflected.col}`)) {
      return false;
    }
  }

  return true;
}

export function buildComposedShapeTopology(spec: PuzzleSpec): Topology {
  if (spec.shapeFamily !== "composed") {
    throw new Error(
      `Unsupported shape family for composed builder: ${spec.shapeFamily}`,
    );
  }

  const { size, composedLayout } = spec;

  if (!Number.isInteger(size) || size < 2) {
    throw new Error(`Invalid composed shape size: ${size}`);
  }

  if (!composedLayout) {
    throw new Error("Composed shape spec is missing composedLayout.");
  }

  const layout = parseSerializedLayout(composedLayout);
  layout.overlapRows = spec.overlapRows ?? 1;
  layout.overlapCols = spec.overlapCols ?? 1;

  return buildTopologyFromComposedShapeDefinition(
    {
      kind: "composed",
      id:
        spec.shapeName
          ?.trim()
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-") || "composed-shape",
      name: spec.shapeName?.trim() || "Composed Shape",
      layout,
    },
    size,
  );
}

export function buildTopology(spec: PuzzleSpec): Topology {
  if (spec.shapeFamily !== "composed") {
    throw new Error(`Unsupported shape family: ${spec.shapeFamily}`);
  }

  return buildComposedShapeTopology(spec);
}

export function buildEmptyContent(
  spec: PuzzleSpec,
  topology: Topology,
): PuzzleContent {
  const formModel = buildFormModelFromTopology(spec, topology);

  const clues: Clue[] = formModel.formWords.map((formWord) => ({
    formWordId: formWord.id,
    text: "",
  }));

  return {
    metadata: {
      title: "",
      author: "",
      publication: "",
    },
    clues,
  };
}

export function buildEmptyFills(topology: Topology): Record<string, string> {
  const fillsByCellId: Record<string, string> = {};

  for (const cell of topology.cells) {
    fillsByCellId[cell.id] = "";
  }

  return fillsByCellId;
}
