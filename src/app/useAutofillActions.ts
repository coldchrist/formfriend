import type { MutableRefObject, RefObject } from "react";
import {
  autofillFormModel,
  autofillGrid,
  type AutofillProgress,
} from "../domain/autofill";
import {
  buildCellFillsFromFormFillState,
  buildFormFillStateFromCellFills,
  buildFormModelFromTopology,
} from "../domain/formModel";
import type { FormModel } from "../domain/formModel";
import type { LoadedWordList } from "../domain/wordList";
import type { PuzzleGridHandle } from "../components/PuzzleGrid";
import type { FormStyle } from "../domain/types";
import type { PuzzleStoreState } from "../state/puzzleStore";

type SetState<T> = React.Dispatch<React.SetStateAction<T>>;

type UiStatusSetter = (
  text: string,
  kind?: "info" | "success" | "error",
) => void;

type UseAutofillActionsArgs = {
  loadedWordList: LoadedWordList | null;
  currentFormStyle: FormStyle;
  formModel: FormModel;
  store: PuzzleStoreState;
  setStore: SetState<PuzzleStoreState>;
  lockCompletedWords: boolean;
  randomizeAutofillChoices: boolean;
  isAutofillRunning: boolean;
  autofillShouldContinueRef: MutableRefObject<boolean>;
  setIsAutofillRunning: SetState<boolean>;
  setAutofillStatusText: SetState<string>;
  setIsDirty: SetState<boolean>;
  setUiStatus: UiStatusSetter;
  gridRef: RefObject<PuzzleGridHandle | null>;
};

export function useAutofillActions({
  loadedWordList,
  currentFormStyle,
  formModel,
  store,
  setStore,
  lockCompletedWords,
  randomizeAutofillChoices,
  isAutofillRunning,
  autofillShouldContinueRef,
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
    setIsAutofillRunning(true);
    setAutofillStatusText("Autofill running...");
    setUiStatus("Autofill running...", "info");
    await new Promise((resolve) => setTimeout(resolve, 0));

    try {
      if (currentFormStyle === "single") {
        const result = await autofillFormModel(
          formModel,
          store.state,
          loadedWordList,
          {
            lockCompletedWords,
            randomizeChoices: randomizeAutofillChoices,
          },
          {
            shouldContinue: () => autofillShouldContinueRef.current,
            onProgress: (progress: AutofillProgress) => {
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

        setStore((prev) => ({
          ...prev,
          state: result,
        }));
      } else {
        const currentCellFills = buildCellFillsFromFormFillState(
          formModel,
          store.state,
        );

        const result = await autofillGrid(
          store.topology,
          currentCellFills,
          loadedWordList,
          {
            lockCompletedWords,
            randomizeChoices: randomizeAutofillChoices,
          },
          {
            shouldContinue: () => autofillShouldContinueRef.current,
            onProgress: (progress: AutofillProgress) => {
              setAutofillStatusText(
                `Autofill running... nodes visited: ${progress.nodesVisited.toLocaleString()}`,
              );

              if (progress.partialGridFillsByCellId) {
                setStore((prev) => {
                  const currentFormModel = buildFormModelFromTopology(
                    prev.spec,
                    prev.topology,
                  );

                  return {
                    ...prev,
                    state: buildFormFillStateFromCellFills(
                      currentFormModel,
                      progress.partialGridFillsByCellId!,
                    ),
                  };
                });
              }
            },
            progressInterval: 1000,
            yieldInterval: 250,
          },
        );

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

        setStore((prev) => {
          const currentFormModel = buildFormModelFromTopology(
            prev.spec,
            prev.topology,
          );

          return {
            ...prev,
            state: buildFormFillStateFromCellFills(currentFormModel, result),
          };
        });
      }

      setIsDirty(true);
      setAutofillStatusText("Autofill succeeded.");
      setUiStatus("Autofill succeeded.", "success");

      requestAnimationFrame(() => {
        gridRef.current?.focusGrid();
      });
    } finally {
      setIsAutofillRunning(false);
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
