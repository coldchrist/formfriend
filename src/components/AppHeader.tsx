import type { AppMode } from "../domain/types";

type AppHeaderProps = {
  isDirty: boolean;
  uiStatusKind: string;
  uiStatusText: string;
  isSolve: boolean;
  currentMode: AppMode;
  onModeChange: (mode: AppMode) => void;
};

export function AppHeader({
  isDirty,
  uiStatusKind,
  uiStatusText,
  isSolve,
  currentMode,
  onModeChange,
}: AppHeaderProps) {
  return (
    <header
      className="app-header"
      style={{
        display: "block",
        paddingBottom: "0.75rem",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          columnGap: "1rem",
          width: "100%",
        }}
      >
        <h1 style={{ margin: 0, justifySelf: "start" }}>
          Form Friend{isDirty ? " *" : ""}
        </h1>

        <div
          style={{
            justifySelf: "center",
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "#334155",
            textAlign: "center",
          }}
        >
          Design, construct and solve forms
        </div>

        <div
          className={`header-status-message header-status-${uiStatusKind}`}
          style={{ justifySelf: "end" }}
        >
          {uiStatusText}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: "0.75rem",
          borderBottom: "1px solid #cbd5f5",
        }}
      >
        {[
          ["designer", "Design"],
          ["construct", "Construct"],
          ["solve", "Solve"],
        ].map(([mode, label]) => {
          const isActive =
            mode === "solve" ? isSolve : currentMode === (mode as AppMode);

          return (
            <button
              key={mode}
              type="button"
              onClick={() =>
                onModeChange(
                  mode === "solve" ? "solve_checkable" : (mode as AppMode),
                )
              }
              style={{
                padding: "0.5rem 1rem",
                marginBottom: "-1px",
                border: "1px solid #cbd5f5",
                borderBottom: isActive
                  ? "1px solid white"
                  : "1px solid #cbd5f5",
                borderTopLeftRadius: "0.5rem",
                borderTopRightRadius: "0.5rem",
                background: isActive ? "white" : "#e2e8f0",
                fontWeight: isActive ? 600 : 400,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
