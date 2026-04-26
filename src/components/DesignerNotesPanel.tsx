import { useRef } from "react";
import type { EntryPath } from "../domain/entryPath";

type DesignerNotesPanelProps = {
  layoutRowsText: string;
  onConstruct: () => void;
  onStartFromShape: () => void;
  onSaveShape: () => void;
  onClearGrid: () => void;
  onLoadShape: (file: File) => void | Promise<void>;
  extraEntries: EntryPath[];
  isDefiningExtraEntry: boolean;
  pendingExtraEntryCellIds: string[];
  onBeginExtraEntryDefinition: () => void;
  onFinishExtraEntryDefinition: () => void;
  onCancelExtraEntryDefinition: () => void;
  onSelectExtraEntry: (id: string) => void;
  selectedExtraEntryId: string | null;
  onRemoveExtraEntry: (id: string) => void;
  describeExtraEntry: (entry: EntryPath) => string;
};

export function DesignerNotesPanel({
  layoutRowsText,
  onConstruct,
  onStartFromShape,
  onSaveShape,
  onClearGrid,
  onLoadShape,
  extraEntries,
  isDefiningExtraEntry,
  pendingExtraEntryCellIds,
  onBeginExtraEntryDefinition,
  onFinishExtraEntryDefinition,
  onCancelExtraEntryDefinition,
  onSelectExtraEntry,
  selectedExtraEntryId,
  onRemoveExtraEntry,
  describeExtraEntry,
}: DesignerNotesPanelProps) {
  const loadShapeFileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section
      className="clue-panel"
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        gap: "16px",
      }}
    >
      <input
        ref={loadShapeFileInputRef}
        type="file"
        accept=".json,application/json"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          void onLoadShape(file);
          e.currentTarget.value = "";
        }}
      />

      {/* Action buttons */}
      <div className="designer-actions">
        <button
          type="button"
          className="designer-action-btn designer-action-btn--primary"
          onClick={onStartFromShape}
          title="Start the design grid from a standard library shape"
        >
          ⬚ Start from Shape
        </button>
        <button
          type="button"
          className="designer-action-btn"
          onClick={() => loadShapeFileInputRef.current?.click()}
          title="Load a shape from a file"
        >
          📂 Load Shape
        </button>
        <button
          type="button"
          className="designer-action-btn"
          onClick={onSaveShape}
          title="Save this shape to a file"
        >
          💾 Save Shape
        </button>
        <button
          type="button"
          className="designer-action-btn designer-action-btn--danger"
          onClick={onClearGrid}
          title="Clear the design grid"
        >
          ⌫ Clear Grid
        </button>
        <button
          type="button"
          className="designer-action-btn"
          onClick={onConstruct}
          title="Switch to Construct mode using this shape"
        >
          ✏ Construct from this Shape
        </button>
      </div>

      <div className="designer-layout-string">
        <div className="designer-layout-label">Extra words</div>
        {isDefiningExtraEntry ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: "0.85rem", color: "#475569" }}>
              Click cells in order. Selected cells:{" "}
              {pendingExtraEntryCellIds.length}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button
                type="button"
                className="designer-action-btn"
                onClick={onFinishExtraEntryDefinition}
                disabled={pendingExtraEntryCellIds.length < 2}
              >
                Finish Extra Word
              </button>
              <button
                type="button"
                className="designer-action-btn"
                onClick={onCancelExtraEntryDefinition}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="designer-action-btn"
            onClick={onBeginExtraEntryDefinition}
          >
            ＋ Define Extra Word
          </button>
        )}

        {extraEntries.length > 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginTop: 8,
            }}
          >
            {extraEntries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                  alignItems: "center",
                  fontSize: "0.8rem",
                }}
              >
                <button
                  type="button"
                  className="designer-action-btn"
                  onClick={() => onSelectExtraEntry(entry.id)}
                  title={describeExtraEntry(entry)}
                  style={{
                    flex: 1,
                    background:
                      selectedExtraEntryId === entry.id ? "#dcfce7" : "#f0fdf4",
                    borderColor: "#22c55e",
                    color: "#166534",
                  }}
                >
                  {entry.label ?? entry.id}
                </button>
                <button
                  type="button"
                  className="designer-action-btn designer-action-btn--danger"
                  onClick={() => onRemoveExtraEntry(entry.id)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Layout string */}
      {layoutRowsText ? (
        <div className="designer-layout-string">
          <div className="designer-layout-label">Layout</div>
          <code className="designer-layout-code">{layoutRowsText}</code>
        </div>
      ) : null}
    </section>
  );
}
