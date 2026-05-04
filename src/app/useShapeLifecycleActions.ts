import type { Dispatch, SetStateAction } from "react";
import { buildEmptyContent, buildTopology } from "../domain/squareTopology";
import {
  buildEmptyFormFillState,
  buildFormModelFromTopology,
} from "../domain/formModel";
import { buildPuzzleSpecFromShapeDefinition } from "../domain/shapeInstantiation";
import {
  supportsInversion,
  supportsLeftRightVariant,
  transformComposedShapeDefinitionForVariant,
  type ShapeOrientation,
} from "../domain/shapeTransforms";
import type {
  CanonicalShapeDefinition,
  ShapeDefinition,
} from "../domain/shapeDefinition";
import { canonicalizeShapeDefinition } from "../domain/shapeSerialization";
import type { CellLetterMode, FormStyle, LetterFilterMode, ShapeVariant } from "../domain/types";
import { DEFAULT_EXTRA_ENTRY_READING_POLICY } from "../domain/entryPath";
import type { PuzzleStoreState } from "../state/puzzleStore";
import { getTodayString, resolveFormStyleForTopology } from "./appHelpers";

type SetState<T> = Dispatch<SetStateAction<T>>;

type UiStatusSetter = (
  text: string,
  kind?: "info" | "success" | "error",
) => void;

type UseShapeLifecycleActionsArgs = {
  store: PuzzleStoreState;
  setStore: SetState<PuzzleStoreState>;
  activeShapeDefinition: ShapeDefinition | null;
  currentShapeVariant: ShapeVariant;
  currentFormStyle: FormStyle;
  currentCellLetterMode: CellLetterMode;
  currentLetterFilterMode: LetterFilterMode;
  currentInverted: boolean;
  currentShapeSupportsInversion: boolean;
  currentShapeSupportsLeftRight: boolean;
  allowedSizes: number[];
  canBeSingle: boolean;
  sessionShapeLibrary: CanonicalShapeDefinition[];
  setSelectedLibraryShapeId: SetState<string | null>;
  setSessionShapeLibrary: SetState<CanonicalShapeDefinition[]>;
  setCurrentPuzzleDateAdded: SetState<string>;
  setCurrentPuzzleComment: SetState<string>;
  setCurrentPuzzleEnigmaIssue: SetState<string>;
  setCurrentPuzzleFormNumber: SetState<string>;
  setIsDirty: SetState<boolean>;
  setLoadedPuzzleFileName: SetState<string | null>;
  setUiStatus: UiStatusSetter;
  confirmDiscardChanges: (actionDescription: string) => boolean;
  cancelAutofillForReset: () => void;
};

