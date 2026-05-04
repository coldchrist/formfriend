import type {
  ComposedShapeDefinition,
  CompositeComponentPlacement,
  GridPresentation,
} from "./shapeDefinition";
import { buildOccupiedCellsFromComposedLayout, getOccupiedCellBounds } from "./shapeComposition";
import { applyVariantSelection } from "./shapeTransforms";
import type { ShapeVariant } from "./types";

export interface CompositeCompatibilitySchema {
  slotWidth: number;
  slotHeight: number;
  overlapRows: number;
  overlapCols: number;
  gridPresentation: GridPresentation;
}

export function getComposedShapeCompatibilitySchema(
  shape: ComposedShapeDefinition,
  primitiveSize: number,
  shapeVariant: ShapeVariant = "left",
  inverted = false,
): CompositeCompatibilitySchema {
  const layout = applyVariantSelection(shape.layout, shapeVariant, inverted);
  const occupiedCells = buildOccupiedCellsFromComposedLayout(layout, primitiveSize);
  const bounds = getOccupiedCellBounds(occupiedCells);

  if (!bounds) {
    throw new Error("Component shape produced no occupied cells.");
  }

  return {
    slotWidth: bounds.width,
    slotHeight: bounds.height,
    overlapRows: shape.layout.overlapRows,
    overlapCols: shape.layout.overlapCols,
    gridPresentation: shape.renderHints?.gridPresentation ?? "square",
  };
}

export function getCompositeComponentCompatibilitySchema(
  component: CompositeComponentPlacement & { definition: ComposedShapeDefinition },
  primitiveSize: number,
): CompositeCompatibilitySchema {
  return getComposedShapeCompatibilitySchema(
    component.definition,
    primitiveSize,
    component.shapeVariant ?? "left",
    component.inverted ?? false,
  );
}

export function areCompositeSchemasCompatible(
  expected: CompositeCompatibilitySchema,
  candidate: CompositeCompatibilitySchema,
): boolean {
  return (
    expected.slotWidth === candidate.slotWidth &&
    expected.slotHeight === candidate.slotHeight &&
    expected.overlapRows === candidate.overlapRows &&
    expected.overlapCols === candidate.overlapCols &&
    expected.gridPresentation === candidate.gridPresentation
  );
}

export function describeCompositeCompatibilitySchema(
  schema: CompositeCompatibilitySchema,
): string {
  return [
    `${schema.slotWidth}x${schema.slotHeight} slot`,
    `${schema.overlapRows}/${schema.overlapCols} overlap`,
    `${schema.gridPresentation} grid`,
  ].join(", ");
}
