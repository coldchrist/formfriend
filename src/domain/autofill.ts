import {
  compareEntriesByPreference,
  findMatchingWords,
  getEntryFrequencyBand,
  type LoadedWordList,
} from "./wordList";
import {
  applyWordToDisplayEntryByCell,
  formFillStateHasCellConflicts,
  getDisplayEntryPatternById,
  type FormModel,
} from "./formModel";
import type { CellLetterMode, EntryRef, FormFillState, LetterFilterMode, Topology } from "./types";

export type AutofillOptions = {
  lockCompletedWords: boolean;
  randomizeChoices: boolean;
  minFrequencyBand?: number;
};

export type AutofillProgress = {
  nodesVisited: number;
  partialFormFillState?: FormFillState;
  partialGridFillsByCellId?: Record<string, string>;
};

export interface FormWordAutofillOptions {
  randomizeChoices?: boolean;
  lockCompletedWords?: boolean;
  minFrequencyBand?: number;
}

interface FormWordChoice {
  displayEntryId: string;
  pattern: string;
  matches: string[];
}

export type AutofillRuntime = {
  shouldContinue: () => boolean;
  onProgress?: (progress: AutofillProgress) => void;
  progressInterval?: number;
  yieldInterval?: number;
  random?: () => number;
};

type AutofillSearchState = {
  fillsByCellId: Record<string, string>;
  usedWords: Set<string>;
};

type AutofillInternalState = {
  nodesVisited: number;
  lastYieldAt: number;
  lastReportAt: number;
  latestGridFillsByCellId: Record<string, string>;
};

function getRepresentativeDisplayEntries(formModel: FormModel) {
  const seen = new Set<string>();

  return formModel.displayEntries.filter((entry) => {
    if (seen.has(entry.formWordId)) {
      return false;
    }

    seen.add(entry.formWordId);
    return true;
  });
}

function patternIsComplete(pattern: string): boolean {
  return pattern.length > 0 && !pattern.includes("_") && !pattern.includes("?");
}

function shuffleSliceInPlace(
  words: string[],
  start: number,
  endExclusive: number,
  random: () => number,
): void {
  for (let i = endExclusive - 1; i > start; i -= 1) {
    const j = start + Math.floor(random() * (i - start + 1));
    [words[i], words[j]] = [words[j], words[i]];
  }
}

function randomizeWithinFrequencyBands(
  wordList: LoadedWordList,
  words: string[],
  random: () => number,
): string[] {
  const shuffled = [...words];
  let start = 0;

  while (start < shuffled.length) {
    const band = getEntryFrequencyBand(wordList, shuffled[start]);
    let end = start + 1;

    while (
      end < shuffled.length &&
      getEntryFrequencyBand(wordList, shuffled[end]) === band
    ) {
      end += 1;
    }

    if (end - start > 1) {
      shuffleSliceInPlace(shuffled, start, end, random);
    }

    start = end;
  }

  return shuffled;
}

