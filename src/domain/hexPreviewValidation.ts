import type { Cell, Topology } from "./types";

function getHexPreviewPoint(
  cell: Cell,
  cellsByRow: Map<number, Cell[]>,
  maxDisplayedRowSpan: number,
) {
  const rowCells = cellsByRow.get(cell.row) ?? [];
  const rowMinCol = Math.min(...rowCells.map((rowCell) => rowCell.col));
  const rowMaxCol = Math.max(...rowCells.map((rowCell) => rowCell.col));
  const rowSpan = rowMaxCol - rowMinCol + 1;

  return {
    x: (maxDisplayedRowSpan - rowSpan) / 2 + (cell.col - rowMinCol),
    y: cell.row,
  };
}

export function isHexPreviewValid(topology: Topology): boolean {
  const cellById = new Map(topology.cells.map((cell) => [cell.id, cell]));

  const cellsByRow = new Map<number, Cell[]>();
  for (const cell of topology.cells) {
    const existing = cellsByRow.get(cell.row) ?? [];
    existing.push(cell);
    cellsByRow.set(cell.row, existing);
  }

  for (const rowCells of cellsByRow.values()) {
    rowCells.sort((a, b) => a.col - b.col);
  }

  const maxDisplayedRowSpan = Math.max(
    ...[...cellsByRow.values()].map((rowCells) => {
      const rowMinCol = Math.min(...rowCells.map((cell) => cell.col));
      const rowMaxCol = Math.max(...rowCells.map((cell) => cell.col));
      return rowMaxCol - rowMinCol + 1;
    }),
    0,
  );

  for (const entry of topology.entries) {
    if (entry.direction !== "down" || entry.cells.length <= 2) {
      continue;
    }

    const points = entry.cells
      .map((cellId) => cellById.get(cellId))
      .filter((cell): cell is Cell => Boolean(cell))
      .map((cell) => getHexPreviewPoint(cell, cellsByRow, maxDisplayedRowSpan));

    const dx = points[1].x - points[0].x;
    const dy = points[1].y - points[0].y;

    for (let i = 2; i < points.length; i += 1) {
      if (
        points[i].x - points[i - 1].x !== dx ||
        points[i].y - points[i - 1].y !== dy
      ) {
        return false;
      }
    }
  }

  return true;
}
