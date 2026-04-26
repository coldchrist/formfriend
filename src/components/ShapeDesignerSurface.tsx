import { useMemo, useRef } from "react";
import type { KeyboardEvent } from "react";
import type {
  ComposedShapeLayout,
  ShapePrimitive,
} from "../domain/shapeDefinition";
import type { Topology } from "../domain/types";
import { buildOccupiedCellsFromComposedLayout } from "../domain/shapeComposition";
import { getPrimitiveAt } from "../domain/shapeLayout";

type ShapeDesignerSurfaceProps = {
  layout: ComposedShapeLayout;
  size: number;
  selection: { row: number; col: number };
  selectedPrimitive: ShapePrimitive;
  topology: Topology;
  isDefiningExtraEntry: boolean;
  pendingExtraEntryCellIds: string[];
  selectedExtraEntryCellIds: string[];
  onExtraEntryCellClick: (cellId: string) => void;
  onSelectCell: (row: number, col: number) => void;
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void;
};

const ELEMENT_CELL_PX = 18;

function primitiveGlyph(primitive: ShapePrimitive): string {
  switch (primitive) {
    case "S":
      return "■";
    case "L":
      return "◤";
    case "R":
      return "◥";
    case "l":
      return "◣";
    case "r":
      return "◢";
    default:
      return "";
  }
}

