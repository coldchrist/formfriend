import { ShapePalette } from "../components/ShapePalette";
import { ShapeDesignerSurface } from "../components/ShapeDesignerSurface";
import { PuzzleGrid } from "../components/PuzzleGrid";
import { buildTopologyFromComposedShapeDefinition } from "../domain/shapeTopology";
import { placePrimitiveAtSelection } from "../domain/shapeDesignerState";
import type { ShapePrimitive } from "../domain/shapeDefinition";
import type { ShapeDesignerState } from "../domain/shapeDesignerState";
import { isHexPreviewValid } from "../domain/hexPreviewValidation";

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
  const hexPreviewTopology =
    designerGridPresentation === "hex"
      ? buildTopologyFromComposedShapeDefinition(
          {
            kind: "composed",
            id: "preview",
            name: "Preview",
            layout: shapeDesignerState.layout,
            renderHints: { gridPresentation: "hex" },
          },
          safeDesignerPrimitiveSize,
        )
      : null;

  const isValidHexPreview = hexPreviewTopology
    ? isHexPreviewValid(hexPreviewTopology)
    : true;
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

        {hexPreviewTopology ? (
          <section className="clue-panel" style={{ minWidth: "220px" }}>
            <h3>Hex Preview</h3>
            {!isValidHexPreview ? (
              <div
                style={{
                  marginBottom: "0.5rem",
                  fontSize: "0.85rem",
                  color: "#92400e",
                }}
              >
                Hex preview invalid: one or more down entries would not remain
                linear.
              </div>
            ) : null}
            <div
              className="grid-wrapper"
              style={{
                opacity: isValidHexPreview ? 1 : 0.35,
                filter: isValidHexPreview ? undefined : "grayscale(1)",
              }}
            >
              <PuzzleGrid
                topology={hexPreviewTopology}
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
