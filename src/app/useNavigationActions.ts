import type { Dispatch, SetStateAction } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import {
  buildCellFillsFromFormFillState,
  buildFormModelFromTopology,
  setDisplayedCellCharacter,
} from "../domain/formModel";
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
  singleClueEntries,
  currentFormStyle,
}: UseNavigationActionsArgs) {
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

  return {
    handleEntryClick,
    handleGridKeyDown,
    handleClueInputKeyDown,
  };
}
