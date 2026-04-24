import {
  buildEmptyContent,
  buildTopology,
  isTopologyReflectableAcrossLeadingDiagonal,
} from "../domain/squareTopology";
import {
  buildEmptyFormFillState,
  buildFormModelFromTopology,
} from "../domain/formModel";
import type {
  ConstructWorkspace,
  FormStyle,
  ShapeVariant,
  SolveMode,
  SolveWorkspace,
  Topology,
} from "../domain/types";
import type { ComposedShapeDefinition } from "../domain/shapeDefinition";
import { buildPuzzleSpecFromComposedShapeDefinition } from "../domain/shapeInstantiation";
import {
  applyVariantSelection,
  type ShapeOrientation,
} from "../domain/shapeTransforms";

export function resolveFormStyleForTopology(
  requestedFormStyle: FormStyle,
  topology: Topology,
): FormStyle {
  if (requestedFormStyle === "single") {
    return isTopologyReflectableAcrossLeadingDiagonal(topology)
      ? "single"
      : "double";
  }

  return "double";
}

export function instantiateConstructWorkspaceFromShape(
  definition: ComposedShapeDefinition,
  options: {
    size: number;
    orientation: ShapeOrientation;
    inverted: boolean;
    requestedFormStyle: FormStyle;
  },
): ConstructWorkspace {
  const transformedDefinition: ComposedShapeDefinition = {
    ...definition,
    layout: applyVariantSelection(
      definition.layout,
      options.orientation,
      options.inverted,
    ),
  };

  const requestedSpec = buildPuzzleSpecFromComposedShapeDefinition(
    transformedDefinition,
    options.size,
    options.requestedFormStyle,
  );

  const initialTopology = buildTopology(requestedSpec);
  const resolvedFormStyle = resolveFormStyleForTopology(
    requestedSpec.formStyle ?? "double",
    initialTopology,
  );

  const spec =
    resolvedFormStyle === (requestedSpec.formStyle ?? "double")
      ? {
          ...requestedSpec,
          shapeVariant:
            options.orientation === "right"
              ? ("right" as ShapeVariant)
              : "left",
          inverted: options.inverted,
        }
      : {
          ...requestedSpec,
          formStyle: resolvedFormStyle,
          shapeVariant:
            options.orientation === "right"
              ? ("right" as ShapeVariant)
              : "left",
          inverted: options.inverted,
        };

  const topology =
    resolvedFormStyle === (requestedSpec.formStyle ?? "double")
      ? initialTopology
      : buildTopology(spec);

  const content = buildEmptyContent(spec, topology);

  return {
    spec,
    topology,
    content,
    state: buildEmptyFormFillState(buildFormModelFromTopology(spec, topology)),
    solution: undefined,
    selection: {
      cellId: topology.cells[0]?.id ?? null,
      direction: "across",
    },
  };
}

export function createSolveWorkspaceFromLoadedForm(input: {
  spec: ConstructWorkspace["spec"];
  topology: ConstructWorkspace["topology"];
  content: ConstructWorkspace["content"];
  solution?: ConstructWorkspace["solution"];
  solveMode: SolveMode;
}): SolveWorkspace {
  return {
    spec: input.spec,
    topology: input.topology,
    content: input.content,
    state: buildEmptyFormFillState(
      buildFormModelFromTopology(input.spec, input.topology),
    ),
    solution: input.solution,
    selection: {
      cellId: input.topology.cells[0]?.id ?? null,
      direction: "across",
    },
    solveMode: input.solveMode,
  };
}

export function createConstructWorkspaceFromSolveWorkspace(
  solveWorkspace: SolveWorkspace,
): ConstructWorkspace {
  return {
    spec: solveWorkspace.spec,
    topology: solveWorkspace.topology,
    content: solveWorkspace.content,
    state: buildEmptyFormFillState(
      buildFormModelFromTopology(solveWorkspace.spec, solveWorkspace.topology),
    ),
    solution: undefined,
    selection: {
      cellId: solveWorkspace.topology.cells[0]?.id ?? null,
      direction: "across",
    },
  };
}
