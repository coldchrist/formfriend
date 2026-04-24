import type { ComposedShapeDefinition } from "./shapeDefinition";
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

    shapeId: definition.id,
    shapeName: definition.name,
  };
}
