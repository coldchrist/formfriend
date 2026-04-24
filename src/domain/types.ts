export type ShapeFamily = "composed";
export type ShapeVariant = "left" | "right";
export type EntryDirection = "across" | "down";
export type AppMode =
  | "construct"
  | "solve_strict"
  | "solve_checkable"
  | "designer";
export type FormStyle = "double" | "single";

export interface PuzzleSpec {
  shapeFamily: ShapeFamily;
  size: number;
  shapeVariant?: ShapeVariant;
  formStyle?: FormStyle;
  inverted?: boolean;
  composedLayout?: string;
  overlapRows?: number;
  overlapCols?: number;
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
}

export interface PuzzleState extends FormFillState {}

export interface SolutionState extends FormFillState {}

export interface SelectionState {
  cellId: string | null;
  direction: EntryDirection;
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
  obfuscatedSolution?: string;
  gridPresentation: "square" | "hex";
  dateAdded: string;
  comment?: string;
  enigmaIssue?: string;
  formNumber?: string;
}
