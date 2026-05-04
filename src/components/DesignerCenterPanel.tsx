import { ShapePalette } from "../components/ShapePalette";
import { ShapeDesignerSurface } from "../components/ShapeDesignerSurface";
import { PuzzleGrid } from "../components/PuzzleGrid";
import { buildTopologyFromComposedShapeDefinition } from "../domain/shapeTopology";
import { placePrimitiveAtSelection } from "../domain/shapeDesignerState";
import type { ShapePrimitive } from "../domain/shapeDefinition";
import type { ShapeDesignerState } from "../domain/shapeDesignerState";
import type { Topology } from "../domain/types";
import { isHexPreviewValid } from "../domain/hexPreviewValidation";

type DesignerCenterPanelProps = {
  matchingDesignerLibraryShapeName: string | null;
  shapeDesignerState: ShapeDesignerState;
  safeDesignerPrimitiveSize: number;
  designerGridPresentation: "square" | "hex";
  topology: Topology;
  previewError: string | null;
  isDefiningExtraEntry: boolean;
  pendingExtraEntryCellIds: string[];
  selectedExtraEntryCellIds: string[];
  componentNameById: Record<string, string>;
  onExtraEntryCellClick: (cellId: string) => void;
  onSelectCell: (row: number, col: number) => void;
  onSelectComponentCell: (row: number, col: number) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onPrimitivePlaced: (updater: (prev: ShapeDesignerState) => ShapeDesignerState) => void;
  onClearGrid: () => void;
};

