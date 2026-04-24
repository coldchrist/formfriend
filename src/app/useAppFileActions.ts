import type { Dispatch, RefObject, SetStateAction } from "react";
import {
  applyWordToDisplayEntryByCell,
  buildEmptyFormFillState,
  buildFormModelFromTopology,
} from "../domain/formModel";
import type { FormModel } from "../domain/formModel";
import {
  findMatchingWords,
  parseWordListText,
  type LoadedWordList,
} from "../domain/wordList";
import type {
  SavedPuzzle,
  AppMode,
  EntryRef,
  SolutionState,
} from "../domain/types";
import type { PuzzleGridHandle } from "../components/PuzzleGrid";
import type { PuzzleStoreState } from "../state/puzzleStore";
import { getTodayString, WORD_LOOKUP_PAGE_SIZE } from "./appHelpers";
import {
  buildPuzzleFile,
  downloadPuzzleFile,
  readPuzzleFile,
} from "../io/puzzleFile";

type UiStatusSetter = (
  text: string,
  kind?: "info" | "success" | "error",
) => void;

type SetState<T> = Dispatch<SetStateAction<T>>;

type UseAppFileActionsArgs = {
  store: PuzzleStoreState;
  setStore: SetState<PuzzleStoreState>;
  formModel: FormModel;
  activeEntry: EntryRef | undefined;
  activeEntryPattern: string;
  loadedWordList: LoadedWordList | null;
  setLoadedWordList: SetState<LoadedWordList | null>;
  setLoadedWordListName: SetState<string | null>;
  setLoadedPuzzleFileName: SetState<string | null>;
  setActiveWorkspace: (workspace: "construct" | "solve") => void;
  setIsDirty: SetState<boolean>;
  isSolve: boolean;
  setUiStatus: UiStatusSetter;
  confirmDiscardChanges: (actionDescription: string) => boolean;
  gridRef: RefObject<PuzzleGridHandle | null>;

  currentPuzzleDateAdded: string;
  setCurrentPuzzleDateAdded: SetState<string>;
  currentPuzzleComment: string;
  setCurrentPuzzleComment: SetState<string>;
  currentPuzzleEnigmaIssue: string;
  setCurrentPuzzleEnigmaIssue: SetState<string>;
  currentPuzzleFormNumber: string;
  setCurrentPuzzleFormNumber: SetState<string>;

  saveDialogKind: "save" | "solver" | null;
  setSaveDialogKind: SetState<"save" | "solver" | null>;
  saveDialogDateAdded: string;
  setSaveDialogDateAdded: SetState<string>;
  saveDialogComment: string;
  setSaveDialogComment: SetState<string>;
  saveDialogEnigmaIssue: string;
  setSaveDialogEnigmaIssue: SetState<string>;
  saveDialogFormNumber: string;
  setSaveDialogFormNumber: SetState<string>;
  saveDialogFilename: string;
  setSaveDialogFilename: SetState<string>;

  setIsWordLookupOpen: SetState<boolean>;
  wordLookupOffset: number;
  setWordLookupOffset: SetState<number>;
  setWordLookupMatches: SetState<string[]>;
  setWordLookupTotal: SetState<number>;

  setIsLibraryOpen: SetState<boolean>;

  activeShapeGridPresentation: "square" | "hex";
};

import { deobfuscateSolutionGrid } from "../io/puzzleFile";
import { getMappingsForCell } from "../domain/formModel";

function tryDecodeSolutionGrid(
  obfuscatedSolution: string | undefined,
): string[] | undefined {
  if (!obfuscatedSolution) return undefined;
  try {
    return deobfuscateSolutionGrid(obfuscatedSolution);
  } catch {
    return undefined;
  }
}

function solutionGridToState(
  grid: string[],
  topology: SavedPuzzle["topology"],
  loadedFormModel: FormModel,
): SolutionState {
  // Start with empty fills
  const fillsByFormWordId: Record<string, string> = {};
  for (const formWord of loadedFormModel.formWords) {
    fillsByFormWordId[formWord.id] = "_".repeat(formWord.length);
  }

  // Place each grid letter into the correct formWord slot
  for (let row = 0; row < grid.length; row++) {
    const rowStr = grid[row] ?? "";
    for (let col = 0; col < rowStr.length; col++) {
      const letter = rowStr[col] ?? " ";
      if (letter === " ") continue;
      const cellId = `r${row}c${col}`;
      const mappings = getMappingsForCell(loadedFormModel, cellId);
      for (const mapping of mappings) {
        const fill = fillsByFormWordId[mapping.formWordId];
        if (fill !== undefined) {
          fillsByFormWordId[mapping.formWordId] =
            fill.substring(0, mapping.formWordOffset) +
            letter +
            fill.substring(mapping.formWordOffset + 1);
        }
      }
    }
  }

  return { fillsByFormWordId };
}

