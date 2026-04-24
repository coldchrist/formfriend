import type { ShapePrimitive } from "./shapeDefinition";

export interface OccupiedCell {
  row: number;
  col: number;
}

export type SolidShapePrimitive = Exclude<ShapePrimitive, ".">;

function assertValidSize(size: number): void {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error("Primitive size must be a positive integer.");
  }
}

export function buildPrimitiveMask(
  primitive: SolidShapePrimitive,
  size: number,
): OccupiedCell[] {
  assertValidSize(size);

  const cells: OccupiedCell[] = [];

  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      let occupied = false;

      switch (primitive) {
        case "S":
          occupied = true;
          break;

        // Upper-left triangle
        case "L":
          occupied = col <= size - 1 - row;
          break;

        // Upper-right triangle
        case "R":
          occupied = col >= row;
          break;

        // Lower-left triangle
        case "l":
          occupied = col <= row;
          break;

        // Lower-right triangle
        case "r":
          occupied = col >= size - 1 - row;
          break;
      }

      if (occupied) {
        cells.push({ row, col });
      }
    }
  }

  return cells;
}
