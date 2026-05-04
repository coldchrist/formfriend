import { DesignerSidebar } from "../components/DesignerSidebar";
import { Toolbar } from "../components/Toolbar";
import type { AppMode, ShapeVariant } from "../domain/types";
import type { ShapeDefinition } from "../domain/shapeDefinition";
import type { ShapeDesignerDesignType } from "../domain/shapeDesignerState";

type LeftSidebarProps = {
  isDesigner: boolean;
  shapeDisplayName?: string;
  sessionShapeLibrary: ShapeDefinition[];
  selectedLibraryShapeId: string | null;
  isConstruct: boolean;
  currentSize: number;
  designerState: {
    designType: ShapeDesignerDesignType;
    name: string;
    size: number;
    layout: {
      width: number;
      height: number;
      overlapRows: number;
      overlapCols: number;
    };
  };
  safeDesignerPrimitiveSize: number;
  minimumDesignerPrimitiveSize: number;
  designerGridPresentation: "square" | "hex";
  onInstantiateLibraryShape: (definition: ShapeDefinition) => void;
  onNewPuzzle: (size: number) => void;
  onSave: () => void;
  onLoad: (file: File) => void | Promise<void>;
  onBrowseLibrary: () => void;
  onDesignerStateChange: (
    updater: (
      prev: LeftSidebarProps["designerState"],
    ) => LeftSidebarProps["designerState"],
  ) => void;
  onDesignerGridPresentationChange: (value: "square" | "hex") => void;
  storeMode: AppMode;
};

export function LeftSidebar({
  isDesigner,
  shapeDisplayName,
  sessionShapeLibrary,
  selectedLibraryShapeId,
  isConstruct,
  currentSize,
  designerState,
  safeDesignerPrimitiveSize,
  minimumDesignerPrimitiveSize,
  designerGridPresentation,
  onInstantiateLibraryShape,
  onNewPuzzle,
  onSave,
  onLoad,
  onBrowseLibrary,
  onDesignerStateChange,
  onDesignerGridPresentationChange,
}: LeftSidebarProps) {
  return (
    <aside className="left-panel">
      {!isDesigner ? (
        <Toolbar
          isConstruct={isConstruct}
          currentSize={currentSize}
          shapeDisplayName={shapeDisplayName}
          libraryShapeOptions={sessionShapeLibrary.map((shape) => ({ id: shape.id, name: shape.name }))}
          selectedLibraryShapeId={selectedLibraryShapeId}
          onLibraryShapeChange={(shapeId) => {
            const definition = sessionShapeLibrary.find((item) => item.id === shapeId);
            if (definition) onInstantiateLibraryShape(definition);
          }}
          onNewPuzzle={onNewPuzzle}
          onSave={onSave}
          onLoad={onLoad}
          onBrowseLibrary={onBrowseLibrary}
        />
      ) : (
        <DesignerSidebar
          designType={designerState.designType}
          shapeName={designerState.name}
          primitiveSize={safeDesignerPrimitiveSize}
          minimumPrimitiveSize={minimumDesignerPrimitiveSize}
          gridPresentation={designerGridPresentation}
          width={designerState.layout.width}
          height={designerState.layout.height}
          overlapRows={designerState.layout.overlapRows}
          overlapCols={designerState.layout.overlapCols}
          onDesignTypeChange={(value) => onDesignerStateChange((prev) => ({ ...prev, designType: value }))}
          onShapeNameChange={(value) => onDesignerStateChange((prev) => ({ ...prev, name: value }))}
          onPrimitiveSizeChange={(value) => onDesignerStateChange((prev) => ({ ...prev, size: value }))}
          onGridPresentationChange={onDesignerGridPresentationChange}
          onWidthChange={(value) => onDesignerStateChange((prev) => ({ ...prev, layout: { ...prev.layout, width: value } }))}
          onHeightChange={(value) => onDesignerStateChange((prev) => ({ ...prev, layout: { ...prev.layout, height: value } }))}
          onOverlapRowsChange={(value) => onDesignerStateChange((prev) => ({ ...prev, layout: { ...prev.layout, overlapRows: value } }))}
          onOverlapColsChange={(value) => onDesignerStateChange((prev) => ({ ...prev, layout: { ...prev.layout, overlapCols: value } }))}
        />
      )}
    </aside>
  );
}