export function useShapeLifecycleActions({
  store,
  setStore,
  activeShapeDefinition,
  currentShapeVariant,
  currentFormStyle,
  currentCellLetterMode,
  currentLetterFilterMode,
  currentInverted,
  currentShapeSupportsInversion,
  currentShapeSupportsLeftRight,
  allowedSizes,
  canBeSingle,
  sessionShapeLibrary,
  setSelectedLibraryShapeId,
  setSessionShapeLibrary,
  setCurrentPuzzleDateAdded,
  setCurrentPuzzleComment,
  setCurrentPuzzleEnigmaIssue,
  setCurrentPuzzleFormNumber,
  setIsDirty,
  setLoadedPuzzleFileName,
  setUiStatus,
  confirmDiscardChanges,
  cancelAutofillForReset,
}: UseShapeLifecycleActionsArgs) {
  void canBeSingle;
  void sessionShapeLibrary;
  void currentShapeSupportsLeftRight;

  function transformDefinitionForPlacement(
    definition: ShapeDefinition,
    size: number,
    orientation: ShapeOrientation,
    inverted: boolean,
  ): ShapeDefinition {
    if (definition.kind !== "composed") {
      return definition;
    }

    return transformComposedShapeDefinitionForVariant(
      definition,
      size,
      orientation,
      inverted,
      definition.extraEntryReadingPolicy ?? DEFAULT_EXTRA_ENTRY_READING_POLICY,
    );
  }

  function instantiateComposedShape(
    definition: ShapeDefinition,
    options?: {
      size?: number;
      orientation?: ShapeOrientation;
      inverted?: boolean;
      requestedFormStyle?: FormStyle;
      cellLetterMode?: CellLetterMode;
      letterFilterMode?: LetterFilterMode;
      uiMessage?: string;
    },
  ) {
    const size = options?.size ?? store.spec.size;
    const orientation = options?.orientation ?? "left";
    const inverted = options?.inverted ?? false;
    const requestedFormStyle = options?.requestedFormStyle ?? currentFormStyle;
    const requestedCellLetterMode = options?.cellLetterMode ?? currentCellLetterMode;
    const requestedLetterFilterMode = options?.letterFilterMode ?? currentLetterFilterMode;
    const transformedDefinition = transformDefinitionForPlacement(
      definition,
      size,
      orientation,
      inverted,
    );

    const requestedSpec = buildPuzzleSpecFromShapeDefinition(
      transformedDefinition,
      size,
      requestedFormStyle,
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
            shapeVariant: (orientation === "right"
              ? "right"
              : "left") as ShapeVariant,
            inverted,
            cellLetterMode: requestedCellLetterMode,
            letterFilterMode: requestedLetterFilterMode,
          }
        : {
            ...requestedSpec,
            formStyle: resolvedFormStyle,
            shapeVariant: (orientation === "right"
              ? "right"
              : "left") as ShapeVariant,
            inverted,
            cellLetterMode: requestedCellLetterMode,
            letterFilterMode: requestedLetterFilterMode,
          };

    const topology =
      resolvedFormStyle === (requestedSpec.formStyle ?? "double")
        ? initialTopology
        : buildTopology(spec);

    const content = buildEmptyContent(spec, topology);

    setSelectedLibraryShapeId(definition.id);

    setStore((prev) => ({
      ...prev,
      spec,
      topology,
      content,
      state: buildEmptyFormFillState(
        buildFormModelFromTopology(spec, topology),
      ),
      solution: undefined,
      selection: {
        cellId: topology.cells[0]?.id ?? null,
        direction: "across",
      },
      mode: "construct",
    }));

    setCurrentPuzzleDateAdded(getTodayString());
    setCurrentPuzzleComment("");
    setCurrentPuzzleEnigmaIssue("");
    setCurrentPuzzleFormNumber("");

    if (options?.uiMessage) {
      setUiStatus(options.uiMessage, "success");
    }
  }

  function upsertSessionShape(definition: ShapeDefinition) {
    const canonical = canonicalizeShapeDefinition(definition);

    setSessionShapeLibrary((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === canonical.id);

      if (existingIndex < 0) {
        return [...prev, canonical];
      }

      const next = [...prev];
      next[existingIndex] = canonical;
      return next;
    });

    setSelectedLibraryShapeId(canonical.id);
  }

  function handleSizeChange(size: number) {
    if (!confirmDiscardChanges("change the form size")) {
      return;
    }

    if (!activeShapeDefinition) {
      return;
    }

    cancelAutofillForReset();

    instantiateComposedShape(activeShapeDefinition, {
      size,
      orientation: currentShapeVariant === "right" ? "right" : "left",
      inverted: currentShapeSupportsInversion ? currentInverted : false,
      requestedFormStyle: currentFormStyle,
      uiMessage: "Updated form size.",
    });

    setIsDirty(false);
    setLoadedPuzzleFileName(null);
  }

  function handleShapeVariantChange(shapeVariant: ShapeVariant) {
    if (shapeVariant === currentShapeVariant) {
      return;
    }

    if (!confirmDiscardChanges("change the form variant")) {
      return;
    }

    if (!activeShapeDefinition) {
      return;
    }

    cancelAutofillForReset();

    instantiateComposedShape(activeShapeDefinition, {
      size: store.spec.size,
      orientation: shapeVariant === "right" ? "right" : "left",
      inverted: currentShapeSupportsInversion ? currentInverted : false,
      requestedFormStyle: currentFormStyle,
      uiMessage: `Updated shape variant: ${shapeVariant}.`,
    });

    setIsDirty(false);
    setLoadedPuzzleFileName(null);
  }

  function handleInvertedChange(inverted: boolean) {
    if (!currentShapeSupportsInversion || inverted === currentInverted) {
      return;
    }

    if (!confirmDiscardChanges("change the form orientation")) {
      return;
    }

    if (!activeShapeDefinition) {
      return;
    }

    cancelAutofillForReset();

    instantiateComposedShape(activeShapeDefinition, {
      size: store.spec.size,
      orientation: currentShapeVariant === "right" ? "right" : "left",
      inverted,
      requestedFormStyle: currentFormStyle,
      uiMessage: "Updated shape inversion.",
    });

    setIsDirty(false);
    setLoadedPuzzleFileName(null);
  }

  function handleNewPuzzle(size: number) {
    if (!confirmDiscardChanges("start a new form")) {
      return;
    }

    if (!activeShapeDefinition) {
      return;
    }

    const resolvedSize = allowedSizes.includes(size)
      ? size
      : allowedSizes[allowedSizes.length - 1];

    cancelAutofillForReset();

    instantiateComposedShape(activeShapeDefinition, {
      size: resolvedSize,
      orientation: currentShapeVariant === "right" ? "right" : "left",
      inverted: currentShapeSupportsInversion ? currentInverted : false,
      requestedFormStyle: currentFormStyle,
      uiMessage: `Started a new ${activeShapeDefinition.name} form.`,
    });

    setIsDirty(false);
    setLoadedPuzzleFileName(null);
  }

  function handleFormStyleChange(formStyle: FormStyle) {
    if (formStyle === currentFormStyle) {
      return;
    }

    if (formStyle === "single" && !canBeSingle) {
      return;
    }

    if (!confirmDiscardChanges("change the form style")) {
      return;
    }

    if (!activeShapeDefinition) {
      return;
    }

    cancelAutofillForReset();

    instantiateComposedShape(activeShapeDefinition, {
      size: store.spec.size,
      orientation: currentShapeVariant === "right" ? "right" : "left",
      inverted: currentShapeSupportsInversion ? currentInverted : false,
      requestedFormStyle: formStyle,
      uiMessage: `Started a new ${formStyle} ${activeShapeDefinition.name} form.`,
    });

    setIsDirty(false);
    setLoadedPuzzleFileName(null);
  }

  function instantiateLibraryShapeFromSelection(
    definition: ShapeDefinition,
  ) {
    cancelAutofillForReset();

    try {
      const minSize =
        definition.kind === "composed"
          ? Math.max(
              definition.layout.overlapRows ?? 1,
              definition.layout.overlapCols ?? 1,
            ) + 1
          : store.spec.size;
      const size = Math.max(store.spec.size, minSize);

      const supportsOrientation =
        definition.kind === "composed" &&
        supportsLeftRightVariant(
          definition.layout,
          definition.renderHints?.gridPresentation ?? "square",
        );
      const supportsVerticalInversion =
        definition.kind === "composed" &&
        supportsInversion(
          definition.layout,
          definition.renderHints?.gridPresentation ?? "square",
        );

      instantiateComposedShape(definition, {
        size,
        orientation:
          supportsOrientation && currentShapeVariant === "right"
            ? "right"
            : "left",
        inverted: supportsVerticalInversion ? currentInverted : false,
        requestedFormStyle: currentFormStyle,
        uiMessage: `Using shape: ${definition.name}`,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load shape.";
      window.alert(message);
    }

    setIsDirty(false);
    setLoadedPuzzleFileName(null);
  }

  return {
    instantiateComposedShape,
    instantiateLibraryShapeFromSelection,
    upsertSessionShape,
    handleSizeChange,
    handleShapeVariantChange,
    handleInvertedChange,
    handleNewPuzzle,
    handleFormStyleChange,
  };
}
