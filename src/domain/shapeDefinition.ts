export type ShapePrimitive = "." | "S" | "L" | "R" | "l" | "r";

export type ShapeDefinitionKind = "composed" | "explicit";

export interface ComposedShapeLayout {
  width: number;
  height: number;
  rows: string[];
  overlapRows: number;
  overlapCols: number;
}

export interface ShapeExtraEntry {
  id: string;
  cellIds: string[];
  label?: string;
}

export type GridPresentation = "square" | "hex";

export interface ShapeRenderHints {
  previewStyle?: "rect";
  gridPresentation?: GridPresentation;
}

export interface ComposedShapeDefinition {
  kind: "composed";
  id: string;
  name: string;
  layout: ComposedShapeLayout;
  subformIdsByMacroCell?: Record<string, string>;
  extraEntries?: ShapeExtraEntry[];
  renderHints?: ShapeRenderHints;
}

export interface ExplicitShapeDefinition {
  kind: "explicit";
  id: string;
  name: string;
  renderHints?: ShapeRenderHints;
}

export type ShapeDefinition = ComposedShapeDefinition | ExplicitShapeDefinition;

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
