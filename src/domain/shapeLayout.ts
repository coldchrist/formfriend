import {
  type ComposedShapeLayout,
  type ShapePrimitive,
  isShapePrimitive,
} from "./shapeDefinition";

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer.`);
  }
}

function validateRowWidth(row: string, width: number, rowIndex: number): void {
  if (row.length !== width) {
    throw new Error(
      `Row ${rowIndex} has width ${row.length}, expected ${width}.`,
    );
  }
}

export function createEmptyComposedShapeLayout(
  width: number,
  height: number,
): ComposedShapeLayout {
  assertPositiveInteger(width, "width");
  assertPositiveInteger(height, "height");

  return {
    width,
    height,
    rows: Array.from({ length: height }, () => ".".repeat(width)),
    overlapRows: 1,
    overlapCols: 1,
  };
}

export function validateComposedShapeLayout(layout: ComposedShapeLayout): void {
  assertPositiveInteger(layout.width, "layout.width");
  assertPositiveInteger(layout.height, "layout.height");

  if (layout.rows.length !== layout.height) {
    throw new Error(
      `Layout has ${layout.rows.length} rows, expected ${layout.height}.`,
    );
  }

  if (!Number.isInteger(layout.overlapRows) || layout.overlapRows < 0) {
    throw new Error("layout.overlapRows must be an integer >= 0.");
  }

  if (!Number.isInteger(layout.overlapCols) || layout.overlapCols < 0) {
    throw new Error("layout.overlapCols must be an integer >= 0.");
  }

  layout.rows.forEach((row, rowIndex) => {
    validateRowWidth(row, layout.width, rowIndex);

    for (const ch of row) {
      if (!isShapePrimitive(ch)) {
        throw new Error(`Invalid shape primitive '${ch}' in row ${rowIndex}.`);
      }
    }
  });
}

export function getPrimitiveAt(
  layout: ComposedShapeLayout,
  row: number,
  col: number,
): ShapePrimitive {
  validateComposedShapeLayout(layout);

  if (row < 0 || row >= layout.height || col < 0 || col >= layout.width) {
    throw new Error(`Macro-cell (${row}, ${col}) is out of bounds.`);
  }

  const ch = layout.rows[row][col];
  if (!isShapePrimitive(ch)) {
    throw new Error(`Invalid shape primitive '${ch}' at (${row}, ${col}).`);
  }

  return ch;
}

export function setPrimitiveAt(
  layout: ComposedShapeLayout,
  row: number,
  col: number,
  primitive: ShapePrimitive,
): ComposedShapeLayout {
  validateComposedShapeLayout(layout);

  if (row < 0 || row >= layout.height || col < 0 || col >= layout.width) {
    throw new Error(`Macro-cell (${row}, ${col}) is out of bounds.`);
  }

  const nextRows = [...layout.rows];
  const oldRow = nextRows[row];
  nextRows[row] = `${oldRow.slice(0, col)}${primitive}${oldRow.slice(col + 1)}`;

  return {
    ...layout,
    rows: nextRows,
  };
}

export function clearPrimitiveAt(
  layout: ComposedShapeLayout,
  row: number,
  col: number,
): ComposedShapeLayout {
  return setPrimitiveAt(layout, row, col, ".");
}

export function resizeComposedShapeLayout(
  layout: ComposedShapeLayout,
  width: number,
  height: number,
): ComposedShapeLayout {
  validateComposedShapeLayout(layout);
  assertPositiveInteger(width, "width");
  assertPositiveInteger(height, "height");

  const nextRows: string[] = [];

  for (let row = 0; row < height; row += 1) {
    const sourceRow = row < layout.height ? layout.rows[row] : "";
    const padded = `${sourceRow}${".".repeat(width)}`;
    nextRows.push(padded.slice(0, width));
  }

  return {
    ...layout,
    width,
    height,
    rows: nextRows,
  };
}

export function serializeLayout(layout: ComposedShapeLayout): string {
  validateComposedShapeLayout(layout);
  return layout.rows.join(":");
}

export function parseSerializedLayout(serialized: string): ComposedShapeLayout {
  const rows = serialized.split(":").map((row) => row.trim());

  if (rows.length === 0 || (rows.length === 1 && rows[0] === "")) {
    throw new Error("Serialized layout is empty.");
  }

  const width = rows[0]?.length ?? 0;
  const height = rows.length;

  const layout: ComposedShapeLayout = {
    width,
    height,
    rows,
    overlapRows: 1,
    overlapCols: 1,
  };

  validateComposedShapeLayout(layout);
  return layout;
}
