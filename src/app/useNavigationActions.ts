import { useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  buildCellFillsFromFormFillState,
  buildFormModelFromTopology,
  getDisplayedCellValue,
  getPuzzleSpecCellLetterSpan,
  getReducedCellOwnedSegment,
  reducedSegmentAcceptedLetterCount,
  setDisplayedCellCharacter,
  setReducedCellOwnedSegment,
} from "../domain/formModel";
import {
  isLetterAllowedForFilterMode,
  normalizeLettersOnly,
} from "../domain/letterFilter";
import type { EntryRef, EntryDirection, FormStyle } from "../domain/types";
import type { PuzzleStoreState } from "../state/puzzleStore";
import { getEntryForCell } from "../state/puzzleStore";
import {
  getCellById,
  getEntryIndex,
  getNextCellIdInEntry,
  getNextSolveCellId,
  getPreviousCellIdInEntry,
  getWrappedEntry,
} from "./appHelpers";

type SetState<T> = Dispatch<SetStateAction<T>>;

type UseNavigationActionsArgs = {
  store: PuzzleStoreState;
  setStore: SetState<PuzzleStoreState>;
  setIsDirty: SetState<boolean>;
  setIncorrectCellIds: SetState<Set<string>>;
  setIsSolutionCorrect: SetState<boolean>;
  activeEntry: EntryRef | undefined;
  acrossEntries: EntryRef[];
  downEntries: EntryRef[];
  displayedAcrossEntries: EntryRef[];
  displayedDownEntries: EntryRef[];
  displayedExtraEntries: EntryRef[];
  singleClueEntries: EntryRef[];
  currentFormStyle: FormStyle;
};

