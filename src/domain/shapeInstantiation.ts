import type {
  CellMaskShapeDefinition,
  ComposedShapeDefinition,
  ShapeDefinition,
} from "./shapeDefinition";
import type { FormStyle, PuzzleSpec } from "./types";
import { serializeLayout } from "./shapeLayout";

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

  throw new Error(`Unsupported shape definition kind: ${definition.kind}`);
}
