import type { Cell, EntryDirection, EntryRef, Topology } from "./types";
import type { ComposedShapeDefinition } from "./shapeDefinition";
import { buildOccupiedCellsFromComposedLayout } from "./shapeComposition";

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
    entries: buildEntriesFromCells(cells),
  };
}
