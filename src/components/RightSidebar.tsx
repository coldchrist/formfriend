import { CluePanel } from "../components/CluePanel";
import { DesignerNotesPanel } from "../components/DesignerNotesPanel";
import type { EntryPath } from "../domain/entryPath";
import type { EntryRef } from "../domain/types";

type RightSidebarProps = {
  isDesigner: boolean;
  isSolve: boolean;
  currentFormStyle: "single" | "double";
  shapeDesignerLayoutRowsText: string;
  singleClueEntries: EntryRef[];
  displayedAcrossEntries: EntryRef[];
  displayedDownEntries: EntryRef[];
  displayedExtraEntries: EntryRef[];
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
  onConstruct: () => void;
  onStartFromShape: () => void;
  onSaveShape: () => void;
  onClearDesignedGrid: () => void;
  onLoadDesignedShape: (file: File) => void | Promise<void>;
  extraEntries: EntryPath[];
  isDefiningExtraEntry: boolean;
  pendingExtraEntryCellIds: string[];
  onBeginExtraEntryDefinition: () => void;
  onFinishExtraEntryDefinition: () => void;
  onCancelExtraEntryDefinition: () => void;
  onRemoveExtraEntry: (id: string) => void;
  onSelectExtraEntry: (entryId: string) => void;
  selectedExtraEntryId: string | null;
  describeExtraEntry: (entry: EntryPath) => string;
};

export function RightSidebar({
  isDesigner,
  isSolve,
  currentFormStyle,
  shapeDesignerLayoutRowsText,
  singleClueEntries,
  displayedAcrossEntries,
  displayedDownEntries,
  displayedExtraEntries,
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
  extraEntries,
  isDefiningExtraEntry,
  pendingExtraEntryCellIds,
  onBeginExtraEntryDefinition,
  onFinishExtraEntryDefinition,
  onCancelExtraEntryDefinition,
  onRemoveExtraEntry,
  onSelectExtraEntry,
  selectedExtraEntryId,
  describeExtraEntry,
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
          extraEntries={extraEntries}
          isDefiningExtraEntry={isDefiningExtraEntry}
          pendingExtraEntryCellIds={pendingExtraEntryCellIds}
          onBeginExtraEntryDefinition={onBeginExtraEntryDefinition}
          onFinishExtraEntryDefinition={onFinishExtraEntryDefinition}
          onCancelExtraEntryDefinition={onCancelExtraEntryDefinition}
          onRemoveExtraEntry={onRemoveExtraEntry}
          describeExtraEntry={describeExtraEntry}
          onSelectExtraEntry={onSelectExtraEntry}
          selectedExtraEntryId={selectedExtraEntryId}
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

          {displayedExtraEntries.length > 0 ? (
            <CluePanel
              title="Extra"
              entries={displayedExtraEntries}
              cluesByEntryId={cluesByEntryId}
              activeEntryId={
                activeEntry?.direction === "extra" ? activeEntry.id : undefined
              }
              readOnly={isSolve}
              onEntryClick={onEntryClick}
              onEntryKeyDown={onEntryKeyDown}
              onClueChange={onClueChange}
            />
          ) : null}
        </>
      )}
    </aside>
  );
}
