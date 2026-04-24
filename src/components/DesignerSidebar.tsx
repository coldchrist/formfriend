type DesignerSidebarProps = {
  shapeName: string;
  primitiveSize: number;
  minimumPrimitiveSize: number;
  gridPresentation: "square" | "hex";
  width: number;
  height: number;
  overlapRows: number;
  overlapCols: number;
  onShapeNameChange: (value: string) => void;
  onPrimitiveSizeChange: (value: number) => void;
  onGridPresentationChange: (value: "square" | "hex") => void;
  onWidthChange: (value: number) => void;
  onHeightChange: (value: number) => void;
  onOverlapRowsChange: (value: number) => void;
  onOverlapColsChange: (value: number) => void;
};

type SpinnerProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
};

function Spinner({ label, value, min, max, onChange }: SpinnerProps) {
  return (
    <div className="designer-spinner">
      <span className="designer-spinner-label">{label}</span>
      <div className="designer-spinner-control">
        <button
          type="button"
          className="designer-spinner-btn"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="designer-spinner-value">{value}</span>
        <button
          type="button"
          className="designer-spinner-btn"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

export function DesignerSidebar({
  shapeName,
  primitiveSize,
  minimumPrimitiveSize,
  gridPresentation,
  width,
  height,
  overlapRows,
  overlapCols,
  onShapeNameChange,
  onPrimitiveSizeChange,
  onGridPresentationChange,
  onWidthChange,
  onHeightChange,
  onOverlapRowsChange,
  onOverlapColsChange,
}: DesignerSidebarProps) {
  return (
    <div className="construct-sidebar">
      <section className="construct-sidebar-section">
        <h4 className="construct-sidebar-heading">Shape</h4>

        <label className="construct-sidebar-label">
          <span>Name</span>
          <input
            type="text"
            value={shapeName}
            onChange={(e) => onShapeNameChange(e.target.value)}
            placeholder="Untitled shape"
            style={{ width: "100%", padding: "5px 6px", fontSize: "13px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
          />
        </label>

        <Spinner
          label="Primitive size"
          value={primitiveSize}
          min={minimumPrimitiveSize}
          max={15}
          onChange={onPrimitiveSizeChange}
        />

        <Spinner
          label="Width"
          value={width}
          min={1}
          max={12}
          onChange={onWidthChange}
        />

        <Spinner
          label="Height"
          value={height}
          min={1}
          max={12}
          onChange={onHeightChange}
        />

        <Spinner
          label="Row overlap"
          value={overlapRows}
          min={0}
          max={5}
          onChange={onOverlapRowsChange}
        />

        <Spinner
          label="Col overlap"
          value={overlapCols}
          min={0}
          max={5}
          onChange={onOverlapColsChange}
        />

        <label className="construct-sidebar-label" style={{ marginTop: "4px" }}>
          <span>Grid display</span>
          <select
            value={gridPresentation}
            onChange={(e) =>
              onGridPresentationChange(e.target.value as "square" | "hex")
            }
            style={{ padding: "5px 6px", fontSize: "13px", border: "1px solid #cbd5e1", borderRadius: "4px" }}
          >
            <option value="square">Rectilinear</option>
            <option value="hex">Hex</option>
          </select>
        </label>
      </section>
    </div>
  );
}
