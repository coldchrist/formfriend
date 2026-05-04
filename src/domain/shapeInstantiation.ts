import type {
  CellMaskShapeDefinition,
  CompositeShapeDefinition,
  ComposedShapeDefinition,
  ShapeDefinition,
} from "./shapeDefinition";
import type { FormStyle, PuzzleSpec } from "./types";
import { serializeLayout } from "./shapeLayout";
import { buildTopologyFromCompositeShapeDefinition } from "./shapeTopology";

export function buildPuzzleSpecFromComposedShapeDefinition(
  definition: ComposedShapeDefinition,
  size: number,
  requestedFormStyle: FormStyle,
): PuzzleSpec {
  return {
    shapeFamily: "composed",
    size,
    formStyle: requestedFormStyle,
    composedLayout: serializeLayout(definition.layout),
    overlapRows: definition.layout.overlapRows,
    overlapCols: definition.layout.overlapCols,
    extraEntries: definition.extraEntries,

    shapeId: definition.id,
    shapeName: definition.name,
  };
}

export function buildPuzzleSpecFromCellMaskShapeDefinition(
  definition: CellMaskShapeDefinition,
  requestedFormStyle: FormStyle,
): PuzzleSpec {
  return {
    shapeFamily: "cellMask",
    size: Math.max(definition.width, definition.height),
    formStyle: requestedFormStyle,
    cellMaskRows: [...definition.rows],
    cellMaskWidth: definition.width,
    cellMaskHeight: definition.height,
    extraEntries: definition.extraEntries,

    shapeId: definition.id,
    shapeName: definition.name,
  };
}


function cellMaskRowsFromCells(cells: Array<{ row: number; col: number }>): {
  rows: string[];
  width: number;
  height: number;
} {
  if (!cells.length) {
    throw new Error("Cannot instantiate an empty composite shape.");
  }

  const minRow = Math.min(...cells.map((cell) => cell.row));
  const maxRow = Math.max(...cells.map((cell) => cell.row));
  const minCol = Math.min(...cells.map((cell) => cell.col));
  const maxCol = Math.max(...cells.map((cell) => cell.col));
  const width = maxCol - minCol + 1;
  const height = maxRow - minRow + 1;
  const occupied = new Set(cells.map((cell) => `${cell.row - minRow},${cell.col - minCol}`));
  const rows: string[] = [];

  for (let row = 0; row < height; row += 1) {
    let rowText = "";
    for (let col = 0; col < width; col += 1) {
      rowText += occupied.has(`${row},${col}`) ? "#" : ".";
    }
    rows.push(rowText);
  }

  return { rows, width, height };
}

export function buildPuzzleSpecFromCompositeShapeDefinition(
  definition: CompositeShapeDefinition,
  size: number,
  requestedFormStyle: FormStyle,
): PuzzleSpec {
  const resized = { ...definition, primitiveSize: size };
  const topology = buildTopologyFromCompositeShapeDefinition(resized);
  const mask = cellMaskRowsFromCells(topology.cells);

  return {
    shapeFamily: "cellMask",
    size,
    formStyle: requestedFormStyle,
    cellMaskRows: mask.rows,
    cellMaskWidth: mask.width,
    cellMaskHeight: mask.height,
    extraEntries: definition.extraEntries,

    shapeId: definition.id,
    shapeName: definition.name,
  };
}

export function buildPuzzleSpecFromShapeDefinition(
  definition: ShapeDefinition,
  size: number,
  requestedFormStyle: FormStyle,
): PuzzleSpec {
  if (definition.kind === "composed") {
    return buildPuzzleSpecFromComposedShapeDefinition(
      definition,
      size,
      requestedFormStyle,
    );
  }

  if (definition.kind === "cellMask") {
    return buildPuzzleSpecFromCellMaskShapeDefinition(
      definition,
      requestedFormStyle,
    );
  }

  if (definition.kind === "composite") {
    return buildPuzzleSpecFromCompositeShapeDefinition(
      definition,
      size,
      requestedFormStyle,
    );
  }

  throw new Error(`Unsupported shape definition kind: ${definition.kind}`);
}
