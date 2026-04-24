import type {
  ComposedShapeLayout,
  GridPresentation,
  ShapePrimitive,
} from "./shapeDefinition";
import { validateComposedShapeLayout } from "./shapeLayout";

export type ShapeOrientation = "left" | "right";

export interface DerivedShapeVariants {
  canonical: ComposedShapeLayout;
  reflected: ComposedShapeLayout;
  inverted: ComposedShapeLayout;
  reflectedAndInverted: ComposedShapeLayout;
}

function cloneLayout(layout: ComposedShapeLayout): ComposedShapeLayout {
  return {
    ...layout,
    rows: [...layout.rows],
  };
}

export function reflectPrimitiveHorizontally(
  primitive: ShapePrimitive,
): ShapePrimitive {
  switch (primitive) {
    case "l":
      return "r";
    case "r":
      return "l";
    case "L":
      return "R";
    case "R":
      return "L";
    case "S":
      return "S";
    case ".":
      return ".";
    default:
      return primitive;
  }
}

export function invertPrimitiveVertically(
  primitive: ShapePrimitive,
): ShapePrimitive {
  switch (primitive) {
    case "l":
      return "L";
    case "L":
      return "l";
    case "r":
      return "R";
    case "R":
      return "r";
    case "S":
      return "S";
    case ".":
      return ".";
    default:
      return primitive;
  }
}

function mapRow(
  row: string,
  mapper: (primitive: ShapePrimitive) => ShapePrimitive,
): string {
  let result = "";

  for (const ch of row) {
    result += mapper(ch as ShapePrimitive);
  }

  return result;
}

export function reflectLayoutHorizontally(
  layout: ComposedShapeLayout,
): ComposedShapeLayout {
  validateComposedShapeLayout(layout);

  return {
    ...cloneLayout(layout),
    rows: layout.rows.map((row) =>
      mapRow([...row].reverse().join(""), reflectPrimitiveHorizontally),
    ),
  };
}

export function invertLayoutVertically(
  layout: ComposedShapeLayout,
): ComposedShapeLayout {
  validateComposedShapeLayout(layout);

  return {
    ...cloneLayout(layout),
    rows: [...layout.rows]
      .reverse()
      .map((row) => mapRow(row, invertPrimitiveVertically)),
  };
}

export function serializeLayoutCanonical(layout: ComposedShapeLayout): string {
  validateComposedShapeLayout(layout);

  return [
    `${layout.width}x${layout.height}`,
    `${layout.overlapRows},${layout.overlapCols}`,
    layout.rows.join(":"),
  ].join("|");
}

export function layoutsEqual(
  left: ComposedShapeLayout,
  right: ComposedShapeLayout,
): boolean {
  return serializeLayoutCanonical(left) === serializeLayoutCanonical(right);
}

export function deriveShapeVariants(
  layout: ComposedShapeLayout,
): DerivedShapeVariants {
  validateComposedShapeLayout(layout);

  const canonical = cloneLayout(layout);
  const reflected = reflectLayoutHorizontally(canonical);
  const inverted = invertLayoutVertically(canonical);
  const reflectedAndInverted = invertLayoutVertically(reflected);

  return {
    canonical,
    reflected,
    inverted,
    reflectedAndInverted,
  };
}

export function supportsLeftRightVariant(
  layout: ComposedShapeLayout,
  gridPresentation: GridPresentation = "square",
): boolean {
  if (gridPresentation === "hex") {
    return false;
  }

  const { canonical, reflected } = deriveShapeVariants(layout);
  return !layoutsEqual(canonical, reflected);
}

export function supportsInversion(
  layout: ComposedShapeLayout,
  gridPresentation: GridPresentation = "square",
): boolean {
  const { canonical, reflected, inverted, reflectedAndInverted } =
    deriveShapeVariants(layout);

  const reachableWithoutInversion =
    gridPresentation === "hex" ? [canonical] : [canonical, reflected];

  const invertedAddsNewLayout = !reachableWithoutInversion.some((candidate) =>
    layoutsEqual(candidate, inverted),
  );

  const reflectedInvertedAddsNewLayout = !reachableWithoutInversion.some(
    (candidate) => layoutsEqual(candidate, reflectedAndInverted),
  );

  return invertedAddsNewLayout || reflectedInvertedAddsNewLayout;
}

export function describeVariantSupport(layout: ComposedShapeLayout): {
  supportsLeftRight: boolean;
  supportsInversion: boolean;
  canonical: string;
  reflected: string;
  inverted: string;
  reflectedAndInverted: string;
} {
  const variants = deriveShapeVariants(layout);

  return {
    supportsLeftRight: !layoutsEqual(variants.canonical, variants.reflected),
    supportsInversion: supportsInversion(layout),
    canonical: variants.canonical.rows.join(":"),
    reflected: variants.reflected.rows.join(":"),
    inverted: variants.inverted.rows.join(":"),
    reflectedAndInverted: variants.reflectedAndInverted.rows.join(":"),
  };
}

export function applyVariantSelection(
  layout: ComposedShapeLayout,
  orientation: ShapeOrientation,
  inverted: boolean,
): ComposedShapeLayout {
  let result = layout;

  if (orientation === "right") {
    result = reflectLayoutHorizontally(result);
  }

  if (inverted) {
    result = invertLayoutVertically(result);
  }

  return result;
}
