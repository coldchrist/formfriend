import { forwardRef, useImperativeHandle, useRef } from "react";
import type { EntryRef, SelectionState, Topology } from "../domain/types";

export type PuzzleGridHandle = {
  focusGrid: () => void;
};

type PuzzleGridProps = {
  topology: Topology;
  fillsByCellId: Record<string, string>;
  selection: SelectionState;
  activeCellIds?: string[];
  clueNumberByCellId: Record<string, string>;
  gridPresentation?: "square" | "hex";
  cellSize?: number;
  incorrectCellIds?: Set<string>;
  onCellClick: (cellId: string) => void;
  onKeyDown: (event: React.KeyboardEvent<SVGSVGElement>) => void;
};

const DEFAULT_CELL_SIZE = 32;
const PADDING = 16;

export const PuzzleGrid = forwardRef<PuzzleGridHandle, PuzzleGridProps>(
  function PuzzleGrid(
    {
      topology,
      fillsByCellId,
      selection,
      activeCellIds = [],
      incorrectCellIds = new Set(),
      clueNumberByCellId,
      gridPresentation = "square", // ← MUST BE HERE
      cellSize = DEFAULT_CELL_SIZE,
      onCellClick,
      onKeyDown,
    },
    ref,
  ) {
    const svgRef = useRef<SVGSVGElement | null>(null);

    useImperativeHandle(ref, () => ({
      focusGrid() {
        svgRef.current?.focus();
      },
    }));

    const maxRow = Math.max(...topology.cells.map((c) => c.row), 0);
    const maxCol = Math.max(...topology.cells.map((c) => c.col), 0);

    const isHex = gridPresentation === "hex";

    const cellsByRow = new Map<number, typeof topology.cells>();
    for (const cell of topology.cells) {
      const existing = cellsByRow.get(cell.row) ?? [];
      existing.push(cell);
      cellsByRow.set(cell.row, existing);
    }

    for (const cells of cellsByRow.values()) {
      cells.sort((a, b) => a.col - b.col);
    }

    const maxDisplayedRowLength = Math.max(
      ...[...cellsByRow.values()].map((cells) => cells.length),
      0,
    );

    const rowOffsetByRow = new Map<number, number>();
    for (const [row, cells] of cellsByRow.entries()) {
      rowOffsetByRow.set(
        row,
        ((maxDisplayedRowLength - cells.length) / 2) * cellSize,
      );
    }

    const width = PADDING * 2 + maxDisplayedRowLength * cellSize;
    const height = PADDING * 2 + (maxRow + 1) * cellSize;

    const activeCellIdSet = new Set(activeCellIds);

    return (
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="puzzle-grid"
        role="img"
        aria-label="Puzzle grid"
        tabIndex={0}
        onKeyDown={onKeyDown}
      >
        {topology.cells.map((cell) => {
          const isHex = gridPresentation === "hex";

          const rowCells = cellsByRow.get(cell.row) ?? [];
          const rowIndex = rowCells.findIndex(
            (rowCell) => rowCell.id === cell.id,
          );
          const rowOffset = isHex ? (rowOffsetByRow.get(cell.row) ?? 0) : 0;

          const x = isHex
            ? PADDING + rowOffset + rowIndex * cellSize
            : PADDING + cell.col * cellSize;

          const y = PADDING + cell.row * cellSize;
          const isSelected = selection.cellId === cell.id;
          const isActive = activeCellIdSet.has(cell.id);
          const isIncorrect = incorrectCellIds.has(cell.id);

          const fill = isIncorrect
            ? "#fee2e2" // pale red
            : isSelected
              ? "#cfe8ff"
              : isActive
                ? "#eaf4ff"
                : "white";
          const clueNumber = clueNumberByCellId[cell.id];

          return (
            <g
              key={cell.id}
              onClick={() => {
                onCellClick(cell.id);
                svgRef.current?.focus();
              }}
              style={{ cursor: "pointer" }}
            >
              <rect
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill={fill}
                stroke="#333"
              />

              {clueNumber ? (
                <text
                  x={x + 4}
                  y={y + 10}
                  textAnchor="start"
                  fontSize={Math.max(8, Math.floor(cellSize * 0.3125))}
                  fontFamily="Arial, sans-serif"
                  fill="#555"
                >
                  {clueNumber}
                </text>
              ) : null}

              <text
                x={x + cellSize / 2}
                y={y + cellSize / 2 + Math.floor(cellSize * 0.25)}
                textAnchor="middle"
                fontSize={Math.max(12, Math.floor(cellSize * 0.75))}
                fontFamily="Arial, sans-serif"
              >
                {fillsByCellId[cell.id] ?? ""}
              </text>
            </g>
          );
        })}
      </svg>
    );
  },
);
