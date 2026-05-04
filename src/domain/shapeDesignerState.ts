import type {
  ComposedShapeLayout,
  CompositeComponentPlacement,
  CompositeShapeVariant,
  ShapePrimitive,
} from "./shapeDefinition";
import {
  clearPrimitiveAt,
  createEmptyComposedShapeLayout,
  resizeComposedShapeLayout,
  setPrimitiveAt,
} from "./shapeLayout";

export type ShapeDesignerDesignType = "primitive" | "composite";

export interface ShapeDesignerSelection {
  row: number;
  col: number;
}

export interface CompositeDesignerGrid {
  width: number;
  height: number;
  cells: CompositeComponentPlacement[];
}

export interface ShapeDesignerState {
  designType: ShapeDesignerDesignType;
  name: string;
  layout: ComposedShapeLayout;
  componentGrid: CompositeDesignerGrid;
  size: number;
  selectedPrimitive: ShapePrimitive;
  selection: ShapeDesignerSelection;
  componentSelection: ShapeDesignerSelection;
}

export function createInitialShapeDesignerState(): ShapeDesignerState {
  return {
    designType: "primitive",
    name: "Untitled shape",
    layout: createEmptyComposedShapeLayout(2, 2),
    componentGrid: { width: 2, height: 2, cells: [] },
    size: 4,
    selectedPrimitive: "S",
    selection: { row: 0, col: 0 },
    componentSelection: { row: 0, col: 0 },
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

export function clampGridSelection(
  width: number,
  height: number,
  selection: ShapeDesignerSelection,
): ShapeDesignerSelection {
  return {
    row: Math.max(0, Math.min(height - 1, selection.row)),
    col: Math.max(0, Math.min(width - 1, selection.col)),
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

export function moveGridSelection(
  width: number,
  height: number,
  selection: ShapeDesignerSelection,
  deltaRow: number,
  deltaCol: number,
): ShapeDesignerSelection {
  return clampGridSelection(width, height, {
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
    designType: "primitive",
    name: name ?? state.name,
    layout,
    size: Math.max(state.size, minimumSafeSize),
    selection: { row: 0, col: 0 },
  };
}

export function replaceDesignerCompositeGrid(
  state: ShapeDesignerState,
  componentGrid: CompositeDesignerGrid,
  name?: string,
): ShapeDesignerState {
  return {
    ...state,
    designType: "composite",
    name: name ?? state.name,
    componentGrid,
    componentSelection: { row: 0, col: 0 },
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

export function resizeDesignerComponentGrid(
  state: ShapeDesignerState,
  width: number,
  height: number,
): ShapeDesignerState {
  const cells = state.componentGrid.cells.filter(
    (cell) => cell.row < height && cell.col < width,
  );

  return {
    ...state,
    componentGrid: { width, height, cells },
    componentSelection: {
      row: Math.min(state.componentSelection.row, height - 1),
      col: Math.min(state.componentSelection.col, width - 1),
    },
  };
}

export function clearDesignerLayout(
  state: ShapeDesignerState,
): ShapeDesignerState {
  if (state.designType === "composite") {
    return {
      ...state,
      componentGrid: {
        ...state.componentGrid,
        cells: [],
      },
      componentSelection: { row: 0, col: 0 },
    };
  }

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

export function placeComponentAtSelection(
  state: ShapeDesignerState,
  shapeId: string,
  shapeVariant: CompositeShapeVariant = "left",
  inverted = false,
): ShapeDesignerState {
  const row = state.componentSelection.row;
  const col = state.componentSelection.col;
  const cells = state.componentGrid.cells.filter(
    (cell) => cell.row !== row || cell.col !== col,
  );

  return {
    ...state,
    componentGrid: {
      ...state.componentGrid,
      cells: [...cells, { row, col, shapeId, shapeVariant, inverted }],
    },
  };
}

export function clearComponentAtSelection(
  state: ShapeDesignerState,
): ShapeDesignerState {
  const row = state.componentSelection.row;
  const col = state.componentSelection.col;
  return {
    ...state,
    componentGrid: {
      ...state.componentGrid,
      cells: state.componentGrid.cells.filter(
        (cell) => cell.row !== row || cell.col !== col,
      ),
    },
  };
}
