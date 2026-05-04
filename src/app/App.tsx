import { buildTopologyFromComposedShapeDefinition, buildTopologyFromCompositeShapeDefinition } from "../domain/shapeTopology";
import { isHexPreviewValid } from "../domain/hexPreviewValidation";
import { getAllStandardShapeDefinitions } from "../domain/standardShapeLibrary";
import { useEffect, useMemo, useRef, useState } from "react";
import { DesignerCenterPanel } from "../components/DesignerCenterPanel";
import { LeftSidebar } from "../components/LeftSidebar";
import { PuzzleCenterPanel } from "../components/PuzzleCenterPanel";
import { RightSidebar } from "../components/RightSidebar";
import { SolveLayout } from "../components/SolveLayout";
import { AppHeader } from "../components/AppHeader";
import {
  PuzzleLibraryDialog,
  SavePuzzleDialog,
  ShapeLibraryDialog,
} from "../components/AppDialogs";
import { WordLookupDialog } from "../components/WordLookupDialog";
import type { PuzzleGridHandle } from "../components/PuzzleGrid";
import {
  buildDoublePresentationNumbering,
  buildSinglePresentationNumbering,
  getAllowedSizes,
  getFormTypeTitle,
  getTodayString,
  relabelEntry,
} from "./appHelpers";
import { useAppFileActions } from "./useAppFileActions";
import { useAutofillActions } from "./useAutofillActions";
import { useNavigationActions } from "./useNavigationActions";
import { useShapeLifecycleActions } from "./useShapeLifecycleActions";
import {
  createInitialShapeDesignerState,
  moveSelection,
  placePrimitiveAtSelection,
  clearPrimitiveAtSelection,
  replaceDesignerLayout,
  resizeDesignerLayout,
  clearDesignerLayout,
  resizeDesignerComponentGrid,
  placeComponentAtSelection,
  clearComponentAtSelection,
  moveGridSelection,
  replaceDesignerCompositeGrid,
} from "../domain/shapeDesignerState";
import type {
  CanonicalShapeDefinition,
  ShapeDefinition,
  ShapePrimitive,
} from "../domain/shapeDefinition";
import type { EntryPath, ExtraEntryReadingPolicy } from "../domain/entryPath";
import {
  DEFAULT_EXTRA_ENTRY_READING_POLICY,
  describeEntryPath,
  expandEntryPathToCellIds,
  inferParametricEntryPathFromCellIds,
} from "../domain/entryPath";
import { isTopologyReflectableAcrossLeadingDiagonal } from "../domain/squareTopology";
import { parseWordListText } from "../domain/wordList";
import type { LoadedWordList } from "../domain/wordList";
import { describeLetterFilterMode } from "../domain/letterFilter";
import {
  buildCellFillsFromFormFillState,
  buildEmptyFormFillState,
  buildFormModelFromTopology,
  getDisplayEntryAnswerTextById,
  getDisplayEntryPatternById,
} from "../domain/formModel";
import type {
  AppMode,
  CellLetterMode,
  EntryRef,
  FormStyle,
  LetterFilterMode,
  ShapeVariant,
} from "../domain/types";
import {
  buildComposedShapeDefinitionFromDesignerState,
  buildCompositeShapeDefinitionFromDesignerState,
  normalizeShapeDefinition,
} from "../domain/shapeSerialization";
import { parseSerializedLayout } from "../domain/shapeLayout";
import {
  applyVariantSelection,
  layoutsEqual,
  supportsInversion,
  supportsLeftRightVariant,
  type ShapeOrientation,
} from "../domain/shapeTransforms";
import { areCompositeSchemasCompatible, describeCompositeCompatibilitySchema, getComposedShapeCompatibilitySchema, type CompositeCompatibilitySchema } from "../domain/shapeCompatibility";
import {
  downloadShapeDefinitionFile,
  readShapeDefinitionFile,
} from "../io/shapeFile";
import { PUZZLE_LIBRARY } from "../library/puzzleLibrary";
import {
  createInitialPuzzleStore,
  getEntryForCell,
  toggleDirectionForRepeatedCellClick,
  type PuzzleStoreState,
} from "../state/puzzleStore";
import "../styles/app.css";

