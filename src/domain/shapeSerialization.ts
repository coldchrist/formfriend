import type {
  CanonicalCellMaskShapeDefinition,
  CanonicalComposedShapeDefinition,
  CanonicalShapeDefinition,
  CellMaskShapeDefinition,
  ComposedShapeDefinition,
  ComposedShapeLayout,
  ShapeDefinition,
} from "./shapeDefinition";
import type { EntryPath, ExtraEntryReadingPolicy } from "./entryPath";
import { isExtraEntryReadingPolicy } from "./entryPath";
import type { FormStyle, Topology } from "./types";
import type { ShapeDesignerState } from "./shapeDesignerState";
import {
  validateComposedShapeLayout,
  serializeLayout,
  parseSerializedLayout,
} from "./shapeLayout";
import {
  buildTopologyFromCellMaskShapeDefinition,
  buildTopologyFromComposedShapeDefinition,
} from "./shapeTopology";
import { isTopologyReflectableAcrossLeadingDiagonal } from "./squareTopology";

export type SavedComposedShapeDefinitionV1 = CanonicalComposedShapeDefinition;
export type SavedCellMaskShapeDefinitionV1 = CanonicalCellMaskShapeDefinition;
export type SavedShapeDefinitionV1 = CanonicalShapeDefinition;

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
  extraEntries: EntryPath[] = [],
  extraEntryReadingPolicy?: ExtraEntryReadingPolicy,
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
    extraEntries,
    extraEntryReadingPolicy,
    renderHints: {
      gridPresentation,
    },
  };
}

export function canonicalizeShapeDefinition(
  definition: ShapeDefinition,
): CanonicalShapeDefinition {
  if (definition.kind === "composed") {
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
      extraEntryReadingPolicy: definition.extraEntryReadingPolicy,
    };
  }

  if (definition.kind === "cellMask") {
    return {
      version: 1,
      kind: "cellMask",
      id: definition.id,
      name: definition.name,
      width: definition.width,
      height: definition.height,
      rows: [...definition.rows],
      renderHints: definition.renderHints,
      extraEntries: definition.extraEntries,
      extraEntryReadingPolicy: definition.extraEntryReadingPolicy,
    };
  }

  throw new Error("Only composed and cell mask shapes are supported for saving in v1.");
}

export function normalizeShapeDefinition(
  canonical: CanonicalShapeDefinition,
): ShapeDefinition {
  if (canonical.version !== 1) {
    throw new Error(`Unsupported saved shape version: ${canonical.version}`);
  }

  if (canonical.kind === "composed") {
    const parsedLayout = parseSerializedLayout(canonical.layout);

    const layout: ComposedShapeLayout = {
      ...parsedLayout,
      overlapRows: canonical.overlapRows,
      overlapCols: canonical.overlapCols,
    };

    validateComposedShapeLayout(layout);

    return {
      kind: "composed",
      id: canonical.id,
      name: canonical.name,
      layout,
      renderHints: canonical.renderHints,
      subformIdsByMacroCell: canonical.subformIdsByMacroCell,
      extraEntries: canonical.extraEntries,
      extraEntryReadingPolicy: canonical.extraEntryReadingPolicy,
    };
  }

  if (canonical.kind === "cellMask") {
    return {
      kind: "cellMask",
      id: canonical.id,
      name: canonical.name,
      width: canonical.width,
      height: canonical.height,
      rows: [...canonical.rows],
      renderHints: canonical.renderHints,
      extraEntries: canonical.extraEntries,
      extraEntryReadingPolicy: canonical.extraEntryReadingPolicy,
    };
  }

  throw new Error(`Unsupported saved shape kind: ${(canonical as { kind?: string }).kind}`);
}

export function saveShapeDefinition(
  definition: ShapeDefinition,
): SavedShapeDefinitionV1 {
  return canonicalizeShapeDefinition(definition);
}

export function loadShapeDefinition(
  saved: SavedShapeDefinitionV1,
): ShapeDefinition {
  return normalizeShapeDefinition(saved);
}

export function instantiateShapeDefinition(
  definition: ShapeDefinition,
  request: ShapeInstantiationRequest,
): ShapeInstantiationResult {
  let topology: Topology;

  if (definition.kind === "composed") {
    topology = buildTopologyFromComposedShapeDefinition(
      definition,
      request.size,
    );
  } else if (definition.kind === "cellMask") {
    topology = buildTopologyFromCellMaskShapeDefinition(definition);
  } else {
    throw new Error(
      "Only composed and cell mask shapes are supported for instantiation in v1.",
    );
  }

  const resolvedFormStyle =
    request.requestedFormStyle === "single" &&
    !topology.entries.some((entry) => entry.direction === "extra") &&
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

  if (parsed.kind !== "composed" && parsed.kind !== "cellMask") {
    throw new Error("Saved shape file has unsupported kind.");
  }

  if (typeof parsed.id !== "string" || typeof parsed.name !== "string") {
    throw new Error("Saved shape file is missing id or name.");
  }

  if (parsed.kind === "composed") {
    if (typeof parsed.layout !== "string") {
      throw new Error("Saved shape file is missing layout.");
    }

    if (
      !Number.isInteger(parsed.overlapRows) ||
      !Number.isInteger(parsed.overlapCols)
    ) {
      throw new Error("Saved shape file has invalid overlap settings.");
    }
  }

  if (parsed.kind === "cellMask") {
    if (
      !Number.isInteger(parsed.width) ||
      !Number.isInteger(parsed.height) ||
      !Array.isArray(parsed.rows)
    ) {
      throw new Error("Saved cell mask shape file has invalid dimensions or rows.");
    }
  }


  if (
    "extraEntryReadingPolicy" in parsed &&
    parsed.extraEntryReadingPolicy !== undefined &&
    !isExtraEntryReadingPolicy(parsed.extraEntryReadingPolicy)
  ) {
    throw new Error("Saved shape file has invalid extra entry reading policy.");
  }

  return parsed;
}
