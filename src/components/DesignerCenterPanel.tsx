import { ShapePalette } from "../components/ShapePalette";
import { ShapeDesignerSurface } from "../components/ShapeDesignerSurface";
import { PuzzleGrid } from "../components/PuzzleGrid";
import { buildTopologyFromComposedShapeDefinition } from "../domain/shapeTopology";
import { placePrimitiveAtSelection } from "../domain/shapeDesignerState";
import type { ShapePrimitive } from "../domain/shapeDefinition";
import type { ShapeDesignerState } from "../domain/shapeDesignerState";

type DesignerCenterPanelProps = {
  matchingDesignerLibraryShapeName: string | null;
  shapeDesignerState: ShapeDesignerState;
  safeDesignerPrimitiveSize: number;
  designerGridPresentation: "square" | "hex";
  onSelectCell: (row: number, col: number) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  onPrimitivePlaced: (
    updater: (prev: ShapeDesignerState) => ShapeDesignerState,
  ) => void;
  onClearGrid: () => void;
};

export function DesignerCenterPanel({
  matchingDesignerLibraryShapeName,
  shapeDesignerState,
  safeDesignerPrimitiveSize,
  designerGridPresentation,
  onSelectCell,
  onKeyDown,
  onPrimitivePlaced,
  onClearGrid,
}: DesignerCenterPanelProps) {
  return (
    <>
      <h3 className="center-title">
        Shape Designer
        {matchingDesignerLibraryShapeName
          ? ` - ${matchingDesignerLibraryShapeName}`
          : ""}
      </h3>

      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: "1rem",
          flexWrap: "wrap",
          minWidth: 0,
        }}
      >
        <div style={{ minWidth: 0, flex: "1 1 0" }}>
          <ShapeDesignerSurface
            layout={shapeDesignerState.layout}
            size={safeDesignerPrimitiveSize}
            selection={shapeDesignerState.selection}
            selectedPrimitive={shapeDesignerState.selectedPrimitive}
            onSelectCell={onSelectCell}
            onKeyDown={onKeyDown}
          />

          <ShapePalette
            selectedPrimitive={shapeDesignerState.selectedPrimitive}
            onSelectPrimitive={(primitive: ShapePrimitive) =>
              onPrimitivePlaced((prev) =>
                placePrimitiveAtSelection(
                  {
                    ...prev,
                    selectedPrimitive: primitive,
                  },
                  primitive,
                ),
              )
            }
            onClearGrid={onClearGrid}
          />
        </div>

        {designerGridPresentation === "hex" ? (
          <section className="clue-panel" style={{ minWidth: "220px" }}>
            <h3>Hex Preview</h3>
            <div className="grid-wrapper">
              <PuzzleGrid
                topology={buildTopologyFromComposedShapeDefinition(
                  {
                    kind: "composed",
                    id: "preview",
                    name: "Preview",
                    layout: shapeDesignerState.layout,
                    renderHints: { gridPresentation: "hex" },
                  },
                  safeDesignerPrimitiveSize,
                )}
                fillsByCellId={{}}
                selection={{ cellId: null, direction: "across" }}
                activeCellIds={[]}
                clueNumberByCellId={{}}
                gridPresentation="hex"
                cellSize={18}
                onCellClick={() => {}}
                onKeyDown={() => {}}
              />
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}
