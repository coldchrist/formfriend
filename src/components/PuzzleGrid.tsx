import { forwardRef, useImperativeHandle, useRef } from "react";
import type { Cell, CellLetterMode, EntryRef, SelectionState, Topology } from "../domain/types";

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
  cellLetterMode?: CellLetterMode;
  incorrectCellIds?: Set<string>;
  acrossLabelByCellId?: Record<string, string>;
  downLabelByCellId?: Record<string, string>;
  onCellClick: (cellId: string) => void;
  onKeyDown: (event: React.KeyboardEvent<SVGSVGElement>) => void;
};

const DEFAULT_CELL_SIZE = 32;
const PADDING = 16;

type ExtraLabel = {
  entry: EntryRef;
  firstCell: Cell;
  offsetRow: number;
  offsetCol: number;
  distance: number;
};

function signOffset(value: number): number {
  if (value < 0) return -1;
  if (value > 0) return 1;
  return 0;
}

function makeLabelSlotKey(
  cellId: string,
  offsetRow: number,
  offsetCol: number,
  distance: number,
): string {
  return `${cellId}:${offsetRow}:${offsetCol}:${distance}`;
}

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
      cellLetterMode = "single",
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

    function getCellX(cell: (typeof topology.cells)[number]): number {
      const rowMetrics = rowMetricsByRow.get(cell.row);

      return isHex && rowMetrics
        ? PADDING +
            LABEL_SPACE +
            rowMetrics.offset +
            (cell.col - rowMetrics.minCol) * cellSize
        : PADDING + LABEL_SPACE + (cell.col - minCol) * cellSize;
    }

    const cellXById = new Map(
      topology.cells.map((cell) => [cell.id, getCellX(cell)]),
    );

    const cellById = new Map(topology.cells.map((cell) => [cell.id, cell]));

    function getCellY(cell: Cell): number {
      return PADDING + LABEL_SPACE + cell.row * cellSize;
    }

    const hexDownLabelSide: "left" | "right" | "center" = (() => {
      if (!isHex) {
        return "center";
      }

      const firstMultiCellDownEntry = topology.entries.find(
        (entry) => entry.direction === "down" && entry.cells.length > 1,
      );

      if (!firstMultiCellDownEntry) {
        return "center";
      }

      const firstX = cellXById.get(firstMultiCellDownEntry.cells[0]);
      const secondX = cellXById.get(firstMultiCellDownEntry.cells[1]);

      if (firstX === undefined || secondX === undefined) {
        return "center";
      }

      if (secondX > firstX) {
        return "left";
      }

      if (secondX < firstX) {
        return "right";
      }

      return "center";
    })();

    const occupiedLabelSlots = new Set<string>();

    for (const cellId of Object.keys(acrossLabelByCellId)) {
      occupiedLabelSlots.add(makeLabelSlotKey(cellId, 0, -1, 1));
    }

    for (const cellId of Object.keys(downLabelByCellId)) {
      const downOffset =
        hexDownLabelSide === "left"
          ? { row: -1, col: -1 }
          : hexDownLabelSide === "right"
            ? { row: -1, col: 1 }
            : { row: -1, col: 0 };

      occupiedLabelSlots.add(
        makeLabelSlotKey(cellId, downOffset.row, downOffset.col, 1),
      );
    }

    const extraLabels: ExtraLabel[] = [];

    for (const entry of topology.entries) {
      if (entry.direction !== "extra" || entry.cells.length < 2) {
        continue;
      }

      const firstCell = cellById.get(entry.cells[0]);
      const secondCell = cellById.get(entry.cells[1]);

      if (!firstCell || !secondCell) {
        continue;
      }

      const offsetRow = -signOffset(secondCell.row - firstCell.row);
      const offsetCol = -signOffset(secondCell.col - firstCell.col);

      if (offsetRow === 0 && offsetCol === 0) {
        continue;
      }

      let distance = 1;
      while (
        occupiedLabelSlots.has(
          makeLabelSlotKey(firstCell.id, offsetRow, offsetCol, distance),
        )
      ) {
        distance += 1;
      }

      occupiedLabelSlots.add(
        makeLabelSlotKey(firstCell.id, offsetRow, offsetCol, distance),
      );

      extraLabels.push({
        entry,
        firstCell,
        offsetRow,
        offsetCol,
        distance,
      });
    }

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
          const x =
            cellXById.get(cell.id) ??
            PADDING + LABEL_SPACE + (cell.col - minCol) * cellSize;

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
                    hexDownLabelSide === "left"
                      ? x - 3
                      : hexDownLabelSide === "right"
                        ? x + cellSize + 3
                        : x + cellSize / 2
                  }
                  y={y - 3}
                  textAnchor={
                    hexDownLabelSide === "left"
                      ? "end"
                      : hexDownLabelSide === "right"
                        ? "start"
                        : "middle"
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
                fontSize={Math.max(10, Math.floor(cellSize * (cellLetterMode === "bigram" ? 0.48 : ((fillsByCellId[cell.id] ?? "").length > 1 ? 0.48 : 0.75))))}
                fontFamily="Arial, sans-serif"
              >
                {fillsByCellId[cell.id] ?? ""}
              </text>
            </g>
          );
        })}

        {extraLabels.map(
          ({ entry, firstCell, offsetRow, offsetCol, distance }) => {
            const x = cellXById.get(firstCell.id);
            if (x === undefined) return null;

            const y = getCellY(firstCell);
            const fontSize = Math.max(8, Math.floor(cellSize * 0.3125));
            const step = Math.max(10, fontSize + 4);
            const extraDistance = distance - 1;

            const labelX =
              offsetCol < 0
                ? x - 3 - extraDistance * step
                : offsetCol > 0
                  ? x + cellSize + 3 + extraDistance * step
                  : x + cellSize / 2;

            const labelY =
              offsetRow < 0
                ? y - 3 - extraDistance * step
                : offsetRow > 0
                  ? y + cellSize + fontSize + extraDistance * step
                  : y + cellSize / 2 + 4;

            const textAnchor =
              offsetCol < 0 ? "end" : offsetCol > 0 ? "start" : "middle";

            return (
              <text
                key={`extra-label-${entry.id}`}
                x={labelX}
                y={labelY}
                textAnchor={textAnchor}
                fontSize={fontSize}
                fontFamily="Arial, sans-serif"
                fontWeight={700}
                fill="#b45309"
              >
                {entry.label}
              </text>
            );
          },
        )}
      </svg>
    );
  },
);
