import type { Cell, EntryDirection, EntryRef, Topology } from "./types";
import type {
  CellMaskShapeDefinition,
  CompositeShapeDefinition,
  ComposedShapeDefinition,
  ShapeExtraEntry,
  CompositeComponentPlacement,
} from "./shapeDefinition";
import {
  buildOccupiedCellsFromComposedLayout,
  getOccupiedCellBounds,
} from "./shapeComposition";
import { applyVariantSelection } from "./shapeTransforms";
import {
  areCompositeSchemasCompatible,
  describeCompositeCompatibilitySchema,
  getCompositeComponentCompatibilitySchema,
  type CompositeCompatibilitySchema,
} from "./shapeCompatibility";
import {
  expandEntryPathToCellIds,
  validateEntryPath,
  type EntryPathExpansionContext,
} from "./entryPath";

function cellId(row: number, col: number): string {
  return `r${row}c${col}`;
}

function sortCellsReadingOrder(cells: Cell[]): Cell[] {
  return [...cells].sort((a, b) => {
    if (a.row !== b.row) {
      return a.row - b.row;
    }
    return a.col - b.col;
  });
}

function compareCellsReadingOrder(
  left: { row: number; col: number },
  right: { row: number; col: number },
): number {
  if (left.row !== right.row) {
    return left.row - right.row;
  }
  return left.col - right.col;
}

function buildBaseEntriesFromCells(cells: Cell[]): EntryRef[] {
  const sortedCells = sortCellsReadingOrder(cells);
  const cellSet = new Set(cells.map((cell) => cell.id));
  const numberingByCellId = new Map<string, number>();
  let nextNumber = 1;

  function hasCell(row: number, col: number): boolean {
    return cellSet.has(cellId(row, col));
  }

  function isAcrossStart(cell: Cell): boolean {
    return !hasCell(cell.row, cell.col - 1);
  }

  function isDownStart(cell: Cell): boolean {
    return !hasCell(cell.row - 1, cell.col);
  }

  function buildEntryCells(
    startCell: Cell,
    direction: Extract<EntryDirection, "across" | "down">,
  ): string[] {
    const cellsInEntry: string[] = [];
    let row = startCell.row;
    let col = startCell.col;

    while (hasCell(row, col)) {
      cellsInEntry.push(cellId(row, col));
      if (direction === "across") {
        col += 1;
      } else {
        row += 1;
      }
    }

    return cellsInEntry;
  }

  for (const cell of sortedCells) {
    if (isAcrossStart(cell) || isDownStart(cell)) {
      numberingByCellId.set(cell.id, nextNumber);
      nextNumber += 1;
    }
  }

  const acrossEntries: EntryRef[] = [];
  const downEntries: EntryRef[] = [];

  for (const cell of sortedCells) {
    if (isAcrossStart(cell)) {
      const number = numberingByCellId.get(cell.id);
      if (number === undefined) {
        throw new Error(`Missing clue number for cell ${cell.id}`);
      }

      acrossEntries.push({
        id: `A${number}`,
        number,
        label: `${number}A`,
        direction: "across",
        cells: buildEntryCells(cell, "across"),
      });
    }

    if (isDownStart(cell)) {
      const number = numberingByCellId.get(cell.id);
      if (number === undefined) {
        throw new Error(`Missing clue number for cell ${cell.id}`);
      }

      downEntries.push({
        id: `D${number}`,
        number,
        label: `${number}D`,
        direction: "down",
        cells: buildEntryCells(cell, "down"),
      });
    }
  }

  return [...acrossEntries, ...downEntries];
}

function buildExtraEntriesFromPaths(
  cells: Cell[],
  extraEntries: ShapeExtraEntry[] | undefined,
  context?: EntryPathExpansionContext,
): EntryRef[] {
  if (!extraEntries?.length) {
    return [];
  }

  return extraEntries.map((entry, index) => {
    validateEntryPath(entry, cells, context);
    const number = index + 1;
    const label = entry.label?.trim() || `X${number}`;

    return {
      id: entry.id || `X${number}`,
      number,
      label,
      direction: "extra" as EntryDirection,
      cells: expandEntryPathToCellIds(entry, context),
    };
  });
}

export function buildEntriesFromCells(
  cells: Cell[],
  extraEntries?: ShapeExtraEntry[],
  context?: EntryPathExpansionContext,
): EntryRef[] {
  return [
    ...buildBaseEntriesFromCells(cells),
    ...buildExtraEntriesFromPaths(cells, extraEntries, context),
  ];
}

export function buildTopologyFromComposedShapeDefinition(
  definition: ComposedShapeDefinition,
  size: number,
): Topology {
  const occupied = buildOccupiedCellsFromComposedLayout(
    definition.layout,
    size,
  );

  const cells: Cell[] = occupied.map((cell) => ({
    id: cellId(cell.row, cell.col),
    row: cell.row,
    col: cell.col,
  }));

  return {
    cells: sortCellsReadingOrder(cells),
    entries: buildEntriesFromCells(cells, definition.extraEntries, { size }),
  };
}

