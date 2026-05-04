import type {
  EntryDirection,
  CellLetterMode,
  EntryRef,
  FormFillState,
  LetterFilterMode,
  PuzzleSpec,
  Topology,
} from "./types";
import {
  filterTextForLetterFilterMode,
  isLetterAllowedForFilterMode,
  normalizeLettersOnly,
} from "./letterFilter";

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
  cellLetterSpan?: number;
  displayEntryId?: string;
}

export interface FormModel {
  cellLetterMode: CellLetterMode;
  letterFilterMode: LetterFilterMode;
  visibleCells: VisibleCell[];
  formWords: FormWord[];
  displayEntries: DisplayEntry[];
  mappings: CellFormWordMapping[];
}

function getCellLetterSpan(spec: PuzzleSpec): number {
  return spec.cellLetterMode === "bigram" ? 2 : 1;
}

export function getPuzzleSpecCellLetterSpan(spec: PuzzleSpec): number {
  return getCellLetterSpan(spec);
}

function buildDoubleFormModel(spec: PuzzleSpec, topology: Topology): FormModel {
  const cellLetterSpan = getCellLetterSpan(spec);
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
      length: entry.cells.length * cellLetterSpan,
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
        formWordOffset: i * cellLetterSpan,
        cellLetterSpan,
        displayEntryId: entry.id,
      });
    }
  }

  return {
    cellLetterMode: spec.cellLetterMode ?? "single",
    letterFilterMode: spec.letterFilterMode ?? "all",
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

function buildSingleFormModel(spec: PuzzleSpec, topology: Topology): FormModel {
  const cellLetterSpan = getCellLetterSpan(spec);
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
      length: representative.cells.length * cellLetterSpan,
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
          formWordOffset: i * cellLetterSpan,
          cellLetterSpan,
          displayEntryId: entry.id,
        });
      }
    }
  });

  return {
    cellLetterMode: spec.cellLetterMode ?? "single",
    letterFilterMode: spec.letterFilterMode ?? "all",
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

  return buildDoubleFormModel(spec, topology);
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

function fillLooksLikeReducedPattern(
  value: string,
  expectedLength: number,
  mode: LetterFilterMode,
): boolean {
  if (value.length > expectedLength) {
    return false;
  }

  return value
    .split("")
    .every(
      (char) =>
        char === "_" ||
        char === "?" ||
        isLetterAllowedForFilterMode(char, mode),
    );
}

function projectFillForGrid(
  value: string,
  expectedLength: number,
  mode: LetterFilterMode,
): string {
  const normalized = value.toUpperCase().replace(/[^A-Z_?]/g, "");

  if (mode === "all") {
    return normalized.padEnd(expectedLength, "_").slice(0, expectedLength);
  }

  if (fillLooksLikeReducedPattern(normalized, expectedLength, mode)) {
    return normalized.padEnd(expectedLength, "_").slice(0, expectedLength);
  }

  return filterTextForLetterFilterMode(normalized, mode)
    .padEnd(expectedLength, "_")
    .slice(0, expectedLength);
}

function getProjectedFormWordFill(
  formModel: FormModel,
  fillState: FormFillState,
  formWordId: string,
): string {
  const formWord = getFormWordById(formModel, formWordId);
  if (!formWord) {
    return "";
  }

  if (formModel.letterFilterMode !== "all") {
    const displayEntry = formModel.displayEntries.find(
      (entry) => entry.formWordId === formWordId,
    );
    if (displayEntry) {
      return getReducedSegmentsForDisplayEntry(
        formModel,
        fillState,
        displayEntry,
      )
        .map((segment, index) => {
          const mapping = getMappingsForCell(
            formModel,
            displayEntry.cellIds[index],
          ).find((item) => item.displayEntryId === displayEntry.id);
          const span = mapping?.cellLetterSpan ?? 1;
          return filterTextForLetterFilterMode(
            segment,
            formModel.letterFilterMode,
          )
            .padEnd(span, "_")
            .slice(0, span);
        })
        .join("");
    }
  }

  const rawFill = fillState.fillsByFormWordId[formWordId] ?? "";
  return projectFillForGrid(
    rawFill,
    formWord.length,
    formModel.letterFilterMode,
  );
}

export function getReducedEntryText(
  formModel: FormModel,
  value: string,
): string {
  return filterTextForLetterFilterMode(value, formModel.letterFilterMode);
}

export function getDisplayedCellValue(
  formModel: FormModel,
  fillState: FormFillState,
  cellId: string,
): string {
  const mappings = getMappingsForCell(formModel, cellId);

  let resolved = "";

  for (const mapping of mappings) {
    const fill = getProjectedFormWordFill(
      formModel,
      fillState,
      mapping.formWordId,
    );
    const span = mapping.cellLetterSpan ?? 1;
    const rawValue = fill.slice(
      mapping.formWordOffset,
      mapping.formWordOffset + span,
    );
    const value = rawValue.replace(/_/g, "");

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
      const mapping = getMappingsForCell(formModel, cellId).find(
        (item) => item.displayEntryId === displayEntry.id,
      );
      const span = mapping?.cellLetterSpan ?? 1;
      const value = getDisplayedCellValue(formModel, fillState, cellId);
      return (value || "").padEnd(span, "_").slice(0, span);
    })
    .join("");
}

