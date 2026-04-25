import { CluePanel } from "../components/CluePanel";
import { DesignerNotesPanel } from "../components/DesignerNotesPanel";
import type { EntryRef } from "../domain/types";

type RightSidebarProps = {
  isDesigner: boolean;
  isSolve: boolean;
  currentFormStyle: "single" | "double";
  shapeDesignerLayoutRowsText: string;
  singleClueEntries: EntryRef[];
  displayedAcrossEntries: EntryRef[];
  displayedDownEntries: EntryRef[];
  cluesByEntryId: Record<string, string>;
  activeClueEntryId?: string;
  activeEntry?: EntryRef;
  onEntryClick: (entryId: string) => void;
  onEntryKeyDown: (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    entryId: string,
  ) => void;
  onClueChange: (entryId: string, text: string) => void;
  // Designer actions (only used when isDesigner)
  // Designer actions (only used when isDesigner)
  onConstruct: () => void;
  onStartFromShape: () => void;
  onSaveShape: () => void;
  onClearDesignedGrid: () => void;
  onLoadDesignedShape: (file: File) => void | Promise<void>;
};

export function RightSidebar({
  isDesigner,
  isSolve,
  currentFormStyle,
  shapeDesignerLayoutRowsText,
  singleClueEntries,
  displayedAcrossEntries,
  displayedDownEntries,
  cluesByEntryId,
  activeClueEntryId,
  activeEntry,
  onEntryClick,
  onEntryKeyDown,
  onClueChange,
  onConstruct,
  onStartFromShape,
  onSaveShape,
  onClearDesignedGrid,
  onLoadDesignedShape,
}: RightSidebarProps) {
  return (
    <aside
      className="right-panel"
      style={
        isDesigner
          ? { display: "flex", flexDirection: "column", minHeight: 0 }
          : currentFormStyle === "single"
            ? { display: "flex", flexDirection: "column", minHeight: 0 }
            : undefined
      }
    >
      {isDesigner ? (
        <DesignerNotesPanel
          layoutRowsText={shapeDesignerLayoutRowsText}
          onConstruct={onConstruct}
          onStartFromShape={onStartFromShape}
          onSaveShape={onSaveShape}
          onClearGrid={onClearDesignedGrid}
          onLoadShape={onLoadDesignedShape}
        />
      ) : currentFormStyle === "single" ? (
        <CluePanel
          title="Clues"
          entries={singleClueEntries}
          cluesByEntryId={cluesByEntryId}
          activeEntryId={activeClueEntryId}
          readOnly={isSolve}
          fillAvailableHeight
          onEntryClick={onEntryClick}
          onEntryKeyDown={onEntryKeyDown}
          onClueChange={onClueChange}
        />
      ) : (
        <>
          <CluePanel
            title="Across"
            entries={displayedAcrossEntries}
            cluesByEntryId={cluesByEntryId}
            activeEntryId={
              activeEntry?.direction === "across" ? activeEntry.id : undefined
            }
            readOnly={isSolve}
            onEntryClick={onEntryClick}
            onEntryKeyDown={onEntryKeyDown}
            onClueChange={onClueChange}
          />

          <CluePanel
            title="Down"
            entries={displayedDownEntries}
            cluesByEntryId={cluesByEntryId}
            activeEntryId={
              activeEntry?.direction === "down" ? activeEntry.id : undefined
            }
            readOnly={isSolve}
            onEntryClick={onEntryClick}
            onEntryKeyDown={onEntryKeyDown}
            onClueChange={onClueChange}
          />
        </>
      )}
    </aside>
  );
}
