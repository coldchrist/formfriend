export type ShapeFamily = "composed" | "cellMask";
export type ShapeVariant = "left" | "right";
export type EntryDirection = "across" | "down" | "extra";
export type AppMode =
  | "construct"
  | "solve_strict"
  | "solve_checkable"
  | "designer";
export type FormStyle = "double" | "single";
export type CellLetterMode = "single" | "bigram";
export type LetterFilterMode = "all" | "vowelless" | "consonantless";

export interface PuzzleSpec {
  shapeFamily: ShapeFamily;
  size: number;
  shapeVariant?: ShapeVariant;
  formStyle?: FormStyle;
  cellLetterMode?: CellLetterMode;
  letterFilterMode?: LetterFilterMode;
  inverted?: boolean;
  composedLayout?: string;
  overlapRows?: number;
  overlapCols?: number;
  cellMaskRows?: string[];
  cellMaskWidth?: number;
  cellMaskHeight?: number;
  extraEntries?: import("./entryPath").EntryPath[];
  shapeId?: string;
  shapeName?: string;
}

export interface Cell {
  id: string;
  row: number;
  col: number;
}

export interface EntryRef {
  id: string;
  number: number;
  label: string;
  direction: EntryDirection;
  cells: string[];
}

export interface Topology {
  cells: Cell[];
  entries: EntryRef[];
}

export interface Clue {
  formWordId: string;
  text: string;
}

export interface PuzzleMetadata {
  title: string;
  author: string;
  publication: string;
}

export interface PuzzleContent {
  metadata: PuzzleMetadata;
  clues: Clue[];
}

export interface FormFillState {
  fillsByFormWordId: Record<string, string>;
  /**
   * Explicit per-cell ownership of full answer text for vowelless/consonantless modes.
   * Each array is aligned to the display entry cells for the form word. When absent,
   * ownership is derived from fillsByFormWordId for backward compatibility.
   */
  reducedSegmentsByFormWordId?: Record<string, string[]>;
}

export interface PuzzleState extends FormFillState {}

export interface SolutionState extends FormFillState {}

export interface SelectionState {
  cellId: string | null;
  direction: EntryDirection;
  entryId?: string;
}

export interface WorkspacePuzzleData {
  spec: PuzzleSpec;
  topology: Topology;
  content: PuzzleContent;
}

export interface ConstructWorkspace extends WorkspacePuzzleData {
  state: PuzzleState;
  solution?: SolutionState;
  selection: SelectionState;
}

export interface SavedPuzzle {
  version: 2;
  spec: PuzzleSpec;
  topology: Topology;
  content: PuzzleContent;
  state: PuzzleState;
  /**
   * Canonical solved fill state. This preserves full answer text and, for
   * reduced modes, explicit per-cell owned segments. obfuscatedSolution is kept
   * only as a legacy/display-grid fallback.
   */
  solutionState?: SolutionState;
  obfuscatedSolution?: string;
  gridPresentation: "square" | "hex";
  dateAdded: string;
  comment?: string;
  enigmaIssue?: string;
  formNumber?: string;
}
