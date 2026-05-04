import { isTopologyReflectableAcrossLeadingDiagonal } from "../domain/squareTopology";
import { parseSerializedLayout } from "../domain/shapeLayout";
import { supportsInversion, supportsLeftRightVariant } from "../domain/shapeTransforms";
import { areCompositeSchemasCompatible, describeCompositeCompatibilitySchema, getComposedShapeCompatibilitySchema, type CompositeCompatibilitySchema } from "../domain/shapeCompatibility";
import type { ShapeDefinition } from "../domain/shapeDefinition";
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

type ShapeLibraryDialogMode = "startPrimitive" | "insertPrimitive" | "startComposite";

type ShapeLibraryDialogProps = {
  shapes: ShapeDefinition[];
  mode?: ShapeLibraryDialogMode;
  primitiveSize?: number;
  compositeCompatibilitySchema?: CompositeCompatibilitySchema | null;
  onLoadShape: (shape: ShapeDefinition, shapeVariant?: ShapeVariant, inverted?: boolean) => void;
  onClose: () => void;
};

export function ShapeLibraryDialog({
  shapes,
  mode = "startPrimitive",
  primitiveSize = 4,
  compositeCompatibilitySchema = null,
  onLoadShape,
  onClose,
}: ShapeLibraryDialogProps) {
  const isInsertPrimitive = mode === "insertPrimitive";

  function variantChoices(shape: ShapeDefinition): Array<{ label: string; variant: ShapeVariant; inverted: boolean; disabled: boolean; reason?: string }> {
    if (!isInsertPrimitive || shape.kind !== "composed") {
      return [{ label: "Use", variant: "left", inverted: false, disabled: false }];
    }

    const supportsRight = supportsLeftRightVariant(
      shape.layout,
      shape.renderHints?.gridPresentation ?? "square",
    );
    const supportsInvert = supportsInversion(
      shape.layout,
      shape.renderHints?.gridPresentation ?? "square",
    );
    const baseChoices: Array<{ label: string; variant: ShapeVariant; inverted: boolean }> = [
      { label: "Left", variant: "left", inverted: false },
    ];

    if (supportsRight) baseChoices.push({ label: "Right", variant: "right", inverted: false });
    if (supportsInvert) baseChoices.push({ label: "Left inv.", variant: "left", inverted: true });
    if (supportsRight && supportsInvert) baseChoices.push({ label: "Right inv.", variant: "right", inverted: true });

    return baseChoices.map((choice) => {
      if (!compositeCompatibilitySchema) {
        return { ...choice, disabled: false };
      }

      try {
        const candidateSchema = getComposedShapeCompatibilitySchema(
          shape,
          primitiveSize,
          choice.variant,
          choice.inverted,
        );
        const disabled = !areCompositeSchemasCompatible(
          compositeCompatibilitySchema,
          candidateSchema,
        );
        return {
          ...choice,
          disabled,
          reason: disabled
            ? `Needs ${describeCompositeCompatibilitySchema(compositeCompatibilitySchema)}; this variant is ${describeCompositeCompatibilitySchema(candidateSchema)}.`
            : undefined,
        };
      } catch (error) {
        return {
          ...choice,
          disabled: true,
          reason: error instanceof Error ? error.message : "Could not validate shape compatibility.",
        };
      }
    });
  }

  const filteredShapes = [...shapes]
    .filter((shape) => {
      if (mode === "startComposite") return shape.kind === "composite";
      return shape.kind === "composed";
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const title =
    mode === "startComposite"
      ? "Start from composite shape"
      : mode === "insertPrimitive"
        ? "Insert primitive shape"
        : "Start from Shape";

  return (
    <div className="dialog-backdrop">
      <div className="save-puzzle-dialog">
        <h3>{title}</h3>

        <div
          className="save-puzzle-fields"
          style={{ maxHeight: "350px", overflowY: "auto" }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isInsertPrimitive ? "2fr 1fr 1fr 1.8fr" : "2fr 1fr 1fr 1fr",
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
            <div>{isInsertPrimitive ? "Variant" : "Overlap"}</div>
          </div>

          {filteredShapes.map((shape) => {
            const choices = variantChoices(shape);
            const allChoicesDisabled = isInsertPrimitive && choices.every((choice) => choice.disabled);
            return (
            <div
              key={shape.id}
              style={{
                display: "grid",
                gridTemplateColumns: isInsertPrimitive ? "2fr 1fr 1fr 1.8fr" : "2fr 1fr 1fr 1fr",
                padding: "4px 0",
                borderBottom: "1px solid #eee",
                fontSize: "0.85rem",
                cursor: isInsertPrimitive ? "default" : "pointer",
                opacity: allChoicesDisabled ? 0.45 : 1,
              }}
              onClick={() => {
                if (!isInsertPrimitive) onLoadShape(shape);
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
                {shape.kind === "composed"
                  ? String(shape.layout.width) + " × " + String(shape.layout.height)
                  : shape.kind === "cellMask"
                    ? String(shape.width) + " × " + String(shape.height)
                    : shape.kind === "composite"
                      ? String(shape.componentGrid.width) + " × " + String(shape.componentGrid.height)
                      : "—"}
              </div>
              <div>
                {isInsertPrimitive ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                    {choices.map((choice) => (
                      <button
                        key={shape.id + "-" + choice.variant + "-" + String(choice.inverted)}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (!choice.disabled) {
                            onLoadShape(shape, choice.variant, choice.inverted);
                          }
                        }}
                        disabled={choice.disabled}
                        title={choice.reason}
                        style={{ fontSize: "0.75rem" }}
                      >
                        {choice.label}
                      </button>
                    ))}
                  </div>
                ) : shape.kind === "composed" ? (
                  String(shape.layout.overlapRows) + " / " + String(shape.layout.overlapCols)
                ) : shape.kind === "composite" ? (
                  String(shape.overlapRows) + " / " + String(shape.overlapCols)
                ) : (
                  "—"
                )}
              </div>
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