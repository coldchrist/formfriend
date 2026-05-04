import type { MutableRefObject, RefObject } from "react";
import {
  autofillFormModel,
  type AutofillProgress,
} from "../domain/autofill";
import type { FormModel } from "../domain/formModel";
import type { LoadedWordList } from "../domain/wordList";
import type { PuzzleGridHandle } from "../components/PuzzleGrid";
import type { PuzzleStoreState } from "../state/puzzleStore";

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

type UiStatusSetter = (
  text: string,
  kind?: "info" | "success" | "error",
) => void;

type UseAutofillActionsArgs = {
  loadedWordList: LoadedWordList | null;
  formModel: FormModel;
  store: PuzzleStoreState;
  setStore: SetState<PuzzleStoreState>;
  lockCompletedWords: boolean;
  randomizeAutofillChoices: boolean;
  autofillMinFrequencyBand: number;
  isAutofillRunning: boolean;
  autofillShouldContinueRef: MutableRefObject<boolean>;
  autofillRunIdRef: MutableRefObject<number>;
  setIsAutofillRunning: SetState<boolean>;
  setAutofillStatusText: SetState<string>;
  setIsDirty: SetState<boolean>;
  setUiStatus: UiStatusSetter;
  gridRef: RefObject<PuzzleGridHandle | null>;
};

export function useAutofillActions({
  loadedWordList,
  formModel,
  store,
  setStore,
  lockCompletedWords,
  randomizeAutofillChoices,
  autofillMinFrequencyBand,
  isAutofillRunning,
  autofillShouldContinueRef,
  autofillRunIdRef,
  setIsAutofillRunning,
  setAutofillStatusText,
  setIsDirty,
  setUiStatus,
  gridRef,
}: UseAutofillActionsArgs) {
  async function handleAutofill() {
    if (!loadedWordList) {
      setUiStatus("No word list loaded.", "info");
      return;
    }

    if (isAutofillRunning) {
      return;
    }

    autofillShouldContinueRef.current = true;
    const runId = autofillRunIdRef.current + 1;
    autofillRunIdRef.current = runId;
    setIsAutofillRunning(true);
    setAutofillStatusText("Autofill running...");
    setUiStatus("Autofill running...", "info");
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      const result = await autofillFormModel(
        formModel,
        store.state,
        loadedWordList,
        {
          lockCompletedWords,
          randomizeChoices: randomizeAutofillChoices,
          minFrequencyBand: autofillMinFrequencyBand,
        },
        {
          shouldContinue: () =>
            autofillShouldContinueRef.current &&
            autofillRunIdRef.current === runId,
          onProgress: (progress: AutofillProgress) => {
            if (autofillRunIdRef.current !== runId) {
              return;
            }

            setAutofillStatusText(
              `Autofill running... nodes visited: ${progress.nodesVisited.toLocaleString()}`,
            );

            if (progress.partialFormFillState) {
              setStore((prev) => ({
                ...prev,
                state: progress.partialFormFillState!,
              }));
            }
          },
          progressInterval: 1000,
          yieldInterval: 250,
        },
      );

      if (autofillRunIdRef.current !== runId) {
        return;
      }

      if (!autofillShouldContinueRef.current) {
        setAutofillStatusText("Autofill cancelled.");
        setUiStatus("Autofill cancelled.", "info");
        return;
      }

      if (!result) {
        setAutofillStatusText("Autofill failed: no solution found.");
        setUiStatus("No autofill solution found.", "error");
        return;
      }

      if (autofillRunIdRef.current !== runId) {
        return;
      }

      setStore((prev) => ({
        ...prev,
        state: result,
      }));

      setIsDirty(true);
      setAutofillStatusText("Autofill succeeded.");
      setUiStatus("Autofill succeeded.", "success");

      requestAnimationFrame(() => {
        gridRef.current?.focusGrid();
      });
    } finally {
      if (autofillRunIdRef.current === runId) {
        setIsAutofillRunning(false);
      }
    }
  }

  function handleStopAutofill() {
    autofillShouldContinueRef.current = false;
    setAutofillStatusText("Stopping autofill...");
    setUiStatus("Stopping autofill...", "info");
  }

  return {
    handleAutofill,
    handleStopAutofill,
  };
}
