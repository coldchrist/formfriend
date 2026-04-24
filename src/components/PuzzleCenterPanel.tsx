import { useRef, useState } from "react";
import { PuzzleGrid, type PuzzleGridHandle } from "../components/PuzzleGrid";
import type { FormStyle, ShapeVariant } from "../domain/types";

type PuzzleCenterPanelProps = {
  gridRef: React.RefObject<PuzzleGridHandle | null>;
  isConstruct: boolean;
  isSolveCheckable: boolean;
  isSolutionCorrect: boolean;
  formTypeTitle: string;
  showAutofillBanner: boolean;
  autofillStatusText: string;
  // Size / style / variant / invert controls (construct only)
  size: number;
  allowedSizes: number[];
  formStyle: FormStyle;
  canBeSingle: boolean;
  shapeVariant: ShapeVariant;
  supportsShapeVariantToggle: boolean;
  inverted: boolean;
  supportsInverted: boolean;
  // Word tools state (construct only)
  loadedWordListName: string | null;
  loadedWordListEntryCount: number;
  isAutofillRunning: boolean;
  lockCompletedWords: boolean;
  randomizeAutofillChoices: boolean;
  metadata: {
    publication?: string;
    title: string;
    author: string;
  };
  projectedFillsByCellId: Record<string, string>;
  selection: {
    cellId: string | null;
    direction: "across" | "down";
  };
  activeGridCellIds: string[];
  clueNumberByCellId: Record<string, string>;
  acrossLabelByCellId?: Record<string, string>;
  downLabelByCellId?: Record<string, string>;
  gridPresentation: "square" | "hex";
  incorrectCellIds: Set<string>;
  topology: Parameters<typeof PuzzleGrid>[0]["topology"];
  onPublicationChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onCellClick: (cellId: string) => void;
  onKeyDown: (event: React.KeyboardEvent<SVGSVGElement>) => void;
  // Construct actions
  onSizeChange: (size: number) => void;
  onFormStyleChange: (style: FormStyle) => void;
  onShapeVariantChange: (variant: ShapeVariant) => void;
  onInvertedChange: (inverted: boolean) => void;
  onClearGrid: () => void;
  onFindWords: () => void;
  onAutofill: () => void;
  onStopAutofill: () => void;
  onLoadWordList: (file: File) => void;
  onLockCompletedWordsChange: (value: boolean) => void;
  onRandomizeAutofillChoicesChange: (value: boolean) => void;
};