export default function App() {
  const [constructStore, setConstructStore] = useState(() =>
    createInitialPuzzleStore(5),
  );
  const [solveStore, setSolveStore] = useState<PuzzleStoreState>(() => ({
    ...createInitialPuzzleStore(5),
    mode: "solve_strict" as AppMode,
  }));
  const [activeWorkspace, setActiveWorkspace] = useState<"construct" | "solve">(
    "construct",
  );
  const gridRef = useRef<PuzzleGridHandle | null>(null);
  const [isConstructDirty, setIsConstructDirty] = useState(false);
  const [isSolveDirty, setIsSolveDirty] = useState(false);
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
  const [autofillMinFrequencyBand, setAutofillMinFrequencyBand] = useState(1);
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
  const [currentPuzzleDateAdded, setCurrentPuzzleDateAdded] =
    useState(getTodayString());
  const [currentPuzzleComment, setCurrentPuzzleComment] = useState("");
  const [currentPuzzleEnigmaIssue, setCurrentPuzzleEnigmaIssue] = useState("");
  const [currentPuzzleFormNumber, setCurrentPuzzleFormNumber] = useState("");
  const [saveDialogKind, setSaveDialogKind] = useState<
    "save" | "solver" | null
  >(null);
  const [saveDialogDateAdded, setSaveDialogDateAdded] =
    useState(getTodayString());
  const [saveDialogComment, setSaveDialogComment] = useState("");
  const [saveDialogEnigmaIssue, setSaveDialogEnigmaIssue] = useState("");
  const [saveDialogFormNumber, setSaveDialogFormNumber] = useState("");
  const [saveDialogFilename, setSaveDialogFilename] = useState("");
  const autofillShouldContinueRef = useRef(true);
  const autofillRunIdRef = useRef(0);
  const [isWordLookupOpen, setIsWordLookupOpen] = useState(false);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [shapeLibraryDialogMode, setShapeLibraryDialogMode] = useState<
    "startPrimitive" | "insertPrimitive" | "startComposite" | null
  >(null);
  const [wordLookupMatches, setWordLookupMatches] = useState<string[]>([]);
  const [wordLookupTotal, setWordLookupTotal] = useState(0);
  const [wordLookupOffset, setWordLookupOffset] = useState(0);
  const [shapeDesignerState, setShapeDesignerState] = useState(
    createInitialShapeDesignerState(),
  );
  const [sessionShapeLibrary, setSessionShapeLibrary] = useState<
    CanonicalShapeDefinition[]
  >(() => getAllStandardShapeDefinitions());
  const [selectedLibraryShapeId, setSelectedLibraryShapeId] = useState<
    string | null
  >(null);
  const [designerGridPresentation, setDesignerGridPresentation] = useState<
    "square" | "hex"
  >("square");
  const [designerExtraEntries, setDesignerExtraEntries] = useState<EntryPath[]>(
    [],
  );
  const [designerExtraEntryReadingPolicy, setDesignerExtraEntryReadingPolicy] =
    useState<ExtraEntryReadingPolicy>(DEFAULT_EXTRA_ENTRY_READING_POLICY);
  const [isDefiningExtraEntry, setIsDefiningExtraEntry] = useState(false);
  const [pendingExtraEntryCellIds, setPendingExtraEntryCellIds] = useState<
    string[]
  >([]);
  const [selectedDesignerExtraEntryId, setSelectedDesignerExtraEntryId] =
    useState<string | null>(null);
  const normalizedSessionShapeLibrary = useMemo(() => {
    const resolveShape = (shapeId: string) =>
      sessionShapeLibrary.find((shape) => shape.id === shapeId);
    return sessionShapeLibrary.map((shape) =>
      normalizeShapeDefinition(shape, resolveShape),
    );
  }, [sessionShapeLibrary]);
  const isSolve = activeWorkspace === "solve";
  const isSolveStrict = isSolve && solveStore.mode === "solve_strict";
  const isSolveCheckable = isSolve && solveStore.mode === "solve_checkable";
  const isDirty = isSolve ? isSolveDirty : isConstructDirty;
  const setIsDirty = isSolve ? setIsSolveDirty : setIsConstructDirty;

  const store = isSolve ? solveStore : constructStore;
  const setStore = isSolve ? setSolveStore : setConstructStore;

  const isConstruct = !isSolve && constructStore.mode === "construct";
  const isDesigner = !isSolve && constructStore.mode === "designer";
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
  const normalizedShapeById = useMemo(() => {
    return new Map(normalizedSessionShapeLibrary.map((shape) => [shape.id, shape]));
  }, [normalizedSessionShapeLibrary]);

  const componentNameById = useMemo(() => {
    return Object.fromEntries(normalizedSessionShapeLibrary.map((shape) => [shape.id, shape.name]));
  }, [normalizedSessionShapeLibrary]);

  const compositeCompatibilitySchema = useMemo<CompositeCompatibilitySchema | null>(() => {
    if (shapeDesignerState.designType !== "composite") {
      return null;
    }

    const firstComponent = [...shapeDesignerState.componentGrid.cells].sort(
      (a, b) => a.row - b.row || a.col - b.col,
    )[0];

    if (!firstComponent) {
      return null;
    }

    const componentShape = normalizedShapeById.get(firstComponent.shapeId);
    if (!componentShape || componentShape.kind !== "composed") {
      return null;
    }

    try {
      return getComposedShapeCompatibilitySchema(
        componentShape,
        safeDesignerPrimitiveSize,
        firstComponent.shapeVariant ?? "left",
        firstComponent.inverted ?? false,
      );
    } catch {
      return null;
    }
  }, [
    normalizedShapeById,
    safeDesignerPrimitiveSize,
    shapeDesignerState.componentGrid.cells,
    shapeDesignerState.designType,
  ]);

  function buildDesignerShapeDefinition(extraEntries: EntryPath[] = designerExtraEntries): ShapeDefinition {
    if (shapeDesignerState.designType === "composite") {
      return buildCompositeShapeDefinitionFromDesignerState(
        shapeDesignerState,
        (shapeId) => normalizedShapeById.get(shapeId),
        extraEntries,
        designerExtraEntryReadingPolicy,
      );
    }

    return buildComposedShapeDefinitionFromDesignerState(
      shapeDesignerState,
      designerGridPresentation,
      extraEntries,
      designerExtraEntryReadingPolicy,
    );
  }

  const designerPreviewResult = useMemo(() => {
    try {
      const definition = buildDesignerShapeDefinition(designerExtraEntries);
      const topology = definition.kind === "composite"
        ? buildTopologyFromCompositeShapeDefinition({
            ...definition,
            primitiveSize: safeDesignerPrimitiveSize,
          })
        : buildTopologyFromComposedShapeDefinition(
            definition,
            safeDesignerPrimitiveSize,
          );
      return { topology, error: null as string | null };
    } catch (error) {
      const firstMessage = error instanceof Error ? error.message : "Failed to build designer preview.";
      try {
        const definition = buildDesignerShapeDefinition([]);
        const topology = definition.kind === "composite"
          ? buildTopologyFromCompositeShapeDefinition({
              ...definition,
              primitiveSize: safeDesignerPrimitiveSize,
            })
          : buildTopologyFromComposedShapeDefinition(
              definition,
              safeDesignerPrimitiveSize,
            );
        return { topology, error: firstMessage };
      } catch (fallbackError) {
        return {
          topology: { cells: [], entries: [] },
          error: fallbackError instanceof Error ? fallbackError.message : firstMessage,
        };
      }
    }
  }, [
    designerExtraEntries,
    designerGridPresentation,
    designerExtraEntryReadingPolicy,
    normalizedShapeById,
    safeDesignerPrimitiveSize,
    shapeDesignerState,
  ]);

  const designerPreviewTopology = designerPreviewResult.topology;
  const designerPreviewError = designerPreviewResult.error;

  useEffect(() => {
    if (designerExtraEntries.length === 0) {
      return;
    }

    const validEntries = designerExtraEntries.filter((entry) => {
      try {
        const definition = buildDesignerShapeDefinition([entry]);
        if (definition.kind === "composite") {
          buildTopologyFromCompositeShapeDefinition({
            ...definition,
            primitiveSize: safeDesignerPrimitiveSize,
          });
        } else {
          buildTopologyFromComposedShapeDefinition(
            definition,
            safeDesignerPrimitiveSize,
          );
        }
        return true;
      } catch {
        return false;
      }
    });

    if (validEntries.length !== designerExtraEntries.length) {
      const validIds = new Set(validEntries.map((entry) => entry.id));
      setDesignerExtraEntries(validEntries);
      setSelectedDesignerExtraEntryId((prev) =>
        prev && !validIds.has(prev) ? null : prev,
      );
    }
  }, [
    designerExtraEntries,
    designerGridPresentation,
    designerExtraEntryReadingPolicy,
    normalizedShapeById,
    safeDesignerPrimitiveSize,
    shapeDesignerState,
  ]);

  const selectedDesignerExtraEntryCellIds = useMemo(() => {
    const selected = designerExtraEntries.find(
      (entry) => entry.id === selectedDesignerExtraEntryId,
    );

    if (!selected) {
      return [];
    }

    try {
      const expandedCellIds = expandEntryPathToCellIds(selected, {
        size: safeDesignerPrimitiveSize,
      });

      return expandedCellIds;
    } catch {
      return [];
    }
  }, [
    designerExtraEntries,
    designerPreviewTopology,
    safeDesignerPrimitiveSize,
    selectedDesignerExtraEntryId,
  ]);

  const currentShapeVariant: ShapeVariant = store.spec.shapeVariant ?? "left";
  const currentFormStyle: FormStyle = store.spec.formStyle ?? "double";
  const currentCellLetterMode: CellLetterMode = store.spec.cellLetterMode ?? "single";
  const currentLetterFilterMode: LetterFilterMode = store.spec.letterFilterMode ?? "all";
  const currentInverted = store.spec.inverted ?? false;

  const canBeSingle = useMemo(() => {
    return (
      !store.topology.entries.some((entry) => entry.direction === "extra") &&
      isTopologyReflectableAcrossLeadingDiagonal(store.topology)
    );
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
      normalizedSessionShapeLibrary.find(
        (item) => item.id === selectedLibraryShapeId,
      ) ?? null,
    [normalizedSessionShapeLibrary, selectedLibraryShapeId],
  );

  const currentCanonicalLibraryShape = useMemo(() => {
    if (store.spec.shapeId) {
      const byId = normalizedSessionShapeLibrary.find(
        (item) => item.id === store.spec.shapeId,
      );
      if (byId) {
        return byId;
      }
    }

    return selectedLibraryShape ?? null;
  }, [normalizedSessionShapeLibrary, store.spec.shapeId, selectedLibraryShape]);

  const activeShapeDefinition = useMemo(() => {
    return currentCanonicalLibraryShape ?? selectedLibraryShape ?? null;
  }, [currentCanonicalLibraryShape, selectedLibraryShape]);

  const matchingDesignerLibraryShapeName = useMemo(() => {
    const target = shapeDesignerState.layout;

    function layoutsMatch(left: typeof target, right: typeof target) {
      return (
        left.width === right.width &&
        left.height === right.height &&
        left.overlapRows === right.overlapRows &&
        left.overlapCols === right.overlapCols &&
        left.rows.length === right.rows.length &&
        left.rows.every((row, index) => row === right.rows[index])
      );
    }

    for (const shape of normalizedSessionShapeLibrary) {
      if (shape.kind !== "composed") {
        continue;
      }

      let supportsLeftRight = false;
      let supportsInvert = false;

      try {
        supportsLeftRight = supportsLeftRightVariant(
          shape.layout,
          shape.renderHints?.gridPresentation ?? "square",
        );
        supportsInvert = supportsInversion(
          shape.layout,
          shape.renderHints?.gridPresentation ?? "square",
        );
      } catch {
        // Skip invalid shapes silently
        continue;
      }

      const candidateOrientations: ShapeOrientation[] = supportsLeftRight
        ? ["left", "right"]
        : ["left"];
      const candidateInversions = supportsInvert ? [false, true] : [false];

      for (const orientation of candidateOrientations) {
        for (const inverted of candidateInversions) {
          const candidateLayout = applyVariantSelection(
            shape.layout,
            orientation,
            inverted,
          );

          if (layoutsMatch(candidateLayout, target)) {
            return getFormTypeTitle(
              orientation === "right" ? "right" : "left",
              "double",
              inverted,
              false,
              supportsLeftRight,
              shape.name,
            );
          }
        }
      }
    }

    return null;
  }, [normalizedSessionShapeLibrary, shapeDesignerState.layout]);

  const currentGridPresentation = useMemo(() => {
    return activeShapeDefinition?.renderHints?.gridPresentation ?? "square";
  }, [activeShapeDefinition]);

  const currentShapeSupportsLeftRight = useMemo(() => {
    const baseLayout =
      currentCanonicalLibraryShape?.kind === "composed"
        ? currentCanonicalLibraryShape.layout
        : currentComposedLayout;

    const gridPres =
      currentCanonicalLibraryShape?.renderHints?.gridPresentation ??
      currentGridPresentation;

    if (!baseLayout) {
      return false;
    }

    if (!supportsLeftRightVariant(baseLayout, gridPres)) {
      return false;
    }

    const reflectedLayout = applyVariantSelection(baseLayout, "right", false);

    const alreadyCoveredByLibrary = normalizedSessionShapeLibrary.some(
      (shape) => {
        if (shape.kind !== "composed") {
          return false;
        }

        if (shape.id === currentCanonicalLibraryShape?.id) {
          return false;
        }

        const shapeGridPres = shape.renderHints?.gridPresentation ?? "square";
        if (shapeGridPres !== gridPres) {
          return false;
        }

        try {
          return layoutsEqual(shape.layout, reflectedLayout);
        } catch {
          return false;
        }
      },
    );

    return !alreadyCoveredByLibrary;
  }, [
    currentCanonicalLibraryShape,
    currentComposedLayout,
    currentGridPresentation,
    normalizedSessionShapeLibrary,
  ]);

  const currentShapeSupportsInversion = useMemo(() => {
    const baseLayout =
      currentCanonicalLibraryShape?.kind === "composed"
        ? currentCanonicalLibraryShape.layout
        : currentComposedLayout;
    const gridPres =
      currentCanonicalLibraryShape?.renderHints?.gridPresentation ??
      currentGridPresentation;

    if (!baseLayout) {
      return false;
    }

    // First check the raw geometric test
    if (!supportsInversion(baseLayout, gridPres)) {
      return false;
    }

    // If inverting the canonical produces a layout that matches another
    // shape already in the library, inversion is redundant — the user
    // can just pick that shape directly.
    const invertedLayout = applyVariantSelection(baseLayout, "left", true);
    const alreadyCoveredByLibrary = normalizedSessionShapeLibrary.some(
      (shape) => {
        if (shape.kind !== "composed") {
          return false;
        }

        if (shape.id === currentCanonicalLibraryShape?.id) {
          return false;
        }
        try {
          return layoutsEqual(shape.layout, invertedLayout);
        } catch {
          return false;
        }
      },
    );

    return !alreadyCoveredByLibrary;
  }, [
    currentCanonicalLibraryShape,
    currentComposedLayout,
    currentGridPresentation,
    normalizedSessionShapeLibrary,
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
    fetch("/wordlist.enriched.tsv")
      .then((res) => res.text())
      .then((text) => {
        const parsed = parseWordListText(text, "wordlist.enriched.tsv");
        setLoadedWordList(parsed);
        setLoadedWordListName("wordlist.enriched.tsv");
      })
      .catch(() => {
        // Silent fail — user can still load their own word list manually
      });
  }, []);

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

  // Global keyboard shortcuts active only in Solve mode
  useEffect(() => {
    if (!isSolve) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey && event.key === "Enter") {
        event.preventDefault();
        handleCheck();
      } else if (event.ctrlKey && event.key === "Backspace") {
        event.preventDefault();
        handleClearGrid();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  });


  function cancelAutofillForReset() {
    if (
      isAutofillRunning ||
      autofillStatusText.startsWith("Autofill running") ||
      autofillStatusText.startsWith("Stopping autofill")
    ) {
      autofillShouldContinueRef.current = false;
      autofillRunIdRef.current += 1;
      setIsAutofillRunning(false);
      setAutofillStatusText("Autofill cancelled.");
      setUiStatus("Autofill cancelled because the form was reset.", "info");
    }
  }

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
      store.selection.entryId,
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

  const extraEntries = useMemo(
    () => store.topology.entries.filter((entry) => entry.direction === "extra"),
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

  const answerTextByEntryId = useMemo(() => {
    return Object.fromEntries(
      formModel.displayEntries.map((entry) => [
        entry.id,
        getDisplayEntryAnswerTextById(formModel, formFillState, entry.id),
      ]),
    ) as Record<string, string>;
  }, [formModel, formFillState]);

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

    return downEntries
      .map((entry) =>
        relabelEntry(
          entry,
          presentationNumbering.numberByEntryId[entry.id] ?? entry.number,
          false,
        ),
      )
      .sort((a, b) => a.number - b.number);
  }, [downEntries, currentFormStyle, presentationNumbering.numberByEntryId]);
  const displayedExtraEntries = useMemo(() => {
    if (currentFormStyle === "single") {
      return [];
    }

    return extraEntries
      .map((entry) =>
        relabelEntry(
          entry,
          presentationNumbering.numberByEntryId[entry.id] ?? entry.number,
          false,
        ),
      )
      .sort((a, b) => a.number - b.number);
  }, [extraEntries, currentFormStyle, presentationNumbering.numberByEntryId]);

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

    const numbering = presentationNumbering as {
      representativeEntryIds: string[];
      numberByEntryId: Record<string, number>;
    };

    return numbering.representativeEntryIds
      .map((entryId: string) => {
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

    const numbering = presentationNumbering as {
      representativeEntryIdByFormWordId: Record<string, string>;
    };

    return numbering.representativeEntryIdByFormWordId[activeFormWordId];
  }, [activeEntry, activeFormWordId, currentFormStyle, presentationNumbering]);

  const projectedFillsByCellId = useMemo(() => {
    return buildCellFillsFromFormFillState(formModel, formFillState);
  }, [formModel, formFillState]);

  function handleCellClick(cellId: string) {
    clearReducedModeEdit();
    setStore((prev) => ({
      ...prev,
      selection: toggleDirectionForRepeatedCellClick(
        prev.topology,
        prev.selection,
        cellId,
      ),
    }));
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

  function handleModeChange(mode: AppMode) {
    const enteringSolve = mode === "solve_checkable" || mode === "solve_strict";

    if (enteringSolve) {
      setActiveWorkspace("solve");
      const resolvedMode = solveStore.solution
        ? "solve_checkable"
        : "solve_strict";
      setSolveStore((prev) => ({ ...prev, mode: resolvedMode }));
    } else {
      setActiveWorkspace("construct");
      setConstructStore((prev) => ({ ...prev, mode }));
    }

    setIncorrectCellIds(new Set());
    setIsSolutionCorrect(false);
  }

  function handleConstructFromLoadedForm() {
    const hasSolution = Boolean(solveStore.solution);
    let showSolution = false;

    if (hasSolution) {
      showSolution = window.confirm(
        "This form has a solution. Opening it in Construct mode will reveal the answers. Continue?",
      );
    }

    const loadedFormModel = buildFormModelFromTopology(
      solveStore.spec,
      solveStore.topology,
    );
    setConstructStore({
      mode: "construct",
      spec: solveStore.spec,
      topology: solveStore.topology,
      content: solveStore.content,
      state:
        showSolution && solveStore.solution
          ? solveStore.solution
          : buildEmptyFormFillState(loadedFormModel),
      solution: undefined,
      selection: {
        cellId: solveStore.topology.cells[0]?.id ?? null,
        direction: "across",
      },
    });

    setActiveWorkspace("construct");
    setIncorrectCellIds(new Set());
    setIsSolutionCorrect(false);
    setIsConstructDirty(false);
    setUiStatus("Switched to construct mode for this form.", "success");
  }

  function handleClearDesignedGrid() {
    setShapeDesignerState((prev) => clearDesignerLayout(prev));
    setDesignerExtraEntries([]);
    setDesignerExtraEntryReadingPolicy(DEFAULT_EXTRA_ENTRY_READING_POLICY);
    setPendingExtraEntryCellIds([]);
    setIsDefiningExtraEntry(false);
    setSelectedDesignerExtraEntryId(null);
    setUiStatus("Cleared designed shape.", "success");
  }

  function isCurrentHexDesignerShapeValid(): boolean {
    if (shapeDesignerState.designType === "composite") {
      return true;
    }
    if (designerGridPresentation !== "hex") {
      return true;
    }

    try {
      return isHexPreviewValid(designerPreviewTopology);
    } catch {
      return false;
    }
  }

  function handleUseDesignedShape() {
    if (!isCurrentHexDesignerShapeValid()) {
      window.alert(
        "This shape is marked as hex, but its down entries would not remain linear in hex view. Please adjust the design before constructing with it.",
      );
      return;
    }

    try {
      const definition = buildDesignerShapeDefinition(designerExtraEntries);
      upsertSessionShape(definition);

      instantiateComposedShape(definition, {
        size: safeDesignerPrimitiveSize,
        orientation: "left",
        inverted: false,
        requestedFormStyle: "single",
        uiMessage: `Constructing from designed ${definition.kind === "composite" ? "composite" : "shape"}`,
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
    if (!isCurrentHexDesignerShapeValid()) {
      window.alert(
        "This shape is marked as hex, but its down entries would not remain linear in hex view. Please adjust the design before saving it.",
      );
      return;
    }

    try {
      const definition = buildDesignerShapeDefinition(designerExtraEntries);

      if (!definition.name.trim()) {
        const name = window.prompt(
          "Enter a name for this shape:",
          "Untitled shape",
        );
        if (!name) return;
        definition.name = name.trim();
        setShapeDesignerState((prev) => ({ ...prev, name: definition.name }));
      }

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
      const definition = await readShapeDefinitionFile(file, (shapeId) =>
        sessionShapeLibrary.find((shape) => shape.id === shapeId),
      );

      if (definition.kind === "composed") {
        setShapeDesignerState((prev) =>
          replaceDesignerLayout(prev, definition.layout, definition.name),
        );
        setDesignerGridPresentation(
          definition.renderHints?.gridPresentation ?? "square",
        );
      } else if (definition.kind === "composite") {
        setShapeDesignerState((prev) =>
          replaceDesignerCompositeGrid(
            {
              ...prev,
              layout: {
                ...prev.layout,
                overlapRows: definition.overlapRows,
                overlapCols: definition.overlapCols,
              },
              size: definition.primitiveSize,
            },
            {
              width: definition.componentGrid.width,
              height: definition.componentGrid.height,
              cells: definition.componentGrid.cells.map((cell) => ({
                row: cell.row,
                col: cell.col,
                shapeId: cell.shapeId,
                shapeVariant: cell.shapeVariant,
                inverted: cell.inverted,
              })),
            },
            definition.name,
          ),
        );
        setDesignerGridPresentation(
          definition.renderHints?.gridPresentation ?? "square",
        );
      } else {
        throw new Error("Only composed and composite shapes can be loaded in Designer mode.");
      }

      setDesignerExtraEntries(definition.extraEntries ?? []);
      setDesignerExtraEntryReadingPolicy(
        definition.extraEntryReadingPolicy ??
          DEFAULT_EXTRA_ENTRY_READING_POLICY,
      );
      setPendingExtraEntryCellIds([]);
      setIsDefiningExtraEntry(false);
      setSelectedDesignerExtraEntryId(null);
      upsertSessionShape(definition);
      setStore((prev) => ({ ...prev, mode: "designer" }));
      setUiStatus(`Loaded shape: ${definition.name}`, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load shape.";
      window.alert(message);
    }
  }

  function handleStartFromLibraryShape(
    shape: ShapeDefinition,
    shapeVariant: ShapeVariant = "left",
    inverted = false,
  ) {
    if (shape.kind === "composite") {
      if (!confirmDiscardChanges("start from a composite library shape")) {
        return;
      }

      setShapeDesignerState((prev) =>
        replaceDesignerCompositeGrid(
          {
            ...prev,
            layout: {
              ...prev.layout,
              overlapRows: shape.overlapRows,
              overlapCols: shape.overlapCols,
            },
            size: shape.primitiveSize,
          },
          {
            width: shape.componentGrid.width,
            height: shape.componentGrid.height,
            cells: shape.componentGrid.cells.map((cell) => ({
              row: cell.row,
              col: cell.col,
              shapeId: cell.shapeId,
              shapeVariant: cell.shapeVariant,
              inverted: cell.inverted,
            })),
          },
          shape.name,
        ),
      );
      setDesignerExtraEntries(shape.extraEntries ?? []);
      setDesignerExtraEntryReadingPolicy(
        shape.extraEntryReadingPolicy ?? DEFAULT_EXTRA_ENTRY_READING_POLICY,
      );
      setPendingExtraEntryCellIds([]);
      setIsDefiningExtraEntry(false);
      setSelectedDesignerExtraEntryId(null);
      setDesignerGridPresentation(shape.renderHints?.gridPresentation ?? "square");
      upsertSessionShape(shape);
      setSelectedLibraryShapeId(shape.id);
      setStore((prev) => ({ ...prev, mode: "designer" }));
      setShapeLibraryDialogMode(null);
      setIsDirty(true);
      setUiStatus(`Started composite designer from shape: ${shape.name}`, "success");
      return;
    }

    if (shapeDesignerState.designType === "composite") {
      if (shape.kind !== "composed") {
        window.alert("Only composed shapes can be inserted as primitive components.");
        return;
      }

      try {
        const candidateSchema = getComposedShapeCompatibilitySchema(
          shape,
          safeDesignerPrimitiveSize,
          shapeVariant,
          inverted,
        );
        if (
          compositeCompatibilitySchema &&
          !areCompositeSchemasCompatible(
            compositeCompatibilitySchema,
            candidateSchema,
          )
        ) {
          window.alert(
            `This component is not compatible with the current composite schema. Expected ${describeCompositeCompatibilitySchema(compositeCompatibilitySchema)}; got ${describeCompositeCompatibilitySchema(candidateSchema)}. Clear the grid to start a new schema.`,
          );
          return;
        }
      } catch (error) {
        window.alert(
          error instanceof Error
            ? error.message
            : "Could not validate component compatibility.",
        );
        return;
      }

      setShapeDesignerState((prev) =>
        placeComponentAtSelection(prev, shape.id, shapeVariant, inverted),
      );
      setDesignerGridPresentation(shape.renderHints?.gridPresentation ?? "square");
      setShapeLibraryDialogMode(null);
      setIsDirty(true);
      setUiStatus(`Placed component: ${shape.name}`, "success");
      return;
    }

    if (shape.kind !== "composed") {
      window.alert("Only composed shapes can be loaded in primitive Designer mode.");
      return;
    }

    if (!confirmDiscardChanges("start from a library shape")) {
      return;
    }

    setShapeDesignerState((prev) =>
      replaceDesignerLayout(prev, shape.layout, shape.name),
    );
    setDesignerExtraEntries(shape.extraEntries ?? []);
    setDesignerExtraEntryReadingPolicy(
      shape.extraEntryReadingPolicy ?? DEFAULT_EXTRA_ENTRY_READING_POLICY,
    );
    setPendingExtraEntryCellIds([]);
    setIsDefiningExtraEntry(false);
    setSelectedDesignerExtraEntryId(null);
    setDesignerGridPresentation(
      shape.renderHints?.gridPresentation ?? "square",
    );
    upsertSessionShape(shape);
    setSelectedLibraryShapeId(shape.id);
    setStore((prev) => ({ ...prev, mode: "designer" }));
    setShapeLibraryDialogMode(null);
    setIsDirty(true);
    setUiStatus(`Started designer from shape: ${shape.name}`, "success");
  }

  function handleBeginExtraEntryDefinition() {
    setPendingExtraEntryCellIds([]);
    setSelectedDesignerExtraEntryId(null);
    setIsDefiningExtraEntry(true);
    setUiStatus("Click cells in order to define the extra word path.", "info");
  }

  function handleCancelExtraEntryDefinition() {
    setPendingExtraEntryCellIds([]);
    setIsDefiningExtraEntry(false);
    setUiStatus("Canceled extra word definition.", "info");
  }

  function handleDesignerExtraCellClick(cellId: string) {
    if (!isDefiningExtraEntry) {
      return;
    }

    setPendingExtraEntryCellIds((prev) => {
      if (prev.includes(cellId)) {
        return prev;
      }
      return [...prev, cellId];
    });
  }

  function handleFinishExtraEntryDefinition() {
    try {
      const nextNumber = designerExtraEntries.length + 1;
      const path = inferParametricEntryPathFromCellIds(
        `X${nextNumber}`,
        pendingExtraEntryCellIds,
        safeDesignerPrimitiveSize,
        `X${nextNumber}`,
      );

      const definition = buildDesignerShapeDefinition([...designerExtraEntries, path]);
      if (definition.kind === "composite") {
        buildTopologyFromCompositeShapeDefinition({
          ...definition,
          primitiveSize: safeDesignerPrimitiveSize,
        });
      } else {
        buildTopologyFromComposedShapeDefinition(
          definition,
          safeDesignerPrimitiveSize,
        );
      }

      setDesignerExtraEntries((prev) => [...prev, path]);
      setSelectedDesignerExtraEntryId(path.id);
      setPendingExtraEntryCellIds([]);
      setIsDefiningExtraEntry(false);
      setIsDirty(true);
      setUiStatus(`Added extra word ${path.label ?? path.id}.`, "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Invalid extra word path.";
      window.alert(message);
    }
  }

  function renumberDesignerExtraEntries(entries: EntryPath[]): EntryPath[] {
    return entries.map((entry, index) => {
      const nextId = `X${index + 1}`;
      return {
        ...entry,
        id: nextId,
        label: nextId,
      };
    });
  }

  function handleRemoveDesignerExtraEntry(id: string) {
    const selectedBeforeRemove = selectedDesignerExtraEntryId;

    setDesignerExtraEntries((prev) => {
      const remaining = prev.filter((entry) => entry.id !== id);
      const renumbered = renumberDesignerExtraEntries(remaining);
      const idByPreviousId = new Map(
        remaining.map((entry, index) => [entry.id, `X${index + 1}`]),
      );

      setSelectedDesignerExtraEntryId(
        selectedBeforeRemove === id
          ? null
          : selectedBeforeRemove
            ? (idByPreviousId.get(selectedBeforeRemove) ?? null)
            : null,
      );

      return renumbered;
    });

    setIsDirty(true);
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
    cancelAutofillForReset();

    setStore((prev) => ({
      ...prev,
      state: buildEmptyFormFillState(
        buildFormModelFromTopology(prev.spec, prev.topology),
      ),
    }));

    setIncorrectCellIds(new Set());
    setIsSolutionCorrect(false);
    setIsDirty(true);

    requestAnimationFrame(() => {
      gridRef.current?.focusGrid();
    });
  }

  function handleCellLetterModeChange(mode: CellLetterMode) {
    if (mode === currentCellLetterMode) {
      return;
    }

    if (!confirmDiscardChanges("change the cell letter mode and reset the grid")) {
      return;
    }

    cancelAutofillForReset();

    setStore((prev) => {
      const nextSpec = { ...prev.spec, cellLetterMode: mode };
      const nextFormModel = buildFormModelFromTopology(nextSpec, prev.topology);
      return {
        ...prev,
        spec: nextSpec,
        state: buildEmptyFormFillState(nextFormModel),
        solution: undefined,
      };
    });
    setIncorrectCellIds(new Set());
    setIsSolutionCorrect(false);
    setIsDirty(true);
    setUiStatus(
      mode === "bigram" ? "Bigram cell mode enabled." : "Single-letter cell mode enabled.",
      "success",
    );
  }

  function handleLetterFilterModeChange(mode: LetterFilterMode) {
    if (mode === currentLetterFilterMode) {
      return;
    }

    if (!confirmDiscardChanges("change the letter filter mode and reset the grid")) {
      return;
    }

    cancelAutofillForReset();

    setStore((prev) => {
      const nextSpec = { ...prev.spec, letterFilterMode: mode };
      const nextFormModel = buildFormModelFromTopology(nextSpec, prev.topology);
      return {
        ...prev,
        spec: nextSpec,
        state: buildEmptyFormFillState(nextFormModel),
        solution: undefined,
      };
    });
    setIncorrectCellIds(new Set());
    setIsSolutionCorrect(false);
    setIsDirty(true);
    setUiStatus(describeLetterFilterMode(mode), "success");
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

  function handleDesignerKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const key = event.key;

    if (shapeDesignerState.designType === "composite") {
      if (key === "ArrowLeft" || key === "ArrowRight" || key === "ArrowUp" || key === "ArrowDown") {
        event.preventDefault();
        const delta = key === "ArrowLeft" ? [0, -1] : key === "ArrowRight" ? [0, 1] : key === "ArrowUp" ? [-1, 0] : [1, 0];
        setShapeDesignerState((prev) => ({
          ...prev,
          componentSelection: moveGridSelection(prev.componentGrid.width, prev.componentGrid.height, prev.componentSelection, delta[0], delta[1]),
        }));
        return;
      }

      if (key === "Backspace" || key === "Delete" || key === " ") {
        event.preventDefault();
        setShapeDesignerState((prev) => clearComponentAtSelection(prev));
        return;
      }
    }

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

  function updateDesignerSidebarState(
    updater: (prev: {
      designType: "primitive" | "composite";
      name: string;
      size: number;
      layout: {
        width: number;
        height: number;
        overlapRows: number;
        overlapCols: number;
      };
    }) => {
      designType: "primitive" | "composite";
      name: string;
      size: number;
      layout: {
        width: number;
        height: number;
        overlapRows: number;
        overlapCols: number;
      };
    },
  ) {
    setShapeDesignerState((prev) => {
      const currentWidth =
        prev.designType === "composite" ? prev.componentGrid.width : prev.layout.width;
      const currentHeight =
        prev.designType === "composite" ? prev.componentGrid.height : prev.layout.height;
      const next = updater({
        designType: prev.designType,
        name: prev.name,
        size: prev.size,
        layout: {
          width: currentWidth,
          height: currentHeight,
          overlapRows: prev.layout.overlapRows,
          overlapCols: prev.layout.overlapCols,
        },
      });

      const normalizedType = next.designType;
      const base = {
        ...prev,
        designType: normalizedType,
        name: next.name,
        size: next.size,
        layout: {
          ...prev.layout,
          overlapRows: next.layout.overlapRows,
          overlapCols: next.layout.overlapCols,
        },
      };

      if (normalizedType === "composite") {
        return resizeDesignerComponentGrid(
          base,
          next.layout.width,
          next.layout.height,
        );
      }

      return resizeDesignerLayout(
        base,
        next.layout.width,
        next.layout.height,
      );
    });
  }

  const {
    closeSaveDialog,
    handleApplyWordLookupWord,
    handleCloseWordLookup,
    handleConfirmSaveDialog,
    handleFindWords,
    handleLoad: rawHandleLoad,
    handleLoadMoreWordLookupMatches,
    handleLoadWordList,
    handleSave,
    loadPuzzleFromLibrary: rawLoadPuzzleFromLibrary,
  } = useAppFileActions({
    store,
    setStore,
    setActiveWorkspace,
    isSolve,
    formModel,
    activeEntry,
    activeEntryPattern,
    loadedWordList,
    setLoadedWordList,
    setLoadedWordListName,
    setLoadedPuzzleFileName,
    setIsDirty,
    setUiStatus,
    confirmDiscardChanges,
    cancelAutofillForReset,
    gridRef,

    currentPuzzleDateAdded,
    setCurrentPuzzleDateAdded,
    currentPuzzleComment,
    setCurrentPuzzleComment,
    currentPuzzleEnigmaIssue,
    setCurrentPuzzleEnigmaIssue,
    currentPuzzleFormNumber,
    setCurrentPuzzleFormNumber,

    saveDialogKind,
    setSaveDialogKind,
    saveDialogDateAdded,
    setSaveDialogDateAdded,
    saveDialogComment,
    setSaveDialogComment,
    saveDialogEnigmaIssue,
    setSaveDialogEnigmaIssue,
    saveDialogFormNumber,
    setSaveDialogFormNumber,
    saveDialogFilename,
    setSaveDialogFilename,
    setIsWordLookupOpen,
    wordLookupOffset,
    setWordLookupOffset,
    setWordLookupMatches,
    setWordLookupTotal,

    setIsLibraryOpen,

    activeShapeGridPresentation:
      activeShapeDefinition?.renderHints?.gridPresentation ?? "square",
  });

  function handleLoad(file: File) {
    cancelAutofillForReset();
    setIncorrectCellIds(new Set());
    setIsSolutionCorrect(false);
    rawHandleLoad(file);
  }

  function loadPuzzleFromLibrary(puzzle: (typeof PUZZLE_LIBRARY)[number]) {
    cancelAutofillForReset();
    setIncorrectCellIds(new Set());
    setIsSolutionCorrect(false);
    rawLoadPuzzleFromLibrary(puzzle);
  }

  const { handleAutofill, handleStopAutofill } = useAutofillActions({
    loadedWordList,
    formModel,
    store,
    setStore,
    lockCompletedWords,
    randomizeAutofillChoices,
    autofillMinFrequencyBand,
    isAutofillRunning,
    autofillShouldContinueRef,
    autofillRunIdRef,
    setIsAutofillRunning,
    setAutofillStatusText,
    setIsDirty,
    setUiStatus,
    gridRef,
  });

  const {
    instantiateComposedShape,
    instantiateLibraryShapeFromSelection,
    upsertSessionShape,
    handleSizeChange,
    handleShapeVariantChange,
    handleInvertedChange,
    handleNewPuzzle,
    handleFormStyleChange,
  } = useShapeLifecycleActions({
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
  });

  const { handleEntryClick, handleGridKeyDown, handleClueInputKeyDown, clearReducedModeEdit } =
    useNavigationActions({
      store,
      setStore,
      setIsDirty,
      setIncorrectCellIds,
      setIsSolutionCorrect,
      activeEntry,
      acrossEntries,
      downEntries,
      displayedAcrossEntries,
      displayedDownEntries,
      displayedExtraEntries,
      singleClueEntries,
      currentFormStyle,
    });

  // Solve mode gets its own full-width two-panel layout
  if (isSolve) {
    return (
      <div className="app-shell">
        <AppHeader
          isDirty={isDirty}
          uiStatusKind={uiStatusKind}
          uiStatusText={uiStatusText}
          isSolve={isSolve}
          currentMode={store.mode}
          onModeChange={handleModeChange}
        />

        <main className="app-main app-main--solve">
          <SolveLayout
            gridRef={gridRef}
            isSolveCheckable={isSolveCheckable}
            isSolutionCorrect={isSolutionCorrect}
            hasSolution={Boolean(store.solution)}
            formTypeTitle={formTypeTitle}
            currentFormStyle={currentFormStyle}
            title={store.content.metadata.title}
            author={store.content.metadata.author}
            publication={store.content.metadata.publication ?? ""}
            enigmaIssue={currentPuzzleEnigmaIssue}
            formNumber={currentPuzzleFormNumber}
            projectedFillsByCellId={projectedFillsByCellId}
            cellLetterMode={currentCellLetterMode}
            selection={store.selection}
            activeGridCellIds={activeGridCellIds}
            clueNumberByCellId={presentationNumbering.clueNumberByCellId}
            acrossLabelByCellId={
              "acrossLabelByCellId" in presentationNumbering
                ? (
                    presentationNumbering as {
                      acrossLabelByCellId: Record<string, string>;
                    }
                  ).acrossLabelByCellId
                : undefined
            }
            downLabelByCellId={
              "downLabelByCellId" in presentationNumbering
                ? (
                    presentationNumbering as {
                      downLabelByCellId: Record<string, string>;
                    }
                  ).downLabelByCellId
                : undefined
            }
            gridPresentation={
              activeShapeDefinition?.renderHints?.gridPresentation ?? "square"
            }
            incorrectCellIds={incorrectCellIds}
            topology={store.topology}
            singleClueEntries={singleClueEntries}
            displayedAcrossEntries={displayedAcrossEntries}
            displayedDownEntries={displayedDownEntries}
            displayedExtraEntries={displayedExtraEntries}
            cluesByEntryId={cluesByEntryId}
            answerTextByEntryId={answerTextByEntryId}
            activeClueEntryId={activeClueEntryId}
            activeEntry={activeEntry}
            loadedPuzzleFileName={loadedPuzzleFileName}
            onCellClick={handleCellClick}
            onKeyDown={handleGridKeyDown}
            onCheck={handleCheck}
            onClearGrid={handleClearGrid}
            onLoad={handleLoad}
            onBrowseLibrary={() => setIsLibraryOpen(true)}
            onModeChange={handleModeChange}
            onEntryClick={handleEntryClick}
            onEntryKeyDown={handleClueInputKeyDown}
            onConstructFromForm={handleConstructFromLoadedForm}
          />
        </main>

        {isLibraryOpen ? (
          <PuzzleLibraryDialog
            puzzles={PUZZLE_LIBRARY}
            onLoadPuzzle={loadPuzzleFromLibrary}
            onClose={() => setIsLibraryOpen(false)}
          />
        ) : null}
      </div>
    );
  }

  // Construct and Designer modes use the original three-panel layout
  return (
    <div className="app-shell">
      <AppHeader
        isDirty={isDirty}
        uiStatusKind={uiStatusKind}
        uiStatusText={uiStatusText}
        isSolve={isSolve}
        currentMode={store.mode}
        onModeChange={handleModeChange}
      />

      <main className="app-main">
        <LeftSidebar
          isDesigner={isDesigner}
          storeMode={store.mode}
          currentSize={store.spec.size}
          shapeDisplayName={store.spec.shapeName}
          sessionShapeLibrary={normalizedSessionShapeLibrary}
          selectedLibraryShapeId={selectedLibraryShapeId}
          isConstruct={isConstruct}
          designerState={{
            designType: shapeDesignerState.designType,
            name: shapeDesignerState.name,
            size: shapeDesignerState.size,
            layout: {
              width: shapeDesignerState.designType === "composite" ? shapeDesignerState.componentGrid.width : shapeDesignerState.layout.width,
              height: shapeDesignerState.designType === "composite" ? shapeDesignerState.componentGrid.height : shapeDesignerState.layout.height,
              overlapRows: shapeDesignerState.layout.overlapRows,
              overlapCols: shapeDesignerState.layout.overlapCols,
            },
          }}
          safeDesignerPrimitiveSize={safeDesignerPrimitiveSize}
          minimumDesignerPrimitiveSize={minimumDesignerPrimitiveSize}
          designerGridPresentation={designerGridPresentation}
          onInstantiateLibraryShape={instantiateLibraryShapeFromSelection}
          onNewPuzzle={handleNewPuzzle}
          onSave={handleSave}
          onLoad={handleLoad}
          onBrowseLibrary={() => setIsLibraryOpen(true)}
          onDesignerStateChange={updateDesignerSidebarState}
          onDesignerGridPresentationChange={setDesignerGridPresentation}
        />

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
            <PuzzleCenterPanel
              gridRef={gridRef}
              isConstruct={isConstruct}
              isSolveCheckable={isSolveCheckable}
              isSolutionCorrect={isSolutionCorrect}
              formTypeTitle={formTypeTitle}
              showAutofillBanner={showAutofillBanner}
              autofillStatusText={autofillStatusText}
              loadedWordListName={loadedWordListName}
              loadedWordListEntryCount={
                loadedWordList?.eligibleEntries.length ?? 0
              }
              isAutofillRunning={isAutofillRunning}
              lockCompletedWords={lockCompletedWords}
              randomizeAutofillChoices={randomizeAutofillChoices}
              autofillMinFrequencyBand={autofillMinFrequencyBand}
              metadata={store.content.metadata}
              projectedFillsByCellId={projectedFillsByCellId}
              selection={store.selection}
              activeGridCellIds={activeGridCellIds}
              clueNumberByCellId={presentationNumbering.clueNumberByCellId}
              acrossLabelByCellId={
                "acrossLabelByCellId" in presentationNumbering
                  ? (
                      presentationNumbering as {
                        acrossLabelByCellId: Record<string, string>;
                      }
                    ).acrossLabelByCellId
                  : undefined
              }
              downLabelByCellId={
                "downLabelByCellId" in presentationNumbering
                  ? (
                      presentationNumbering as {
                        downLabelByCellId: Record<string, string>;
                      }
                    ).downLabelByCellId
                  : undefined
              }
              gridPresentation={
                activeShapeDefinition?.renderHints?.gridPresentation ?? "square"
              }
              incorrectCellIds={incorrectCellIds}
              topology={store.topology}
              onPublicationChange={handlePublicationChange}
              onTitleChange={handleTitleChange}
              onAuthorChange={handleAuthorChange}
              onCellClick={handleCellClick}
              onKeyDown={handleGridKeyDown}
              size={store.spec.size}
              allowedSizes={allowedSizes}
              formStyle={currentFormStyle}
              cellLetterMode={currentCellLetterMode}
              letterFilterMode={currentLetterFilterMode}
              canBeSingle={canBeSingle}
              shapeVariant={currentShapeVariant}
              supportsShapeVariantToggle={currentShapeSupportsLeftRight}
              inverted={currentInverted}
              supportsInverted={currentShapeSupportsInversion}
              onShapeVariantChange={handleShapeVariantChange}
              onInvertedChange={handleInvertedChange}
              onSizeChange={handleSizeChange}
              onFormStyleChange={handleFormStyleChange}
              onCellLetterModeChange={handleCellLetterModeChange}
              onLetterFilterModeChange={handleLetterFilterModeChange}
              onClearGrid={handleClearGrid}
              onFindWords={handleFindWords}
              onLoadWordList={handleLoadWordList}
              onAutofill={handleAutofill}
              onStopAutofill={handleStopAutofill}
              onLockCompletedWordsChange={setLockCompletedWords}
              onRandomizeAutofillChoicesChange={setRandomizeAutofillChoices}
              onAutofillMinFrequencyBandChange={setAutofillMinFrequencyBand}
            />
          ) : (
            <DesignerCenterPanel
              matchingDesignerLibraryShapeName={
                matchingDesignerLibraryShapeName
              }
              shapeDesignerState={shapeDesignerState}
              safeDesignerPrimitiveSize={safeDesignerPrimitiveSize}
              designerGridPresentation={designerGridPresentation}
              topology={designerPreviewTopology}
              previewError={designerPreviewError}
              isDefiningExtraEntry={isDefiningExtraEntry}
              pendingExtraEntryCellIds={pendingExtraEntryCellIds}
              selectedExtraEntryCellIds={selectedDesignerExtraEntryCellIds}
              componentNameById={componentNameById}
              onExtraEntryCellClick={handleDesignerExtraCellClick}
              onSelectCell={(row, col) =>
                setShapeDesignerState((prev) => ({
                  ...prev,
                  selection: { row, col },
                }))
              }
              onSelectComponentCell={(row, col) =>
                setShapeDesignerState((prev) => ({
                  ...prev,
                  componentSelection: { row, col },
                }))
              }
              onKeyDown={handleDesignerKeyDown}
              onPrimitivePlaced={(updater) =>
                setShapeDesignerState((prev) => updater(prev))
              }
              onClearGrid={handleClearDesignedGrid}
            />
          )}
        </section>

        <RightSidebar
          isDesigner={isDesigner}
          isSolve={isSolve}
          currentFormStyle={currentFormStyle}
          shapeDesignerLayoutRowsText={shapeDesignerState.layout.rows.join(":")}
          shapeDesignerDesignType={shapeDesignerState.designType}
          singleClueEntries={singleClueEntries}
          displayedAcrossEntries={displayedAcrossEntries}
          displayedDownEntries={displayedDownEntries}
          displayedExtraEntries={displayedExtraEntries}
          cluesByEntryId={cluesByEntryId}
          answerTextByEntryId={answerTextByEntryId}
          activeClueEntryId={activeClueEntryId}
          activeEntry={activeEntry}
          onEntryClick={handleEntryClick}
          onEntryKeyDown={handleClueInputKeyDown}
          onClueChange={handleClueChange}
          onConstruct={handleUseDesignedShape}
          onStartFromShape={() => setShapeLibraryDialogMode("startPrimitive")}
          onInsertPrimitiveShape={() => setShapeLibraryDialogMode("insertPrimitive")}
          onStartFromCompositeShape={() => setShapeLibraryDialogMode("startComposite")}
          onSaveShape={handleSaveDesignedShape}
          onClearDesignedGrid={handleClearDesignedGrid}
          onLoadDesignedShape={handleLoadDesignedShape}
          extraEntries={designerExtraEntries}
          isDefiningExtraEntry={isDefiningExtraEntry}
          pendingExtraEntryCellIds={pendingExtraEntryCellIds}
          onBeginExtraEntryDefinition={handleBeginExtraEntryDefinition}
          onFinishExtraEntryDefinition={handleFinishExtraEntryDefinition}
          onCancelExtraEntryDefinition={handleCancelExtraEntryDefinition}
          onSelectExtraEntry={(entryId) =>
            setSelectedDesignerExtraEntryId((prev) =>
              prev === entryId ? null : entryId,
            )
          }
          selectedExtraEntryId={selectedDesignerExtraEntryId}
          onRemoveExtraEntry={handleRemoveDesignerExtraEntry}
          describeExtraEntry={describeEntryPath}
        />
      </main>

      {saveDialogKind ? (
        <SavePuzzleDialog
          includeSolution={saveDialogKind === "solver"}
          filename={saveDialogFilename}
          dateAdded={saveDialogDateAdded}
          comment={saveDialogComment}
          enigmaIssue={saveDialogEnigmaIssue}
          formNumber={saveDialogFormNumber}
          onIncludeSolutionChange={(include) =>
            setSaveDialogKind(include ? "solver" : "save")
          }
          onFilenameChange={setSaveDialogFilename}
          onDateAddedChange={setSaveDialogDateAdded}
          onCommentChange={setSaveDialogComment}
          onEnigmaIssueChange={setSaveDialogEnigmaIssue}
          onFormNumberChange={setSaveDialogFormNumber}
          onCancel={closeSaveDialog}
          onConfirm={handleConfirmSaveDialog}
        />
      ) : null}

      {isLibraryOpen ? (
        <PuzzleLibraryDialog
          puzzles={PUZZLE_LIBRARY}
          onLoadPuzzle={loadPuzzleFromLibrary}
          onClose={() => setIsLibraryOpen(false)}
        />
      ) : null}

      {shapeLibraryDialogMode !== null ? (
        <ShapeLibraryDialog
          shapes={normalizedSessionShapeLibrary}
          mode={shapeLibraryDialogMode ?? "startPrimitive"}
          primitiveSize={safeDesignerPrimitiveSize}
          compositeCompatibilitySchema={compositeCompatibilitySchema}
          onLoadShape={handleStartFromLibraryShape}
          onClose={() => setShapeLibraryDialogMode(null)}
        />
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