function normalizeMinimumFrequencyBand(value: number | undefined): number {
  if (!Number.isFinite(value) || value === undefined) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

function getPreferredMatches(
  wordList: LoadedWordList,
  pattern: string,
  minFrequencyBand?: number,
  letterFilterMode: LetterFilterMode = "all",
  cellLetterMode: CellLetterMode = "single",
): string[] {
  const minimumBand = normalizeMinimumFrequencyBand(minFrequencyBand);
  const matches = [
    ...findMatchingWords(
      wordList,
      pattern,
      0,
      Number.MAX_SAFE_INTEGER,
      letterFilterMode,
      cellLetterMode,
    ).matches,
  ].filter((word) => getEntryFrequencyBand(wordList, word) >= minimumBand);

  matches.sort((a, b) => compareEntriesByPreference(wordList, a, b));
  return matches;
}

function chooseNextFormWordChoice(
  formModel: FormModel,
  fillState: FormFillState,
  wordList: LoadedWordList,
  options: FormWordAutofillOptions,
  runtimeRandom?: () => number,
): FormWordChoice | null {
  const representatives = getRepresentativeDisplayEntries(formModel);
  const choices: FormWordChoice[] = [];

  for (const entry of representatives) {
    const pattern = getDisplayEntryPatternById(formModel, fillState, entry.id);
    if (!pattern) {
      continue;
    }

    const complete = patternIsComplete(pattern);

    if (complete) {
      continue;
    }

    const matches = getPreferredMatches(
      wordList,
      pattern,
      options.minFrequencyBand,
      formModel.letterFilterMode,
      formModel.cellLetterMode,
    );

    if (matches.length === 0) {
      return {
        displayEntryId: entry.id,
        pattern,
        matches: [],
      };
    }

    choices.push({
      displayEntryId: entry.id,
      pattern,
      matches,
    });
  }

  if (choices.length === 0) {
    return null;
  }

  choices.sort((a, b) => a.matches.length - b.matches.length);

  const best = choices[0];

  if (options.randomizeChoices && best.matches.length > 1) {
    return {
      ...best,
      matches: randomizeWithinFrequencyBands(
        wordList,
        best.matches,
        runtimeRandom ?? Math.random,
      ),
    };
  }

  return best;
}

async function autofillFormWordsRecursive(
  formModel: FormModel,
  fillState: FormFillState,
  wordList: LoadedWordList,
  options: FormWordAutofillOptions,
  usedWords: Set<string>,
  runtime?: {
    shouldContinue?: () => boolean;
    onProgress?: (progress: AutofillProgress) => void;
    progressInterval?: number;
    yieldInterval?: number;
    random?: () => number;
  },
  progressState?: {
    nodesVisited: number;
    lastYieldAt: number;
    latestFormFillState: FormFillState;
  },
): Promise<FormFillState | null> {
  const now = Date.now();

  const progress = progressState ?? {
    nodesVisited: 0,
    lastYieldAt: now,
    latestFormFillState: fillState,
  };

  if (runtime?.shouldContinue && !runtime.shouldContinue()) {
    return progress.latestFormFillState;
  }

  progress.nodesVisited += 1;
  progress.latestFormFillState = fillState;

  const progressInterval = runtime?.progressInterval ?? 100;
  if (
    runtime?.onProgress &&
    (progress.nodesVisited === 1 ||
      progress.nodesVisited % progressInterval === 0)
  ) {
    runtime.onProgress({
      nodesVisited: progress.nodesVisited,
      partialFormFillState: fillState,
    });
  }

  if (now - progress.lastYieldAt >= (runtime?.yieldInterval ?? 250)) {
    await new Promise((resolve) => setTimeout(resolve, 0));
    progress.lastYieldAt = Date.now();
  }

  if (allFormWordsFilled(formModel, fillState)) {
    return fillState;
  }

  if (runtime?.shouldContinue && !runtime.shouldContinue()) {
    return progress.latestFormFillState;
  }

  const choice = chooseNextFormWordChoice(
    formModel,
    fillState,
    wordList,
    options,
    runtime?.random,
  );

  if (runtime?.shouldContinue && !runtime.shouldContinue()) {
    return progress.latestFormFillState;
  }

  if (!choice) {
    return fillState;
  }

  if (choice.matches.length === 0) {
    return null;
  }

  for (const word of choice.matches) {
    if (usedWords.has(word)) {
      continue;
    }

    const nextState = applyWordToDisplayEntryByCell(
      formModel,
      fillState,
      choice.displayEntryId,
      word,
    );

    if (formFillStateHasCellConflicts(formModel, nextState)) {
      continue;
    }

    const nextUsedWords = new Set(usedWords);
    nextUsedWords.add(word);

    const result = await autofillFormWordsRecursive(
      formModel,
      nextState,
      wordList,
      options,
      nextUsedWords,
      runtime,
      progress,
    );

    if (result) {
      return result;
    }
  }

  return null;
}

export async function autofillFormModel(
  formModel: FormModel,
  initialFillState: FormFillState,
  wordList: LoadedWordList,
  options: FormWordAutofillOptions = {},
  runtime?: {
    shouldContinue?: () => boolean;
    onProgress?: (progress: AutofillProgress) => void;
    progressInterval?: number;
    yieldInterval?: number;
    random?: () => number;
  },
): Promise<FormFillState | null> {
  return autofillFormWordsRecursive(
    formModel,
    initialFillState,
    wordList,
    options,
    collectInitiallyUsedFormWords(formModel, initialFillState),
    runtime,
  );
}

function allFormWordsFilled(
  formModel: FormModel,
  fillState: FormFillState,
): boolean {
  const representatives = getRepresentativeDisplayEntries(formModel);

  return representatives.every((entry) => {
    const pattern = getDisplayEntryPatternById(formModel, fillState, entry.id);
    return patternIsComplete(pattern);
  });
}

function collectInitiallyUsedFormWords(
  formModel: FormModel,
  fillState: FormFillState,
): Set<string> {
  const usedWords = new Set<string>();
  const representatives = getRepresentativeDisplayEntries(formModel);

  for (const entry of representatives) {
    const pattern = getDisplayEntryPatternById(formModel, fillState, entry.id);
    if (patternIsComplete(pattern)) {
      usedWords.add(pattern);
    }
  }

  return usedWords;
}

function applyWordToEntry(
  fillsByCellId: Record<string, string>,
  entry: EntryRef,
  word: string,
): Record<string, string> {
  const updated = { ...fillsByCellId };

  for (let i = 0; i < entry.cells.length; i += 1) {
    updated[entry.cells[i]] = word[i] ?? "";
  }

  return updated;
}

function isEntryComplete(
  entry: EntryRef,
  fillsByCellId: Record<string, string>,
): boolean {
  return entry.cells.every((cellId) => (fillsByCellId[cellId] ?? "") !== "");
}

function getCompletedEntryWord(
  entry: EntryRef,
  fillsByCellId: Record<string, string>,
): string | null {
  if (!isEntryComplete(entry, fillsByCellId)) {
    return null;
  }

  return entry.cells.map((cellId) => fillsByCellId[cellId] ?? "").join("");
}

function getPatternForEntry(
  entry: EntryRef,
  fillsByCellId: Record<string, string>,
): string {
  return entry.cells.map((cellId) => fillsByCellId[cellId] || "_").join("");
}

function getCandidatesForEntry(
  wordList: LoadedWordList,
  entry: EntryRef,
  fillsByCellId: Record<string, string>,
  usedWords: Set<string>,
  options: AutofillOptions,
  runtime: AutofillRuntime,
): string[] {
  const pattern = getPatternForEntry(entry, fillsByCellId);

  const matches = getPreferredMatches(
    wordList,
    pattern,
    options.minFrequencyBand,
  ).filter((word) => !usedWords.has(word));

  if (!options.randomizeChoices) {
    return matches;
  }

  return randomizeWithinFrequencyBands(
    wordList,
    matches,
    runtime.random ?? Math.random,
  );
}

function chooseNextEntry(
  topology: Topology,
  fillsByCellId: Record<string, string>,
  wordList: LoadedWordList,
  usedWords: Set<string>,
  options: AutofillOptions,
  runtime: AutofillRuntime,
): { entry: EntryRef; candidates: string[] } | null {
  let bestEntry: EntryRef | null = null;
  let bestCandidates: string[] | null = null;

  for (const entry of topology.entries) {
    const entryIsComplete = isEntryComplete(entry, fillsByCellId);

    if (options.lockCompletedWords && entryIsComplete) {
      continue;
    }

    const candidates = getCandidatesForEntry(
      wordList,
      entry,
      fillsByCellId,
      usedWords,
      options,
      runtime,
    );

    if (candidates.length === 0) {
      return { entry, candidates };
    }

    if (
      !bestEntry ||
      !bestCandidates ||
      candidates.length < bestCandidates.length
    ) {
      bestEntry = entry;
      bestCandidates = candidates;

      if (candidates.length === 1) {
        break;
      }
    }
  }

  if (!bestEntry || !bestCandidates) {
    return null;
  }

  return {
    entry: bestEntry,
    candidates: bestCandidates,
  };
}

async function maybeYield(
  runtime: AutofillRuntime,
  internal: AutofillInternalState,
): Promise<boolean> {
  const now = Date.now();
  const yieldIntervalMs = runtime.yieldInterval ?? 250;

  if (now - internal.lastYieldAt < yieldIntervalMs) {
    return runtime.shouldContinue();
  }

  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0);
  });

  internal.lastYieldAt = Date.now();
  return runtime.shouldContinue();
}

