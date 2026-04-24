import { useRef } from "react";

type DesignerNotesPanelProps = {
  layoutRowsText: string;
  onConstruct: () => void;
  onSaveShape: () => void;
  onClearGrid: () => void;
  onLoadShape: (file: File) => void | Promise<void>;
};

export function DesignerNotesPanel({
  layoutRowsText,
  onConstruct,
  onSaveShape,
  onClearGrid,
  onLoadShape,
}: DesignerNotesPanelProps) {
  const loadShapeFileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <section
      className="clue-panel"
      style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: "16px" }}
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
          onClick={onConstruct}
          title="Switch to Construct mode using this shape"
        >
          ✏ Construct
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
          className="designer-action-btn"
          onClick={() => loadShapeFileInputRef.current?.click()}
          title="Load a shape from a file"
        >
          📂 Load Shape
        </button>
        <button
          type="button"
          className="designer-action-btn designer-action-btn--danger"
          onClick={onClearGrid}
          title="Clear the design grid"
        >
          ⌫ Clear Grid
        </button>
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