export function buildTopologyFromCellMaskShapeDefinition(
  definition: CellMaskShapeDefinition,
  context?: EntryPathExpansionContext,
): Topology {
  if (!Number.isInteger(definition.width) || definition.width < 1) {
    throw new Error("Cell mask width must be a positive integer.");
  }
  if (!Number.isInteger(definition.height) || definition.height < 1) {
    throw new Error("Cell mask height must be a positive integer.");
  }
  if (definition.rows.length !== definition.height) {
    throw new Error("Cell mask row count does not match height.");
  }

  const cells: Cell[] = [];

  definition.rows.forEach((rowText, row) => {
    if (rowText.length !== definition.width) {
      throw new Error("Cell mask row width does not match width.");
    }

    [...rowText].forEach((ch, col) => {
      if (ch === "#") {
        cells.push({ id: cellId(row, col), row, col });
        return;
      }
      if (ch !== ".") {
        throw new Error("Cell mask rows may only contain # and . characters.");
      }
    });
  });

  cells.sort(compareCellsReadingOrder);

  return {
    cells,
    entries: buildEntriesFromCells(cells, definition.extraEntries, context),
  };
}

function normalizeCellsToOrigin(
  cells: Array<{ row: number; col: number }>,
): Array<{ row: number; col: number }> {
  const bounds = getOccupiedCellBounds(cells);
  if (!bounds) {
    return [];
  }

  return cells
    .map((cell) => ({
      row: cell.row - bounds.minRow,
      col: cell.col - bounds.minCol,
    }))
    .sort(compareCellsReadingOrder);
}

function cellsFromCellMaskDefinition(
  definition: CellMaskShapeDefinition,
): Array<{ row: number; col: number }> {
  return buildTopologyFromCellMaskShapeDefinition(definition).cells.map(
    (cell) => ({
      row: cell.row,
      col: cell.col,
    }),
  );
}

export function buildTopologyFromCompositeShapeDefinition(
  definition: CompositeShapeDefinition,
): Topology {
  if (
    !Number.isInteger(definition.primitiveSize) ||
    definition.primitiveSize < 1
  ) {
    throw new Error("Composite primitive size must be a positive integer.");
  }
  if (
    !Number.isInteger(definition.componentGrid.width) ||
    definition.componentGrid.width < 1
  ) {
    throw new Error(
      "Composite component grid width must be a positive integer.",
    );
  }
  if (
    !Number.isInteger(definition.componentGrid.height) ||
    definition.componentGrid.height < 1
  ) {
    throw new Error(
      "Composite component grid height must be a positive integer.",
    );
  }
  if (!definition.componentGrid.cells.length) {
    throw new Error("Composite shapes require at least one component.");
  }

  let componentSchema: CompositeCompatibilitySchema | null = null;
  const occupied = new Set<string>();

  for (const component of definition.componentGrid.cells) {
    if (component.row < 0 || component.col < 0) {
      throw new Error("Composite component coordinates must be non-negative.");
    }
    if (
      component.row >= definition.componentGrid.height ||
      component.col >= definition.componentGrid.width
    ) {
      throw new Error(
        "Composite component placement is outside the component grid.",
      );
    }
    if (component.definition.kind !== "composed") {
      throw new Error(
        "Composite components must be composed, non-composite shapes.",
      );
    }

    const candidateSchema = getCompositeComponentCompatibilitySchema(
      component as CompositeComponentPlacement & {
        definition: ComposedShapeDefinition;
      },
      definition.primitiveSize,
    );
    if (componentSchema === null) {
      componentSchema = candidateSchema;
      if (
        definition.overlapRows < 0 ||
        definition.overlapRows >= componentSchema.slotHeight
      ) {
        throw new Error(
          "Composite row overlap must be less than the component slot height.",
        );
      }
      if (
        definition.overlapCols < 0 ||
        definition.overlapCols >= componentSchema.slotWidth
      ) {
        throw new Error(
          "Composite column overlap must be less than the component slot width.",
        );
      }
    } else if (
      !areCompositeSchemasCompatible(componentSchema, candidateSchema)
    ) {
      throw new Error(
        `Composite components must share the same slot size, overlap, and grid presentation. Expected ${describeCompositeCompatibilitySchema(componentSchema)}; got ${describeCompositeCompatibilitySchema(candidateSchema)} for ${component.definition.name}.`,
      );
    }

    const componentCells = buildOccupiedCellsFromComposedLayout(
      applyVariantSelection(
        component.definition.layout,
        component.shapeVariant ?? "left",
        component.inverted ?? false,
      ),
      definition.primitiveSize,
    );
    const normalizedCells = normalizeCellsToOrigin(componentCells);
    const bounds = getOccupiedCellBounds(normalizedCells);
    if (!bounds) {
      throw new Error("Composite component produced no occupied cells.");
    }
    if (
      bounds.height !== componentSchema.slotHeight ||
      bounds.width !== componentSchema.slotWidth
    ) {
      throw new Error(
        "Composite component bounds did not match its compatibility schema.",
      );
    }

    const originRow =
      component.row * (componentSchema.slotHeight - definition.overlapRows);
    const originCol =
      component.col * (componentSchema.slotWidth - definition.overlapCols);

    for (const cell of normalizedCells) {
      occupied.add(`${originRow + cell.row},${originCol + cell.col}`);
    }
  }

  if (!occupied.size) {
    throw new Error("Composite shape produced no occupied cells.");
  }

  const cells: Cell[] = [...occupied]
    .map((key) => {
      const [rowText, colText] = key.split(",");
      const row = Number(rowText);
      const col = Number(colText);
      return {
        id: cellId(row, col),
        row,
        col,
      };
    })
    .sort(compareCellsReadingOrder);

  return {
    cells,
    entries: buildEntriesFromCells(cells, definition.extraEntries, {
      size: definition.primitiveSize,
    }),
  };
}
