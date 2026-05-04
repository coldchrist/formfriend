import { CluePanel } from "./CluePanel";
import { SolveToolbar } from "./SolveToolbar";
import { PuzzleGrid, type PuzzleGridHandle } from "./PuzzleGrid";
import type { AppMode, CellLetterMode, EntryRef, SelectionState } from "../domain/types";

type SolveLayoutProps = {
  gridRef: React.RefObject<PuzzleGridHandle | null>;
  isSolveCheckable: boolean;
  isSolutionCorrect: boolean;
  hasSolution: boolean;
  formTypeTitle: string;
  currentFormStyle: "single" | "double";

  // Metadata
  title: string;
  author: string;
  publication: string;
  enigmaIssue: string;
  formNumber: string;

  // Grid
  projectedFillsByCellId: Record<string, string>;
  cellLetterMode: CellLetterMode;
  selection: SelectionState;
  activeGridCellIds: string[];
  clueNumberByCellId: Record<string, string>;
  acrossLabelByCellId?: Record<string, string>;
  downLabelByCellId?: Record<string, string>;
  gridPresentation: "square" | "hex";
  incorrectCellIds: Set<string>;
  topology: Parameters<typeof PuzzleGrid>[0]["topology"];

  // Clues
  singleClueEntries: EntryRef[];
  displayedAcrossEntries: EntryRef[];
  displayedDownEntries: EntryRef[];
  displayedExtraEntries: EntryRef[];
  cluesByEntryId: Record<string, string>;
  answerTextByEntryId?: Record<string, string>;
  activeClueEntryId?: string;
  activeEntry?: EntryRef;

  // File state
  loadedPuzzleFileName: string | null;

  // Handlers
  onCellClick: (cellId: string) => void;
  onKeyDown: (event: React.KeyboardEvent<SVGSVGElement>) => void;
  onCheck: () => void;
  onClearGrid: () => void;
  onLoad: (file: File) => void;
  onBrowseLibrary: () => void;
  onModeChange: (mode: AppMode) => void;
  onEntryClick: (entryId: string) => void;
  onEntryKeyDown: (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    entryId: string,
  ) => void;
  onConstructFromForm: () => void;
};

function buildMetadataLine(
  author: string,
  publication: string,
  enigmaIssue: string,
  formNumber: string,
): string | null {
  const parts: string[] = [];

  if (author.trim()) {
    parts.push(`by ${author.trim()}`);
  }

  const issueParts: string[] = [];
  if (publication.trim()) {
    issueParts.push(publication.trim());
  }
  if (enigmaIssue.trim()) {
    issueParts.push(enigmaIssue.trim());
  }
  if (formNumber.trim()) {
    issueParts.push(`Form ${formNumber.trim()}`);
  }
  if (issueParts.length > 0) {
    parts.push(issueParts.join(", "));
  }

  return parts.length > 0 ? parts.join(" · ") : null;
}
export function SolveLayout({
  gridRef,
  isSolveCheckable,
  isSolutionCorrect,
  hasSolution,
  formTypeTitle,
  currentFormStyle,
  title,
  author,
  publication,
  enigmaIssue,
  formNumber,
  projectedFillsByCellId,
  cellLetterMode,
  selection,
  activeGridCellIds,
  clueNumberByCellId,
  acrossLabelByCellId,
  downLabelByCellId,
  gridPresentation,
  incorrectCellIds,
  topology,
  singleClueEntries,
  displayedAcrossEntries,
  displayedDownEntries,
  displayedExtraEntries,
  cluesByEntryId,
  answerTextByEntryId,
  activeClueEntryId,
  activeEntry,
  loadedPuzzleFileName,
  onCellClick,
  onKeyDown,
  onCheck,
  onClearGrid,
  onLoad,
  onBrowseLibrary,
  onModeChange,
  onConstructFromForm,
  onEntryClick,
  onEntryKeyDown,
}: SolveLayoutProps) {

  const metadataLine = buildMetadataLine(
    author,
    publication,
    enigmaIssue,
    formNumber,
  );

  return (
    <div className="solve-layout">
      {/* Left: grid + toolbar */}
      <div className="solve-left">
        {metadataLine ? (
          <div className="solve-metadata-banner">{metadataLine}</div>
        ) : null}

        <div className="solve-form-type">{formTypeTitle}</div>

        {isSolutionCorrect ? (
          <div className="solve-success-banner">🎉 Solved!</div>
        ) : null}

        <div className="solve-grid-wrapper">
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
            cellSize={cellLetterMode === "bigram" ? 44 : undefined}
            cellLetterMode={cellLetterMode}
            onCellClick={onCellClick}
            onKeyDown={onKeyDown}
          />
        </div>

        <SolveToolbar
          isSolveCheckable={isSolveCheckable}
          hasSolution={hasSolution}
          isSolutionCorrect={isSolutionCorrect}
          loadedPuzzleFileName={loadedPuzzleFileName}
          onCheck={onCheck}
          onClearGrid={onClearGrid}
          onLoad={onLoad}
          onBrowseLibrary={onBrowseLibrary}
          onModeChange={onModeChange}
          onConstructFromForm={onConstructFromForm}
        />
      </div>

      {/* Right: clues */}
      <div className="solve-right">
        {currentFormStyle === "single" ? (
          <CluePanel
            title="Clues"
            entries={singleClueEntries}
            cluesByEntryId={cluesByEntryId}
            answerTextByEntryId={answerTextByEntryId}
            activeEntryId={activeClueEntryId}
            readOnly
            fillAvailableHeight
            onEntryClick={onEntryClick}
            onEntryKeyDown={onEntryKeyDown}
            onClueChange={() => {}}
          />
        ) : (
          <>
            <CluePanel
              title="Across"
              entries={displayedAcrossEntries}
              cluesByEntryId={cluesByEntryId}
              answerTextByEntryId={answerTextByEntryId}
              activeEntryId={
                activeEntry?.direction === "across" ? activeEntry.id : undefined
              }
              readOnly
              fillAvailableHeight
              onEntryClick={onEntryClick}
              onEntryKeyDown={onEntryKeyDown}
              onClueChange={() => {}}
            />
            <CluePanel
              title="Down"
              entries={displayedDownEntries}
              cluesByEntryId={cluesByEntryId}
              answerTextByEntryId={answerTextByEntryId}
              activeEntryId={
                activeEntry?.direction === "down" ? activeEntry.id : undefined
              }
              readOnly
              fillAvailableHeight
              onEntryClick={onEntryClick}
              onEntryKeyDown={onEntryKeyDown}
              onClueChange={() => {}}
            />
            {displayedExtraEntries.length > 0 ? (
              <CluePanel
                title="Extra"
                entries={displayedExtraEntries}
                cluesByEntryId={cluesByEntryId}
                answerTextByEntryId={answerTextByEntryId}
                activeEntryId={
                  activeEntry?.direction === "extra" ? activeEntry.id : undefined
                }
                readOnly
                fillAvailableHeight
                onEntryClick={onEntryClick}
                onEntryKeyDown={onEntryKeyDown}
                onClueChange={() => {}}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