async function recursivelyAutofill(
  topology: Topology,
  wordList: LoadedWordList,
  state: AutofillSearchState,
  options: AutofillOptions,
  runtime: AutofillRuntime,
  internal: AutofillInternalState,
): Promise<Record<string, string> | null> {
  if (!runtime.shouldContinue()) {
    return null;
  }

  internal.nodesVisited += 1;
  internal.latestGridFillsByCellId = state.fillsByCellId;

  const now = Date.now();
  const progressIntervalMs = runtime.progressInterval ?? 100;

  if (
    runtime.onProgress &&
    (internal.nodesVisited === 1 ||
      now - internal.lastReportAt >= progressIntervalMs)
  ) {
    runtime.onProgress({
      nodesVisited: internal.nodesVisited,
      partialGridFillsByCellId: state.fillsByCellId,
    });
    internal.lastReportAt = now;
  }

  if (!(await maybeYield(runtime, internal))) {
    return null;
  }

  if (!runtime.shouldContinue()) {
    return null;
  }

  const next = chooseNextEntry(
    topology,
    state.fillsByCellId,
    wordList,
    state.usedWords,
    options,
    runtime,
  );

  if (!runtime.shouldContinue()) {
    return null;
  }

  if (next === null) {
    return state.fillsByCellId;
  }

  if (next.candidates.length === 0) {
    return null;
  }

  for (const candidate of next.candidates) {
    if (!runtime.shouldContinue()) {
      return null;
    }

    const updatedFills = applyWordToEntry(
      state.fillsByCellId,
      next.entry,
      candidate,
    );

    const nextUsedWords = new Set(state.usedWords);
    nextUsedWords.add(candidate);

    const result = await recursivelyAutofill(
      topology,
      wordList,
      {
        fillsByCellId: updatedFills,
        usedWords: nextUsedWords,
      },
      options,
      runtime,
      internal,
    );

    if (result) {
      return result;
    }
  }

  return null;
}

