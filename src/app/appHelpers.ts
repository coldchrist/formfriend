import type { DisplayEntry, FormModel } from "../domain/formModel";
import type { EntryRef, FormStyle, Topology } from "../domain/types";
import { isTopologyReflectableAcrossLeadingDiagonal } from "../domain/squareTopology";

export const WORD_LOOKUP_PAGE_SIZE = 100;

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

function compareCellsReadingOrder(
  left: { row: number; col: number },
  right: { row: number; col: number },
): number {
  if (left.row !== right.row) {
    return left.row - right.row;
  }

  return left.col - right.col;
}

function buildCellById(
  topology: Topology,
): Map<string, Topology["cells"][number]> {
  return new Map(topology.cells.map((cell) => [cell.id, cell]));
}

export function buildDoublePresentationNumbering(topology: Topology): {
  numberByEntryId: Record<string, number>;
  clueNumberByCellId: Record<string, string>;
  acrossLabelByCellId: Record<string, string>;
  downLabelByCellId: Record<string, string>;
} {
  const cellById = buildCellById(topology);
  const numberByEntryId: Record<string, number> = {};
  const clueNumberByCellId: Record<string, string> = {};
  const acrossLabelByCellId: Record<string, string> = {};
  const downLabelByCellId: Record<string, string> = {};

  // Number across entries independently in reading order
  const acrossEntries = topology.entries
    .filter((e) => e.direction === "across")
    .sort((a, b) => {
      const ca = cellById.get(a.cells[0] ?? "");
      const cb = cellById.get(b.cells[0] ?? "");
      if (!ca || !cb) return 0;
      return compareCellsReadingOrder(ca, cb);
    });

  acrossEntries.forEach((entry, i) => {
    const n = i + 1;
    numberByEntryId[entry.id] = n;
    const startCellId = entry.cells[0];
    if (startCellId) {
      acrossLabelByCellId[startCellId] = String(n);
    }
  });

  // Number down entries independently in column order (leftmost column first,
  // then top to bottom within each column) — NPL convention
  const downEntries = topology.entries
    .filter((e) => e.direction === "down")
    .sort((a, b) => {
      const ca = cellById.get(a.cells[0] ?? "");
      const cb = cellById.get(b.cells[0] ?? "");
      if (!ca || !cb) return 0;
      if (ca.col !== cb.col) return ca.col - cb.col;
      return ca.row - cb.row;
    });

  downEntries.forEach((entry, i) => {
    const n = i + 1;
    numberByEntryId[entry.id] = n;
    const startCellId = entry.cells[0];
    if (startCellId) {
      downLabelByCellId[startCellId] = String(n);
    }
  });

  const extraEntries = topology.entries
    .filter((e) => e.direction === "extra")
    .sort((a, b) => {
      const ca = cellById.get(a.cells[0] ?? "");
      const cb = cellById.get(b.cells[0] ?? "");
      if (!ca || !cb) return 0;
      return compareCellsReadingOrder(ca, cb);
    });

  extraEntries.forEach((entry, i) => {
    numberByEntryId[entry.id] = i + 1;
  });

  // clueNumberByCellId is kept for compatibility but unused for double forms
  // (numbers are now rendered outside the grid via acrossLabelByCellId / downLabelByCellId)
  for (const entry of acrossEntries) {
    const startCellId = entry.cells[0];
    if (startCellId) {
      clueNumberByCellId[startCellId] = String(numberByEntryId[entry.id]);
    }
  }

  return {
    numberByEntryId,
    clueNumberByCellId,
    acrossLabelByCellId,
    downLabelByCellId,
  };
}