export function formFillStateHasCellConflicts(
  formModel: FormModel,
  fillState: FormFillState,
): boolean {
  return formModel.visibleCells.some(
    (cell) => getDisplayedCellValue(formModel, fillState, cell.id) === "?",
  );
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
        const span = mapping.cellLetterSpan ?? 1;
        const normalized = value.toUpperCase().slice(0, span);
        for (let i = 0; i < span; i += 1) {
          chars[mapping.formWordOffset + i] = normalized[i] ?? "_";
        }
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

  const normalizedWord = normalizeLettersOnly(word);

  if (formModel.letterFilterMode !== "all") {
    const firstMapping = displayEntry.cellIds
      .map((cellId) =>
        getMappingsForCell(formModel, cellId).find(
          (mapping) => mapping.displayEntryId === displayEntry.id,
        ),
      )
      .find(Boolean);
    const span = firstMapping?.cellLetterSpan ?? 1;
    const segments = splitReducedRawTextIntoCellSegments(
      normalizedWord,
      displayEntry.cellIds.length,
      span,
      formModel.letterFilterMode,
    );
    return setReducedSegmentsForDisplayEntry(fillState, displayEntry, segments);
  }

  return {
    fillsByFormWordId: {
      ...fillState.fillsByFormWordId,
      [displayEntry.formWordId]: normalizedWord,
    },
    reducedSegmentsByFormWordId: fillState.reducedSegmentsByFormWordId,
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

  if (formModel.letterFilterMode !== "all") {
    return applyWordToDisplayEntry(formModel, fillState, displayEntryId, word);
  }

  let nextState = fillState;

  for (let i = 0; i < displayEntry.cellIds.length; i += 1) {
    const cellId = displayEntry.cellIds[i];
    const mapping = getMappingsForCell(formModel, cellId).find(
      (item) => item.displayEntryId === displayEntry.id,
    );
    const span = mapping?.cellLetterSpan ?? 1;
    const value = word.slice(i * span, i * span + span);
    nextState = setDisplayedCellCharacter(formModel, nextState, cellId, value);
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
    reducedSegmentsByFormWordId: fillState.reducedSegmentsByFormWordId,
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
  const rawValue = normalizeLettersOnly(value)
    .split("")
    .filter((letter) =>
      isLetterAllowedForFilterMode(letter, formModel.letterFilterMode),
    )
    .join("");

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

    const span = mapping.cellLetterSpan ?? 1;
    const normalizedValue = rawValue.slice(0, span);
    for (let i = 0; i < span; i += 1) {
      chars[mapping.formWordOffset + i] = normalizedValue[i] ?? "_";
    }
    nextFillsByFormWordId[mapping.formWordId] = chars.join("");
  }

  return {
    fillsByFormWordId: nextFillsByFormWordId,
    reducedSegmentsByFormWordId: fillState.reducedSegmentsByFormWordId,
  };
}

export function getDisplayEntryAnswerTextById(
  formModel: FormModel,
  fillState: FormFillState,
  displayEntryId: string,
): string {
  const displayEntry = getDisplayEntryById(formModel, displayEntryId);
  if (!displayEntry) {
    return "";
  }

  const rawFill = fillState.fillsByFormWordId[displayEntry.formWordId] ?? "";
  const rawLetters = normalizeLettersOnly(rawFill);
  const pattern = getDisplayEntryPatternById(
    formModel,
    fillState,
    displayEntryId,
  );

  if (formModel.letterFilterMode === "all") {
    return pattern;
  }

  const hasHiddenLetters = rawLetters
    .split("")
    .some(
      (letter) =>
        !isLetterAllowedForFilterMode(letter, formModel.letterFilterMode),
    );

  if (!rawLetters || !hasHiddenLetters) {
    return pattern;
  }

  return `${rawLetters} → ${pattern}`;
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

function splitReducedRawTextIntoCellSegments(
  value: string,
  cellCount: number,
  cellLetterSpan: number,
  mode: LetterFilterMode,
): string[] {
  const normalized = normalizeLettersOnly(value);
  const segments = Array.from({ length: cellCount }, () => "");
  if (cellCount <= 0) {
    return segments;
  }

  let cellIndex = 0;
  let acceptedInCurrentCell = 0;

  for (const letter of normalized) {
    segments[cellIndex] += letter;

    if (isLetterAllowedForFilterMode(letter, mode)) {
      acceptedInCurrentCell += 1;
      if (
        acceptedInCurrentCell >= cellLetterSpan &&
        cellIndex < cellCount - 1
      ) {
        cellIndex += 1;
        acceptedInCurrentCell = 0;
      }
    }
  }

  return segments;
}

function getReducedSegmentsForDisplayEntry(
  formModel: FormModel,
  fillState: FormFillState,
  displayEntry: DisplayEntry,
): string[] {
  const explicitSegments =
    fillState.reducedSegmentsByFormWordId?.[displayEntry.formWordId];

  if (explicitSegments) {
    return displayEntry.cellIds.map((_, index) =>
      normalizeLettersOnly(explicitSegments[index] ?? ""),
    );
  }

  const firstMapping = displayEntry.cellIds
    .map((cellId) =>
      getMappingsForCell(formModel, cellId).find(
        (mapping) => mapping.displayEntryId === displayEntry.id,
      ),
    )
    .find(Boolean);
  const span = firstMapping?.cellLetterSpan ?? 1;
  const rawFill = fillState.fillsByFormWordId[displayEntry.formWordId] ?? "";

  return splitReducedRawTextIntoCellSegments(
    rawFill,
    displayEntry.cellIds.length,
    span,
    formModel.letterFilterMode,
  );
}

function setReducedSegmentsForDisplayEntry(
  fillState: FormFillState,
  displayEntry: DisplayEntry,
  segments: string[],
): FormFillState {
  const normalizedSegments = displayEntry.cellIds.map((_, index) =>
    normalizeLettersOnly(segments[index] ?? ""),
  );
  const nextReducedSegmentsByFormWordId = {
    ...(fillState.reducedSegmentsByFormWordId ?? {}),
    [displayEntry.formWordId]: normalizedSegments,
  };

  return {
    fillsByFormWordId: {
      ...fillState.fillsByFormWordId,
      [displayEntry.formWordId]: normalizedSegments.join(""),
    },
    reducedSegmentsByFormWordId: nextReducedSegmentsByFormWordId,
  };
}

export function getReducedCellOwnedSegment(
  formModel: FormModel,
  fillState: FormFillState,
  displayEntryId: string,
  cellId: string,
): string {
  const displayEntry = getDisplayEntryById(formModel, displayEntryId);
  if (!displayEntry || formModel.letterFilterMode === "all") {
    return "";
  }

  const cellIndex = displayEntry.cellIds.indexOf(cellId);
  if (cellIndex < 0) {
    return "";
  }

  const segments = getReducedSegmentsForDisplayEntry(
    formModel,
    fillState,
    displayEntry,
  );

  return segments[cellIndex] ?? "";
}

export function setReducedCellOwnedSegment(
  formModel: FormModel,
  fillState: FormFillState,
  displayEntryId: string,
  cellId: string,
  segment: string,
): FormFillState {
  if (formModel.letterFilterMode === "all") {
    return fillState;
  }

  const normalizedSegment = normalizeLettersOnly(segment);
  const mappings = getMappingsForCell(formModel, cellId);
  if (mappings.length === 0) {
    return fillState;
  }

  let nextFillState = fillState;
  let updatedActiveEntry = false;

  for (const mapping of mappings) {
    const displayEntry = mapping.displayEntryId
      ? getDisplayEntryById(formModel, mapping.displayEntryId)
      : undefined;
    if (!displayEntry) {
      continue;
    }

    const cellIndex = displayEntry.cellIds.indexOf(cellId);
    if (cellIndex < 0) {
      continue;
    }

    const segments = getReducedSegmentsForDisplayEntry(
      formModel,
      nextFillState,
      displayEntry,
    );
    segments[cellIndex] = normalizedSegment;
    nextFillState = setReducedSegmentsForDisplayEntry(
      nextFillState,
      displayEntry,
      segments,
    );

    if (mapping.displayEntryId === displayEntryId) {
      updatedActiveEntry = true;
    }
  }

  return updatedActiveEntry ? nextFillState : fillState;
}

export function reducedSegmentAcceptedLetterCount(
  formModel: FormModel,
  segment: string,
): number {
  if (formModel.letterFilterMode === "all") {
    return normalizeLettersOnly(segment).length;
  }

  return normalizeLettersOnly(segment)
    .split("")
    .filter((letter) =>
      isLetterAllowedForFilterMode(letter, formModel.letterFilterMode),
    ).length;
}
