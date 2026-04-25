import { isTopologyReflectableAcrossLeadingDiagonal } from "../domain/squareTopology";
import { parseSerializedLayout } from "../domain/shapeLayout";
import { supportsLeftRightVariant } from "../domain/shapeTransforms";
import type { ComposedShapeDefinition } from "../domain/shapeDefinition";
import type { FormStyle, SavedPuzzle, ShapeVariant } from "../domain/types";

function getFormTypeTitle(
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

type SavePuzzleDialogProps = {
  includeSolution: boolean;
  filename: string;
  dateAdded: string;
  comment: string;
  enigmaIssue: string;
  formNumber: string;
  onIncludeSolutionChange: (value: boolean) => void;
  onFilenameChange: (value: string) => void;
  onDateAddedChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  onEnigmaIssueChange: (value: string) => void;
  onFormNumberChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function SavePuzzleDialog({
  includeSolution,
  filename,
  dateAdded,
  comment,
  enigmaIssue,
  formNumber,
  onIncludeSolutionChange,
  onFilenameChange,
  onDateAddedChange,
  onCommentChange,
  onEnigmaIssueChange,
  onFormNumberChange,
  onCancel,
  onConfirm,
}: SavePuzzleDialogProps) {
  return (
    <div className="dialog-backdrop">
      <div className="save-puzzle-dialog">
        <h3>Save Form</h3>

        <div className="save-puzzle-fields">
          <div>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={includeSolution}
                onChange={(e) => onIncludeSolutionChange(e.target.checked)}
              />
              <span style={{ fontWeight: 500 }}>Include solution</span>
            </label>
            <p
              style={{
                margin: "4px 0 0 24px",
                fontSize: "0.8rem",
                color: "#64748b",
              }}
            >
              Allows users to check their solution in Solve mode
            </p>
          </div>

          <label>
            Filename
            <input
              type="text"
              value={filename}
              onChange={(e) => onFilenameChange(e.target.value)}
              placeholder="formfriend-puzzle"
            />
          </label>

          <label>
            Date added
            <input
              type="text"
              value={dateAdded}
              onChange={(e) => onDateAddedChange(e.target.value)}
            />
          </label>

          <label>
            Comment
            <textarea
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              rows={3}
            />
          </label>

          <label>
            Enigma issue
            <input
              type="text"
              value={enigmaIssue}
              onChange={(e) => onEnigmaIssueChange(e.target.value)}
              placeholder="e.g. 1998-03"
            />
          </label>

          <label>
            Form number
            <input
              type="text"
              value={formNumber}
              onChange={(e) => onFormNumberChange(e.target.value)}
              placeholder="e.g. F-5"
            />
          </label>
        </div>

        <div className="save-puzzle-buttons">
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={onConfirm}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

type PuzzleLibraryDialogProps = {
  puzzles: SavedPuzzle[];
  onLoadPuzzle: (puzzle: SavedPuzzle) => void;
  onClose: () => void;
};

export function PuzzleLibraryDialog({
  puzzles,
  onLoadPuzzle,
  onClose,
}: PuzzleLibraryDialogProps) {
  return (
    <div className="dialog-backdrop">
      <div className="save-puzzle-dialog">
        <h3>Puzzle Library</h3>

        <div
          className="save-puzzle-fields"
          style={{ maxHeight: "350px", overflowY: "auto" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 2fr 0.6fr 1.2fr 1fr 1fr 0.8fr",
              fontWeight: 600,
              borderBottom: "1px solid #ccc",
              paddingBottom: "4px",
              marginBottom: "6px",
              fontSize: "0.85rem",
            }}
          >
            <div>Title</div>
            <div>Form</div>
            <div>Size</div>
            <div>Author</div>
            <div>Date</div>
            <div>Issue</div>
            <div>No.</div>
          </div>

          {[...puzzles]
            .sort((a, b) => b.dateAdded.localeCompare(a.dateAdded))
            .map((puzzle, index) => {
              const libraryShapeVariant: ShapeVariant =
                puzzle.spec.shapeVariant ?? "left";
              const libraryFormStyle: FormStyle =
                puzzle.spec.formStyle ?? "double";
              const libraryInverted = puzzle.spec.inverted ?? false;
              const libraryCanBeSingle =
                isTopologyReflectableAcrossLeadingDiagonal(puzzle.topology);

              let librarySupportsLeftRight = false;
              try {
                const parsedLayout =
                  puzzle.spec.composedLayout != null
                    ? parseSerializedLayout(puzzle.spec.composedLayout)
                    : null;

                if (parsedLayout) {
                  parsedLayout.overlapRows = puzzle.spec.overlapRows ?? 1;
                  parsedLayout.overlapCols = puzzle.spec.overlapCols ?? 1;

                  librarySupportsLeftRight = supportsLeftRightVariant(
                    parsedLayout,
                    puzzle.gridPresentation ?? "square",
                  );
                }
              } catch {
                librarySupportsLeftRight = false;
              }

              const libraryFormTypeTitle = getFormTypeTitle(
                libraryShapeVariant,
                libraryFormStyle,
                libraryInverted,
                libraryCanBeSingle,
                librarySupportsLeftRight,
                puzzle.spec.shapeName,
              );

              return (
                <div
                  key={index}
                  onClick={() => onLoadPuzzle(puzzle)}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 2fr 0.6fr 1.2fr 1fr 1fr 0.8fr",
                    padding: "4px 0",
                    borderBottom: "1px solid #eee",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "#f1f5f9")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <div>{puzzle.content.metadata.title}</div>
                  <div>{libraryFormTypeTitle}</div>
                  <div>{puzzle.spec.size}</div>
                  <div>{puzzle.content.metadata.author}</div>
                  <div>{puzzle.dateAdded}</div>
                  <div>{puzzle.enigmaIssue ?? ""}</div>
                  <div>{puzzle.formNumber ?? ""}</div>
                </div>
              );
            })}
        </div>

        <div className="save-puzzle-buttons">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

type ShapeLibraryDialogProps = {
  shapes: ComposedShapeDefinition[];
  onLoadShape: (shape: ComposedShapeDefinition) => void;
  onClose: () => void;
};

export function ShapeLibraryDialog({
  shapes,
  onLoadShape,
  onClose,
}: ShapeLibraryDialogProps) {
  return (
    <div className="dialog-backdrop">
      <div className="save-puzzle-dialog">
        <h3>Start from Shape</h3>

        <div
          className="save-puzzle-fields"
          style={{ maxHeight: "350px", overflowY: "auto" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr 1fr 1fr",
              fontWeight: 600,
              borderBottom: "1px solid #ccc",
              paddingBottom: "4px",
              marginBottom: "6px",
              fontSize: "0.85rem",
            }}
          >
            <div>Name</div>
            <div>Grid</div>
            <div>Size</div>
            <div>Overlap</div>
          </div>

          {[...shapes]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((shape) => (
              <div
                key={shape.id}
                onClick={() => onLoadShape(shape)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1fr 1fr 1fr",
                  padding: "4px 0",
                  borderBottom: "1px solid #eee",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#f1f5f9")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div>{shape.name}</div>
                <div>
                  {shape.renderHints?.gridPresentation === "hex"
                    ? "Hex"
                    : "Square"}
                </div>
                <div>
                  {shape.layout.width} × {shape.layout.height}
                </div>
                <div>
                  {shape.layout.overlapRows} / {shape.layout.overlapCols}
                </div>
              </div>
            ))}
        </div>

        <div className="save-puzzle-buttons">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
