import { getAllStandardShapes } from "../domain/standardShapeLibrary";
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
} from "../domain/shapeDesignerState";
import type {
  ComposedShapeDefinition,
  ShapePrimitive,
} from "../domain/shapeDefinition";
import { isTopologyReflectableAcrossLeadingDiagonal } from "../domain/squareTopology";
import { parseWordListText } from "../domain/wordList";
import type { LoadedWordList } from "../domain/wordList";
import {
  buildCellFillsFromFormFillState,
  buildEmptyFormFillState,
  buildFormModelFromTopology,
  getDisplayEntryPatternById,
} from "../domain/formModel";
import type {
  AppMode,
  EntryRef,
  FormStyle,
  ShapeVariant,
} from "../domain/types";
import { buildComposedShapeDefinitionFromDesignerState } from "../domain/shapeSerialization";
import { parseSerializedLayout } from "../domain/shapeLayout";
import {
  applyVariantSelection,
  layoutsEqual,
  supportsInversion,
  supportsLeftRightVariant,
  type ShapeOrientation,
} from "../domain/shapeTransforms";
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

  const isSolve = activeWorkspace === "solve";
  const isSolveStrict = isSolve && solveStore.mode === "solve_strict";
  const isSolveCheckable = isSolve && solveStore.mode === "solve_checkable";
  console.log(
    "[render] isSolve:",
    isSolve,
    "solveStore.mode:",
    solveStore.mode,
    "isSolveCheckable:",
    isSolveCheckable,
    "solveStore.solution:",
    solveStore.solution,
  );

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

    for (const shape of sessionShapeLibrary) {
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
    const baseLayout =
      currentCanonicalLibraryShape?.layout ?? currentComposedLayout;
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
    const alreadyCoveredByLibrary = sessionShapeLibrary.some((shape) => {
      if (shape.id === currentCanonicalLibraryShape?.id) {
        return false;
      }
      try {
        return layoutsEqual(shape.layout, invertedLayout);
      } catch {
        return false;
      }
    });

    return !alreadyCoveredByLibrary;
  }, [
    currentCanonicalLibraryShape,
    currentComposedLayout,
    currentGridPresentation,
    sessionShapeLibrary,
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
    console.log(
      "[construct from form] solveStore.solution:",
      solveStore.solution,
    );
    console.log(
      "[construct from form] showSolution will be asked:",
      Boolean(solveStore.solution),
    );
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
    console.log("[construct from form] showSolution:", showSolution);
    console.log(
      "[construct from form] state being set:",
      showSolution && solveStore.solution ? "SOLUTION" : "EMPTY",
    );
    const firstKey = Object.keys(
      solveStore.solution?.fillsByFormWordId ?? {},
    )[0];
    const constructFirstKey = buildFormModelFromTopology(
      solveStore.spec,
      solveStore.topology,
    ).formWords[0]?.id;
    console.log(
      "[construct from form] solution key sample:",
      firstKey,
      "construct formWord key:",
      constructFirstKey,
    );
    const solutionKeys = Object.keys(
      solveStore.solution?.fillsByFormWordId ?? {},
    );
    const solutionValues = Object.values(
      solveStore.solution?.fillsByFormWordId ?? {},
    );
    console.log(
      "[construct from form] solution keys:",
      solutionKeys.slice(0, 3),
    );
    console.log(
      "[construct from form] solution values:",
      solutionValues.slice(0, 3),
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
    setUiStatus("Cleared designed shape.", "success");
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

    setIncorrectCellIds(new Set());
    setIsSolutionCorrect(false);
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
      name: string;
      size: number;
      layout: {
        width: number;
        height: number;
        overlapRows: number;
        overlapCols: number;
      };
    }) => {
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
      const next = updater({
        name: prev.name,
        size: prev.size,
        layout: {
          width: prev.layout.width,
          height: prev.layout.height,
          overlapRows: prev.layout.overlapRows,
          overlapCols: prev.layout.overlapCols,
        },
      });

      const resized = resizeDesignerLayout(
        prev,
        next.layout.width,
        next.layout.height,
      );

      return {
        ...resized,
        name: next.name,
        size: next.size,
        layout: {
          ...resized.layout,
          overlapRows: next.layout.overlapRows,
          overlapCols: next.layout.overlapCols,
        },
      };
    });
  }

  const {
    closeSaveDialog,
    handleApplyWordLookupWord,
    handleCloseWordLookup,
    handleConfirmSaveDialog,
    handleFindWords,
    handleLoad,
    handleLoadMoreWordLookupMatches,
    handleLoadWordList,
    handleSave,
    loadPuzzleFromLibrary,
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

  const { handleAutofill, handleStopAutofill } = useAutofillActions({
    loadedWordList,
    currentFormStyle,
    formModel,
    store,
    setStore,
    lockCompletedWords,
    randomizeAutofillChoices,
    isAutofillRunning,
    autofillShouldContinueRef,
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
  });

  const { handleEntryClick, handleGridKeyDown, handleClueInputKeyDown } =
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
      singleClueEntries,
      currentFormStyle,
    });

  // Solve mode gets its own full-width two-panel layout
  if (isSolve) {
    console.log("[CHECK BUTTON TEST App]", {
      isSolve,
      storeMode: store.mode,
      solveStoreMode: solveStore.mode,
      isSolveCheckable,
      hasStoreSolution: Boolean(store.solution),
      hasSolveStoreSolution: Boolean(solveStore.solution),
      title: store.content.metadata.title,
    });

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
            cluesByEntryId={cluesByEntryId}
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
          sessionShapeLibrary={sessionShapeLibrary}
          selectedLibraryShapeId={selectedLibraryShapeId}
          isConstruct={isConstruct}
          designerState={{
            name: shapeDesignerState.name,
            size: shapeDesignerState.size,
            layout: {
              width: shapeDesignerState.layout.width,
              height: shapeDesignerState.layout.height,
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
              canBeSingle={canBeSingle}
              shapeVariant={currentShapeVariant}
              supportsShapeVariantToggle={currentShapeSupportsLeftRight}
              inverted={currentInverted}
              supportsInverted={currentShapeSupportsInversion}
              onShapeVariantChange={handleShapeVariantChange}
              onInvertedChange={handleInvertedChange}
              onSizeChange={handleSizeChange}
              onFormStyleChange={handleFormStyleChange}
              onClearGrid={handleClearGrid}
              onFindWords={handleFindWords}
              onLoadWordList={handleLoadWordList}
              onAutofill={handleAutofill}
              onStopAutofill={handleStopAutofill}
              onLockCompletedWordsChange={setLockCompletedWords}
              onRandomizeAutofillChoicesChange={setRandomizeAutofillChoices}
            />
          ) : (
            <DesignerCenterPanel
              matchingDesignerLibraryShapeName={
                matchingDesignerLibraryShapeName
              }
              shapeDesignerState={shapeDesignerState}
              safeDesignerPrimitiveSize={safeDesignerPrimitiveSize}
              designerGridPresentation={designerGridPresentation}
              onSelectCell={(row, col) =>
                setShapeDesignerState((prev) => ({
                  ...prev,
                  selection: { row, col },
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
          singleClueEntries={singleClueEntries}
          displayedAcrossEntries={displayedAcrossEntries}
          displayedDownEntries={displayedDownEntries}
          cluesByEntryId={cluesByEntryId}
          activeClueEntryId={activeClueEntryId}
          activeEntry={activeEntry}
          onEntryClick={handleEntryClick}
          onEntryKeyDown={handleClueInputKeyDown}
          onClueChange={handleClueChange}
          onConstruct={handleUseDesignedShape}
          onSaveShape={handleSaveDesignedShape}
          onClearDesignedGrid={handleClearDesignedGrid}
          onLoadDesignedShape={handleLoadDesignedShape}
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
