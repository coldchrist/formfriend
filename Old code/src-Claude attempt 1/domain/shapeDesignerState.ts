import type { ComposedShapeLayout, ShapePrimitive } from "./shapeDefinition";
import {
  clearPrimitiveAt,
  createEmptyComposedShapeLayout,
  resizeComposedShapeLayout,
  setPrimitiveAt,
} from "./shapeLayout";

export interface ShapeDesignerSelection {
  row: number;
  col: number;
}

export interface ShapeDesignerState {
  name: string;
  layout: ComposedShapeLayout;
  size: number;
  selectedPrimitive: ShapePrimitive;
  selection: ShapeDesignerSelection;
}

export function createInitialShapeDesignerState(): ShapeDesignerState {
  return {
    name: "",
    layout: createEmptyComposedShapeLayout(2, 2),
    size: 4,
    selectedPrimitive: "S",
    selection: { row: 0, col: 0 },
  };
}

export function clampSelection(
  layout: ComposedShapeLayout,
  selection: ShapeDesignerSelection,
): ShapeDesignerSelection {
  return {
    row: Math.max(0, Math.min(layout.height - 1, selection.row)),
    col: Math.max(0, Math.min(layout.width - 1, selection.col)),
  };
}

export function moveSelection(
  layout: ComposedShapeLayout,
  selection: ShapeDesignerSelection,
  deltaRow: number,
  deltaCol: number,
): ShapeDesignerSelection {
  return clampSelection(layout, {
    row: selection.row + deltaRow,
    col: selection.col + deltaCol,
  });
}

export function advanceSelection(
  layout: ComposedShapeLayout,
  selection: ShapeDesignerSelection,
): ShapeDesignerSelection {
  const nextCol = selection.col + 1;
  if (nextCol < layout.width) {
    return { row: selection.row, col: nextCol };
  }

  if (selection.row + 1 < layout.height) {
    return { row: selection.row + 1, col: 0 };
  }

  return selection;
}

export function retreatSelection(
  layout: ComposedShapeLayout,
  selection: ShapeDesignerSelection,
): ShapeDesignerSelection {
  const prevCol = selection.col - 1;
  if (prevCol >= 0) {
    return { row: selection.row, col: prevCol };
  }

  if (selection.row - 1 >= 0) {
    return { row: selection.row - 1, col: layout.width - 1 };
  }

  return selection;
}

export function placePrimitiveAtSelection(
  state: ShapeDesignerState,
  primitive: ShapePrimitive,
): ShapeDesignerState {
  return {
    ...state,
    layout: setPrimitiveAt(
      state.layout,
      state.selection.row,
      state.selection.col,
      primitive,
    ),
    selection: advanceSelection(state.layout, state.selection),
  };
}

export function clearPrimitiveAtSelection(
  state: ShapeDesignerState,
  moveBack: boolean,
): ShapeDesignerState {
  const clearedLayout = clearPrimitiveAt(
    state.layout,
    state.selection.row,
    state.selection.col,
  );

  const nextSelection = moveBack
    ? retreatSelection(state.layout, state.selection)
    : advanceSelection(state.layout, state.selection);

  return {
    ...state,
    layout: clearedLayout,
    selection: nextSelection,
  };
}

export function replaceDesignerLayout(
  state: ShapeDesignerState,
  layout: ComposedShapeLayout,
  name?: string,
): ShapeDesignerState {
  const minimumSafeSize = Math.max(layout.overlapRows, layout.overlapCols) + 1;

  return {
    ...state,
    name: name ?? state.name,
    layout,
    size: Math.max(state.size, minimumSafeSize),
    selection: { row: 0, col: 0 },
  };
}

export function resizeDesignerLayout(
  state: ShapeDesignerState,
  width: number,
  height: number,
): ShapeDesignerState {
  const layout = resizeComposedShapeLayout(state.layout, width, height);

  return {
    ...state,
    layout,
    selection: {
      row: Math.min(state.selection.row, height - 1),
      col: Math.min(state.selection.col, width - 1),
    },
  };
}

export function clearDesignerLayout(
  state: ShapeDesignerState,
): ShapeDesignerState {
  const emptyLayout = createEmptyComposedShapeLayout(
    state.layout.width,
    state.layout.height,
  );

  return {
    ...state,
    layout: {
      ...emptyLayout,
      overlapRows: state.layout.overlapRows,
      overlapCols: state.layout.overlapCols,
    },
    selection: { row: 0, col: 0 },
  };
}

export function setDesignerOverlap(
  state: ShapeDesignerState,
  overlap: number,
): ShapeDesignerState {
  const clamped = Math.max(0, Math.min(5, overlap));

  return {
    ...state,
    layout: {
      ...state.layout,
      overlapRows: clamped,
      overlapCols: clamped,
    },
  };
}
