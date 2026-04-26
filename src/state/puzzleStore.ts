import { buildEmptyContent, buildTopology } from "../domain/squareTopology";
import {
  buildEmptyFormFillState,
  buildFormModelFromTopology,
} from "../domain/formModel";
import type { ShapeDefinition } from "../domain/shapeDefinition";
import { buildPuzzleSpecFromShapeDefinition } from "../domain/shapeInstantiation";
import {
  DEFAULT_STANDARD_SHAPE_ID,
  getStandardShapeById,
} from "../domain/standardShapeLibrary";

import type {
  AppMode,
  ConstructWorkspace,
  EntryDirection,
  FormStyle,
  PuzzleContent,
  PuzzleSpec,
  PuzzleState,
  SelectionState,
  ShapeVariant,
  SolutionState,
  Topology,
} from "../domain/types";

export interface PuzzleStoreState {
  mode: AppMode;
  spec: PuzzleSpec;
  topology: Topology;
  content: PuzzleContent;
  state: PuzzleState;
  solution?: SolutionState;
  selection: SelectionState;
}

function getDefaultShapeDefinition(): ShapeDefinition {
  const definition = getStandardShapeById(DEFAULT_STANDARD_SHAPE_ID);
  if (!definition) {
    throw new Error("Missing default standard shape definition.");
  }
  return definition;
}

export function createInitialPuzzleStore(
  size = 5,
  definition: ShapeDefinition = getDefaultShapeDefinition(),
  shapeVariant: ShapeVariant = "left",
  formStyle: FormStyle = "double",
): PuzzleStoreState {
  const spec: PuzzleSpec = {
    ...buildPuzzleSpecFromShapeDefinition(definition, size, formStyle),
    shapeVariant: shapeVariant === "right" ? "right" : "left",
    inverted: false,
  };

  const topology = buildTopology(spec);

  return {
    mode: "construct",
    spec,
    topology,
    content: buildEmptyContent(spec, topology),
    state: buildEmptyFormFillState(buildFormModelFromTopology(spec, topology)),
    solution: undefined,
    selection: {
      cellId: topology.cells[0]?.id ?? null,
      direction: "across",
    },
  };
}

export function createInitialConstructWorkspace(
  size = 5,
  definition: ShapeDefinition = getDefaultShapeDefinition(),
  shapeVariant: ShapeVariant = "left",
  formStyle: FormStyle = "double",
): ConstructWorkspace {
  const initial = createInitialPuzzleStore(
    size,
    definition,
    shapeVariant,
    formStyle,
  );

  return {
    spec: initial.spec,
    topology: initial.topology,
    content: initial.content,
    state: initial.state,
    solution: initial.solution,
    selection: initial.selection,
  };
}

export function createConstructWorkspaceFromPuzzleData(input: {
  spec: PuzzleSpec;
  topology: Topology;
  content: PuzzleContent;
}): ConstructWorkspace {
  const emptyState = buildEmptyFormFillState(
    buildFormModelFromTopology(input.spec, input.topology),
  );

  return {
    spec: input.spec,
    topology: input.topology,
    content: input.content,
    state: emptyState,
    solution: undefined,
    selection: {
      cellId: input.topology.cells[0]?.id ?? null,
      direction: "across",
    },
  };
}

export function getEntryForCell(
  topology: Topology,
  cellId: string,
  direction: EntryDirection,
  entryId?: string,
) {
  if (entryId) {
    const entryById = topology.entries.find(
      (entry) =>
        entry.id === entryId &&
        entry.direction === direction &&
        entry.cells.includes(cellId),
    );

    if (entryById) {
      return entryById;
    }
  }

  return topology.entries.find(
    (entry) => entry.direction === direction && entry.cells.includes(cellId),
  );
}

function getEntriesForCellCycle(
  topology: Topology,
  cellId: string,
): Array<{ id: string; direction: EntryDirection }> {
  const entriesForCell = topology.entries.filter((entry) =>
    entry.cells.includes(cellId),
  );

  const acrossEntry = entriesForCell.find(
    (entry) => entry.direction === "across",
  );
  const downEntry = entriesForCell.find((entry) => entry.direction === "down");
  const extraEntries = entriesForCell.filter(
    (entry) => entry.direction === "extra",
  );

  const cycleEntries = [] as Array<{ id: string; direction: EntryDirection }>;

  if (acrossEntry) {
    cycleEntries.push({ id: acrossEntry.id, direction: acrossEntry.direction });
  }

  if (downEntry) {
    cycleEntries.push({ id: downEntry.id, direction: downEntry.direction });
  }

  for (const entry of extraEntries) {
    cycleEntries.push({ id: entry.id, direction: entry.direction });
  }

  return cycleEntries;
}

function selectionMatchesCycleEntry(
  selection: SelectionState,
  cycleEntry: { id: string; direction: EntryDirection },
): boolean {
  if (selection.entryId) {
    return selection.entryId === cycleEntry.id;
  }

  return selection.direction === cycleEntry.direction;
}

export function toggleDirectionForRepeatedCellClick(
  topology: Topology,
  selection: SelectionState,
  clickedCellId: string,
): SelectionState {
  const cycleEntries = getEntriesForCellCycle(topology, clickedCellId);
  if (cycleEntries.length === 0) {
    return selection;
  }

  if (selection.cellId !== clickedCellId) {
    const matchingEntry =
      (selection.entryId
        ? cycleEntries.find((entry) => entry.id === selection.entryId)
        : undefined) ??
      cycleEntries.find((entry) => entry.direction === selection.direction);
    const nextEntry = matchingEntry ?? cycleEntries[0];
    if (!nextEntry) {
      return selection;
    }

    return {
      cellId: clickedCellId,
      direction: nextEntry.direction,
      entryId: nextEntry.id,
    };
  }

  const currentIndex = cycleEntries.findIndex((entry) =>
    selectionMatchesCycleEntry(selection, entry),
  );
  const nextEntry =
    cycleEntries[(currentIndex + 1 + cycleEntries.length) % cycleEntries.length];
  if (!nextEntry) {
    return selection;
  }

  return {
    cellId: clickedCellId,
    direction: nextEntry.direction,
    entryId: nextEntry.id,
  };
}
