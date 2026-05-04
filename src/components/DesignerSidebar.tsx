import type { ShapeDesignerDesignType } from "../domain/shapeDesignerState";

type DesignerSidebarProps = {
  designType: ShapeDesignerDesignType;
  shapeName: string;
  primitiveSize: number;
  minimumPrimitiveSize: number;
  gridPresentation: "square" | "hex";
  width: number;
  height: number;
  overlapRows: number;
  overlapCols: number;
  onDesignTypeChange: (value: ShapeDesignerDesignType) => void;
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
        <button type="button" className="designer-spinner-btn" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Decrease ${label}`}>
          −
        </button>
        <span className="designer-spinner-value">{value}</span>
        <button type="button" className="designer-spinner-btn" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`Increase ${label}`}>
          +
        </button>
      </div>
    </div>
  );
}

export function DesignerSidebar({
  designType,
  shapeName,
  primitiveSize,
  minimumPrimitiveSize,
  gridPresentation,
  width,
  height,
  overlapRows,
  overlapCols,
  onDesignTypeChange,
  onShapeNameChange,
  onPrimitiveSizeChange,
  onGridPresentationChange,
  onWidthChange,
  onHeightChange,
  onOverlapRowsChange,
  onOverlapColsChange,
}: DesignerSidebarProps) {
  const isComposite = designType === "composite";

  return (
    <div className="construct-sidebar">
      <section className="construct-sidebar-section">
        <h4 className="construct-sidebar-heading">Shape</h4>

        <div className="construct-sidebar-label">
          <span>Design type</span>
          <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginTop: 4 }}>
            <input type="radio" checked={!isComposite} onChange={() => onDesignTypeChange("primitive")} />
            Primitive
          </label>
          <label style={{ display: "flex", gap: "0.4rem", alignItems: "center", marginTop: 4 }}>
            <input type="radio" checked={isComposite} onChange={() => onDesignTypeChange("composite")} />
            Composite
          </label>
        </div>

        <label className="construct-sidebar-label">
          <span>Name</span>
          <input type="text" value={shapeName} onChange={(e) => onShapeNameChange(e.target.value)} placeholder="Untitled shape" style={{ width: "100%", padding: "5px 6px", fontSize: "13px", border: "1px solid #cbd5e1", borderRadius: "4px" }} />
        </label>

        <Spinner label="Primitive size" value={primitiveSize} min={minimumPrimitiveSize} max={15} onChange={onPrimitiveSizeChange} />
        <Spinner label={isComposite ? "Component grid width" : "Width"} value={width} min={1} max={12} onChange={onWidthChange} />
        <Spinner label={isComposite ? "Component grid height" : "Height"} value={height} min={1} max={12} onChange={onHeightChange} />
        <Spinner label="Row overlap" value={overlapRows} min={0} max={15} onChange={onOverlapRowsChange} />
        <Spinner label="Col overlap" value={overlapCols} min={0} max={15} onChange={onOverlapColsChange} />

        {!isComposite ? (
          <label className="construct-sidebar-label" style={{ marginTop: "4px" }}>
            <span>Grid display</span>
            <select value={gridPresentation} onChange={(e) => onGridPresentationChange(e.target.value as "square" | "hex")} style={{ padding: "5px 6px", fontSize: "13px", border: "1px solid #cbd5e1", borderRadius: "4px" }}>
              <option value="square">Rectilinear</option>
              <option value="hex">Hex</option>
            </select>
          </label>
        ) : (
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#64748b" }}>
            Grid display is inherited from placed components.
          </p>
        )}
      </section>
    </div>
  );
}