export function useNavigationActions({
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
}: UseNavigationActionsArgs) {
  const reducedModeEditRef = useRef<{
    cellId: string;
    entryId: string;
    segment: string;
    rawText?: string;
    sequential?: boolean;
    allowTrailingHiddenAppend?: boolean;
  } | null>(null);

  function debugReducedInput(label: string, payload: unknown) {
    if (
      typeof window !== "undefined" &&
      window.localStorage.getItem("formfriend.debugReducedInput") === "1"
    ) {
      console.log(`[formfriend reduced input] ${label}`, payload);
    }
  }

  function selectEntry(entry: EntryRef) {
    reducedModeEditRef.current = null;
    setStore((prev) => ({
      ...prev,
      selection: {
        cellId: entry.cells[0] ?? null,
        direction: entry.direction,
        entryId: entry.id,
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
      activeEntry.direction === "across"
        ? acrossEntries
        : activeEntry.direction === "down"
          ? downEntries
          : displayedExtraEntries;
    const index = getEntryIndex(entries, activeEntry.id);
    const nextEntry = getWrappedEntry(entries, index, step);
    if (!nextEntry) {
      return;
    }

    selectEntry(nextEntry);
  }

  function moveSelectionByArrow(
    direction: EntryDirection,
    deltaRow: number,
    deltaCol: number,
  ) {
    reducedModeEditRef.current = null;
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
            entryId: undefined,
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
          entryId: undefined,
        },
      };
    });
  }

  function handleGridKeyDown(event: ReactKeyboardEvent<SVGSVGElement>) {
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

      const priorReducedModeEdit = reducedModeEditRef.current;
      let nextReducedModeEdit: typeof reducedModeEditRef.current =
        priorReducedModeEdit;

      setStore((prev) => {
        if (!prev.selection.cellId) {
          return prev;
        }

        const entry = getEntryForCell(
          prev.topology,
          prev.selection.cellId,
          prev.selection.direction,
          prev.selection.entryId,
        );
        if (!entry) {
          return prev;
        }

        const currentFormModel = buildFormModelFromTopology(
          prev.spec,
          prev.topology,
        );
        const currentFormFillState = prev.state;
        const cellLetterSpan = getPuzzleSpecCellLetterSpan(prev.spec);

        if (currentFormModel.letterFilterMode !== "all") {
          const currentSegment = getReducedCellOwnedSegment(
            currentFormModel,
            currentFormFillState,
            entry.id,
            prev.selection.cellId,
          );
          const nextSegment = currentSegment.slice(0, -1);
          const nextFormFillState = setReducedCellOwnedSegment(
            currentFormModel,
            currentFormFillState,
            entry.id,
            prev.selection.cellId,
            nextSegment,
          );
          nextReducedModeEdit = nextSegment
            ? {
                cellId: prev.selection.cellId,
                entryId: entry.id,
                segment: nextSegment,
              }
            : null;

          return {
            ...prev,
            state: nextFormFillState,
            selection: {
              ...prev.selection,
              cellId:
                nextSegment.length > 0
                  ? prev.selection.cellId
                  : getPreviousCellIdInEntry(entry, prev.selection.cellId),
            },
          };
        }

        const currentCellValue = getDisplayedCellValue(
          currentFormModel,
          currentFormFillState,
          prev.selection.cellId,
        );
        const nextCellValue =
          cellLetterSpan > 1 && currentCellValue.length > 1
            ? currentCellValue.slice(0, -1)
            : "";

        const nextFormFillState = setDisplayedCellCharacter(
          currentFormModel,
          currentFormFillState,
          prev.selection.cellId,
          nextCellValue,
        );

        return {
          ...prev,
          state: nextFormFillState,
          selection: {
            ...prev.selection,
            cellId:
              nextCellValue.length > 0
                ? prev.selection.cellId
                : getPreviousCellIdInEntry(entry, prev.selection.cellId),
          },
        };
      });

      queueMicrotask(() => {
        reducedModeEditRef.current = nextReducedModeEdit;
      });
      setIsDirty(true);
      setIncorrectCellIds(new Set());
      setIsSolutionCorrect(false);
      return;
    }

    if (/^[a-zA-Z]$/.test(key) || key === " ") {
      event.preventDefault();

      const letter = key === " " ? "" : key.toUpperCase();
      const priorReducedModeEdit = reducedModeEditRef.current;
      let nextReducedModeEdit: typeof reducedModeEditRef.current =
        priorReducedModeEdit;

      setStore((prev) => {
        if (!prev.selection.cellId) {
          return prev;
        }

        const entry = getEntryForCell(
          prev.topology,
          prev.selection.cellId,
          prev.selection.direction,
          prev.selection.entryId,
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
        const cellLetterSpan = getPuzzleSpecCellLetterSpan(prev.spec);

        if (currentFormModel.letterFilterMode !== "all") {
          const displayEntry = currentFormModel.displayEntries.find(
            (candidate) => candidate.id === entry.id,
          );
          if (!displayEntry) {
            return prev;
          }

          const editKey = {
            cellId: prev.selection.cellId,
            entryId: entry.id,
          };
          const currentCellIndex = displayEntry.cellIds.indexOf(
            prev.selection.cellId,
          );
          if (currentCellIndex < 0) {
            return prev;
          }

          const priorEditMatches =
            priorReducedModeEdit &&
            priorReducedModeEdit.cellId === editKey.cellId &&
            priorReducedModeEdit.entryId === editKey.entryId;
          const typedLetterIsAccepted =
            letter !== "" &&
            isLetterAllowedForFilterMode(
              letter,
              currentFormModel.letterFilterMode,
            );
          const rawFill = normalizeLettersOnly(
            currentFormFillState.fillsByFormWordId[displayEntry.formWordId] ??
              "",
          );
          const currentSegment = getReducedCellOwnedSegment(
            currentFormModel,
            currentFormFillState,
            entry.id,
            prev.selection.cellId,
          );
          const currentSegmentAcceptedLetterCount =
            reducedSegmentAcceptedLetterCount(currentFormModel, currentSegment);

          const continueSequentialTyping = Boolean(
            priorEditMatches &&
            priorReducedModeEdit.allowTrailingHiddenAppend &&
            !typedLetterIsAccepted,
          );

          const startingSegment = continueSequentialTyping
            ? (priorReducedModeEdit?.segment ?? currentSegment)
            : priorEditMatches
              ? priorReducedModeEdit.allowTrailingHiddenAppend &&
                typedLetterIsAccepted
                ? ""
                : priorReducedModeEdit.segment
              : currentSegmentAcceptedLetterCount === 0
                ? currentSegment
                : "";
          const replacementSegment = `${startingSegment}${letter}`;
          const nextFormFillState = setReducedCellOwnedSegment(
            currentFormModel,
            currentFormFillState,
            entry.id,
            prev.selection.cellId,
            replacementSegment,
          );
          const nextRawFill = normalizeLettersOnly(
            nextFormFillState.fillsByFormWordId[displayEntry.formWordId] ?? "",
          );

          const nextSegment = getReducedCellOwnedSegment(
            currentFormModel,
            nextFormFillState,
            entry.id,
            prev.selection.cellId,
          );
          const acceptedLetterCount = reducedSegmentAcceptedLetterCount(
            currentFormModel,
            nextSegment,
          );
          const segmentIsComplete = acceptedLetterCount >= cellLetterSpan;
          const isLastCellInEntry =
            currentCellIndex >= displayEntry.cellIds.length - 1;
          const requestedNextCellId =
            letter === "" || segmentIsComplete
              ? prev.mode === "solve_strict" || prev.mode === "solve_checkable"
                ? getNextSolveCellId(entry, prev.selection.cellId, fillsBefore)
                : getNextCellIdInEntry(entry, prev.selection.cellId)
              : prev.selection.cellId;
          const nextCellId = requestedNextCellId ?? prev.selection.cellId;
          const advancedToDifferentCell = nextCellId !== prev.selection.cellId;
          const isAtEndOfEntry = isLastCellInEntry;

          nextReducedModeEdit = {
            ...editKey,
            cellId: nextCellId,
            segment: advancedToDifferentCell ? "" : nextSegment,
            rawText: nextRawFill,
            sequential: true,
            allowTrailingHiddenAppend: isLastCellInEntry && segmentIsComplete,
          };

          return {
            ...prev,
            state: nextFormFillState,
            selection: {
              ...prev.selection,
              cellId: nextCellId,
            },
          };
        }

        const currentCellValue = getDisplayedCellValue(
          currentFormModel,
          currentFormFillState,
          prev.selection.cellId,
        );
        const nextCellValue =
          cellLetterSpan > 1
            ? (currentCellValue.length >= cellLetterSpan
                ? letter
                : `${currentCellValue}${letter}`
              ).slice(0, cellLetterSpan)
            : letter;

        const nextFormFillState = setDisplayedCellCharacter(
          currentFormModel,
          currentFormFillState,
          prev.selection.cellId,
          nextCellValue,
        );

        const shouldAdvance =
          nextCellValue.length >= cellLetterSpan || letter === "";
        const nextCellId = !shouldAdvance
          ? prev.selection.cellId
          : prev.mode === "solve_strict" || prev.mode === "solve_checkable"
            ? getNextSolveCellId(entry, prev.selection.cellId, fillsBefore)
            : getNextCellIdInEntry(entry, prev.selection.cellId);

        nextReducedModeEdit = null;

        return {
          ...prev,
          state: nextFormFillState,
          selection: {
            ...prev.selection,
            cellId: nextCellId,
          },
        };
      });

      queueMicrotask(() => {
        reducedModeEditRef.current = nextReducedModeEdit;
      });
      setIsDirty(true);
      setIncorrectCellIds(new Set());
      setIsSolutionCorrect(false);
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

  function handleClueInputKeyDown(
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
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
        : [
            ...displayedAcrossEntries,
            ...displayedDownEntries,
            ...displayedExtraEntries,
          ];

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

  function clearReducedModeEdit() {
    reducedModeEditRef.current = null;
  }

  return {
    handleEntryClick,
    handleGridKeyDown,
    handleClueInputKeyDown,
    clearReducedModeEdit,
  };
}