function collectInitiallyUsedWords(
  topology: Topology,
  fillsByCellId: Record<string, string>,
): Set<string> {
  const usedWords = new Set<string>();

  for (const entry of topology.entries) {
    const word = getCompletedEntryWord(entry, fillsByCellId);
    if (word) {
      usedWords.add(word);
    }
  }

  return usedWords;
}

export async function autofillGrid(
  topology: Topology,
  fillsByCellId: Record<string, string>,
  wordList: LoadedWordList,
  options: AutofillOptions,
  runtime: AutofillRuntime,
): Promise<Record<string, string> | null> {
  const now = Date.now();

  const internal: AutofillInternalState = {
    nodesVisited: 0,
    lastYieldAt: now,
    lastReportAt: now,
    latestGridFillsByCellId: { ...fillsByCellId },
  };

  const result = await recursivelyAutofill(
    topology,
    wordList,
    {
      fillsByCellId: { ...fillsByCellId },
      usedWords: collectInitiallyUsedWords(topology, fillsByCellId),
    },
    options,
    runtime,
    internal,
  );

  if (runtime.onProgress) {
    runtime.onProgress({
      nodesVisited: internal.nodesVisited,
      partialGridFillsByCellId: result ?? internal.latestGridFillsByCellId,
    });
  }

  return result;
}
