import type { Dispatch, SetStateAction } from "react";
import { buildEmptyContent, buildTopology } from "../domain/squareTopology";
import {
  buildEmptyFormFillState,
  buildFormModelFromTopology,
} from "../domain/formModel";
import { buildPuzzleSpecFromComposedShapeDefinition } from "../domain/shapeInstantiation";
import {
  applyVariantSelection,
  supportsInversion,
  supportsLeftRightVariant,
  type ShapeOrientation,
} from "../domain/shapeTransforms";
import type { ComposedShapeDefinition } from "../domain/shapeDefinition";
import type { FormStyle, ShapeVariant } from "../domain/types";
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
  activeShapeDefinition: ComposedShapeDefinition | null;
  currentShapeVariant: ShapeVariant;
  currentFormStyle: FormStyle;
  currentInverted: boolean;
  currentShapeSupportsInversion: boolean;
  currentShapeSupportsLeftRight: boolean;
  allowedSizes: number[];
  canBeSingle: boolean;
  sessionShapeLibrary: ComposedShapeDefinition[];
  setSelectedLibraryShapeId: SetState<string | null>;
  setSessionShapeLibrary: SetState<ComposedShapeDefinition[]>;
  setCurrentPuzzleDateAdded: SetState<string>;
  setCurrentPuzzleComment: SetState<string>;
  setCurrentPuzzleEnigmaIssue: SetState<string>;
  setCurrentPuzzleFormNumber: SetState<string>;
  setIsDirty: SetState<boolean>;
  setLoadedPuzzleFileName: SetState<string | null>;
  setUiStatus: UiStatusSetter;
  confirmDiscardChanges: (actionDescription: string) => boolean;
};

export function useShapeLifecycleActions({
  store,
  setStore,
  activeShapeDefinition,
  currentShapeVariant,
  currentFormStyle,
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
}: UseShapeLifecycleActionsArgs) {
  void canBeSingle;
  void sessionShapeLibrary;
  void currentShapeSupportsLeftRight;

  function instantiateComposedShape(
    definition: ComposedShapeDefinition,
    options?: {
      size?: number;
      orientation?: ShapeOrientation;
      inverted?: boolean;
      requestedFormStyle?: FormStyle;
      uiMessage?: string;
    },
  ) {
    const size = options?.size ?? store.spec.size;
    const orientation = options?.orientation ?? "left";
    const inverted = options?.inverted ?? false;
    const requestedFormStyle = options?.requestedFormStyle ?? currentFormStyle;

    const transformedDefinition: ComposedShapeDefinition = {
      ...definition,
      layout: applyVariantSelection(definition.layout, orientation, inverted),
    };

    const requestedSpec = buildPuzzleSpecFromComposedShapeDefinition(
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
          }
        : {
            ...requestedSpec,
            formStyle: resolvedFormStyle,
            shapeVariant: (orientation === "right"
              ? "right"
              : "left") as ShapeVariant,
            inverted,
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

  function upsertSessionShape(definition: ComposedShapeDefinition) {
    setSessionShapeLibrary((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === definition.id);

      if (existingIndex < 0) {
        return [...prev, definition];
      }

      const next = [...prev];
      next[existingIndex] = definition;
      return next;
    });

    setSelectedLibraryShapeId(definition.id);
  }

  function handleSizeChange(size: number) {
    if (!confirmDiscardChanges("change the form size")) {
      return;
    }

    if (!activeShapeDefinition) {
      return;
    }

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
    definition: ComposedShapeDefinition,
  ) {
    try {
      // Ensure size meets the minimum for this shape's overlap requirements
      const minSize =
        Math.max(
          definition.layout.overlapRows ?? 1,
          definition.layout.overlapCols ?? 1,
        ) + 1;
      const size = Math.max(store.spec.size, minSize);

      instantiateComposedShape(definition, {
        size,
        orientation:
          supportsLeftRightVariant(
            definition.layout,
            definition.renderHints?.gridPresentation ?? "square",
          ) && currentShapeVariant === "right"
            ? "right"
            : "left",
        inverted: supportsInversion(
          definition.layout,
          definition.renderHints?.gridPresentation ?? "square",
        )
          ? currentInverted
          : false,
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