export function useAppFileActions({
  store,
  setStore,
  formModel,
  activeEntry,
  activeEntryPattern,
  loadedWordList,
  setLoadedWordList,
  setLoadedWordListName,
  setLoadedPuzzleFileName,
  setActiveWorkspace,
  setIsDirty,
  isSolve,
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

  activeShapeGridPresentation,
}: UseAppFileActionsArgs) {
  function openSaveDialog(kind: "save" | "solver") {
    setSaveDialogKind(kind);
    setSaveDialogDateAdded(currentPuzzleDateAdded || getTodayString());
    setSaveDialogComment(currentPuzzleComment);
    setSaveDialogEnigmaIssue(currentPuzzleEnigmaIssue);
    setSaveDialogFormNumber(currentPuzzleFormNumber);
    setSaveDialogFilename(
      saveDialogFilename.trim() || store.content.metadata.title.trim(),
    );
  }

  function closeSaveDialog() {
    setSaveDialogKind(null);
  }

  function handleConfirmSaveDialog() {
    if (!saveDialogKind) {
      return;
    }

    const includeSolution = saveDialogKind === "solver";

    const metadata = {
      dateAdded: saveDialogDateAdded || getTodayString(),
      comment: saveDialogComment,
      enigmaIssue: saveDialogEnigmaIssue,
      formNumber: saveDialogFormNumber,
      gridPresentation: activeShapeGridPresentation,
    };

    setCurrentPuzzleDateAdded(metadata.dateAdded);
    setCurrentPuzzleComment(metadata.comment);
    setCurrentPuzzleEnigmaIssue(metadata.enigmaIssue);
    setCurrentPuzzleFormNumber(metadata.formNumber);

    const puzzle = buildPuzzleFile({
      spec: store.spec,
      topology: store.topology,
      content: store.content,
      state: buildEmptyFormFillState(
        buildFormModelFromTopology(store.spec, store.topology),
      ),
      solution: includeSolution ? store.state : undefined,
      formModel: formModel,
      gridPresentation: metadata.gridPresentation,
      dateAdded: metadata.dateAdded,
      comment: metadata.comment,
      enigmaIssue: metadata.enigmaIssue,
      formNumber: metadata.formNumber,
    });

    const usedFilename =
      saveDialogFilename.trim() || store.content.metadata.title.trim();
    downloadPuzzleFile(puzzle, usedFilename || undefined);
    setSaveDialogFilename(usedFilename);
    if (includeSolution) {
      setIsDirty(false);
    }
    setUiStatus("Form saved.", "success");
    setSaveDialogKind(null);
  }

  function handleSave() {
    openSaveDialog("solver");
  }

  function handleExportSolverVersion() {
    if (!store.solution) {
      window.alert("Capture a solution before saving a checkable form.");
      return;
    }

    openSaveDialog("solver");
  }

  async function handleLoad(file: File) {
    if (!confirmDiscardChanges("load another form")) {
      return;
    }

    try {
      const { puzzle } = await readPuzzleFile(file);
      const solutionGrid = tryDecodeSolutionGrid(puzzle.obfuscatedSolution);

      setStore(() => {
        const loadedMode: AppMode = isSolve
          ? solutionGrid != null
            ? "solve_checkable"
            : "solve_strict"
          : "construct";
        const loadedFormModel = buildFormModelFromTopology(
          puzzle.spec,
          puzzle.topology,
        );

        const solution = solutionGrid
          ? solutionGridToState(solutionGrid, puzzle.topology, loadedFormModel)
          : undefined;

        return {
          mode: loadedMode,
          spec: puzzle.spec,
          topology: puzzle.topology,
          content: puzzle.content,
          state: buildEmptyFormFillState(loadedFormModel),
          solution,
          selection: {
            cellId: puzzle.topology.cells[0]?.id ?? null,
            direction: "across",
          },
        };
      });

      setCurrentPuzzleDateAdded(puzzle.dateAdded ?? getTodayString());
      setCurrentPuzzleComment(puzzle.comment ?? "");
      setCurrentPuzzleEnigmaIssue(puzzle.enigmaIssue ?? "");
      setCurrentPuzzleFormNumber(puzzle.formNumber ?? "");
      setLoadedPuzzleFileName(file.name);
      setIsDirty(false);

      if (isSolve) {
        setActiveWorkspace("solve");
      }
      setUiStatus(`Loaded form: ${file.name}`, "success");
      requestAnimationFrame(() => {
        gridRef.current?.focusGrid();
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to load form file.";
      window.alert(message);
    }
  }

  function loadPuzzleFromLibrary(puzzle: SavedPuzzle) {
    if (!confirmDiscardChanges("load a library form")) {
      return;
    }

    const solutionGrid = tryDecodeSolutionGrid(puzzle.obfuscatedSolution);

    setStore(() => {
      const loadedMode: AppMode = isSolve
        ? solutionGrid != null
          ? "solve_checkable"
          : "solve_strict"
        : "construct";

      const loadedFormModel = buildFormModelFromTopology(
        puzzle.spec,
        puzzle.topology,
      );

      const solution = solutionGrid
        ? solutionGridToState(solutionGrid, puzzle.topology, loadedFormModel)
        : undefined;

      return {
        mode: loadedMode,
        spec: puzzle.spec,
        topology: puzzle.topology,
        content: puzzle.content,
        state: buildEmptyFormFillState(loadedFormModel),
        solution,
        selection: {
          cellId: puzzle.topology.cells[0]?.id ?? null,
          direction: "across",
        },
      };
    });

    setCurrentPuzzleDateAdded(puzzle.dateAdded ?? getTodayString());
    setCurrentPuzzleComment(puzzle.comment ?? "");
    setCurrentPuzzleEnigmaIssue(puzzle.enigmaIssue ?? "");
    setCurrentPuzzleFormNumber(puzzle.formNumber ?? "");
    setLoadedPuzzleFileName("(library)");
    setIsDirty(false);
    setIsLibraryOpen(false);
    if (isSolve) {
      setActiveWorkspace("solve");
    }
    setUiStatus("Loaded form from library.", "success");
    requestAnimationFrame(() => {
      gridRef.current?.focusGrid();
    });
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
      store.state,
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

  return {
    openSaveDialog,
    closeSaveDialog,
    handleConfirmSaveDialog,
    handleSave,
    handleExportSolverVersion,
    handleLoad,
    loadPuzzleFromLibrary,
    handleLoadWordList,
    handleFindWords,
    handleLoadMoreWordLookupMatches,
    handleApplyWordLookupWord,
    handleCloseWordLookup,
  };
}