export function buildSinglePresentationNumbering(
  formModel: FormModel,
  topology: Topology,
): {
  numberByEntryId: Record<string, number>;
  clueNumberByCellId: Record<string, string>;
  acrossLabelByCellId: Record<string, string>;
  downLabelByCellId: Record<string, string>;
  representativeEntryIds: string[];
  representativeEntryIdByFormWordId: Record<string, string>;
} {
  const cellById = buildCellById(topology);

  // Build a map from formWordId to all its display entries
  const entriesByFormWordId = new Map<string, DisplayEntry[]>();
  for (const entry of formModel.displayEntries) {
    const existing = entriesByFormWordId.get(entry.formWordId) ?? [];
    existing.push(entry);
    entriesByFormWordId.set(entry.formWordId, existing);
  }

  // Use across entries as the canonical ordering — numbered in reading order.
  // The Nth across entry and Nth down entry share the same form word.
  const acrossEntries = formModel.displayEntries
    .filter((e) => e.direction === "across")
    .sort((a, b) => {
      const ca = cellById.get(a.cellIds[0] ?? "");
      const cb = cellById.get(b.cellIds[0] ?? "");
      if (!ca || !cb) return 0;
      return compareCellsReadingOrder(ca, cb);
    });

  const numberByEntryId: Record<string, number> = {};
  const clueNumberByCellId: Record<string, string> = {};
  const acrossLabelByCellId: Record<string, string> = {};
  const downLabelByCellId: Record<string, string> = {};
  const representativeEntryIds: string[] = [];
  const representativeEntryIdByFormWordId: Record<string, string> = {};

  acrossEntries.forEach((acrossEntry, index) => {
    const number = index + 1;

    representativeEntryIds.push(acrossEntry.id);
    representativeEntryIdByFormWordId[acrossEntry.formWordId] = acrossEntry.id;

    // Place the number outside both the across and down entry start cells
    // so solvers can navigate from either direction
    const acrossStartCellId = acrossEntry.cellIds[0];
    if (acrossStartCellId) {
      acrossLabelByCellId[acrossStartCellId] = String(number);
    }

    const siblings = entriesByFormWordId.get(acrossEntry.formWordId) ?? [];
    const downEntry = siblings.find((e) => e.direction === "down");
    const downStartCellId = downEntry?.cellIds[0];
    if (downStartCellId) {
      downLabelByCellId[downStartCellId] = String(number);
    }

    for (const entry of siblings) {
      numberByEntryId[entry.id] = number;
      const startCellId = entry.cellIds[0];
      if (startCellId) {
        clueNumberByCellId[startCellId] = String(number);
      }
    }
  });

  return {
    numberByEntryId,
    clueNumberByCellId,
    acrossLabelByCellId,
    downLabelByCellId,
    representativeEntryIds,
    representativeEntryIdByFormWordId,
  };
}

export function relabelEntry(
  entry: EntryRef,
  number: number,
  single: boolean,
): EntryRef {
  return {
    ...entry,
    number,
    label: single
      ? String(number)
      : entry.direction === "extra"
        ? `X${number}`
        : `${number}${entry.direction === "across" ? "A" : "D"}`,
  };
}

export function getFormTypeTitle(
  shapeVariant: import("../domain/types").ShapeVariant,
  formStyle: FormStyle,
  inverted: boolean,
  canBeSingle: boolean,
  supportsLeftRight: boolean,
  shapeName?: string,
): string {
  const parts: string[] = [];

  if (formStyle === "double" && canBeSingle) {
    parts.push("Double");
  }

  if (inverted) {
    parts.push("Inverted");
  }

  if (supportsLeftRight) {
    if (shapeVariant === "left") {
      parts.push("Left");
    } else if (shapeVariant === "right") {
      parts.push("Right");
    }
  }

  parts.push(shapeName?.trim() || "Composed Shape");
  return parts.join(" ");
}

export function getAllowedSizes(): number[] {
  return [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
}

export function resolveFormStyleForTopology(
  requestedFormStyle: FormStyle,
  topology: Topology,
): FormStyle {
  if (requestedFormStyle === "single") {
    return !topology.entries.some((entry) => entry.direction === "extra") &&
      isTopologyReflectableAcrossLeadingDiagonal(topology)
      ? "single"
      : "double";
  }

  return "double";
}

export function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}
