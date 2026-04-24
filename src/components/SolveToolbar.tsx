import { useRef } from "react";
import type { AppMode } from "../domain/types";

type SolveToolbarProps = {
  isSolveCheckable: boolean;
  hasSolution: boolean;
  isSolutionCorrect: boolean;
  loadedPuzzleFileName: string | null;
  onCheck: () => void;
  onClearGrid: () => void;
  onLoad: (file: File) => void;
  onBrowseLibrary: () => void;
  onModeChange: (mode: AppMode) => void;
};

type ToolbarButtonProps = {
  icon: string;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "secondary";
  title: string;
};

function ToolbarButton({
  icon,
  label,
  shortcut,
  onClick,
  disabled = false,
  variant = "default",
  title,
}: ToolbarButtonProps) {
  const variantClass =
    variant === "primary"
      ? " solve-toolbar-btn--primary"
      : variant === "secondary"
        ? " solve-toolbar-btn--secondary"
        : "";

  const fullTitle = shortcut ? `${title} (${shortcut})` : title;

  return (
    <button
      type="button"
      className={`solve-toolbar-btn${variantClass}`}
      onClick={onClick}
      disabled={disabled}
      title={fullTitle}
      aria-label={fullTitle}
    >
      <span aria-hidden="true">{icon}</span>
      <span className="solve-toolbar-btn-label">{label}</span>
    </button>
  );
}

export function SolveToolbar({
  isSolveCheckable,
  hasSolution,
  isSolutionCorrect,
  loadedPuzzleFileName,
  onCheck,
  onClearGrid,
  onLoad,
  onBrowseLibrary,
  onModeChange,
}: SolveToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="solve-toolbar" role="toolbar" aria-label="Solve actions">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden-file-input"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            onLoad(file);
            e.target.value = "";
          }
        }}
      />

      {isSolveCheckable ? (
        <ToolbarButton
          icon="✓"
          label="Check"
          shortcut="Ctrl+Enter"
          onClick={onCheck}
          disabled={!hasSolution || isSolutionCorrect}
          variant="primary"
          title="Check your solution"
        />
      ) : null}

      <ToolbarButton
        icon="⌫"
        label="Clear"
        shortcut="Ctrl+Backspace"
        onClick={onClearGrid}
        title="Clear the working grid"
      />

      <div className="solve-toolbar-separator" aria-hidden="true" />

      <ToolbarButton
        icon="📂"
        label="Load"
        onClick={() => fileInputRef.current?.click()}
        title={
          loadedPuzzleFileName
            ? `Load a form (current: ${loadedPuzzleFileName})`
            : "Load a form from a file"
        }
      />

      <ToolbarButton
        icon="📚"
        label="Library"
        onClick={onBrowseLibrary}
        title="Browse the built-in puzzle library"
      />

      <div className="solve-toolbar-separator" aria-hidden="true" />

      <ToolbarButton
        icon="✏"
        label="Construct"
        onClick={() => onModeChange("construct")}
        variant="secondary"
        title="Switch to Construct mode for this form"
      />
    </div>
  );
}
