import type {
  ConstructWorkspace,
  GridPresentation,
  SavedPuzzlePayload,
  SolveMode,
} from "../domain/types";

export type WorkspaceKey = "design" | "construct" | "solve";

export type DirtyByWorkspace = Record<WorkspaceKey, boolean>;

export function getWorkspaceLabel(workspace: WorkspaceKey): string {
  switch (workspace) {
    case "design":
      return "Design";
    case "construct":
      return "Construct";
    case "solve":
      return "Solve";
    default:
      return workspace;
  }
}

export function createEmptyDirtyByWorkspace(): DirtyByWorkspace {
  return {
    design: false,
    construct: false,
    solve: false,
  };
}

export function buildSavePayload(
  workspace: ConstructWorkspace,
  metadata: {
    solveMode: SolveMode;
    dateAdded: string;
    comment: string;
    enigmaIssue: string;
    formNumber: string;
  },
  gridPresentation: GridPresentation,
): SavedPuzzlePayload {
  return {
    spec: workspace.spec,
    topology: workspace.topology,
    content: workspace.content,
    solveMode: metadata.solveMode,
    gridPresentation,
    dateAdded: metadata.dateAdded,
    comment: metadata.comment.trim() || undefined,
    enigmaIssue: metadata.enigmaIssue.trim() || undefined,
    formNumber: metadata.formNumber.trim() || undefined,
  };
}
