import { forwardRef, useEffect, useRef, useState } from "react";
import type { AppMode, FormStyle, ShapeVariant } from "../domain/types";

type ToolbarProps = {
  size: number;
  allowedSizes: number[];
  mode: AppMode;
  isConstruct: boolean;
  isSolveStrict: boolean;
  isSolveCheckable: boolean;
  hasSolution: boolean;
  wordListEntryCount: number;
  loadedPuzzleFileName: string | null;
  loadedWordListName: string | null;
  lockCompletedWords: boolean;
  randomizeAutofillChoices: boolean;
  isAutofillRunning: boolean;
  autofillStatusText: string;
  shapeVariant: ShapeVariant;
  formStyle: FormStyle;
  inverted: boolean;
  canBeSingle: boolean;
  supportsInverted: boolean;
  formTypeTitle: string;
  supportsShapeVariantToggle: boolean;
  shapeDisplayName?: string;
  libraryShapeOptions: Array<{ id: string; name: string }>;
  selectedLibraryShapeId: string | null;
  canConstructFromSolve: boolean;
  onConstructFromForm: () => void;
  onLibraryShapeChange: (shapeId: string) => void;
  onNewPuzzle: (size: number) => void;
  onSizeChange: (size: number) => void;
  onModeChange: (mode: AppMode) => void;
  onCaptureSolution: () => void;
  onClearGrid: () => void;
  onCheck: () => void;
  onSave: () => void;
  onLoad: (file: File) => void;
  onLoadWordList: (file: File) => void;
  onBrowseLibrary: () => void;
  onFindWords: () => void;
  onAutofill: () => void;
  onStopAutofill: () => void;
  onLockCompletedWordsChange: (value: boolean) => void;
  onRandomizeAutofillChoicesChange: (value: boolean) => void;
  onShapeVariantChange: (shapeVariant: ShapeVariant) => void;
  onInvertedChange: (inverted: boolean) => void;
  onFormStyleChange: (formStyle: FormStyle) => void;
};

