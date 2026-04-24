import type { ComposedShapeDefinition } from "../domain/shapeDefinition";
import type { ShapeOrientation, ShapeVariant } from "../domain/shapeTransforms";
import type { FormStyle } from "../domain/types";
import {
  applyVariantSelection,
  supportsInversion,
  supportsLeftRightVariant,
} from "../domain/shapeTransforms";
import { getFormTypeTitle } from "./presentationHelpers";

export function findMatchingDesignerLibraryShapeName(
  sessionShapeLibrary: ComposedShapeDefinition[],
  target: ComposedShapeDefinition["layout"],
): string | null {
  function layoutsMatch(left: typeof target, right: typeof target) {
    return (
      left.width === right.width &&
      left.height === right.height &&
      left.overlapRows === right.overlapRows &&
      left.overlapCols === right.overlapCols &&
      left.rows.length === right.rows.length &&
      left.rows.every((row, index) => row === right.rows[index])
    );
  }

  for (const shape of sessionShapeLibrary) {
    let supportsLeftRight = false;
    let supportsInvert = false;

    try {
      supportsLeftRight = supportsLeftRightVariant(
        shape.layout,
        shape.renderHints?.gridPresentation ?? "square",
      );
      supportsInvert = supportsInversion(
        shape.layout,
        shape.renderHints?.gridPresentation ?? "square",
      );
    } catch {
      continue;
    }

    const candidateOrientations: ShapeOrientation[] = supportsLeftRight
      ? ["left", "right"]
      : ["left"];
    const candidateInversions = supportsInvert ? [false, true] : [false];

    for (const orientation of candidateOrientations) {
      for (const inverted of candidateInversions) {
        const candidateLayout = applyVariantSelection(
          shape.layout,
          orientation,
          inverted,
        );

        if (layoutsMatch(candidateLayout, target)) {
          return getFormTypeTitle(
            orientation === "right" ? "right" : "left",
            "double" as FormStyle,
            inverted,
            false,
            supportsLeftRight,
            shape.name,
          );
        }
      }
    }
  }

  return null;
}
