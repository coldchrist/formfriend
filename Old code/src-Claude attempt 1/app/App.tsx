import { buildTopologyFromComposedShapeDefinition } from "../domain/shapeTopology";
import { getAllStandardShapes } from "../domain/standardShapeLibrary";
import { useEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { CluePanel } from "../components/CluePanel";
import { WordLookupDialog } from "../components/WordLookupDialog";
import { PuzzleGrid, type PuzzleGridHandle } from "../components/PuzzleGrid";
import { Toolbar } from "../components/Toolbar";
import { ShapePalette } from "../components/ShapePalette";
import { ShapeDesignerSurface } from "../components/ShapeDesignerSurface";
import {
  createInitialShapeDesignerState,
  moveSelection,
  placePrimitiveAtSelection,
  clearPrimitiveAtSelection,
  replaceDesignerLayout,
  resizeDesignerLayout,
  clearDesignerLayout,
} from "../domain/shapeDesignerState";
import type {
  ComposedShapeDefinition,
  ShapePrimitive,
} from "../domain/shapeDefinition";
import {
  buildEmptyContent,
  buildTopology,
  isTopologyReflectableAcrossLeadingDiagonal,
} from "../domain/squareTopology";
import {
  findMatchingWords,
  parseWordListText,
  type LoadedWordList,
} from "../domain/wordList";
import {
  autofillFormModel,
  autofillGrid,
  type AutofillProgress,
} from "../domain/autofill";
import {
  applyWordToDisplayEntryByCell,
  buildCellFillsFromFormFillState,
  buildEmptyFormFillState,
  buildFormFillStateFromCellFills,
  buildFormModelFromTopology,
  formModelRoundTripMatchesCellFills,
  getDisplayEntryPatternById,
  setDisplayedCellCharacter,
} from "../domain/formModel";
import type { DisplayEntry, FormModel } from "../domain/formModel";
import type {
  AppMode,
  EntryDirection,
  EntryRef,
  FormStyle,
  SavedPuzzle,
  ShapeVariant,
  SolveMode,
  Topology,
} from "../domain/types";
import { buildComposedShapeDefinitionFromDesignerState } from "../domain/shapeSerialization";
import { parseSerializedLayout } from "../domain/shapeLayout";
import { buildPuzzleSpecFromComposedShapeDefinition } from "../domain/shapeInstantiation";
import {
  applyVariantSelection,
  supportsInversion,
  supportsLeftRightVariant,
  type ShapeOrientation,
} from "../domain/shapeTransforms";
import {
  downloadPuzzleFile,
  downloadSolverPuzzleFile,
  readPuzzleFile,
} from "../io/puzzleFile";
import {
  downloadShapeDefinitionFile,
  readShapeDefinitionFile,
} from "../io/shapeFile";
import { PUZZLE_LIBRARY } from "../library/puzzleLibrary";
import {
  createInitialPuzzleStore,
  getEntryForCell,
  toggleDirectionForRepeatedCellClick,
} from "../state/puzzleStore";
import {
  getCellById,
  getEntryIndex,
  getWrappedEntry,
  getNextCellIdInEntry,
  getPreviousCellIdInEntry,
  getNextSolveCellId,
} from "./gridNavigation";
import {
  compareCellsReadingOrder,
  buildCellById,
  buildDoublePresentationNumbering,
  buildSinglePresentationNumbering,
  relabelEntry,
  getFormTypeTitle,
} from "./presentationHelpers";
import {
  getAllowedSizes,
  resolveFormStyleForTopology,
  getSolveModeForStoreMode,
  getTodayString,
} from "./puzzleHelpers";
import { findMatchingDesignerLibraryShapeName } from "./designerHelpers";

import "../styles/app.css";

const WORD_LOOKUP_PAGE_SIZE = 100;

function buildSavedPuzzle(
  store: ReturnType<typeof createInitialPuzzleStore>,
  metadata: {
    solveMode: SolveMode;
    dateAdded: string;
    comment: string;
    enigmaIssue: string;
    formNumber: string;
  },
  options?: {
    stateOverride?: SavedPuzzle["state"];
    solutionOverride?: SavedPuzzle["solution"];
  },
): SavedPuzzle {
  return {
    version: 1,
    spec: store.spec,
    topology: store.topology,
    content: store.content,
    state: options?.stateOverride ?? store.state,
    solution:
      options?.solutionOverride !== undefined
        ? options.solutionOverride
        : store.solution,
    solveMode: metadata.solveMode,
    gridPresentation:
      activeShapeDefinition?.renderHints?.gridPresentation ?? "square",
    dateAdded: metadata.dateAdded || getTodayString(),
    comment: metadata.comment.trim() || undefined,
    enigmaIssue: metadata.enigmaIssue.trim() || undefined,
    formNumber: metadata.formNumber.trim() || undefined,
  };
}
export default function App() {
  const [store, setStore] = useState(() => createInitialPuzzleStore(5));
  const gridRef = useRef<PuzzleGridHandle | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [loadedWordList, setLoadedWordList] = useState<LoadedWordList | null>(
    null,
  );
  const [loadedPuzzleFileName, setLoadedPuzzleFileName] = useState<
    string | null
  >(null);
  const [loadedWordListName, setLoadedWordListName] = useState<string | null>(
    null,
  );
  const [lockCompletedWords, setLockCompletedWords] = useState(true);
  const [randomizeAutofillChoices, setRandomizeAutofillChoices] =
    useState(true);
  const [isAutofillRunning, setIsAutofillRunning] = useState(false);
  const [autofillStatusText, setAutofillStatusText] =
    useState("Autofill idle.");
  const [uiStatusText, setUiStatusText] = useState("Ready.");
  const [uiStatusKind, setUiStatusKind] = useState<
    "info" | "success" | "error"
  >("info");
  const [incorrectCellIds, setIncorrectCellIds] = useState<Set<string>>(
    new Set(),
  );
  const [isSolutionCorrect, setIsSolutionCorrect] = useState(false);
  const [currentPuzzleSolveMode, setCurrentPuzzleSolveMode] =
    useState<SolveMode>("checkable");
  const [currentPuzzleDateAdded, setCurrentPuzzleDateAdded] =
    useState(getTodayString());
  const [currentPuzzleComment, setCurrentPuzzleComment] = useState("");
  const [currentPuzzleEnigmaIssue, setCurrentPuzzleEnigmaIssue] = useState("");
  const [currentPuzzleFormNumber, setCurrentPuzzleFormNumber] = useState("");
  const [saveDialogKind, setSaveDialogKind] = useState<
    "save" | "solver" | null
  >(null);
  const [saveDialogSolveMode, setSaveDialogSolveMode] =
    useState<SolveMode>("checkable");
  const [saveDialogDateAdded, setSaveDialogDateAdded] =
    useState(getTodayString());
  const [saveDialogComment, setSaveDialogComment] = useState("");
  const [saveDialogEnigmaIssue, setSaveDialogEnigmaIssue] = useState("");
  const [saveDialogFormNumber, setSaveDialogFormNumber] = useState("");
  const autofillShouldContinueRef = useRef(true);
  const [isWordLookupOpen, setIsWordLookupOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [wordLookupMatches, setWordLookupMatches] = useState<string[]>([]);
  const [wordLookupTotal, setWordLookupTotal] = useState(0);
  const [wordLookupOffset, setWordLookupOffset] = useState(0);
  const [shapeDesignerState, setShapeDesignerState] = useState(
    createInitialShapeDesignerState(),
  );
  const [sessionShapeLibrary, setSessionShapeLibrary] = useState<
    ComposedShapeDefinition[]
  >(() => getAllStandardShapes());
  const [selectedLibraryShapeId, setSelectedLibraryShapeId] = useState<
    string | null
  >(null);
  const [designerGridPresentation, setDesignerGridPresentation] = useState<
    "square" | "hex"
  >("square");
  const loadShapeFileInputRef = useRef<HTMLInputElement | null>(null);
  const isConstruct = store.mode === "construct";
  const isDesigner = store.mode === "designer";
  const isSolveStrict = store.mode === "solve_strict";
  const isSolveCheckable = store.mode === "solve_checkable";
  const isSolve = isSolveStrict || isSolveCheckable;
  const minimumDesignerPrimitiveSize =
    Math.max(
      shapeDesignerState.layout.overlapRows,
      shapeDesignerState.layout.overlapCols,
    ) + 1;
  const safeDesignerPrimitiveSize = Number.isFinite(shapeDesignerState.size)
    ? Math.max(
        minimumDesignerPrimitiveSize,
        Math.min(15, shapeDesignerState.size),
      )
    : minimumDesignerPrimitiveSize;
  const currentShapeVariant: ShapeVariant = store.spec.shapeVariant ?? "left";
  const currentFormStyle: FormStyle = store.spec.formStyle ?? "double";
  const currentInverted = store.spec.inverted ?? false;

  const canBeSingle = useMemo(() => {
    return isTopologyReflectableAcrossLeadingDiagonal(store.topology);
  }, [store.topology]);

  const allowedSizes = getAllowedSizes();

  const currentComposedLayout = useMemo(() => {
    if (store.spec.shapeFamily !== "composed" || !store.spec.composedLayout) {
      return null;
    }

    const parsed = parseSerializedLayout(store.spec.composedLayout);
    parsed.overlapRows = store.spec.overlapRows ?? 1;
    parsed.overlapCols = store.spec.overlapCols ?? 1;
    return parsed;
  }, [
    store.spec.shapeFamily,
    store.spec.composedLayout,
    store.spec.overlapRows,
    store.spec.overlapCols,
  ]);

  const selectedLibraryShape = useMemo(
    () =>
      sessionShapeLibrary.find((item) => item.id === selectedLibraryShapeId) ??
      null,
    [sessionShapeLibrary, selectedLibraryShapeId],
  );

  const currentCanonicalLibraryShape = useMemo(() => {
    if (store.spec.shapeId) {
      const byId = sessionShapeLibrary.find(
        (item) => item.id === store.spec.shapeId,
      );
      if (byId) {
        return byId;
      }
    }

    return selectedLibraryShape ?? null;
  }, [sessionShapeLibrary, store.spec.shapeId, selectedLibraryShape]);

  const activeShapeDefinition = useMemo(() => {
    return currentCanonicalLibraryShape ?? selectedLibraryShape ?? null;
  }, [currentCanonicalLibraryShape, selectedLibraryShape]);

  const matchingDesignerLibraryShapeName = useMemo(() => {
    return findMatchingDesignerLibraryShapeName(
      sessionShapeLibrary,
      shapeDesignerState.layout,
    );
  }, [sessionShapeLibrary, shapeDesignerState.layout]);

  const currentGridPresentation = useMemo(() => {
    return activeShapeDefinition?.renderHints?.gridPresentation ?? "square";
  }, [activeShapeDefinition]);

  const currentShapeSupportsLeftRight = useMemo(() => {
    if (currentCanonicalLibraryShape) {
      return supportsLeftRightVariant(
        currentCanonicalLibraryShape.layout,
        currentCanonicalLibraryShape.renderHints?.gridPresentation ?? "square",
      );
    }

    if (!currentComposedLayout) {
      return false;
    }

    return supportsLeftRightVariant(
      currentComposedLayout,
      currentGridPresentation,
    );
  }, [
    currentCanonicalLibraryShape,
    currentComposedLayout,
    currentGridPresentation,
  ]);

  const currentShapeSupportsInversion = useMemo(() => {
    if (currentCanonicalLibraryShape) {
      return supportsInversion(
        currentCanonicalLibraryShape.layout,
        currentCanonicalLibraryShape.renderHints?.gridPresentation ?? "square",
      );
    }

    if (!currentComposedLayout) {
      return false;
    }

    return supportsInversion(currentComposedLayout, currentGridPresentation);
  }, [
    currentCanonicalLibraryShape,
    currentComposedLayout,
    currentGridPresentation,
  ]);

  const formTypeTitle = getFormTypeTitle(
    currentShapeVariant,
    currentFormStyle,
    currentInverted,
    canBeSingle,
    currentShapeSupportsLeftRight,
    store.spec.shapeName,
  );

  const showAutofillBanner =
    isAutofillRunning ||
    autofillStatusText.startsWith("Autofill running") ||
    autofillStatusText.startsWith("Stopping autofill");

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isDirty]);

  function confirmDiscardChanges(actionDescription: string): boolean {
    if (!isDirty) {
      return true;
    }

    return window.confirm(
      `You have unsaved changes. Discard them and ${actionDescription}?`,
    );
  }

  function setUiStatus(
    text: string,
    kind: "info" | "success" | "error" = "info",
  ) {
    setUiStatusText(text);
    setUiStatusKind(kind);
  }

  const activeEntry = useMemo(() => {
    if (!store.selection.cellId) {
      return undefined;
    }

    return getEntryForCell(
      store.topology,
      store.selection.cellId,
      store.selection.direction,
    );
  }, [store.selection, store.topology]);

  const acrossEntries = useMemo(
    () =>
      store.topology.entries.filter((entry) => entry.direction === "across"),
    [store.topology.entries],
  );

  const downEntries = useMemo(
    () => store.topology.entries.filter((entry) => entry.direction === "down"),
    [store.topology.entries],
  );

  const formModel = useMemo(() => {
    return buildFormModelFromTopology(store.spec, store.topology);
  }, [store.spec, store.topology]);

  const formFillState = store.state;

  const presentationNumbering = useMemo(() => {
    return currentFormStyle === "single"
      ? buildSinglePresentationNumbering(formModel, store.topology)
      : buildDoublePresentationNumbering(store.topology);
  }, [currentFormStyle, formModel, store.topology]);

  const cluesByEntryId = useMemo(() => {
    const clueTextByFormWordId = Object.fromEntries(
      store.content.clues.map((clue) => [clue.formWordId, clue.text]),
    ) as Record<string, string>;

    return Object.fromEntries(
      formModel.displayEntries.map((entry) => [
        entry.id,
        clueTextByFormWordId[entry.formWordId] ?? "",
      ]),
    ) as Record<string, string>;
  }, [formModel.displayEntries, store.content.clues]);

  const displayedAcrossEntries = useMemo(() => {
    if (currentFormStyle === "single") {
      return [];
    }

    return acrossEntries.map((entry) =>
      relabelEntry(
        entry,
        presentationNumbering.numberByEntryId[entry.id] ?? entry.number,
        false,
      ),
    );
  }, [acrossEntries, currentFormStyle, presentationNumbering.numberByEntryId]);

  const displayedDownEntries = useMemo(() => {
    if (currentFormStyle === "single") {
      return [];
    }

    return downEntries.map((entry) =>
      relabelEntry(
        entry,
        presentationNumbering.numberByEntryId[entry.id] ?? entry.number,
        false,
      ),
    );
  }, [downEntries, currentFormStyle, presentationNumbering.numberByEntryId]);

  const singleClueEntries = useMemo(() => {
    if (
      currentFormStyle !== "single" ||
      !("representativeEntryIds" in presentationNumbering)
    ) {
      return [];
    }

    const entriesById = new Map(
      store.topology.entries.map((entry) => [entry.id, entry]),
    );

    return presentationNumbering.representativeEntryIds
      .map((entryId) => {
        const entry = entriesById.get(entryId);
        if (!entry) {
          return undefined;
        }

        return relabelEntry(
          entry,
          presentationNumbering.numberByEntryId[entry.id] ?? entry.number,
          true,
        );
      })
      .filter((entry): entry is EntryRef => Boolean(entry));
  }, [currentFormStyle, presentationNumbering, store.topology.entries]);

  const activeEntryPattern = useMemo(() => {
    if (!activeEntry) {
      return "";
    }

    return getDisplayEntryPatternById(formModel, formFillState, activeEntry.id);
  }, [activeEntry, formModel, formFillState]);

  const activeDisplayEntry = useMemo(() => {
    if (!activeEntry) {
      return undefined;
    }

    return formModel.displayEntries.find(
      (entry) => entry.id === activeEntry.id,
    );
  }, [activeEntry, formModel.displayEntries]);

  const activeFormWordId = activeDisplayEntry?.formWordId;

  const activeGridCellIds = useMemo(() => {
    if (!activeEntry) {
      return [];
    }

    if (currentFormStyle !== "single" || !activeFormWordId) {
      return [...activeEntry.cells];
    }

    const groupedCellIds = new Set<string>();

    for (const entry of formModel.displayEntries) {
      if (entry.formWordId !== activeFormWordId) {
        continue;
      }

      for (const cellId of entry.cellIds) {
        groupedCellIds.add(cellId);
      }
    }

    return [...groupedCellIds];
  }, [
    activeEntry,
    activeFormWordId,
    currentFormStyle,
    formModel.displayEntries,
  ]);

  const activeClueEntryId = useMemo(() => {
    if (!activeEntry) {
      return undefined;
    }

    if (
      currentFormStyle !== "single" ||
      !activeFormWordId ||
      !("representativeEntryIdByFormWordId" in presentationNumbering)
    ) {
      return activeEntry.id;
    }

    return presentationNumbering.representativeEntryIdByFormWordId[
      activeFormWordId
    ];
  }, [activeEntry, activeFormWordId, currentFormStyle, presentationNumbering]);

  const projectedFillsByCellId = useMemo(() => {
    return buildCellFillsFromFormFillState(formModel, formFillState);
  }, [formModel, formFillState]);

  const formModelRoundTripOk = useMemo(() => {
    return formModelRoundTripMatchesCellFills(
      formModel,
      projectedFillsByCellId,
    );
  }, [formModel, projectedFillsByCellId]);

  void formModelRoundTripOk;

  function handleCellClick(cellId: string) {
    setStore((prev) => ({
      ...prev,
      selection: toggleDirectionForRepeatedCellClick(
        prev.topology,
        prev.selection,
        cellId,
      ),
    }));
  }

  function selectEntry(entry: EntryRef) {
    setStore((prev) => ({
      ...prev,
      selection: {
        cellId: entry.cells[0] ?? null,
        direction: entry.direction,
      },
    }));
  }

  function handleEntryClick(entryId: string) {
    const entry = store.topology.entries.find((e) => e.id === entryId);
    if (!entry) {
      return;
    }
    selectEntry(entry);
  }

  function moveToAdjacentEntry(step: 1 | -1) {
    if (!activeEntry) {
      return;
    }

    const entries =
      activeEntry.direction === "across" ? acrossEntries : downEntries;
    const index = getEntryIndex(entries, activeEntry.id);
    const nextEntry = getWrappedEntry(entries, index, step);
    if (!nextEntry) {
      return;
    }

    selectEntry(nextEntry);
  }

  function handleClueChange(entryId: string, text: string) {
    setStore((prev) => {
      if (prev.mode !== "construct") {
        return prev;
      }

      const currentFormModel = buildFormModelFromTopology(
        prev.spec,
        prev.topology,
      );

      const displayEntry = currentFormModel.displayEntries.find(
        (entry) => entry.id === entryId,
      );
      if (!displayEntry) {
        return prev;
      }

      return {
        ...prev,
        content: {
          ...prev.content,
          clues: prev.content.clues.map((clue) =>
            clue.formWordId === displayEntry.formWordId
              ? { ...clue, text }
              : clue,
          ),
        },
      };
    });

    if (store.mode === "construct") {
      setIsDirty(true);
    }
  }

  function handleSizeChange(size: number) {
    if (!confirmDiscardChanges("change the puzzle size")) {
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
      uiMessage: "Updated puzzle size.",
    });

    setIsDirty(false);
    setLoadedPuzzleFileName(null);
  }

  function handleShapeVariantChange(shapeVariant: ShapeVariant) {
    if (shapeVariant === currentShapeVariant) {
      return;
    }

    if (!confirmDiscardChanges("change the puzzle variant")) {
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

    if (!confirmDiscardChanges("change the puzzle orientation")) {
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
    if (!confirmDiscardChanges("start a new puzzle")) {
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
      uiMessage: `Started a new ${activeShapeDefinition.name} puzzle.`,
    });

    setIsDirty(false);
    setLoadedPuzzleFileName(null);
  }

  function handleModeChange(mode: AppMode) {
    setStore((prev) => ({ ...prev, mode }));
    setIncorrectCellIds(new Set());
    setIsSolutionCorrect(false);
  }

  function handleDesignerPlacePrimitive(primitive: ShapePrimitive) {
    setShapeDesignerState((prev) => placePrimitiveAtSelection(prev, primitive));
  }

  function handleClearDesignedGrid() {
    setShapeDesignerState((prev) => clearDesignerLayout(prev));
    setUiStatus("Cleared designed shape.", "success");
  }

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
            shapeVariant: orientation === "right" ? "right" : "left",
            inverted,
          }
        : {
            ...requestedSpec,
            formStyle: resolvedFormStyle,
            shapeVariant: orientation === "right" ? "right" : "left",
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
      selection: {
        cellId: topology.cells[0]?.id ?? null,
        direction: "across",
      },
      mode: "construct",
    }));

    setCurrentPuzzleSolveMode("checkable");
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

  function handleUseDesignedShape() {
    try {
      const definition = buildComposedShapeDefinitionFromDesignerState(
        shapeDesignerState,
        designerGridPresentation,
      );

      upsertSessionShape(definition);

      instantiateComposedShape(definition, {
        size: safeDesignerPrimitiveSize,
        orientation: "left",
        inverted: false,
        requestedFormStyle: "single",
        uiMessage: "Constructing from designed shape",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to use designed shape.";
      window.alert(message);
    }
  }

  function handleSaveDesignedShape() {
    try {
      const definition = buildComposedShapeDefinitionFromDesignerState(
        shapeDesignerState,
        designerGridPresentation,
      );
      upsertSessionShape(definition);
      downloadShapeDefinitionFile(definition);
      setUiStatus(`Saved shape: ${definition.name}`, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save shape.";
      window.alert(message);
    }
  }

  async function handleLoadDesignedShape(file: File) {
    try {
      const definition = await readShapeDefinitionFile(file);

      if (definition.kind !== "composed") {
        throw new Error("Only composed shapes can be loaded in Designer mode.");
      }

      setShapeDesignerState((prev) =>
        replaceDesignerLayout(prev, definition.layout, definition.name),
      );
      upsertSessionShape(definition);
      setStore((prev) => ({ ...prev, mode: "designer" }));
      setUiStatus(`Loaded shape: ${definition.name}`, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load shape.";
      window.alert(message);
    }
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
      uiMessage: `Started a new ${formStyle} ${activeShapeDefinition.name} puzzle.`,
    });

    setIsDirty(false);
    setLoadedPuzzleFileName(null);
  }

  function handleCaptureSolution() {
    if (!isConstruct) {
      return;
    }

    setStore((prev) => {
      if (prev.mode !== "construct") {
        return prev;
      }

      return {
        ...prev,
        solution: {
          fillsByFormWordId: { ...prev.state.fillsByFormWordId },
        },
      };
    });

    setIsDirty(true);
    setUiStatus("Solution captured.", "success");
  }

  function handleClearGrid() {
    setStore((prev) => ({
      ...prev,
      state: buildEmptyFormFillState(
        buildFormModelFromTopology(prev.spec, prev.topology),
      ),
    }));

    setIsDirty(true);

    requestAnimationFrame(() => {
      gridRef.current?.focusGrid();
    });
  }

  function handleCheck() {
    if (!store.solution) {
      return;
    }

    const currentCellFills = buildCellFillsFromFormFillState(
      formModel,
      store.state,
    );
    const solutionCellFills = buildCellFillsFromFormFillState(
      formModel,
      store.solution,
    );

    const mismatches = Object.keys(solutionCellFills).filter((cellId) => {
      return (
        (currentCellFills[cellId] ?? "") !== (solutionCellFills[cellId] ?? "")
      );
    });

    if (mismatches.length === 0) {
      setIncorrectCellIds(new Set());
      setIsSolutionCorrect(true);
    } else {
      setIncorrectCellIds(new Set(mismatches));
      setIsSolutionCorrect(false);
    }
  }

  function openSaveDialog(kind: "save" | "solver") {
    setSaveDialogKind(kind);
    setSaveDialogSolveMode(currentPuzzleSolveMode);
    setSaveDialogDateAdded(currentPuzzleDateAdded || getTodayString());
    setSaveDialogComment(currentPuzzleComment);
    setSaveDialogEnigmaIssue(currentPuzzleEnigmaIssue);
    setSaveDialogFormNumber(currentPuzzleFormNumber);
  }

  function closeSaveDialog() {
    setSaveDialogKind(null);
  }

  function handleConfirmSaveDialog() {
    if (!saveDialogKind) {
      return;
    }

    const metadata = {
      solveMode: saveDialogSolveMode,
      dateAdded: saveDialogDateAdded || getTodayString(),
      comment: saveDialogComment,
      enigmaIssue: saveDialogEnigmaIssue,
      formNumber: saveDialogFormNumber,
    };

    setCurrentPuzzleSolveMode(metadata.solveMode);
    setCurrentPuzzleDateAdded(metadata.dateAdded);
    setCurrentPuzzleComment(metadata.comment);
    setCurrentPuzzleEnigmaIssue(metadata.enigmaIssue);
    setCurrentPuzzleFormNumber(metadata.formNumber);

    if (saveDialogKind === "save") {
      const puzzle = buildSavedPuzzle(store, metadata);
      downloadPuzzleFile(puzzle);
      setIsDirty(false);
      setUiStatus("Puzzle saved.", "success");
    } else {
      if (!store.solution) {
        window.alert("Capture a solution before exporting a solver version.");
        return;
      }

      const solverPuzzle = buildSavedPuzzle(store, metadata, {
        stateOverride: buildEmptyFormFillState(
          buildFormModelFromTopology(store.spec, store.topology),
        ),
        solutionOverride: store.solution,
      });

      downloadSolverPuzzleFile(solverPuzzle);
      setUiStatus("Solver version exported.", "success");
    }

    setSaveDialogKind(null);
  }

  function handleSave() {
    openSaveDialog("save");
  }

  function handleExportSolverVersion() {
    if (!store.solution) {
      window.alert("Capture a solution before exporting a solver version.");
      return;
    }

    openSaveDialog("solver");
  }

  async function handleLoad(file: File) {
    if (!confirmDiscardChanges("load another puzzle")) {
      return;
    }

    try {
      const puzzle = await readPuzzleFile(file);

      setStore(() => {
        const loadedSolveMode = puzzle.solveMode ?? "checkable";
        const loadedMode: AppMode = puzzle.solution
          ? loadedSolveMode === "strict"
            ? "solve_strict"
            : "solve_checkable"
          : "construct";

        const loadedFormModel = buildFormModelFromTopology(
          puzzle.spec,
          puzzle.topology,
        );

        return {
          mode: loadedMode,
          spec: puzzle.spec,
          topology: puzzle.topology,
          content: puzzle.content,
          state:
            loadedMode === "construct"
              ? puzzle.state
              : buildEmptyFormFillState(loadedFormModel),
          solution: puzzle.solution,
          selection: {
            cellId: puzzle.topology.cells[0]?.id ?? null,
            direction: "across",
          },
        };
      });

      setCurrentPuzzleSolveMode(puzzle.solveMode ?? "checkable");
      setCurrentPuzzleDateAdded(puzzle.dateAdded ?? getTodayString());
      setCurrentPuzzleComment(puzzle.comment ?? "");
      setCurrentPuzzleEnigmaIssue(puzzle.enigmaIssue ?? "");
      setCurrentPuzzleFormNumber(puzzle.formNumber ?? "");
      setLoadedPuzzleFileName(file.name);
      setIsDirty(false);
      setUiStatus(`Loaded puzzle: ${file.name}`, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load puzzle file.";
      window.alert(message);
    }
  }

  function loadPuzzleFromLibrary(puzzle: SavedPuzzle) {
    if (!confirmDiscardChanges("load a library puzzle")) {
      return;
    }

    setStore(() => {
      const loadedSolveMode = puzzle.solveMode ?? "checkable";
      const loadedMode: AppMode = puzzle.solution
        ? loadedSolveMode === "strict"
          ? "solve_strict"
          : "solve_checkable"
        : "construct";

      const loadedFormModel = buildFormModelFromTopology(
        puzzle.spec,
        puzzle.topology,
      );

      return {
        mode: loadedMode,
        spec: puzzle.spec,
        topology: puzzle.topology,
        content: puzzle.content,
        state:
          loadedMode === "construct"
            ? puzzle.state
            : buildEmptyFormFillState(loadedFormModel),
        solution: puzzle.solution,
        selection: {
          cellId: puzzle.topology.cells[0]?.id ?? null,
          direction: "across",
        },
      };
    });

    setCurrentPuzzleSolveMode(puzzle.solveMode ?? "checkable");
    setCurrentPuzzleDateAdded(puzzle.dateAdded ?? getTodayString());
    setCurrentPuzzleComment(puzzle.comment ?? "");
    setCurrentPuzzleEnigmaIssue(puzzle.enigmaIssue ?? "");
    setCurrentPuzzleFormNumber(puzzle.formNumber ?? "");
    setLoadedPuzzleFileName("(library)");
    setIsDirty(false);
    setIsLibraryOpen(false);
    setUiStatus("Loaded puzzle from library.", "success");
  }

  async function handleLoadWordList(file: File) {
    try {
      const text = await file.text();
      const parsed = parseWordListText(text, file.name);
      setLoadedWordList(parsed);
      setLoadedWordListName(file.name);

      setUiStatus(
        `Loaded word list: ${parsed.name} (${parsed.eligibleEntries.length.toLocaleString()} eligible entries)`,
        "success",
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Failed to load word list file.";
      window.alert(message);
    }
  }

  function handleFindWords() {
    if (!activeEntry) {
      setUiStatus("No active entry selected.", "info");
      return;
    }

    if (!loadedWordList) {
      setUiStatus("No word list loaded.", "info");
      return;
    }

    if (!activeEntryPattern) {
      setUiStatus("Unable to derive a pattern for the active entry.", "error");
      return;
    }

    const result = findMatchingWords(
      loadedWordList,
      activeEntryPattern,
      0,
      WORD_LOOKUP_PAGE_SIZE,
    );

    if (result.total === 0) {
      setUiStatus(`No matches for pattern ${activeEntryPattern}.`, "info");
      return;
    }

    setWordLookupMatches(result.matches);
    setWordLookupTotal(result.total);
    setWordLookupOffset(result.matches.length);
    setIsWordLookupOpen(true);
    setUiStatus(
      `Found ${result.total.toLocaleString()} matches for pattern ${activeEntryPattern}.`,
      "success",
    );
  }

  async function handleAutofill() {
    if (!loadedWordList) {
      setUiStatus("No word list loaded.", "info");
      return;
    }

    if (isAutofillRunning) {
      return;
    }

    autofillShouldContinueRef.current = true;
    setIsAutofillRunning(true);
    setAutofillStatusText("Autofill running...");
    setUiStatus("Autofill running...", "info");
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      if (currentFormStyle === "single") {
        const result = await autofillFormModel(
          formModel,
          store.state,
          loadedWordList,
          {
            lockCompletedWords,
            randomizeChoices: randomizeAutofillChoices,
          },
          {
            shouldContinue: () => autofillShouldContinueRef.current,
            onProgress: (progress: AutofillProgress) => {
              setAutofillStatusText(
                `Autofill running... nodes visited: ${progress.nodesVisited.toLocaleString()}`,
              );

              if (progress.partialFormFillState) {
                setStore((prev) => ({
                  ...prev,
                  state: progress.partialFormFillState!,
                }));
              }
            },
            progressInterval: 1000,
            yieldInterval: 250,
          },
        );

        if (!autofillShouldContinueRef.current) {
          setAutofillStatusText("Autofill cancelled.");
          setUiStatus("Autofill cancelled.", "info");
          return;
        }

        if (!result) {
          setAutofillStatusText("Autofill failed: no solution found.");
          setUiStatus("No autofill solution found.", "error");
          return;
        }

        setStore((prev) => ({
          ...prev,
          state: result,
        }));
      } else {
        const currentCellFills = buildCellFillsFromFormFillState(
          formModel,
          store.state,
        );

        const result = await autofillGrid(
          store.topology,
          currentCellFills,
          loadedWordList,
          {
            lockCompletedWords,
            randomizeChoices: randomizeAutofillChoices,
          },
          {
            shouldContinue: () => autofillShouldContinueRef.current,
            onProgress: (progress: AutofillProgress) => {
              setAutofillStatusText(
                `Autofill running... nodes visited: ${progress.nodesVisited.toLocaleString()}`,
              );

              if (progress.partialGridFillsByCellId) {
                setStore((prev) => {
                  const currentFormModel = buildFormModelFromTopology(
                    prev.spec,
                    prev.topology,
                  );

                  return {
                    ...prev,
                    state: buildFormFillStateFromCellFills(
                      currentFormModel,
                      progress.partialGridFillsByCellId!,
                    ),
                  };
                });
              }
            },
            progressInterval: 100,
            yieldInterval: 250,
          },
        );

        if (!autofillShouldContinueRef.current) {
          setAutofillStatusText("Autofill cancelled.");
          setUiStatus("Autofill cancelled.", "info");
          return;
        }

        if (!result) {
          setAutofillStatusText("Autofill failed: no solution found.");
          setUiStatus("No autofill solution found.", "error");
          return;
        }

        setStore((prev) => {
          const currentFormModel = buildFormModelFromTopology(
            prev.spec,
            prev.topology,
          );

          return {
            ...prev,
            state: buildFormFillStateFromCellFills(currentFormModel, result),
          };
        });
      }
      setIsDirty(true);
      setAutofillStatusText("Autofill succeeded.");
      setUiStatus("Autofill succeeded.", "success");

      requestAnimationFrame(() => {
        gridRef.current?.focusGrid();
      });
    } finally {
      setIsAutofillRunning(false);
    }
  }

  function handleStopAutofill() {
    autofillShouldContinueRef.current = false;
    setAutofillStatusText("Stopping autofill...");
    setUiStatus("Stopping autofill...", "info");
  }

  function handleLoadMoreWordLookupMatches() {
    if (!loadedWordList || !activeEntryPattern) {
      return;
    }

    const result = findMatchingWords(
      loadedWordList,
      activeEntryPattern,
      wordLookupOffset,
      WORD_LOOKUP_PAGE_SIZE,
    );

    setWordLookupMatches((prev) => [...prev, ...result.matches]);
    setWordLookupOffset((prev) => prev + result.matches.length);
  }

  function handleApplyWordLookupWord(word: string) {
    if (!activeEntry) {
      return;
    }

    const nextFormFillState = applyWordToDisplayEntryByCell(
      formModel,
      formFillState,
      activeEntry.id,
      word,
    );

    setStore((prev) => ({
      ...prev,
      state: nextFormFillState,
    }));

    setIsDirty(true);
    setIsWordLookupOpen(false);
    setUiStatus(`Applied word: ${word}`, "success");

    requestAnimationFrame(() => {
      gridRef.current?.focusGrid();
    });
  }

  function handleCloseWordLookup() {
    setIsWordLookupOpen(false);
  }

  function handleTitleChange(title: string) {
    setStore((prev) => {
      if (prev.mode !== "construct") {
        return prev;
      }

      return {
        ...prev,
        content: {
          ...prev.content,
          metadata: {
            ...prev.content.metadata,
            title,
          },
        },
      };
    });

    if (store.mode === "construct") {
      setIsDirty(true);
    }
  }

  function handleAuthorChange(author: string) {
    setStore((prev) => {
      if (prev.mode !== "construct") {
        return prev;
      }

      return {
        ...prev,
        content: {
          ...prev.content,
          metadata: {
            ...prev.content.metadata,
            author,
          },
        },
      };
    });

    if (store.mode === "construct") {
      setIsDirty(true);
    }
  }

  function handlePublicationChange(publication: string) {
    setStore((prev) => {
      if (prev.mode !== "construct") {
        return prev;
      }

      return {
        ...prev,
        content: {
          ...prev.content,
          metadata: {
            ...prev.content.metadata,
            publication,
          },
        },
      };
    });

    if (store.mode === "construct") {
      setIsDirty(true);
    }
  }

  function moveSelectionByArrow(
    direction: EntryDirection,
    deltaRow: number,
    deltaCol: number,
  ) {
    setStore((prev) => {
      const currentCell = getCellById(prev.topology, prev.selection.cellId);
      if (!currentCell) {
        return prev;
      }

      let candidateCells;

      if (deltaCol !== 0) {
        candidateCells = prev.topology.cells
          .filter((cell) => cell.row === currentCell.row)
          .sort((a, b) => a.col - b.col);

        const index = candidateCells.findIndex(
          (cell) => cell.id === currentCell.id,
        );
        if (index < 0 || candidateCells.length === 0) {
          return prev;
        }

        const step = deltaCol > 0 ? 1 : -1;
        const nextIndex =
          (index + step + candidateCells.length) % candidateCells.length;
        const nextCell = candidateCells[nextIndex];

        return {
          ...prev,
          selection: {
            cellId: nextCell.id,
            direction,
          },
        };
      }

      candidateCells = prev.topology.cells
        .filter((cell) => cell.col === currentCell.col)
        .sort((a, b) => a.row - b.row);

      const index = candidateCells.findIndex(
        (cell) => cell.id === currentCell.id,
      );
      if (index < 0 || candidateCells.length === 0) {
        return prev;
      }

      const step = deltaRow > 0 ? 1 : -1;
      const nextIndex =
        (index + step + candidateCells.length) % candidateCells.length;
      const nextCell = candidateCells[nextIndex];

      return {
        ...prev,
        selection: {
          cellId: nextCell.id,
          direction,
        },
      };
    });
  }

  function handleGridKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    const key = event.key;

    if (key === "Tab") {
      event.preventDefault();
      moveToAdjacentEntry(event.shiftKey ? -1 : 1);
      return;
    }

    if (key === "Enter") {
      event.preventDefault();
      moveToAdjacentEntry(1);
      return;
    }

    if (key === "ArrowLeft") {
      event.preventDefault();
      moveSelectionByArrow("across", 0, -1);
      return;
    }

    if (key === "ArrowRight") {
      event.preventDefault();
      moveSelectionByArrow("across", 0, 1);
      return;
    }

    if (key === "ArrowUp") {
      event.preventDefault();
      moveSelectionByArrow("down", -1, 0);
      return;
    }

    if (key === "ArrowDown") {
      event.preventDefault();
      moveSelectionByArrow("down", 1, 0);
      return;
    }

    if (key === "Backspace") {
      event.preventDefault();

      setStore((prev) => {
        if (!prev.selection.cellId) {
          return prev;
        }

        const entry = getEntryForCell(
          prev.topology,
          prev.selection.cellId,
          prev.selection.direction,
        );
        if (!entry) {
          return prev;
        }

        const currentFormModel = buildFormModelFromTopology(
          prev.spec,
          prev.topology,
        );
        const currentFormFillState = prev.state;

        const nextFormFillState = setDisplayedCellCharacter(
          currentFormModel,
          currentFormFillState,
          prev.selection.cellId,
          "",
        );

        return {
          ...prev,
          state: nextFormFillState,
          selection: {
            ...prev.selection,
            cellId: getPreviousCellIdInEntry(entry, prev.selection.cellId),
          },
        };
      });

      setIsDirty(true);
      setIncorrectCellIds(new Set());
      setIsSolutionCorrect(false);
      return;
    }

    if (/^[a-zA-Z]$/.test(key) || key === " ") {
      event.preventDefault();

      const letter = key === " " ? "" : key.toUpperCase();

      setStore((prev) => {
        if (!prev.selection.cellId) {
          return prev;
        }

        const entry = getEntryForCell(
          prev.topology,
          prev.selection.cellId,
          prev.selection.direction,
        );
        if (!entry) {
          return prev;
        }

        const currentFormModel = buildFormModelFromTopology(
          prev.spec,
          prev.topology,
        );
        const fillsBefore = buildCellFillsFromFormFillState(
          currentFormModel,
          prev.state,
        );
        const currentFormFillState = prev.state;

        const nextFormFillState = setDisplayedCellCharacter(
          currentFormModel,
          currentFormFillState,
          prev.selection.cellId,
          letter,
        );

        const nextCellId =
          prev.mode === "solve_strict" || prev.mode === "solve_checkable"
            ? getNextSolveCellId(entry, prev.selection.cellId, fillsBefore)
            : getNextCellIdInEntry(entry, prev.selection.cellId);

        return {
          ...prev,
          state: nextFormFillState,
          selection: {
            ...prev.selection,
            cellId: nextCellId,
          },
        };
      });

      setIsDirty(true);
      setIncorrectCellIds(new Set());
      setIsSolutionCorrect(false);
    }
  }

  function handleClueInputKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    entryId: string,
  ) {
    const topologyEntry = store.topology.entries.find((e) => e.id === entryId);
    if (!topologyEntry) {
      return;
    }

    if (keyIsNavigation(event.key)) {
      return;
    }

    const entries =
      currentFormStyle === "single"
        ? singleClueEntries
        : [...displayedAcrossEntries, ...displayedDownEntries];

    if (event.key === "Tab") {
      event.preventDefault();
      const index = getEntryIndex(entries, entryId);
      const nextEntry = getWrappedEntry(
        entries,
        index,
        event.shiftKey ? -1 : 1,
      );
      if (nextEntry) {
        selectEntry(nextEntry);
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const index = getEntryIndex(entries, entryId);
      const nextEntry = getWrappedEntry(entries, index, 1);
      if (nextEntry) {
        selectEntry(nextEntry);
      }
    }
  }

  function handleDesignerKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const key = event.key;

    if (key === "ArrowLeft") {
      event.preventDefault();
      setShapeDesignerState((prev) => ({
        ...prev,
        selection: moveSelection(prev.layout, prev.selection, 0, -1),
      }));
      return;
    }

    if (key === "ArrowRight") {
      event.preventDefault();
      setShapeDesignerState((prev) => ({
        ...prev,
        selection: moveSelection(prev.layout, prev.selection, 0, 1),
      }));
      return;
    }

    if (key === "ArrowUp") {
      event.preventDefault();
      setShapeDesignerState((prev) => ({
        ...prev,
        selection: moveSelection(prev.layout, prev.selection, -1, 0),
      }));
      return;
    }

    if (key === "ArrowDown") {
      event.preventDefault();
      setShapeDesignerState((prev) => ({
        ...prev,
        selection: moveSelection(prev.layout, prev.selection, 1, 0),
      }));
      return;
    }

    if (key === "Backspace") {
      event.preventDefault();
      setShapeDesignerState((prev) => clearPrimitiveAtSelection(prev, true));
      return;
    }

    if (key === " ") {
      event.preventDefault();
      setShapeDesignerState((prev) => clearPrimitiveAtSelection(prev, false));
      return;
    }

    if (key === "Enter") {
      event.preventDefault();
      setShapeDesignerState((prev) => ({
        ...prev,
        selection: {
          row: Math.min(prev.layout.height - 1, prev.selection.row + 1),
          col: 0,
        },
      }));
      return;
    }

    if (
      key === "L" ||
      key === "R" ||
      key === "S" ||
      key === "l" ||
      key === "r" ||
      key === "."
    ) {
      event.preventDefault();
      const primitive = key as ShapePrimitive;
      setShapeDesignerState((prev) =>
        placePrimitiveAtSelection(
          {
            ...prev,
            selectedPrimitive: primitive,
          },
          primitive,
        ),
      );
      return;
    }
  }

  function keyIsNavigation(key: string): boolean {
    return (
      key === "ArrowLeft" ||
      key === "ArrowRight" ||
      key === "ArrowUp" ||
      key === "ArrowDown"
    );
  }

  return (
    <div className="app-shell">
      <header
        className="app-header"
        style={{
          display: "block",
          paddingBottom: "0.75rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr auto 1fr",
            alignItems: "center",
            columnGap: "1rem",
            width: "100%",
          }}
        >
          <h1 style={{ margin: 0, justifySelf: "start" }}>
            Form Friend{isDirty ? " *" : ""}
          </h1>

          <div
            style={{
              justifySelf: "center",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "#334155",
              textAlign: "center",
            }}
          >
            Design, construct and solve forms
          </div>

          <div
            className={`header-status-message header-status-${uiStatusKind}`}
            style={{ justifySelf: "end" }}
          >
            {uiStatusText}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "0.75rem",
            borderBottom: "1px solid #cbd5f5",
          }}
        >
          {[
            ["designer", "Design"],
            ["construct", "Construct"],
            ["solve", "Solve"],
          ].map(([mode, label]) => {
            const isActive =
              mode === "solve" ? isSolve : store.mode === (mode as AppMode);

            return (
              <button
                key={mode}
                type="button"
                onClick={() =>
                  handleModeChange(
                    mode === "solve"
                      ? currentPuzzleSolveMode === "strict"
                        ? "solve_strict"
                        : "solve_checkable"
                      : (mode as AppMode),
                  )
                }
                style={{
                  padding: "0.5rem 1rem",
                  marginBottom: "-1px",
                  border: "1px solid #cbd5f5",
                  borderBottom: isActive
                    ? "1px solid white"
                    : "1px solid #cbd5f5",
                  borderTopLeftRadius: "0.5rem",
                  borderTopRightRadius: "0.5rem",
                  background: isActive ? "white" : "#e2e8f0",
                  fontWeight: isActive ? 600 : 400,
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="app-main">
        <aside className="left-panel">
          {!isDesigner ? (
            <>
              <Toolbar
                size={store.spec.size}
                allowedSizes={allowedSizes}
                shapeVariant={currentShapeVariant}
                formStyle={currentFormStyle}
                inverted={currentInverted}
                canBeSingle={canBeSingle}
                supportsInverted={currentShapeSupportsInversion}
                formTypeTitle={formTypeTitle}
                supportsShapeVariantToggle={currentShapeSupportsLeftRight}
                shapeDisplayName={store.spec.shapeName}
                libraryShapeOptions={sessionShapeLibrary.map((shape) => ({
                  id: shape.id,
                  name: shape.name,
                }))}
                selectedLibraryShapeId={selectedLibraryShapeId}
                onLibraryShapeChange={(shapeId) => {
                  const definition = sessionShapeLibrary.find(
                    (item) => item.id === shapeId,
                  );
                  if (!definition) {
                    return;
                  }

                  instantiateComposedShape(definition, {
                    size: store.spec.size,
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
                }}
                onShapeVariantChange={handleShapeVariantChange}
                onInvertedChange={handleInvertedChange}
                onFormStyleChange={handleFormStyleChange}
                mode={store.mode}
                isConstruct={isConstruct}
                isSolveStrict={isSolveStrict}
                isSolveCheckable={isSolveCheckable}
                hasSolution={Boolean(store.solution)}
                wordListEntryCount={loadedWordList?.eligibleEntries.length ?? 0}
                loadedPuzzleFileName={loadedPuzzleFileName}
                loadedWordListName={loadedWordListName}
                lockCompletedWords={lockCompletedWords}
                randomizeAutofillChoices={randomizeAutofillChoices}
                isAutofillRunning={isAutofillRunning}
                autofillStatusText={autofillStatusText}
                onNewPuzzle={handleNewPuzzle}
                onSizeChange={handleSizeChange}
                onModeChange={handleModeChange}
                onCaptureSolution={handleCaptureSolution}
                onClearGrid={handleClearGrid}
                onCheck={handleCheck}
                onSave={handleSave}
                onExportSolverVersion={handleExportSolverVersion}
                onLoad={handleLoad}
                onBrowseLibrary={() => setIsLibraryOpen(true)}
                onFindWords={handleFindWords}
                onLoadWordList={handleLoadWordList}
                onAutofill={handleAutofill}
                onStopAutofill={handleStopAutofill}
                onLockCompletedWordsChange={setLockCompletedWords}
                onRandomizeAutofillChoicesChange={setRandomizeAutofillChoices}
              />

              {null}
            </>
          ) : (
            <>
              <section className="clue-panel">
                <h3>Designer Settings</h3>
                <label style={{ display: "block", marginBottom: "0.75rem" }}>
                  <span style={{ display: "block", marginBottom: "0.25rem" }}>
                    Shape name
                  </span>
                  <input
                    type="text"
                    value={shapeDesignerState.name}
                    onChange={(e) =>
                      setShapeDesignerState((prev) => ({
                        ...prev,
                        name: e.target.value,
                      }))
                    }
                    style={{ width: "100%" }}
                  />
                </label>

                <div
                  style={{
                    border: "1px solid #d1d5db",
                    borderRadius: "0.5rem",
                    padding: "0.75rem",
                    marginBottom: "0.75rem",
                  }}
                >
                  <label style={{ display: "block", marginBottom: "0.75rem" }}>
                    <span style={{ display: "block", marginBottom: "0.25rem" }}>
                      Primitive size
                    </span>
                    <select
                      value={safeDesignerPrimitiveSize}
                      onChange={(e) =>
                        setShapeDesignerState((prev) => ({
                          ...prev,
                          size: Number(e.target.value),
                        }))
                      }
                      style={{ width: "100%" }}
                    >
                      {Array.from({ length: 13 }, (_, index) => index + 3)
                        .filter((size) => size >= minimumDesignerPrimitiveSize)
                        .map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                    </select>
                  </label>
                  {/*
                  <label style={{ display: "block", marginBottom: "0.75rem" }}>
                    <span style={{ display: "block", marginBottom: "0.25rem" }}>
                      Start with library shape
                    </span>
                    <select
                      value=""
                      onChange={(e) => {
                        const shape = sessionShapeLibrary.find(
                          (item) => item.id === e.target.value,
                        );
                        if (!shape) {
                          return;
                        }

                        setShapeDesignerState((prev) =>
                          replaceDesignerLayout(prev, shape.layout, shape.name),
                        );
                        setDesignerGridPresentation(
                          shape.renderHints?.gridPresentation ?? "square",
                        );
                      }}
                      style={{ width: "100%" }}
                    >
                      <option value="">Choose a library shape...</option>
                      {sessionShapeLibrary.map((shape) => (
                        <option key={shape.id} value={shape.id}>
                          {shape.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  */}
                  <label style={{ display: "block", marginBottom: "0.75rem" }}>
                    <span style={{ display: "block", marginBottom: "0.25rem" }}>
                      Grid display
                    </span>
                    <select
                      value={designerGridPresentation}
                      onChange={(e) =>
                        setDesignerGridPresentation(
                          e.target.value as "square" | "hex",
                        )
                      }
                      style={{ width: "100%" }}
                    >
                      <option value="square">Rectilinear</option>
                      <option value="hex">Hex</option>
                    </select>
                  </label>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gap: "0.75rem",
                    }}
                  >
                    <label style={{ display: "block" }}>
                      <span
                        style={{ display: "block", marginBottom: "0.25rem" }}
                      >
                        Width
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={shapeDesignerState.layout.width}
                        onChange={(e) =>
                          setShapeDesignerState((prev) =>
                            resizeDesignerLayout(
                              prev,
                              Math.max(1, Number(e.target.value) || 1),
                              prev.layout.height,
                            ),
                          )
                        }
                        style={{ width: "100%" }}
                      />
                    </label>

                    <label style={{ display: "block" }}>
                      <span
                        style={{ display: "block", marginBottom: "0.25rem" }}
                      >
                        Height
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        value={shapeDesignerState.layout.height}
                        onChange={(e) =>
                          setShapeDesignerState((prev) =>
                            resizeDesignerLayout(
                              prev,
                              prev.layout.width,
                              Math.max(1, Number(e.target.value) || 1),
                            ),
                          )
                        }
                        style={{ width: "100%" }}
                      />
                    </label>

                    <label style={{ display: "block" }}>
                      <span
                        style={{
                          display: "block",
                          marginBottom: "0.25rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Row overlap
                      </span>
                      <select
                        value={shapeDesignerState.layout.overlapRows}
                        onChange={(e) =>
                          setShapeDesignerState((prev) => {
                            const overlapRows = Number(e.target.value);
                            const minimumSize =
                              Math.max(overlapRows, prev.layout.overlapCols) +
                              1;

                            return {
                              ...prev,
                              size: Math.max(prev.size, minimumSize),
                              layout: {
                                ...prev.layout,
                                overlapRows,
                              },
                            };
                          })
                        }
                        style={{ width: "100%" }}
                      >
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </label>

                    <label style={{ display: "block" }}>
                      <span
                        style={{
                          display: "block",
                          marginBottom: "0.25rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Column overlap
                      </span>
                      <select
                        value={shapeDesignerState.layout.overlapCols}
                        onChange={(e) =>
                          setShapeDesignerState((prev) => {
                            const overlapCols = Number(e.target.value);
                            const minimumSize =
                              Math.max(prev.layout.overlapRows, overlapCols) +
                              1;

                            return {
                              ...prev,
                              size: Math.max(prev.size, minimumSize),
                              layout: {
                                ...prev.layout,
                                overlapCols,
                              },
                            };
                          })
                        }
                        style={{ width: "100%" }}
                      >
                        <option value={0}>0</option>
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                    gap: "0.5rem",
                  }}
                >
                  <button type="button" onClick={handleUseDesignedShape}>
                    Construct with This Shape
                  </button>
                  <button type="button" onClick={handleSaveDesignedShape}>
                    Save Shape
                  </button>
                  <button
                    type="button"
                    onClick={() => loadShapeFileInputRef.current?.click()}
                  >
                    Load Shape
                  </button>
                  <button type="button" onClick={handleClearDesignedGrid}>
                    Clear Grid
                  </button>
                </div>

                <input
                  ref={loadShapeFileInputRef}
                  type="file"
                  accept=".json,application/json"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) {
                      return;
                    }

                    void handleLoadDesignedShape(file);
                    e.currentTarget.value = "";
                  }}
                />
              </section>
              {null}
            </>
          )}
        </aside>

        <section
          className="center-panel"
          style={
            isDesigner
              ? {
                  minWidth: 420,
                  width: "fit-content",
                  maxWidth: "100%",
                  alignItems: "center",
                }
              : undefined
          }
        >
          {!isDesigner ? (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                  gap: "0.5rem",
                }}
              >
                {/* Publication (left) */}
                <div
                  style={{
                    textAlign: "left",
                    fontSize: "0.9rem",
                    color: "#555",
                  }}
                >
                  {isConstruct ? (
                    <input
                      type="text"
                      value={store.content.metadata.publication ?? ""}
                      onChange={(e) => handlePublicationChange(e.target.value)}
                      style={{
                        width: "100%",
                        border: "none",
                        borderBottom: "1px solid #ccc",
                      }}
                    />
                  ) : (
                    store.content.metadata.publication
                  )}
                </div>

                {/* Title (center) */}
                <div
                  style={{
                    textAlign: "center",
                    fontWeight: 600,
                    fontSize: "1.1rem",
                  }}
                >
                  {isConstruct ? (
                    <input
                      type="text"
                      value={store.content.metadata.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      style={{
                        textAlign: "center",
                        border: "none",
                        borderBottom: "1px solid #ccc",
                        width: "100%",
                      }}
                    />
                  ) : (
                    store.content.metadata.title
                  )}
                </div>

                {/* Author (right) */}
                <div style={{ textAlign: "right", fontSize: "0.9rem" }}>
                  {isConstruct ? (
                    <input
                      type="text"
                      value={store.content.metadata.author}
                      onChange={(e) => handleAuthorChange(e.target.value)}
                      style={{
                        textAlign: "right",
                        border: "none",
                        borderBottom: "1px solid #ccc",
                        width: "100%",
                      }}
                    />
                  ) : (
                    store.content.metadata.author
                  )}
                </div>
              </div>

              <h3 className="center-title">{formTypeTitle}</h3>
              {showAutofillBanner ? (
                <div
                  style={{
                    display: "block",
                    marginTop: "0.25rem",
                    marginBottom: "0.75rem",
                    fontStyle: "italic",
                    textAlign: "center",
                    fontWeight: 500,
                    minHeight: "1.25rem",
                  }}
                >
                  {autofillStatusText.startsWith("Stopping autofill")
                    ? "Stopping autofill..."
                    : "Autofilling..."}
                </div>
              ) : null}
              <div className="grid-wrapper">
                <PuzzleGrid
                  ref={gridRef}
                  topology={store.topology}
                  fillsByCellId={projectedFillsByCellId}
                  selection={store.selection}
                  activeCellIds={activeGridCellIds}
                  clueNumberByCellId={presentationNumbering.clueNumberByCellId}
                  gridPresentation={
                    activeShapeDefinition?.renderHints?.gridPresentation ??
                    "square"
                  }
                  incorrectCellIds={
                    isSolveCheckable ? incorrectCellIds : new Set()
                  }
                  onCellClick={handleCellClick}
                  onKeyDown={handleGridKeyDown}
                />
              </div>
              {isSolveCheckable && isSolutionCorrect ? (
                <div
                  style={{
                    textAlign: "center",
                    marginTop: "0.5rem",
                    color: "#15803d",
                  }}
                >
                  Solution is correct!
                </div>
              ) : null}
            </>
          ) : (
            <>
              <h3 className="center-title">
                Shape Designer
                {matchingDesignerLibraryShapeName
                  ? ` - ${matchingDesignerLibraryShapeName}`
                  : ""}
              </h3>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  flexWrap: "wrap",
                  minWidth: 0,
                }}
              >
                <div style={{ minWidth: 0, flex: "1 1 0" }}>
                  <ShapeDesignerSurface
                    layout={shapeDesignerState.layout}
                    size={safeDesignerPrimitiveSize}
                    selection={shapeDesignerState.selection}
                    selectedPrimitive={shapeDesignerState.selectedPrimitive}
                    onSelectCell={(row, col) =>
                      setShapeDesignerState((prev) => ({
                        ...prev,
                        selection: { row, col },
                      }))
                    }
                    onKeyDown={handleDesignerKeyDown}
                  />

                  <ShapePalette
                    selectedPrimitive={shapeDesignerState.selectedPrimitive}
                    onSelectPrimitive={(primitive) =>
                      setShapeDesignerState((prev) =>
                        placePrimitiveAtSelection(
                          {
                            ...prev,
                            selectedPrimitive: primitive,
                          },
                          primitive,
                        ),
                      )
                    }
                  />
                </div>

                {designerGridPresentation === "hex" ? (
                  <section className="clue-panel" style={{ minWidth: "220px" }}>
                    <h3>Hex Preview</h3>
                    <div className="grid-wrapper">
                      <PuzzleGrid
                        topology={buildTopologyFromComposedShapeDefinition(
                          {
                            kind: "composed",
                            id: "preview",
                            name: "Preview",
                            layout: shapeDesignerState.layout,
                            renderHints: { gridPresentation: "hex" },
                          },
                          safeDesignerPrimitiveSize,
                        )}
                        fillsByCellId={{}}
                        selection={{ cellId: null, direction: "across" }}
                        activeCellIds={[]}
                        clueNumberByCellId={{}}
                        gridPresentation="hex"
                        cellSize={18}
                        onCellClick={() => {}}
                        onKeyDown={() => {}}
                      />
                    </div>
                  </section>
                ) : null}
              </div>
            </>
          )}
        </section>

        <aside
          className="right-panel"
          style={
            isDesigner
              ? { display: "flex", flexDirection: "column", minHeight: 0 }
              : currentFormStyle === "single"
                ? { display: "flex", flexDirection: "column", minHeight: 0 }
                : undefined
          }
        >
          {isDesigner ? (
            <>
              <section className="clue-panel" style={{ flex: 1, minHeight: 0 }}>
                <h3>Designer Notes</h3>
                <div className="clue-list" style={{ flex: 1, minHeight: 0 }}>
                  <p>
                    This first phase lets you place square and halfsquare
                    primitives on a unified design surface.
                  </p>
                  <p>Library save/load and constructor handoff come next.</p>
                  {/*
                  {matchingDesignerLibraryShapes.length > 0 ? (
                    <p>
                      Already in library:
                      <br />
                      <code>
                        {matchingDesignerLibraryShapes
                          .map((shape) => shape.name)
                          .join(", ")}
                      </code>
                    </p>
                  ) : null}
                  */}
                  <p>
                    Current layout:
                    <br />
                    <code>{shapeDesignerState.layout.rows.join(":")}</code>
                  </p>
                </div>
              </section>
            </>
          ) : currentFormStyle === "single" ? (
            <CluePanel
              title="Clues"
              entries={singleClueEntries}
              cluesByEntryId={cluesByEntryId}
              activeEntryId={activeClueEntryId}
              readOnly={isSolve}
              fillAvailableHeight
              onEntryClick={handleEntryClick}
              onEntryKeyDown={handleClueInputKeyDown}
              onClueChange={handleClueChange}
            />
          ) : (
            <>
              <CluePanel
                title="Across"
                entries={displayedAcrossEntries}
                cluesByEntryId={cluesByEntryId}
                activeEntryId={
                  activeEntry?.direction === "across"
                    ? activeEntry.id
                    : undefined
                }
                readOnly={isSolve}
                onEntryClick={handleEntryClick}
                onEntryKeyDown={handleClueInputKeyDown}
                onClueChange={handleClueChange}
              />

              <CluePanel
                title="Down"
                entries={displayedDownEntries}
                cluesByEntryId={cluesByEntryId}
                activeEntryId={
                  activeEntry?.direction === "down" ? activeEntry.id : undefined
                }
                readOnly={isSolve}
                onEntryClick={handleEntryClick}
                onEntryKeyDown={handleClueInputKeyDown}
                onClueChange={handleClueChange}
              />
            </>
          )}
        </aside>
      </main>
      {saveDialogKind ? (
        <div className="dialog-backdrop">
          <div className="save-puzzle-dialog">
            <h3>
              {saveDialogKind === "save"
                ? "Save Puzzle"
                : "Export Solver Version"}
            </h3>

            <div className="save-puzzle-fields">
              <label>
                Solve mode
                <select
                  value={saveDialogSolveMode}
                  onChange={(e) =>
                    setSaveDialogSolveMode(e.target.value as SolveMode)
                  }
                >
                  <option value="checkable">Checkable</option>
                  <option value="strict">Strict</option>
                </select>
              </label>

              <label>
                Date added
                <input
                  type="text"
                  value={saveDialogDateAdded}
                  onChange={(e) => setSaveDialogDateAdded(e.target.value)}
                />
              </label>

              <label>
                Comment
                <textarea
                  value={saveDialogComment}
                  onChange={(e) => setSaveDialogComment(e.target.value)}
                  rows={3}
                />
              </label>

              <label>
                Enigma issue
                <input
                  type="text"
                  value={saveDialogEnigmaIssue}
                  onChange={(e) => setSaveDialogEnigmaIssue(e.target.value)}
                  placeholder="e.g. 1998-03"
                />
              </label>

              <label>
                Form number
                <input
                  type="text"
                  value={saveDialogFormNumber}
                  onChange={(e) => setSaveDialogFormNumber(e.target.value)}
                  placeholder="e.g. F-5"
                />
              </label>
            </div>

            <div className="save-puzzle-buttons">
              <button type="button" onClick={closeSaveDialog}>
                Cancel
              </button>
              <button type="button" onClick={handleConfirmSaveDialog}>
                {saveDialogKind === "save" ? "Save" : "Export"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {isLibraryOpen ? (
        <div className="dialog-backdrop">
          <div className="save-puzzle-dialog">
            <h3>Puzzle Library</h3>

            <div
              className="save-puzzle-fields"
              style={{ maxHeight: "350px", overflowY: "auto" }}
            >
              {/* Header row */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 2fr 0.6fr 1.2fr 1fr 1fr 0.8fr",
                  fontWeight: 600,
                  borderBottom: "1px solid #ccc",
                  paddingBottom: "4px",
                  marginBottom: "6px",
                  fontSize: "0.85rem",
                }}
              >
                <div>Title</div>
                <div>Form</div>
                <div>Size</div>
                <div>Author</div>
                <div>Date</div>
                <div>Issue</div>
                <div>No.</div>
              </div>

              {[...PUZZLE_LIBRARY]
                .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded))
                .map((puzzle, index) => {
                  const libraryShapeVariant: ShapeVariant =
                    puzzle.spec.shapeVariant ?? "left";
                  const libraryFormStyle: FormStyle =
                    puzzle.spec.formStyle ?? "double";
                  const libraryInverted = puzzle.spec.inverted ?? false;
                  const libraryCanBeSingle =
                    isTopologyReflectableAcrossLeadingDiagonal(puzzle.topology);

                  let librarySupportsLeftRight = false;
                  try {
                    const parsedLayout =
                      puzzle.spec.composedLayout != null
                        ? parseSerializedLayout(puzzle.spec.composedLayout)
                        : null;

                    if (parsedLayout) {
                      parsedLayout.overlapRows = puzzle.spec.overlapRows ?? 1;
                      parsedLayout.overlapCols = puzzle.spec.overlapCols ?? 1;

                      librarySupportsLeftRight = supportsLeftRightVariant(
                        parsedLayout,
                        puzzle.gridPresentation ?? "square",
                      );
                    }
                  } catch {
                    librarySupportsLeftRight = false;
                  }

                  const libraryFormTypeTitle = getFormTypeTitle(
                    libraryShapeVariant,
                    libraryFormStyle,
                    libraryInverted,
                    libraryCanBeSingle,
                    librarySupportsLeftRight,
                    puzzle.spec.shapeName,
                  );

                  return (
                    <div
                      key={index}
                      onClick={() => loadPuzzleFromLibrary(puzzle)}
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "2fr 2fr 0.6fr 1.2fr 1fr 1fr 0.8fr",
                        padding: "4px 0",
                        borderBottom: "1px solid #eee",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = "#f1f5f9")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = "transparent")
                      }
                    >
                      <div>{puzzle.content.metadata.title}</div>
                      <div>{libraryFormTypeTitle}</div>
                      <div>{puzzle.spec.size}</div>
                      <div>{puzzle.content.metadata.author}</div>
                      <div>{puzzle.dateAdded}</div>
                      <div>{puzzle.enigmaIssue ?? ""}</div>
                      <div>{puzzle.formNumber ?? ""}</div>
                    </div>
                  );
                })}
            </div>

            <div className="save-puzzle-buttons">
              <button type="button" onClick={() => setIsLibraryOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <WordLookupDialog
        isOpen={isWordLookupOpen}
        pattern={activeEntryPattern}
        totalMatches={wordLookupTotal}
        matches={wordLookupMatches}
        canLoadMore={wordLookupMatches.length < wordLookupTotal}
        onApply={handleApplyWordLookupWord}
        onLoadMore={handleLoadMoreWordLookupMatches}
        onClose={handleCloseWordLookup}
      />
    </div>
  );
}
