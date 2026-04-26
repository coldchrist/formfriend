import type {
  EntryDirection,
  EntryRef,
  FormFillState,
  PuzzleSpec,
  Topology,
} from "./types";

export interface VisibleCell {
  id: string;
  row: number;
  col: number;
}

export interface FormWord {
  id: string;
  length: number;
  label?: string;
}

export interface DisplayEntry {
  id: string;
  number: number;
  label: string;
  direction: EntryDirection;
  cellIds: string[];
  formWordId: string;
}

export interface CellFormWordMapping {
  cellId: string;
  formWordId: string;
  formWordOffset: number;
  displayEntryId?: string;
}

export interface FormModel {
  visibleCells: VisibleCell[];
  formWords: FormWord[];
  displayEntries: DisplayEntry[];
  mappings: CellFormWordMapping[];
}

function buildDoubleFormModel(topology: Topology): FormModel {
  const visibleCells: VisibleCell[] = topology.cells.map((cell) => ({
    id: cell.id,
    row: cell.row,
    col: cell.col,
  }));

  const formWords: FormWord[] = [];
  const displayEntries: DisplayEntry[] = [];
  const mappings: CellFormWordMapping[] = [];

  for (const entry of topology.entries) {
    const formWordId = `FW_${entry.id}`;

    formWords.push({
      id: formWordId,
      length: entry.cells.length,
      label: entry.label,
    });

    displayEntries.push({
      id: entry.id,
      number: entry.number,
      label: entry.label,
      direction: entry.direction,
      cellIds: [...entry.cells],
      formWordId,
    });

    for (let i = 0; i < entry.cells.length; i += 1) {
      mappings.push({
        cellId: entry.cells[i],
        formWordId,
        formWordOffset: i,
        displayEntryId: entry.id,
      });
    }
  }

  return {
    visibleCells,
    formWords,
    displayEntries,
    mappings,
  };
}

function buildCellLookupMaps(topology: Topology) {
  const cellById = new Map(topology.cells.map((cell) => [cell.id, cell]));
  const idByCoord = new Map(
    topology.cells.map((cell) => [`${cell.row},${cell.col}`, cell.id]),
  );

  return { cellById, idByCoord };
}

function reflectCoordAcrossLeadingDiagonal(row: number, col: number) {
  return { row: col, col: row };
}

function reflectEntryCellSequence(
  topology: Topology,
  entry: EntryRef,
): string[] | null {
  const { cellById, idByCoord } = buildCellLookupMaps(topology);
  const reflected: string[] = [];

  for (const cellId of entry.cells) {
    const cell = cellById.get(cellId);
    if (!cell) {
      return null;
    }

    const reflectedCoord = reflectCoordAcrossLeadingDiagonal(
      cell.row,
      cell.col,
    );
    const reflectedId = idByCoord.get(
      `${reflectedCoord.row},${reflectedCoord.col}`,
    );

    if (!reflectedId) {
      return null;
    }

    reflected.push(reflectedId);
  }

  return reflected;
}

function cellSequencesMatch(a: string[], b: string[]) {
  return (
    a.length === b.length && a.every((cellId, index) => cellId === b[index])
  );
}

function findReflectedEntry(
  topology: Topology,
  entry: EntryRef,
): EntryRef | undefined {
  const reflectedCells = reflectEntryCellSequence(topology, entry);
  if (!reflectedCells) {
    return undefined;
  }

  return topology.entries.find((candidate) =>
    cellSequencesMatch(candidate.cells, reflectedCells),
  );
}

function buildReflectionGroups(topology: Topology): EntryRef[][] {
  const groups: EntryRef[][] = [];
  const visited = new Set<string>();

  for (const entry of topology.entries) {
    if (visited.has(entry.id)) {
      continue;
    }

    const reflected = findReflectedEntry(topology, entry);
    if (!reflected) {
      throw new Error(
        `Single-form reflection failed for entry ${entry.label}.`,
      );
    }

    if (reflected.id === entry.id) {
      groups.push([entry]);
      visited.add(entry.id);
      continue;
    }

    groups.push([entry, reflected]);
    visited.add(entry.id);
    visited.add(reflected.id);
  }

  return groups;
}

function buildSingleFormVisibleCells(topology: Topology): VisibleCell[] {
  return topology.cells.map((cell) => ({
    id: cell.id,
    row: cell.row,
    col: cell.col,
  }));
}

