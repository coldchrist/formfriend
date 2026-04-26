import type { Cell, EntryDirection, EntryRef, Topology } from "./types";
import type {
  CellMaskShapeDefinition,
  ComposedShapeDefinition,
  ShapeExtraEntry,
} from "./shapeDefinition";
import { buildOccupiedCellsFromComposedLayout } from "./shapeComposition";
import {
  expandEntryPathToCellIds,
  validateEntryPath,
  type EntryPathExpansionContext,
} from "./entryPath";

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

function compareCellsReadingOrder(
  left: { row: number; col: number },
  right: { row: number; col: number },
): number {
  if (left.row !== right.row) {
    return left.row - right.row;
  }
  return left.col - right.col;
}

function buildBaseEntriesFromCells(cells: Cell[]): EntryRef[] {
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

  function buildEntryCells(
    startCell: Cell,
    direction: Extract<EntryDirection, "across" | "down">,
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

  for (const cell of sortedCells) {
    if (isAcrossStart(cell) || isDownStart(cell)) {
      numberingByCellId.set(cell.id, nextNumber);
      nextNumber += 1;
    }
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

function buildExtraEntriesFromPaths(
  cells: Cell[],
  extraEntries: ShapeExtraEntry[] | undefined,
  context?: EntryPathExpansionContext,
): EntryRef[] {
  if (!extraEntries?.length) {
    return [];
  }

  return extraEntries.map((entry, index) => {
    validateEntryPath(entry, cells, context);
    const number = index + 1;
    const label = entry.label?.trim() || `X${number}`;

    return {
      id: entry.id || `X${number}`,
      number,
      label,
      direction: "extra" as EntryDirection,
      cells: expandEntryPathToCellIds(entry, context),
    };
  });
}

export function buildEntriesFromCells(
  cells: Cell[],
  extraEntries?: ShapeExtraEntry[],
  context?: EntryPathExpansionContext,
): EntryRef[] {
  return [
    ...buildBaseEntriesFromCells(cells),
    ...buildExtraEntriesFromPaths(cells, extraEntries, context),
  ];
}

export function buildTopologyFromComposedShapeDefinition(
  definition: ComposedShapeDefinition,
  size: number,
): Topology {
  const occupied = buildOccupiedCellsFromComposedLayout(
    definition.layout,
    size,
  );

  const cells: Cell[] = occupied.map((cell) => ({
    id: cellId(cell.row, cell.col),
    row: cell.row,
    col: cell.col,
  }));

  return {
    cells: sortCellsReadingOrder(cells),
    entries: buildEntriesFromCells(cells, definition.extraEntries, { size }),
  };
}

export function buildTopologyFromCellMaskShapeDefinition(
  definition: CellMaskShapeDefinition,
): Topology {
  if (!Number.isInteger(definition.width) || definition.width < 1) {
    throw new Error("Cell mask width must be a positive integer.");
  }
  if (!Number.isInteger(definition.height) || definition.height < 1) {
    throw new Error("Cell mask height must be a positive integer.");
  }
  if (definition.rows.length !== definition.height) {
    throw new Error("Cell mask row count does not match height.");
  }

  const cells: Cell[] = [];

  definition.rows.forEach((rowText, row) => {
    if (rowText.length !== definition.width) {
      throw new Error("Cell mask row width does not match width.");
    }

    [...rowText].forEach((ch, col) => {
      if (ch === "#") {
        cells.push({ id: cellId(row, col), row, col });
        return;
      }
      if (ch !== ".") {
        throw new Error("Cell mask rows may only contain # and . characters.");
      }
    });
  });

  cells.sort(compareCellsReadingOrder);

  return {
    cells,
    entries: buildEntriesFromCells(cells, definition.extraEntries),
  };
}
