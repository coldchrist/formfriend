import type { EntryRef, Topology } from "../domain/types";

export function getCellById(topology: Topology, cellId: string | null) {
  if (!cellId) {
    return undefined;
  }
  return topology.cells.find((cell) => cell.id === cellId);
}

export function getEntryIndex(
  entries: EntryRef[],
  entryId: string | undefined,
): number {
  if (!entryId) {
    return -1;
  }
  return entries.findIndex((entry) => entry.id === entryId);
}

export function getWrappedEntry(
  entries: EntryRef[],
  currentIndex: number,
  step: 1 | -1,
): EntryRef | undefined {
  if (entries.length === 0 || currentIndex < 0) {
    return undefined;
  }

  const nextIndex = (currentIndex + step + entries.length) % entries.length;
  return entries[nextIndex];
}

export function getNextCellIdInEntry(
  entry: EntryRef | undefined,
  currentCellId: string | null,
): string | null {
  if (!entry || !currentCellId) {
    return currentCellId;
  }

  const index = entry.cells.indexOf(currentCellId);
  if (index < 0) {
    return currentCellId;
  }

  return (
    entry.cells[Math.min(index + 1, entry.cells.length - 1)] ?? currentCellId
  );
}

export function getPreviousCellIdInEntry(
  entry: EntryRef | undefined,
  currentCellId: string | null,
): string | null {
  if (!entry || !currentCellId) {
    return currentCellId;
  }

  const index = entry.cells.indexOf(currentCellId);
  if (index < 0) {
    return currentCellId;
  }

  return entry.cells[Math.max(index - 1, 0)] ?? currentCellId;
}

export function getNextSolveCellId(
  entry: EntryRef | undefined,
  currentCellId: string | null,
  fillsByCellIdBefore: Record<string, string>,
): string | null {
  if (!entry || !currentCellId) {
    return currentCellId;
  }

  const index = entry.cells.indexOf(currentCellId);
  if (index < 0) {
    return currentCellId;
  }

  const currentWasBlank = (fillsByCellIdBefore[currentCellId] ?? "") === "";

  if (!currentWasBlank) {
    return (
      entry.cells[Math.min(index + 1, entry.cells.length - 1)] ?? currentCellId
    );
  }

  for (let i = index + 1; i < entry.cells.length; i += 1) {
    const cellId = entry.cells[i];
    if ((fillsByCellIdBefore[cellId] ?? "") === "") {
      return cellId;
    }
  }

  for (let i = index + 1; i < entry.cells.length; i += 1) {
    const cellId = entry.cells[i];
    if ((fillsByCellIdBefore[cellId] ?? "") !== "") {
      return cellId;
    }
  }

  return currentCellId;
}
