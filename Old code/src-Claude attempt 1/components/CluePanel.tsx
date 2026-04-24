import { useEffect, useRef } from "react";
import type { EntryRef } from "../domain/types";

type CluePanelProps = {
  title: string;
  entries: EntryRef[];
  cluesByEntryId: Record<string, string>;
  activeEntryId?: string;
  readOnly?: boolean;
  fillAvailableHeight?: boolean;
  onEntryClick: (entryId: string) => void;
  onClueChange: (entryId: string, text: string) => void;
  onEntryKeyDown: (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    entryId: string,
  ) => void;
};

function autoSizeTextarea(textarea: HTMLTextAreaElement | null) {
  if (!textarea) {
    return;
  }

  textarea.style.height = "auto";
  textarea.style.height = `${textarea.scrollHeight}px`;
}

export function CluePanel({
  title,
  entries,
  cluesByEntryId,
  activeEntryId,
  readOnly = false,
  fillAvailableHeight = false,
  onEntryClick,
  onClueChange,
  onEntryKeyDown,
}: CluePanelProps) {
  const activeInputRef = useRef<HTMLTextAreaElement | null>(null);
  const shouldKeepFocusInCluesRef = useRef(false);

  useEffect(() => {
    if (!activeInputRef.current) {
      return;
    }

    autoSizeTextarea(activeInputRef.current);

    const container = activeInputRef.current.closest(".clue-list");
    if (container instanceof HTMLElement) {
      const inputRect = activeInputRef.current.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      const offsetTop = inputRect.top - containerRect.top + container.scrollTop;
      const offsetBottom = offsetTop + inputRect.height;

      if (offsetTop < container.scrollTop) {
        container.scrollTo({ top: offsetTop, behavior: "smooth" });
      } else if (offsetBottom > container.scrollTop + container.clientHeight) {
        container.scrollTo({
          top: offsetBottom - container.clientHeight,
          behavior: "smooth",
        });
      }
    }

    if (shouldKeepFocusInCluesRef.current && !readOnly) {
      activeInputRef.current.focus();
      activeInputRef.current.select();
      shouldKeepFocusInCluesRef.current = false;
    }
  }, [activeEntryId, readOnly]);

  return (
    <section
      className="clue-panel"
      style={
        fillAvailableHeight
          ? {
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }
          : undefined
      }
    >
      <h3>{title}</h3>
      <div
        className="clue-list"
        style={
          fillAvailableHeight
            ? {
                flex: 1,
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflowY: "auto",
              }
            : undefined
        }
      >
        {entries.map((entry) => {
          const isActive = entry.id === activeEntryId;
          return (
            <div
              key={entry.id}
              className={`clue-row ${isActive ? "active" : ""}`}
              onClick={() => onEntryClick(entry.id)}
            >
              <label>
                <span className="clue-label">{entry.label}</span>
                <textarea
                  ref={(node) => {
                    if (isActive) {
                      activeInputRef.current = node;
                    }
                    autoSizeTextarea(node);
                  }}
                  className="clue-input"
                  rows={1}
                  value={cluesByEntryId[entry.id] ?? ""}
                  disabled={readOnly}
                  onClick={() => onEntryClick(entry.id)}
                  onFocus={(e) => e.currentTarget.select()}
                  onKeyDown={(e) => {
                    if (e.key === "Tab" || e.key === "Enter") {
                      shouldKeepFocusInCluesRef.current = true;
                    }
                    onEntryKeyDown(e, entry.id);
                  }}
                  onChange={(e) => {
                    onClueChange(entry.id, e.target.value);
                    autoSizeTextarea(e.currentTarget);
                  }}
                />
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}