function buildSingleFormModel(
  _spec: PuzzleSpec,
  topology: Topology,
): FormModel {
  const visibleCells = buildSingleFormVisibleCells(topology);
  const formWords: FormWord[] = [];
  const displayEntries: DisplayEntry[] = [];
  const mappings: CellFormWordMapping[] = [];

  const groups = buildReflectionGroups(topology);

  groups.forEach((group, groupIndex) => {
    const representative = group[0];
    const formWordId = `FW_SINGLE_${groupIndex + 1}`;

    formWords.push({
      id: formWordId,
      length: representative.cells.length,
      label: group.map((entry) => entry.label).join("/"),
    });

    for (const entry of group) {
      displayEntries.push({
        id: entry.id,
        number: entry.number,
        label: entry.label,
        direction: entry.direction,
        cellIds: [...entry.cells],
        formWordId,
      });

      for (let i = 0; i < entry.cells.length; i += 1) {
        mappings.push({
          cellId: entry.cells[i],
          formWordId,
          formWordOffset: i,
          displayEntryId: entry.id,
        });
      }
    }
  });

  return {
    visibleCells,
    formWords,
    displayEntries,
    mappings,
  };
}

export function buildFormModelFromTopology(
  spec: PuzzleSpec,
  topology: Topology,
): FormModel {
  const formStyle = spec.formStyle ?? "double";

  if (
    formStyle === "single" &&
    !topology.entries.some((entry) => entry.direction === "extra")
  ) {
    return buildSingleFormModel(spec, topology);
  }

  return buildDoubleFormModel(topology);
}

export function buildEmptyFormFillState(formModel: FormModel): FormFillState {
  const fillsByFormWordId: Record<string, string> = {};

  for (const formWord of formModel.formWords) {
    fillsByFormWordId[formWord.id] = "_".repeat(formWord.length);
  }

  return {
    fillsByFormWordId,
  };
}

export function getMappingsForCell(
  formModel: FormModel,
  cellId: string,
): CellFormWordMapping[] {
  return formModel.mappings.filter((mapping) => mapping.cellId === cellId);
}

export function getMappingsForFormWord(
  formModel: FormModel,
  formWordId: string,
): CellFormWordMapping[] {
  return formModel.mappings.filter(
    (mapping) => mapping.formWordId === formWordId,
  );
}

export function getDisplayEntryById(
  formModel: FormModel,
  displayEntryId: string,
): DisplayEntry | undefined {
  return formModel.displayEntries.find((entry) => entry.id === displayEntryId);
}

export function getFormWordById(
  formModel: FormModel,
  formWordId: string,
): FormWord | undefined {
  return formModel.formWords.find((formWord) => formWord.id === formWordId);
}

export function getDisplayedCellValue(
  formModel: FormModel,
  fillState: FormFillState,
  cellId: string,
): string {
  const mappings = getMappingsForCell(formModel, cellId);

  let resolved = "";

  for (const mapping of mappings) {
    const fill = fillState.fillsByFormWordId[mapping.formWordId] ?? "";
    const value = fill[mapping.formWordOffset] ?? "";

    if (!value) {
      continue;
    }

    if (!resolved) {
      resolved = value;
      continue;
    }

    if (resolved !== value) {
      return "?";
    }
  }

  return resolved || "";
}

export function getDisplayEntryPattern(
  formModel: FormModel,
  fillState: FormFillState,
  displayEntry: DisplayEntry,
): string {
  return displayEntry.cellIds
    .map((cellId) => {
      const value = getDisplayedCellValue(formModel, fillState, cellId);
      return value || "_";
    })
    .join("");
}

export function buildFormFillStateFromCellFills(
  formModel: FormModel,
  fillsByCellId: Record<string, string>,
): FormFillState {
  const fillsByFormWordId: Record<string, string> = {};

  for (const formWord of formModel.formWords) {
    fillsByFormWordId[formWord.id] = "_".repeat(formWord.length);
  }

  for (const formWord of formModel.formWords) {
    const mappings = getMappingsForFormWord(formModel, formWord.id).sort(
      (a, b) => a.formWordOffset - b.formWordOffset,
    );

    const chars = new Array(formWord.length).fill("_");

    for (const mapping of mappings) {
      const value = fillsByCellId[mapping.cellId] ?? "";
      if (value) {
        chars[mapping.formWordOffset] = value;
      }
    }

    fillsByFormWordId[formWord.id] = chars.join("");
  }

  return {
    fillsByFormWordId,
  };
}

export function buildCellFillsFromFormFillState(
  formModel: FormModel,
  fillState: FormFillState,
): Record<string, string> {
  const fillsByCellId: Record<string, string> = {};

  for (const cell of formModel.visibleCells) {
    const value = getDisplayedCellValue(formModel, fillState, cell.id);
    fillsByCellId[cell.id] = value === "_" || value === "?" ? "" : value;
  }

  return fillsByCellId;
}

