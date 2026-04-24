import type {
  ComposedShapeDefinition,
  ComposedShapeLayout,
  ShapeDefinition,
} from "./shapeDefinition";
import type { FormStyle, Topology } from "./types";
import type { ShapeDesignerState } from "./shapeDesignerState";
import {
  validateComposedShapeLayout,
  serializeLayout,
  parseSerializedLayout,
} from "./shapeLayout";
import { buildTopologyFromComposedShapeDefinition } from "./shapeTopology";
import { isTopologyReflectableAcrossLeadingDiagonal } from "./squareTopology";

export interface SavedComposedShapeDefinitionV1 {
  version: 1;
  kind: "composed";
  id: string;
  name: string;
  layout: string;
  overlapRows: number;
  overlapCols: number;
  renderHints?: {
    previewStyle?: "rect";
  };
  // reserved for future use; absent or empty in v1
  subformIdsByMacroCell?: Record<string, string>;
  extraEntries?: Array<{
    id: string;
    cellIds: string[];
    label?: string;
  }>;
}

export type SavedShapeDefinitionV1 = SavedComposedShapeDefinitionV1;

export interface ShapeInstantiationRequest {
  size: number;
  requestedFormStyle: FormStyle;
}

export interface ShapeInstantiationResult {
  topology: Topology;
  resolvedFormStyle: FormStyle;
}

function slugifyShapeId(name: string): string {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) {
    return "shape";
  }

  const slug = trimmed.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

  return slug || "shape";
}

export function buildComposedShapeDefinitionFromDesignerState(
  state: ShapeDesignerState,
  gridPresentation: "square" | "hex",
): ComposedShapeDefinition {
  validateComposedShapeLayout(state.layout);

  const id = slugifyShapeId(state.name || "shape");

  return {
    kind: "composed",
    id,
    name: state.name.trim() || "Untitled shape",
    layout: {
      width: state.layout.width,
      height: state.layout.height,
      rows: [...state.layout.rows],
      overlapRows: state.layout.overlapRows,
      overlapCols: state.layout.overlapCols,
    },
    renderHints: {
      gridPresentation,
    },
  };
}

export function saveShapeDefinition(
  definition: ShapeDefinition,
): SavedShapeDefinitionV1 {
  if (definition.kind !== "composed") {
    throw new Error("Only composed shapes are supported for saving in v1.");
  }

  validateComposedShapeLayout(definition.layout);

  return {
    version: 1,
    kind: "composed",
    id: definition.id,
    name: definition.name,
    layout: serializeLayout(definition.layout),
    overlapRows: definition.layout.overlapRows,
    overlapCols: definition.layout.overlapCols,
    renderHints: definition.renderHints,
    subformIdsByMacroCell: definition.subformIdsByMacroCell,
    extraEntries: definition.extraEntries,
  };
}

export function loadShapeDefinition(
  saved: SavedShapeDefinitionV1,
): ShapeDefinition {
  if (saved.version !== 1) {
    throw new Error(`Unsupported saved shape version: ${saved.version}`);
  }

  if (saved.kind !== "composed") {
    throw new Error(`Unsupported saved shape kind: ${saved.kind}`);
  }

  const parsedLayout = parseSerializedLayout(saved.layout);

  const layout: ComposedShapeLayout = {
    ...parsedLayout,
    overlapRows: saved.overlapRows,
    overlapCols: saved.overlapCols,
  };

  validateComposedShapeLayout(layout);

  return {
    kind: "composed",
    id: saved.id,
    name: saved.name,
    layout,
    renderHints: saved.renderHints,
    subformIdsByMacroCell: saved.subformIdsByMacroCell,
    extraEntries: saved.extraEntries,
  };
}

export function instantiateShapeDefinition(
  definition: ShapeDefinition,
  request: ShapeInstantiationRequest,
): ShapeInstantiationResult {
  if (definition.kind !== "composed") {
    throw new Error(
      "Only composed shapes are supported for instantiation in v1.",
    );
  }

  const topology = buildTopologyFromComposedShapeDefinition(
    definition,
    request.size,
  );

  const resolvedFormStyle =
    request.requestedFormStyle === "single" &&
    isTopologyReflectableAcrossLeadingDiagonal(topology)
      ? "single"
      : "double";

  return {
    topology,
    resolvedFormStyle,
  };
}

export function serializeSavedShapeDefinition(
  saved: SavedShapeDefinitionV1,
): string {
  return JSON.stringify(saved, null, 2);
}

export function parseSavedShapeDefinition(
  text: string,
): SavedShapeDefinitionV1 {
  const parsed = JSON.parse(text) as SavedShapeDefinitionV1;

  if (!parsed || typeof parsed !== "object") {
    throw new Error("Saved shape file is not a valid object.");
  }

  if (parsed.version !== 1) {
    throw new Error("Saved shape file has unsupported version.");
  }

  if (parsed.kind !== "composed") {
    throw new Error("Saved shape file has unsupported kind.");
  }

  if (typeof parsed.id !== "string" || typeof parsed.name !== "string") {
    throw new Error("Saved shape file is missing id or name.");
  }

  if (typeof parsed.layout !== "string") {
    throw new Error("Saved shape file is missing layout.");
  }

  if (
    !Number.isInteger(parsed.overlapRows) ||
    !Number.isInteger(parsed.overlapCols)
  ) {
    throw new Error("Saved shape file has invalid overlap settings.");
  }

  return parsed;
}