export function ShapeDesignerSurface({
  layout,
  size,
  selection,
  selectedPrimitive,
  topology,
  isDefiningExtraEntry,
  pendingExtraEntryCellIds,
  selectedExtraEntryCellIds,
  onExtraEntryCellClick,
  onSelectCell,
  onKeyDown,
}: ShapeDesignerSurfaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const overlapRows = layout.overlapRows;
  const overlapCols = layout.overlapCols;
  const rowStep = size - overlapRows;
  const colStep = size - overlapCols;

  const widthPx =
    (layout.width - 1) * colStep * ELEMENT_CELL_PX + size * ELEMENT_CELL_PX;
  const heightPx =
    (layout.height - 1) * rowStep * ELEMENT_CELL_PX + size * ELEMENT_CELL_PX;

  const minimumPanelWidth = 420;
  const panelWidth = Math.max(minimumPanelWidth, widthPx + 24);

  const occupiedCells = useMemo(() => {
    return buildOccupiedCellsFromComposedLayout(layout, size);
  }, [layout, size]);

  const occupiedSet = new Set(
    occupiedCells.map((cell) => `${cell.row},${cell.col}`),
  );
  const pendingExtraEntryCellIdSet = new Set(pendingExtraEntryCellIds);
  const selectedExtraEntryCellIdSet = new Set(selectedExtraEntryCellIds);
  const cellIdByCoord = new Map(
    topology.cells.map((cell) => [`${cell.row},${cell.col}`, cell.id]),
  );
  const cellById = new Map(topology.cells.map((cell) => [cell.id, cell]));
  return (
    <section
      className="clue-panel"
      style={{
        minHeight: 0,
        width: "100%",
        maxWidth: `${panelWidth}px`,
        minWidth: `${minimumPanelWidth}px`,
        alignSelf: "center",
      }}
    >
      <div
        ref={containerRef}
        tabIndex={0}
        onKeyDown={onKeyDown}
        style={{
          border: "1px solid #cbd5e1",
          borderRadius: "0.5rem",
          padding: "0.75rem",
          outline: "none",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          width: "100%",
          minWidth: 0,
        }}
      >
        <div style={{ marginBottom: "0.5rem", fontSize: "0.9rem" }}>
          {isDefiningExtraEntry ? (
            <span>
              Defining extra word: click occupied cells in reading order.
            </span>
          ) : (
            <span>
              Selected tool:{" "}
              <strong>
                {selectedPrimitive === "." ? "Erase" : selectedPrimitive}
              </strong>
            </span>
          )}
        </div>

        <div
          style={{
            width: "100%",
            display: "flex",
            justifyContent: "center",
            overflowX: "auto",
            overflowY: "hidden",
          }}
        >
          <svg
            width={widthPx}
            height={heightPx}
            style={{
              display: "block",
              background: "#fff",
              flex: "none",
            }}
          >
            {/* Actual composed cells */}
            {Array.from(occupiedSet).map((key) => {
              const [rowText, colText] = key.split(",");
              const row = Number(rowText);
              const col = Number(colText);
              const cellId = cellIdByCoord.get(key);
              const isPendingExtraCell = Boolean(
                cellId && pendingExtraEntryCellIdSet.has(cellId),
              );
              const isSelectedExtraCell = Boolean(
                cellId && selectedExtraEntryCellIdSet.has(cellId),
              );

              return (
                <rect
                  key={key}
                  x={col * ELEMENT_CELL_PX}
                  y={row * ELEMENT_CELL_PX}
                  width={ELEMENT_CELL_PX}
                  height={ELEMENT_CELL_PX}
                  fill={
                    isPendingExtraCell
                      ? "#fde68a"
                      : isSelectedExtraCell
                        ? "#fef08a"
                        : "#e2e8f0"
                  }
                  stroke={
                    isPendingExtraCell || isSelectedExtraCell
                      ? "#d97706"
                      : "#94a3b8"
                  }
                  strokeWidth={
                    isPendingExtraCell || isSelectedExtraCell ? 2 : 1
                  }
                  onClick={() => {
                    if (isDefiningExtraEntry && cellId) {
                      onExtraEntryCellClick(cellId);
                      containerRef.current?.focus();
                    }
                  }}
                  style={{
                    cursor: isDefiningExtraEntry ? "crosshair" : "default",
                  }}
                />
              );
            })}

            {/* Macro-cell overlays */}
            {Array.from({ length: layout.height }).flatMap((_, macroRow) =>
              Array.from({ length: layout.width }).map((__, macroCol) => {
                const x = macroCol * colStep * ELEMENT_CELL_PX;
                const y = macroRow * rowStep * ELEMENT_CELL_PX;
                const w = size * ELEMENT_CELL_PX;
                const h = size * ELEMENT_CELL_PX;
                const primitive = getPrimitiveAt(layout, macroRow, macroCol);
                const isSelected =
                  selection.row === macroRow && selection.col === macroCol;

                return (
                  <g key={`${macroRow},${macroCol}`}>
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      fill={isSelected ? "rgba(37,99,235,0.08)" : "transparent"}
                      stroke={isSelected ? "#2563eb" : "#94a3b8"}
                      strokeDasharray={isSelected ? undefined : "6 4"}
                      strokeWidth={isSelected ? 2 : 1}
                      pointerEvents={isDefiningExtraEntry ? "none" : undefined}
                      onClick={() => {
                        onSelectCell(macroRow, macroCol);
                        containerRef.current?.focus();
                      }}
                      style={{ cursor: "pointer" }}
                    />
                    {primitive !== "." ? (
                      <text
                        x={x + 8}
                        y={y + 18}
                        fontSize={18}
                        fill={isSelected ? "#1d4ed8" : "#475569"}
                        pointerEvents="none"
                      >
                        {primitiveGlyph(primitive)}
                      </text>
                    ) : null}
                  </g>
                );
              }),
            )}

            {/* Extra-entry highlight overlay. Drawn last so it remains visible above macro-cell outlines. */}
            {Array.from(selectedExtraEntryCellIdSet).map((cellId) => {
              const cell = cellById.get(cellId);
              if (!cell) return null;
              return (
                <rect
                  key={`selected-extra-${cellId}`}
                  x={cell.col * ELEMENT_CELL_PX}
                  y={cell.row * ELEMENT_CELL_PX}
                  width={ELEMENT_CELL_PX}
                  height={ELEMENT_CELL_PX}
                  fill="rgba(250, 204, 21, 0.72)"
                  stroke="#ca8a04"
                  strokeWidth={2}
                  pointerEvents="none"
                />
              );
            })}

            {Array.from(pendingExtraEntryCellIdSet).map((cellId) => {
              const cell = cellById.get(cellId);
              if (!cell) return null;
              return (
                <rect
                  key={`pending-extra-${cellId}`}
                  x={cell.col * ELEMENT_CELL_PX}
                  y={cell.row * ELEMENT_CELL_PX}
                  width={ELEMENT_CELL_PX}
                  height={ELEMENT_CELL_PX}
                  fill="rgba(251, 191, 36, 0.82)"
                  stroke="#d97706"
                  strokeWidth={2}
                  pointerEvents="none"
                />
              );
            })}
          </svg>
        </div>

        <div
          style={{
            marginTop: "0.75rem",
            fontSize: "0.85rem",
            color: "#475569",
            whiteSpace: "normal",
            overflowWrap: "break-word",
            width: "100%",
            minWidth: 0,
          }}
        >
          Keyboard: L / R / S / l / r / . place into the current cell, Space
          erases and moves forward, Backspace erases and moves back, Enter moves
          to next row, arrows move selection.
        </div>
      </div>
    </section>
  );
}
