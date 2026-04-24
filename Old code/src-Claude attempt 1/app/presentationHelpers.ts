import type {
  EntryRef,
  FormStyle,
  ShapeVariant,
  Topology,
} from "../domain/types";
import type { DisplayEntry, FormModel } from "../domain/formModel";

export function compareCellsReadingOrder(
  left: { row: number; col: number },
  right: { row: number; col: number },
): number {
  if (left.row !== right.row) {
    return left.row - right.row;
  }

  return left.col - right.col;
}

export function buildCellById(
  topology: Topology,
): Map<string, Topology["cells"][number]> {
  return new Map(topology.cells.map((cell) => [cell.id, cell]));
}

export function buildDoublePresentationNumbering(topology: Topology): {
  numberByEntryId: Record<string, number>;
  clueNumberByCellId: Record<string, string>;
} {
  const cellById = buildCellById(topology);
  const numberByEntryId: Record<string, number> = {};
  const clueNumberByCellId: Record<string, string> = {};

  const acrossStarts = new Map<string, EntryRef>();
  const downStarts = new Map<string, EntryRef>();

  for (const entry of topology.entries) {
    const startCellId = entry.cells[0];
    if (!startCellId) {
      continue;
    }

    if (entry.direction === "across") {
      acrossStarts.set(startCellId, entry);
    } else {
      downStarts.set(startCellId, entry);
    }
  }

  const startCellIds = [
    ...new Set([...acrossStarts.keys(), ...downStarts.keys()]),
  ];

  startCellIds.sort((leftId, rightId) => {
    const left = cellById.get(leftId);
    const right = cellById.get(rightId);

    if (!left || !right) {
      return 0;
    }

    return compareCellsReadingOrder(left, right);
  });

  let nextAcross = 1;
  let nextDown = 1;

  for (const startCellId of startCellIds) {
    const acrossEntry = acrossStarts.get(startCellId);
    const downEntry = downStarts.get(startCellId);

    if (acrossEntry && downEntry) {
      const number = Math.min(nextAcross, nextDown);
      numberByEntryId[acrossEntry.id] = number;
      numberByEntryId[downEntry.id] = number;
      clueNumberByCellId[startCellId] = String(number);
      nextAcross = number + 1;
      nextDown = number + 1;
      continue;
    }

    if (acrossEntry) {
      numberByEntryId[acrossEntry.id] = nextAcross;
      clueNumberByCellId[startCellId] = String(nextAcross);
      nextAcross += 1;
      continue;
    }

    if (downEntry) {
      numberByEntryId[downEntry.id] = nextDown;
      clueNumberByCellId[startCellId] = String(nextDown);
      nextDown += 1;
    }
  }

  return {
    numberByEntryId,
    clueNumberByCellId,
  };
}

export function buildSinglePresentationNumbering(
  formModel: FormModel,
  topology: Topology,
): {
  numberByEntryId: Record<string, number>;
  clueNumberByCellId: Record<string, string>;
  representativeEntryIds: string[];
  representativeEntryIdByFormWordId: Record<string, string>;
} {
  const cellById = buildCellById(topology);
  const grouped = new Map<string, DisplayEntry[]>();

  for (const entry of formModel.displayEntries) {
    const entries = grouped.get(entry.formWordId) ?? [];
    entries.push(entry);
    grouped.set(entry.formWordId, entries);
  }

  const groups = [...grouped.entries()].map(([formWordId, entries]) => {
    const sortedEntries = [...entries].sort((left, right) => {
      const leftCell = cellById.get(left.cellIds[0] ?? "");
      const rightCell = cellById.get(right.cellIds[0] ?? "");

      if (!leftCell || !rightCell) {
        return 0;
      }

      return compareCellsReadingOrder(leftCell, rightCell);
    });

    return {
      formWordId,
      entries: sortedEntries,
      representative: sortedEntries[0],
    };
  });

  groups.sort((left, right) => {
    const leftCell = cellById.get(left.representative.cellIds[0] ?? "");
    const rightCell = cellById.get(right.representative.cellIds[0] ?? "");

    if (!leftCell || !rightCell) {
      return 0;
    }

    return compareCellsReadingOrder(leftCell, rightCell);
  });

  const numberByEntryId: Record<string, number> = {};
  const clueNumberByCellId: Record<string, string> = {};
  const representativeEntryIds: string[] = [];
  const representativeEntryIdByFormWordId: Record<string, string> = {};

  groups.forEach((group, index) => {
    const number = index + 1;
    representativeEntryIds.push(group.representative.id);
    representativeEntryIdByFormWordId[group.formWordId] =
      group.representative.id;

    for (const entry of group.entries) {
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
      : `${number}${entry.direction === "across" ? "A" : "D"}`,
  };
}

export function getFormTypeTitle(
  shapeVariant: ShapeVariant,
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
