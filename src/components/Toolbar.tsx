import { useRef } from "react";

type ToolbarProps = {
  isConstruct: boolean;
  shapeDisplayName?: string;
  libraryShapeOptions: Array<{ id: string; name: string }>;
  selectedLibraryShapeId: string | null;
  onLibraryShapeChange: (shapeId: string) => void;
  onNewPuzzle: (size: number) => void;
  currentSize: number;
  onSave: () => void;
  onLoad: (file: File) => void;
  onBrowseLibrary: () => void;
};

export function Toolbar({
  isConstruct,
  shapeDisplayName,
  libraryShapeOptions,
  selectedLibraryShapeId,
  onLibraryShapeChange,
  onNewPuzzle,
  currentSize,
  onSave,
  onLoad,
  onBrowseLibrary,
}: ToolbarProps) {
  const puzzleFileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="construct-sidebar">
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

      {/* File actions */}
      <section className="construct-sidebar-section">
        <h4 className="construct-sidebar-heading">Files</h4>
        <div className="construct-sidebar-btns">
          {isConstruct ? (
            <button
              type="button"
              className="construct-sidebar-btn"
              onClick={() => onNewPuzzle(currentSize)}
              title="Start a new puzzle"
            >
              New
            </button>
          ) : null}
          <button
            type="button"
            className="construct-sidebar-btn"
            onClick={() => puzzleFileInputRef.current?.click()}
            title="Load a puzzle from a file"
          >
            Load
          </button>
          <button
            type="button"
            className="construct-sidebar-btn"
            onClick={onBrowseLibrary}
            title="Browse the built-in puzzle library"
          >
            Library
          </button>
          {isConstruct ? (
            <button
              type="button"
              className="construct-sidebar-btn"
              onClick={onSave}
              title="Save this puzzle to a file"
            >
              Save
            </button>
          ) : null}
        </div>
      </section>

      {/* Shape setup */}
      {isConstruct ? (
        <section className="construct-sidebar-section">
          <h4 className="construct-sidebar-heading">Shape</h4>
          <label className="construct-sidebar-label">
            <span>Type</span>
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
        </section>
      ) : null}
    </div>
  );
}