export function PuzzleCenterPanel({
  gridRef,
  isConstruct,
  isSolveCheckable,
  isSolutionCorrect,
  formTypeTitle,
  showAutofillBanner,
  autofillStatusText,
  size,
  allowedSizes,
  formStyle,
  canBeSingle,
  shapeVariant,
  supportsShapeVariantToggle,
  inverted,
  supportsInverted,
  loadedWordListName,
  loadedWordListEntryCount,
  isAutofillRunning,
  lockCompletedWords,
  randomizeAutofillChoices,
  metadata,
  projectedFillsByCellId,
  selection,
  activeGridCellIds,
  clueNumberByCellId,
  acrossLabelByCellId,
  downLabelByCellId,
  gridPresentation,
  incorrectCellIds,
  topology,
  onPublicationChange,
  onTitleChange,
  onAuthorChange,
  onCellClick,
  onKeyDown,
  onSizeChange,
  onFormStyleChange,
  onShapeVariantChange,
  onInvertedChange,
  onClearGrid,
  onFindWords,
  onAutofill,
  onStopAutofill,
  onLoadWordList,
  onLockCompletedWordsChange,
  onRandomizeAutofillChoicesChange,
}: PuzzleCenterPanelProps) {
  const wordListFileInputRef = useRef<HTMLInputElement | null>(null);
  const [showAutofillOptions, setShowAutofillOptions] = useState(false);

  const minSize = allowedSizes?.[0] ?? 3;
  const maxSize = allowedSizes?.[allowedSizes.length - 1] ?? 15;

  return (
    <>
      {/* Metadata row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          marginBottom: "0.5rem",
          gap: "0.5rem",
        }}
      >
        <div style={{ textAlign: "left", fontSize: "0.9rem", color: "#555" }}>
          {isConstruct ? (
            <input
              type="text"
              value={metadata.publication ?? ""}
              onChange={(e) => onPublicationChange(e.target.value)}
              placeholder="Publication"
              style={{
                width: "100%",
                border: "none",
                borderBottom: "1px solid #ccc",
              }}
            />
          ) : (
            metadata.publication
          )}
        </div>

        <div
          style={{ textAlign: "center", fontWeight: 600, fontSize: "1.1rem" }}
        >
          {isConstruct ? (
            <input
              type="text"
              value={metadata.title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Title"
              style={{
                textAlign: "center",
                border: "none",
                borderBottom: "1px solid #ccc",
                width: "100%",
              }}
            />
          ) : (
            metadata.title
          )}
        </div>

        <div style={{ textAlign: "right", fontSize: "0.9rem" }}>
          {isConstruct ? (
            <input
              type="text"
              value={metadata.author}
              onChange={(e) => onAuthorChange(e.target.value)}
              placeholder="Author"
              style={{
                textAlign: "right",
                border: "none",
                borderBottom: "1px solid #ccc",
                width: "100%",
              }}
            />
          ) : (
            metadata.author
          )}
        </div>
      </div>

      {/* Form type title row — with Capture Solution and Clear Grid flanking it */}
      {isConstruct ? (
        <div className="construct-title-row">
          <h3 className="center-title" style={{ margin: 0 }}>
            {formTypeTitle}
          </h3>
          <button
            type="button"
            className="construct-title-action construct-title-action--danger"
            onClick={onClearGrid}
            title="Clear all letters from the grid"
          >
            ⌫ Clear Grid
          </button>
        </div>
      ) : (
        <h3 className="center-title">{formTypeTitle}</h3>
      )}

      {showAutofillBanner ? (
        <div
          style={{
            marginTop: "0.25rem",
            marginBottom: "0.75rem",
            fontStyle: "italic",
            textAlign: "center",
            fontWeight: 500,
            minHeight: "1.25rem",
          }}
        >
          {autofillStatusText.startsWith("Stopping autofill")
            ? "Stopping autofill..."
            : "Autofilling..."}
        </div>
      ) : null}

      {/* Grid */}
      <div className="grid-wrapper">
        <PuzzleGrid
          ref={gridRef}
          topology={topology}
          fillsByCellId={projectedFillsByCellId}
          selection={selection}
          activeCellIds={activeGridCellIds}
          clueNumberByCellId={clueNumberByCellId}
          acrossLabelByCellId={acrossLabelByCellId}
          downLabelByCellId={downLabelByCellId}
          gridPresentation={gridPresentation}
          incorrectCellIds={isSolveCheckable ? incorrectCellIds : new Set()}
          onCellClick={onCellClick}
          onKeyDown={onKeyDown}
        />
      </div>

      {isSolveCheckable && isSolutionCorrect ? (
        <div
          style={{ textAlign: "center", marginTop: "0.5rem", color: "#15803d" }}
        >
          Solution is correct!
        </div>
      ) : null}

      {/* Construct shape/size toolbar */}
      {isConstruct ? (
        <>
          <div className="construct-toolbar">
            {/* Size spinner */}
            <div className="construct-toolbar-size" title="Form size">
              <button
                type="button"
                className="construct-toolbar-size-btn"
                onClick={() => {
                  const idx = allowedSizes.indexOf(size);
                  if (idx > 0) onSizeChange(allowedSizes[idx - 1]!);
                }}
                disabled={size <= minSize}
                aria-label="Decrease size"
              >
                −
              </button>
              <span className="construct-toolbar-size-value">{size}</span>
              <button
                type="button"
                className="construct-toolbar-size-btn"
                onClick={() => {
                  const idx = allowedSizes.indexOf(size);
                  if (idx < allowedSizes.length - 1)
                    onSizeChange(allowedSizes[idx + 1]!);
                }}
                disabled={size >= maxSize}
                aria-label="Increase size"
              >
                +
              </button>
            </div>

            {/* Left / Right variant toggle */}
            <div
              className="construct-toolbar-style-toggle"
              style={{ opacity: supportsShapeVariantToggle ? 1 : 0.35 }}
              title={
                supportsShapeVariantToggle
                  ? undefined
                  : "This shape does not support left/right variants"
              }
            >
              <button
                type="button"
                className={`construct-toolbar-style-btn${shapeVariant === "left" ? " construct-toolbar-style-btn--active" : ""}`}
                onClick={() => onShapeVariantChange("left")}
                disabled={!supportsShapeVariantToggle}
                title="Left variant"
              >
                Left
              </button>
              <button
                type="button"
                className={`construct-toolbar-style-btn${shapeVariant === "right" ? " construct-toolbar-style-btn--active" : ""}`}
                onClick={() => onShapeVariantChange("right")}
                disabled={!supportsShapeVariantToggle}
                title="Right variant"
              >
                Right
              </button>
            </div>

            {/* Invert toggle */}
            <button
              type="button"
              className={`construct-toolbar-style-btn construct-toolbar-invert-btn${inverted ? " construct-toolbar-style-btn--active" : ""}`}
              onClick={() => onInvertedChange(!inverted)}
              disabled={!supportsInverted}
              style={{ opacity: supportsInverted ? 1 : 0.35 }}
              title={
                supportsInverted
                  ? inverted
                    ? "Currently inverted — click to uninvert"
                    : "Click to invert"
                  : "This shape does not support inversion"
              }
            >
              Invert
            </button>

            {/* Double / Single style toggle */}
            <div
              className="construct-toolbar-style-toggle"
              style={{ opacity: canBeSingle ? 1 : 0.35 }}
              title={
                canBeSingle
                  ? undefined
                  : "This shape only supports double style"
              }
            >
              <button
                type="button"
                className={`construct-toolbar-style-btn${formStyle === "double" ? " construct-toolbar-style-btn--active" : ""}`}
                onClick={() => onFormStyleChange("double")}
                disabled={!canBeSingle && formStyle !== "double"}
                title="Double form style"
              >
                Double
              </button>
              <button
                type="button"
                className={`construct-toolbar-style-btn${formStyle === "single" ? " construct-toolbar-style-btn--active" : ""}`}
                onClick={() => onFormStyleChange("single")}
                disabled={!canBeSingle}
                title="Single form style"
              >
                Single
              </button>
            </div>
          </div>

          {/* Word tools toolbar */}
          <div className="construct-toolbar construct-toolbar--word">
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
              className="construct-toolbar-btn"
              onClick={() => wordListFileInputRef.current?.click()}
              title={
                loadedWordListName
                  ? `${loadedWordListName} (${loadedWordListEntryCount.toLocaleString()} entries) — click to load a different one`
                  : "Load a word list file"
              }
            >
              <span aria-hidden="true">📖</span>
              <span className="construct-toolbar-btn-label">Word List</span>
            </button>

            {loadedWordListName ? (
              <>
                <span className="construct-toolbar-wordlist-name">
                  {loadedWordListName}
                  <span className="construct-toolbar-wordlist-count">
                    {" "}
                    ({loadedWordListEntryCount.toLocaleString()})
                  </span>
                </span>

                <div
                  className="construct-toolbar-separator"
                  aria-hidden="true"
                />

                <button
                  type="button"
                  className="construct-toolbar-btn"
                  onClick={onFindWords}
                  title="Find words matching the current entry pattern"
                >
                  <span aria-hidden="true">🔍</span>
                  <span className="construct-toolbar-btn-label">Find</span>
                </button>

                {isAutofillRunning ? (
                  <button
                    type="button"
                    className="construct-toolbar-btn construct-toolbar-btn--danger"
                    onClick={onStopAutofill}
                    title="Stop autofill"
                  >
                    <span aria-hidden="true">⏹</span>
                    <span className="construct-toolbar-btn-label">Stop</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    className="construct-toolbar-btn construct-toolbar-btn--primary"
                    onClick={onAutofill}
                    title="Automatically fill the grid using the word list"
                  >
                    <span aria-hidden="true">⚡</span>
                    <span className="construct-toolbar-btn-label">
                      Autofill
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  className="construct-toolbar-options-toggle"
                  onClick={() => setShowAutofillOptions((prev) => !prev)}
                  title="Autofill options"
                  aria-expanded={showAutofillOptions}
                >
                  {showAutofillOptions ? "▲" : "▼"}
                </button>
              </>
            ) : (
              <span className="construct-toolbar-wordlist-name construct-toolbar-wordlist-name--empty">
                No word list loaded
              </span>
            )}
          </div>

          {/* Autofill options panel */}
          {showAutofillOptions && loadedWordListName ? (
            <div className="construct-autofill-options">
              <label className="construct-autofill-option">
                <input
                  type="checkbox"
                  checked={lockCompletedWords}
                  onChange={(e) => onLockCompletedWordsChange(e.target.checked)}
                />
                <span>Lock completed words during autofill</span>
              </label>
              <label className="construct-autofill-option">
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
    </>
  );
}
