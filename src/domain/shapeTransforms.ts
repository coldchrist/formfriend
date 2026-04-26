import type {
  ComposedShapeDefinition,
  ComposedShapeLayout,
  GridPresentation,
  ShapePrimitive,
} from "./shapeDefinition";
import { validateComposedShapeLayout } from "./shapeLayout";
import { buildOccupiedCellsFromComposedLayout } from "./shapeComposition";
import {
  expandEntryPath,
  inferEntryPathFromCoords,
  orientCellCoordsByReadingPolicy,
  type CellCoord,
  type EntryPath,
  type ExtraEntryReadingPolicy,
} from "./entryPath";

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

function normalizeLayoutRowsUpToTranslation(
  layout: ComposedShapeLayout,
): string[] {
  validateComposedShapeLayout(layout);

  const occupiedPositions: Array<{ row: number; col: number }> = [];

  layout.rows.forEach((rowText, row) => {
    [...rowText].forEach((primitive, col) => {
      if (primitive !== ".") {
        occupiedPositions.push({ row, col });
      }
    });
  });

  if (occupiedPositions.length === 0) {
    return [];
  }

  const minRow = Math.min(...occupiedPositions.map((position) => position.row));
  const maxRow = Math.max(...occupiedPositions.map((position) => position.row));
  const minCol = Math.min(...occupiedPositions.map((position) => position.col));
  const maxCol = Math.max(...occupiedPositions.map((position) => position.col));

  const normalizedRows: string[] = [];

  for (let row = minRow; row <= maxRow; row += 1) {
    let normalizedRow = "";

    for (let col = minCol; col <= maxCol; col += 1) {
      normalizedRow += layout.rows[row][col];
    }

    normalizedRows.push(normalizedRow);
  }

  return normalizedRows;
}

export function layoutsEquivalentUpToTranslation(
  left: ComposedShapeLayout,
  right: ComposedShapeLayout,
): boolean {
  if (
    left.overlapRows !== right.overlapRows ||
    left.overlapCols !== right.overlapCols
  ) {
    return false;
  }

  return (
    normalizeLayoutRowsUpToTranslation(left).join(":") ===
    normalizeLayoutRowsUpToTranslation(right).join(":")
  );
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
  return !layoutsEquivalentUpToTranslation(canonical, reflected);
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

function getExpandedLayoutBounds(
  layout: ComposedShapeLayout,
  size: number,
): { minRow: number; maxRow: number; minCol: number; maxCol: number } {
  const cells = buildOccupiedCellsFromComposedLayout(layout, size);

  if (cells.length === 0) {
    return { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
  }

  return {
    minRow: Math.min(...cells.map((cell) => cell.row)),
    maxRow: Math.max(...cells.map((cell) => cell.row)),
    minCol: Math.min(...cells.map((cell) => cell.col)),
    maxCol: Math.max(...cells.map((cell) => cell.col)),
  };
}

function reflectCoordsHorizontally(
  coords: CellCoord[],
  layout: ComposedShapeLayout,
  size: number,
): CellCoord[] {
  const bounds = getExpandedLayoutBounds(layout, size);
  return coords.map((coord) => ({
    row: coord.row,
    col: bounds.minCol + bounds.maxCol - coord.col,
  }));
}

function invertCoordsVertically(
  coords: CellCoord[],
  layout: ComposedShapeLayout,
  size: number,
): CellCoord[] {
  const bounds = getExpandedLayoutBounds(layout, size);
  return coords.map((coord) => ({
    row: bounds.minRow + bounds.maxRow - coord.row,
    col: coord.col,
  }));
}

export function transformExtraEntryPathForVariant(
  path: EntryPath,
  layout: ComposedShapeLayout,
  size: number,
  orientation: ShapeOrientation,
  inverted: boolean,
  readingPolicy: ExtraEntryReadingPolicy,
): EntryPath {
  let currentLayout = layout;
  let coords = expandEntryPath(path, { size });

  if (orientation === "right") {
    coords = reflectCoordsHorizontally(coords, currentLayout, size);
    currentLayout = reflectLayoutHorizontally(currentLayout);
  }

  if (inverted) {
    coords = invertCoordsVertically(coords, currentLayout, size);
  }

  const orientedCoords = orientCellCoordsByReadingPolicy(coords, readingPolicy);
  return inferEntryPathFromCoords(path.id, orientedCoords, path.label);
}

export function transformExtraEntriesForVariant(
  entries: EntryPath[] | undefined,
  layout: ComposedShapeLayout,
  size: number,
  orientation: ShapeOrientation,
  inverted: boolean,
  readingPolicy: ExtraEntryReadingPolicy,
): EntryPath[] | undefined {
  if (!entries?.length) {
    return entries;
  }

  return entries.map((entry) =>
    transformExtraEntryPathForVariant(
      entry,
      layout,
      size,
      orientation,
      inverted,
      readingPolicy,
    ),
  );
}

export function transformComposedShapeDefinitionForVariant(
  definition: ComposedShapeDefinition,
  size: number,
  orientation: ShapeOrientation,
  inverted: boolean,
  readingPolicy: ExtraEntryReadingPolicy,
): ComposedShapeDefinition {
  return {
    ...definition,
    layout: applyVariantSelection(definition.layout, orientation, inverted),
    extraEntries: transformExtraEntriesForVariant(
      definition.extraEntries,
      definition.layout,
      size,
      orientation,
      inverted,
      readingPolicy,
    ),
    extraEntryReadingPolicy: readingPolicy,
  };
}
