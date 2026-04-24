import { buildEmptyContent, buildTopology } from "../domain/squareTopology";
import {
  buildEmptyFormFillState,
  buildFormModelFromTopology,
} from "../domain/formModel";
import type { ComposedShapeDefinition } from "../domain/shapeDefinition";
import { buildPuzzleSpecFromComposedShapeDefinition } from "../domain/shapeInstantiation";
import {
  DEFAULT_STANDARD_SHAPE_ID,
  getStandardShapeById,
} from "../domain/standardShapeLibrary";

import type {
  ConstructWorkspace,
  EntryDirection,
  FormStyle,
  PuzzleContent,
  PuzzleSpec,
  PuzzleState,
  SelectionState,
  ShapeVariant,
  SolutionState,
  SolveMode,
  SolveWorkspace,
  Topology,
} from "../domain/types";

export interface PuzzleStoreState {
  spec: PuzzleSpec;
  topology: Topology;
  content: PuzzleContent;
  state: PuzzleState;
  solution?: SolutionState;
  selection: SelectionState;
}

function getDefaultShapeDefinition(): ComposedShapeDefinition {
  const definition = getStandardShapeById(DEFAULT_STANDARD_SHAPE_ID);
  if (!definition) {
    throw new Error("Missing default standard shape definition.");
  }
  return definition;
}

export function createInitialPuzzleStore(
  size = 5,
  definition: ComposedShapeDefinition = getDefaultShapeDefinition(),
  shapeVariant: ShapeVariant = "left",
  formStyle: FormStyle = "double",
): PuzzleStoreState {
  const spec: PuzzleSpec = {
    ...buildPuzzleSpecFromComposedShapeDefinition(definition, size, formStyle),
    shapeVariant: shapeVariant === "right" ? "right" : "left",
    inverted: false,
  };

  const topology = buildTopology(spec);

  return {
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
  definition?: ComposedShapeDefinition,
  shapeVariant: ShapeVariant = "left",
  formStyle: FormStyle = "double",
): ConstructWorkspace {
  const base = createInitialPuzzleStore(
    size,
    definition ?? getDefaultShapeDefinition(),
    shapeVariant,
    formStyle,
  );

  return {
    ...base,
  };
}

export function createSolveWorkspaceFromPuzzleStore(
  store: PuzzleStoreState,
  solveMode: SolveMode,
): SolveWorkspace {
  const emptyState = buildEmptyFormFillState(
    buildFormModelFromTopology(store.spec, store.topology),
  );

  return {
    spec: store.spec,
    topology: store.topology,
    content: store.content,
    state: emptyState,
    solution: store.solution,
    selection: {
      cellId: store.topology.cells[0]?.id ?? null,
      direction: "across",
    },
    solveMode,
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

export function createSolveWorkspaceFromPuzzleData(input: {
  spec: PuzzleSpec;
  topology: Topology;
  content: PuzzleContent;
  solution?: SolutionState;
  solveMode: SolveMode;
}): SolveWorkspace {
  const emptyState = buildEmptyFormFillState(
    buildFormModelFromTopology(input.spec, input.topology),
  );

  return {
    spec: input.spec,
    topology: input.topology,
    content: input.content,
    state: emptyState,
    solution: input.solution,
    selection: {
      cellId: input.topology.cells[0]?.id ?? null,
      direction: "across",
    },
    solveMode: input.solveMode,
  };
}

export function getEntryForCell(
  topology: Topology,
  cellId: string,
  direction: EntryDirection,
) {
  return topology.entries.find(
    (entry) => entry.direction === direction && entry.cells.includes(cellId),
  );
}

export function toggleDirectionForRepeatedCellClick(
  topology: Topology,
  selection: SelectionState,
  clickedCellId: string,
): SelectionState {
  if (selection.cellId !== clickedCellId) {
    return {
      cellId: clickedCellId,
      direction: "across",
    };
  }

  const nextDirection: EntryDirection =
    selection.direction === "across" ? "down" : "across";

  const nextEntry = getEntryForCell(topology, clickedCellId, nextDirection);
  if (!nextEntry) {
    return selection;
  }

  return {
    cellId: clickedCellId,
    direction: nextDirection,
  };
}
