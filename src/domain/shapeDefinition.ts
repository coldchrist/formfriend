import type { EntryPath, ExtraEntryReadingPolicy } from "./entryPath";

export type ShapePrimitive = "." | "S" | "L" | "R" | "l" | "r";

export type ShapeDefinitionKind = "composed" | "cellMask" | "explicit";

export interface ComposedShapeLayout {
  width: number;
  height: number;
  rows: string[];
  overlapRows: number;
  overlapCols: number;
}

export type ShapeExtraEntry = EntryPath;

export type GridPresentation = "square" | "hex";

export interface ShapeRenderHints {
  previewStyle?: "rect";
  gridPresentation?: GridPresentation;
}

/**
 * Canonical stored shape definitions.
 *
 * These are the source-independent shape records used in saved .shape.json files
 * and in the built-in standard shape library. Runtime code should normalize one
 * of these records before it needs parsed layout dimensions or derived cells.
 */
export interface CanonicalComposedShapeDefinition {
  version: 1;
  kind: "composed";
  id: string;
  name: string;
  layout: string;
  overlapRows: number;
  overlapCols: number;
  subformIdsByMacroCell?: Record<string, string>;
  extraEntries?: ShapeExtraEntry[];
  extraEntryReadingPolicy?: ExtraEntryReadingPolicy;
  renderHints?: ShapeRenderHints;
}

export interface CanonicalCellMaskShapeDefinition {
  version: 1;
  kind: "cellMask";
  id: string;
  name: string;
  width: number;
  height: number;
  rows: string[];
  extraEntries?: ShapeExtraEntry[];
  extraEntryReadingPolicy?: ExtraEntryReadingPolicy;
  renderHints?: ShapeRenderHints;
}

export type CanonicalShapeDefinition =
  | CanonicalComposedShapeDefinition
  | CanonicalCellMaskShapeDefinition;

/**
 * Normalized runtime shape definitions.
 *
 * These are produced from canonical definitions after parsing/validation and are
 * consumed by topology, transforms, rendering, and construction code.
 */
export interface ComposedShapeDefinition {
  kind: "composed";
  id: string;
  name: string;
  layout: ComposedShapeLayout;
  subformIdsByMacroCell?: Record<string, string>;
  extraEntries?: ShapeExtraEntry[];
  extraEntryReadingPolicy?: ExtraEntryReadingPolicy;
  renderHints?: ShapeRenderHints;
}

export interface CellMaskShapeDefinition {
  kind: "cellMask";
  id: string;
  name: string;
  width: number;
  height: number;
  rows: string[];
  extraEntries?: ShapeExtraEntry[];
  extraEntryReadingPolicy?: ExtraEntryReadingPolicy;
  renderHints?: ShapeRenderHints;
}

export interface ExplicitShapeDefinition {
  kind: "explicit";
  id: string;
  name: string;
  renderHints?: ShapeRenderHints;
}

export type ShapeDefinition =
  | ComposedShapeDefinition
  | CellMaskShapeDefinition
  | ExplicitShapeDefinition;

export function isShapePrimitive(value: string): value is ShapePrimitive {
  return (
    value === "." ||
    value === "S" ||
    value === "L" ||
    value === "R" ||
    value === "l" ||
    value === "r"
  );
}

export function makeMacroCellKey(row: number, col: number): string {
  return `${row},${col}`;
}

export function cloneComposedShapeLayout(
  layout: ComposedShapeLayout,
): ComposedShapeLayout {
  return {
    ...layout,
    rows: [...layout.rows],
  };
}