export function DesignerCenterPanel({
  matchingDesignerLibraryShapeName,
  shapeDesignerState,
  safeDesignerPrimitiveSize,
  designerGridPresentation,
  topology,
  previewError,
  isDefiningExtraEntry,
  pendingExtraEntryCellIds,
  selectedExtraEntryCellIds,
  componentNameById,
  onExtraEntryCellClick,
  onSelectCell,
  onSelectComponentCell,
  onKeyDown,
  onPrimitivePlaced,
  onClearGrid,
}: DesignerCenterPanelProps) {
  const isComposite = shapeDesignerState.designType === "composite";
  const hexPreviewTopology =
    !isComposite && designerGridPresentation === "hex"
      ? buildTopologyFromComposedShapeDefinition(
          {
            kind: "composed",
            id: "preview",
            name: "Preview",
            layout: shapeDesignerState.layout,
            extraEntries: [],
            renderHints: { gridPresentation: "hex" },
          },
          safeDesignerPrimitiveSize,
        )
      : null;

  const isValidHexPreview = hexPreviewTopology ? isHexPreviewValid(hexPreviewTopology) : true;
  const pendingExtraEntryCellIdSet = new Set(pendingExtraEntryCellIds);
  const selectedExtraEntryCellIdSet = new Set(selectedExtraEntryCellIds);

  return (
    <>
      <h3 className="center-title">
        Shape Designer{matchingDesignerLibraryShapeName ? ` - ${matchingDesignerLibraryShapeName}` : ""}
      </h3>

      {!isComposite ? (
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", minWidth: 0 }}>
          <div style={{ minWidth: 0, flex: "1 1 0" }}>
            <ShapeDesignerSurface
              layout={shapeDesignerState.layout}
              size={safeDesignerPrimitiveSize}
              selection={shapeDesignerState.selection}
              selectedPrimitive={shapeDesignerState.selectedPrimitive}
              topology={topology}
              isDefiningExtraEntry={isDefiningExtraEntry}
              pendingExtraEntryCellIds={pendingExtraEntryCellIds}
              selectedExtraEntryCellIds={selectedExtraEntryCellIds}
              onExtraEntryCellClick={onExtraEntryCellClick}
              onSelectCell={onSelectCell}
              onKeyDown={onKeyDown}
            />

            <ShapePalette
              selectedPrimitive={shapeDesignerState.selectedPrimitive}
              onSelectPrimitive={(primitive: ShapePrimitive) =>
                onPrimitivePlaced((prev) =>
                  placePrimitiveAtSelection({ ...prev, selectedPrimitive: primitive }, primitive),
                )
              }
              onClearGrid={onClearGrid}
            />
          </div>

          {hexPreviewTopology ? (
            <section className="clue-panel" style={{ minWidth: "220px" }}>
              <h3>Hex Preview</h3>
              {!isValidHexPreview ? (
                <div style={{ marginBottom: "0.5rem", fontSize: "0.85rem", color: "#92400e" }}>
                  Hex preview invalid: one or more down entries would not remain linear.
                </div>
              ) : null}
              <div className="grid-wrapper" style={{ opacity: isValidHexPreview ? 1 : 0.35, filter: isValidHexPreview ? undefined : "grayscale(1)" }}>
                <PuzzleGrid topology={hexPreviewTopology} fillsByCellId={{}} selection={{ cellId: null, direction: "across" }} activeCellIds={[]} clueNumberByCellId={{}} gridPresentation="hex" cellSize={18} onCellClick={() => {}} onKeyDown={() => {}} />
              </div>
            </section>
          ) : null}
        </div>
      ) : (
        <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap", minWidth: 0 }}>
          <section className="clue-panel" style={{ minWidth: "260px" }} tabIndex={0} onKeyDown={onKeyDown}>
            <h3>Component Grid</h3>
            <p style={{ fontSize: "0.85rem", color: "#64748b", marginTop: 0 }}>
              Select a slot, then use Insert primitive shape to place a component. Backspace/Delete clears the selected slot.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${shapeDesignerState.componentGrid.width}, minmax(110px, 1fr))`, gap: "0.5rem" }}>
              {Array.from({ length: shapeDesignerState.componentGrid.height }).flatMap((_, row) =>
                Array.from({ length: shapeDesignerState.componentGrid.width }).map((__, col) => {
                  const cell = shapeDesignerState.componentGrid.cells.find((item) => item.row === row && item.col === col);
                  const isSelected = shapeDesignerState.componentSelection.row === row && shapeDesignerState.componentSelection.col === col;
                  return (
                    <button
                      key={`${row},${col}`}
                      type="button"
                      onClick={() => onSelectComponentCell(row, col)}
                      style={{
                        minHeight: 76,
                        padding: "0.5rem",
                        textAlign: "left",
                        border: isSelected ? "2px solid #2563eb" : "1px dashed #94a3b8",
                        borderRadius: "0.5rem",
                        background: isSelected ? "#eff6ff" : "#fff",
                        cursor: "pointer",
                      }}
                    >
                      <strong>R{row + 1} C{col + 1}</strong>
                      <div style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                        {cell ? componentNameById[cell.shapeId] ?? cell.shapeId : "Empty"}
                      </div>
                      {cell ? (
                        <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                          {cell.shapeVariant ?? "left"}{cell.inverted ? ", inverted" : ""}
                        </div>
                      ) : null}
                    </button>
                  );
                }),
              )}
            </div>
          </section>

          <section className="clue-panel" style={{ minWidth: "260px" }}>
            <h3>Expanded Preview</h3>
            {topology.cells.length ? (
              <div className="grid-wrapper">
                <PuzzleGrid
                  topology={topology}
                  fillsByCellId={{}}
                  selection={{ cellId: null, direction: "across" }}
                  activeCellIds={[]}
                  clueNumberByCellId={{}}
                  gridPresentation={designerGridPresentation}
                  cellSize={18}
                  activeCellIds={[...pendingExtraEntryCellIdSet, ...selectedExtraEntryCellIdSet]}
                  onCellClick={(cellId) => {
                    if (isDefiningExtraEntry) onExtraEntryCellClick(cellId);
                  }}
                  onKeyDown={() => {}}
                />
              </div>
            ) : (
              <p style={{ fontSize: "0.85rem", color: previewError ? "#b91c1c" : "#64748b" }}>{previewError ?? "Place at least one component to preview the composite."}</p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