export const Toolbar = forwardRef<HTMLButtonElement, ToolbarProps>(
  function Toolbar(
    {
      size,
      allowedSizes,
      isConstruct,
      isSolveStrict,
      isSolveCheckable,
      hasSolution,
      wordListEntryCount,
      loadedPuzzleFileName,
      loadedWordListName,
      lockCompletedWords,
      randomizeAutofillChoices,
      isAutofillRunning,
      shapeVariant,
      formStyle,
      inverted,
      canBeSingle,
      supportsInverted,
      formTypeTitle,
      supportsShapeVariantToggle,
      shapeDisplayName,
      libraryShapeOptions,
      selectedLibraryShapeId,
      canConstructFromSolve,
      onConstructFromForm,
      onLibraryShapeChange,
      onNewPuzzle,
      onSizeChange,
      onCaptureSolution,
      onClearGrid,
      onCheck,
      onSave,
      onLoad,
      onLoadWordList,
      onBrowseLibrary,
      onFindWords,
      onAutofill,
      onStopAutofill,
      onLockCompletedWordsChange,
      onRandomizeAutofillChoicesChange,
      onShapeVariantChange,
      onInvertedChange,
      onFormStyleChange,
    },
    clearButtonRef,
  ) {
    const clearLabel = isConstruct ? "Clear Grid" : "Clear Working Grid";
    const showWordTools = !isSolveStrict;
    const [showAutofillOptions, setShowAutofillOptions] = useState(false);
    const [showFilesSection, setShowFilesSection] = useState(true);
    const [showPuzzleSetupSection, setShowPuzzleSetupSection] = useState(true);
    const [showWordToolsSection, setShowWordToolsSection] =
      useState(!isSolveStrict);
    const [showSolutionSection, setShowSolutionSection] = useState(isConstruct);
    const puzzleFileInputRef = useRef<HTMLInputElement | null>(null);
    const wordListFileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
      if (isConstruct) {
        setShowFilesSection(true);
        setShowPuzzleSetupSection(true);
        setShowWordToolsSection(true);
        setShowSolutionSection(false);
        return;
      }

      if (isSolveStrict) {
        setShowFilesSection(true);
        setShowPuzzleSetupSection(false);
        setShowWordToolsSection(false);
        setShowSolutionSection(true);
        return;
      }

      setShowFilesSection(true);
      setShowPuzzleSetupSection(false);
      setShowWordToolsSection(true);
      setShowSolutionSection(true);
    }, [isConstruct, isSolveStrict, isSolveCheckable]);

    return (
      <section className="toolbar-panel">
        <div className="toolbar-section">
          <button
            className="toolbar-section-header"
            type="button"
            onClick={() => setShowFilesSection((prev) => !prev)}
          >
            <span className="toolbar-section-title">Files</span>
            <span>{showFilesSection ? "▾" : "▸"}</span>
          </button>

          {showFilesSection ? (
            <>
              {isConstruct ? (
                <button onClick={() => onNewPuzzle(size)}>New</button>
              ) : null}

              <input
                ref={puzzleFileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden-file-input"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onLoad(file);
                    e.target.value = "";
                  }
                }}
              />

              <button
                type="button"
                onClick={() => puzzleFileInputRef.current?.click()}
              >
                Load Form
              </button>

              <button type="button" onClick={onBrowseLibrary}>
                Browse Library
              </button>

              <div className="toolbar-status">
                Loaded form: {loadedPuzzleFileName ?? "none loaded"}
              </div>

              {isConstruct ? <button onClick={onSave}>Save Form</button> : null}

              {!isConstruct && canConstructFromSolve ? (
                <button type="button" onClick={onConstructFromForm}>
                  Construct from This Form
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        {isConstruct ? (
          <div className="toolbar-section">
            <button
              className="toolbar-section-header"
              type="button"
              onClick={() => setShowPuzzleSetupSection((prev) => !prev)}
            >
              <span className="toolbar-section-title">Puzzle Setup</span>
              <span>{showPuzzleSetupSection ? "▾" : "▸"}</span>
            </button>

            {showPuzzleSetupSection ? (
              <>
                <label>
                  Shape
                  <select
                    value={selectedLibraryShapeId ?? ""}
                    onChange={(e) => onLibraryShapeChange(e.target.value)}
                  >
                    <option value="" disabled>
                      Select shape
                    </option>
                    {libraryShapeOptions.map((shape) => (
                      <option key={shape.id} value={shape.id}>
                        {shape.name}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="toolbar-status">
                  Current: {shapeDisplayName ?? formTypeTitle}
                </div>

                {supportsShapeVariantToggle ? (
                  <label>
                    Variant
                    <select
                      value={shapeVariant}
                      onChange={(e) =>
                        onShapeVariantChange(e.target.value as ShapeVariant)
                      }
                    >
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </label>
                ) : null}

                {supportsInverted ? (
                  <label className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={inverted}
                      onChange={(e) => onInvertedChange(e.target.checked)}
                    />
                    <span>Inverted</span>
                  </label>
                ) : null}

                <label>
                  Size
                  <select
                    value={size}
                    onChange={(e) => onSizeChange(Number(e.target.value))}
                  >
                    {allowedSizes.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Form Style
                  <select
                    value={formStyle}
                    onChange={(e) =>
                      onFormStyleChange(e.target.value as FormStyle)
                    }
                  >
                    <option value="double">Double</option>
                    <option value="single" disabled={!canBeSingle}>
                      Single
                    </option>
                  </select>
                </label>
              </>
            ) : null}
          </div>
        ) : null}

        {showWordTools ? (
          <div className="toolbar-section">
            <button
              className="toolbar-section-header"
              type="button"
              onClick={() => setShowWordToolsSection((prev) => !prev)}
            >
              <span className="toolbar-section-title">Word Tools</span>
              <span>{showWordToolsSection ? "▾" : "▸"}</span>
            </button>

            {showWordToolsSection ? (
              <>
                <input
                  ref={wordListFileInputRef}
                  type="file"
                  accept=".txt,.tsv,text/plain,text/tab-separated-values"
                  className="hidden-file-input"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onLoadWordList(file);
                      e.target.value = "";
                    }
                  }}
                />

                <button
                  type="button"
                  onClick={() => wordListFileInputRef.current?.click()}
                >
                  Load Word List
                </button>

                <div className="toolbar-status">
                  Word list:{" "}
                  {loadedWordListName
                    ? `${loadedWordListName} (${wordListEntryCount.toLocaleString()} eligible entries)`
                    : "none loaded"}
                </div>

                <button onClick={onFindWords}>Find Words</button>

                <button onClick={onAutofill} disabled={isAutofillRunning}>
                  Autofill
                </button>

                {isAutofillRunning ? (
                  <button onClick={onStopAutofill}>Stop Autofill</button>
                ) : null}

                <button
                  className="toolbar-toggle"
                  onClick={() => setShowAutofillOptions((prev) => !prev)}
                  type="button"
                >
                  {showAutofillOptions
                    ? "Hide Autofill Options"
                    : "Show Autofill Options"}
                </button>

                {showAutofillOptions ? (
                  <div className="toolbar-subsection">
                    <label className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={lockCompletedWords}
                        onChange={(e) =>
                          onLockCompletedWordsChange(e.target.checked)
                        }
                      />
                      <span>Lock completed words during autofill</span>
                    </label>

                    <label className="checkbox-option">
                      <input
                        type="checkbox"
                        checked={randomizeAutofillChoices}
                        onChange={(e) =>
                          onRandomizeAutofillChoicesChange(e.target.checked)
                        }
                      />
                      <span>Randomize autofill choices</span>
                    </label>
                  </div>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}

        <div className="toolbar-section">
          <button
            className="toolbar-section-header"
            type="button"
            onClick={() => setShowSolutionSection((prev) => !prev)}
          >
            <span className="toolbar-section-title">
              {isConstruct ? "Solution" : "Solve"}
            </span>
            <span>{showSolutionSection ? "▾" : "▸"}</span>
          </button>

          {showSolutionSection ? (
            <>
              {isConstruct ? (
                <button onClick={onCaptureSolution} disabled={!isConstruct}>
                  Capture Solution
                </button>
              ) : null}

              <button ref={clearButtonRef} onClick={onClearGrid}>
                {clearLabel}
              </button>

              {isSolveCheckable ? (
                <button onClick={onCheck} disabled={!hasSolution}>
                  Check
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </section>
    );
  },
);
