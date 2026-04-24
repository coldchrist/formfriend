import type { ComposedShapeLayout, ShapePrimitive } from "./shapeDefinition";
import { validateComposedShapeLayout } from "./shapeLayout";
import { buildPrimitiveMask, type OccupiedCell } from "./shapePrimitives";

function normalizeOccupiedCells(cells: OccupiedCell[]): OccupiedCell[] {
  if (cells.length === 0) {
    return [];
  }

  const minRow = Math.min(...cells.map((cell) => cell.row));
  const minCol = Math.min(...cells.map((cell) => cell.col));

  return cells
    .map((cell) => ({
      row: cell.row - minRow,
      col: cell.col - minCol,
    }))
    .sort((a, b) => a.row - b.row || a.col - b.col);
}

export function buildOccupiedCellsFromComposedLayout(
  layout: ComposedShapeLayout,
  size: number,
): OccupiedCell[] {
  validateComposedShapeLayout(layout);

  if (!Number.isInteger(size) || size <= 0) {
    throw new Error("Composed shape size must be a positive integer.");
  }

  const rowStep = size - layout.overlapRows;
  const colStep = size - layout.overlapCols;

  if (rowStep <= 0 || colStep <= 0) {
    throw new Error(
      "Overlap is too large for the chosen size; resulting step must be positive.",
    );
  }

  const occupied = new Set<string>();

  for (let macroRow = 0; macroRow < layout.height; macroRow += 1) {
    for (let macroCol = 0; macroCol < layout.width; macroCol += 1) {
      const primitive = layout.rows[macroRow][macroCol] as ShapePrimitive;

      if (primitive === ".") {
        continue;
      }

      const mask = buildPrimitiveMask(primitive, size);
      const rowOffset = macroRow * rowStep;
      const colOffset = macroCol * colStep;

      for (const cell of mask) {
        const globalRow = rowOffset + cell.row;
        const globalCol = colOffset + cell.col;
        occupied.add(`${globalRow},${globalCol}`);
      }
    }
  }

  const cells: OccupiedCell[] = [...occupied].map((key) => {
    const [rowText, colText] = key.split(",");
    return {
      row: Number(rowText),
      col: Number(colText),
    };
  });

  return cells;
}

export function getOccupiedCellBounds(cells: OccupiedCell[]): {
  minRow: number;
  maxRow: number;
  minCol: number;
  maxCol: number;
  width: number;
  height: number;
} | null {
  if (cells.length === 0) {
    return null;
  }

  const minRow = Math.min(...cells.map((cell) => cell.row));
  const maxRow = Math.max(...cells.map((cell) => cell.row));
  const minCol = Math.min(...cells.map((cell) => cell.col));
  const maxCol = Math.max(...cells.map((cell) => cell.col));

  return {
    minRow,
    maxRow,
    minCol,
    maxCol,
    width: maxCol - minCol + 1,
    height: maxRow - minRow + 1,
  };
}
