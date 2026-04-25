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
  acrossLabelByCellId?: Record<string, string>;
  downLabelByCellId?: Record<string, string>;
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
      acrossLabelByCellId = {},
      downLabelByCellId = {},
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

    const maxRow =
      topology.cells.length > 0
        ? Math.max(...topology.cells.map((c) => c.row))
        : 0;
    const maxCol =
      topology.cells.length > 0
        ? Math.max(...topology.cells.map((c) => c.col))
        : 0;
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

    const rowMetricsByRow = new Map<
      number,
      { minCol: number; maxCol: number; span: number; offset: number }
    >();

    const maxDisplayedRowSpan = Math.max(
      ...[...cellsByRow.values()].map((cells) => {
        const rowMinCol = Math.min(...cells.map((cell) => cell.col));
        const rowMaxCol = Math.max(...cells.map((cell) => cell.col));
        return rowMaxCol - rowMinCol + 1;
      }),
      0,
    );

    for (const [row, cells] of cellsByRow.entries()) {
      const rowMinCol = Math.min(...cells.map((cell) => cell.col));
      const rowMaxCol = Math.max(...cells.map((cell) => cell.col));
      const span = rowMaxCol - rowMinCol + 1;

      rowMetricsByRow.set(row, {
        minCol: rowMinCol,
        maxCol: rowMaxCol,
        span,
        offset: ((maxDisplayedRowSpan - span) / 2) * cellSize,
      });
    }

    const minCol =
      topology.cells.length > 0
        ? Math.min(...topology.cells.map((c) => c.col))
        : 0;
    const LABEL_SPACE = 20; // extra space outside grid for numbers
    const width = PADDING * 2 + (maxCol - minCol + 1) * cellSize + LABEL_SPACE;
    const height = PADDING * 2 + (maxRow + 1) * cellSize + LABEL_SPACE;

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
          const rowCells = cellsByRow.get(cell.row) ?? [];
          const rowIndex = rowCells.findIndex(
            (rowCell) => rowCell.id === cell.id,
          );
          const rowMetrics = rowMetricsByRow.get(cell.row);

          const x =
            isHex && rowMetrics
              ? PADDING +
                LABEL_SPACE +
                rowMetrics.offset +
                (cell.col - rowMetrics.minCol) * cellSize
              : PADDING + LABEL_SPACE + (cell.col - minCol) * cellSize;

          const y = PADDING + LABEL_SPACE + cell.row * cellSize;
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

              {acrossLabelByCellId[cell.id] ? (
                <text
                  x={x - 3}
                  y={y + cellSize / 2 + 4}
                  textAnchor="end"
                  fontSize={Math.max(8, Math.floor(cellSize * 0.3125))}
                  fontFamily="Arial, sans-serif"
                  fill="#333"
                >
                  {acrossLabelByCellId[cell.id]}
                </text>
              ) : null}

              {downLabelByCellId[cell.id] ? (
                <text
                  x={
                    isHex && rowIndex < rowCells.length - 1
                      ? x - 3
                      : x + cellSize / 2
                  }
                  y={y - 3}
                  textAnchor={
                    isHex && rowIndex < rowCells.length - 1 ? "end" : "middle"
                  }
                  fontSize={Math.max(8, Math.floor(cellSize * 0.3125))}
                  fontFamily="Arial, sans-serif"
                  fill="#333"
                >
                  {downLabelByCellId[cell.id]}
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