export function cellFillsEqual(
  left: Record<string, string>,
  right: Record<string, string>,
): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);

  for (const key of keys) {
    if ((left[key] ?? "") !== (right[key] ?? "")) {
      return false;
    }
  }

  return true;
}

export function getRoundTripCellFills(
  formModel: FormModel,
  fillsByCellId: Record<string, string>,
): Record<string, string> {
  const formFillState = buildFormFillStateFromCellFills(
    formModel,
    fillsByCellId,
  );

  return buildCellFillsFromFormFillState(formModel, formFillState);
}

export function formModelRoundTripMatchesCellFills(
  formModel: FormModel,
  fillsByCellId: Record<string, string>,
): boolean {
  const roundTrip = getRoundTripCellFills(formModel, fillsByCellId);
  return cellFillsEqual(fillsByCellId, roundTrip);
}

export function getDisplayEntryPatternById(
  formModel: FormModel,
  fillState: FormFillState,
  displayEntryId: string,
): string {
  const displayEntry = getDisplayEntryById(formModel, displayEntryId);
  if (!displayEntry) {
    return "";
  }

  return getDisplayEntryPattern(formModel, fillState, displayEntry);
}

export function applyWordToDisplayEntry(
  formModel: FormModel,
  fillState: FormFillState,
  displayEntryId: string,
  word: string,
): FormFillState {
  const displayEntry = getDisplayEntryById(formModel, displayEntryId);
  if (!displayEntry) {
    return fillState;
  }

  return {
    fillsByFormWordId: {
      ...fillState.fillsByFormWordId,
      [displayEntry.formWordId]: word,
    },
  };
}

export function applyWordToDisplayEntryByCell(
  formModel: FormModel,
  fillState: FormFillState,
  displayEntryId: string,
  word: string,
): FormFillState {
  const displayEntry = getDisplayEntryById(formModel, displayEntryId);
  if (!displayEntry) {
    return fillState;
  }

  let nextState = fillState;

  for (let i = 0; i < displayEntry.cellIds.length; i += 1) {
    const cellId = displayEntry.cellIds[i];
    const char = word[i] ?? "";
    nextState = setDisplayedCellCharacter(formModel, nextState, cellId, char);
  }

  return nextState;
}

export function setFormWordCharacter(
  formModel: FormModel,
  fillState: FormFillState,
  displayEntryId: string,
  formWordOffset: number,
  value: string,
): FormFillState {
  const displayEntry = getDisplayEntryById(formModel, displayEntryId);
  if (!displayEntry) {
    return fillState;
  }

  const formWord = getFormWordById(formModel, displayEntry.formWordId);
  if (!formWord) {
    return fillState;
  }

  const currentFillRaw =
    fillState.fillsByFormWordId[displayEntry.formWordId] ?? "";

  const currentFill =
    currentFillRaw.length === formWord.length
      ? currentFillRaw
      : "_".repeat(formWord.length);

  const chars = currentFill.split("");
  if (formWordOffset < 0 || formWordOffset >= chars.length) {
    return fillState;
  }

  chars[formWordOffset] = value || "_";

  return {
    fillsByFormWordId: {
      ...fillState.fillsByFormWordId,
      [displayEntry.formWordId]: chars.join(""),
    },
  };
}

export function setDisplayedCellCharacter(
  formModel: FormModel,
  fillState: FormFillState,
  cellId: string,
  value: string,
): FormFillState {
  const mappings = getMappingsForCell(formModel, cellId);
  if (mappings.length === 0) {
    return fillState;
  }

  const nextFillsByFormWordId = { ...fillState.fillsByFormWordId };
  const normalizedValue = value || "_";

  for (const mapping of mappings) {
    const formWord = getFormWordById(formModel, mapping.formWordId);
    if (!formWord) {
      continue;
    }

    const currentFillRaw = nextFillsByFormWordId[mapping.formWordId] ?? "";

    const currentFill =
      currentFillRaw.length === formWord.length
        ? currentFillRaw
        : "_".repeat(formWord.length);

    const chars = currentFill.split("");
    if (mapping.formWordOffset < 0 || mapping.formWordOffset >= chars.length) {
      continue;
    }

    chars[mapping.formWordOffset] = normalizedValue;
    nextFillsByFormWordId[mapping.formWordId] = chars.join("");
  }

  return {
    fillsByFormWordId: nextFillsByFormWordId,
  };
}

export function getFormWordOffsetForDisplayEntryCell(
  formModel: FormModel,
  displayEntryId: string,
  cellId: string,
): number {
  const displayEntry = getDisplayEntryById(formModel, displayEntryId);
  if (!displayEntry) {
    return -1;
  }

  return displayEntry.cellIds.indexOf(cellId);
}
