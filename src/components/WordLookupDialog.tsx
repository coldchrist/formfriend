import { useState } from "react";

type WordLookupDialogProps = {
  isOpen: boolean;
  pattern: string;
  totalMatches: number;
  matches: string[];
  canLoadMore: boolean;
  onApply: (word: string) => void;
  onLoadMore: () => void;
  onClose: () => void;
};

export function WordLookupDialog({
  isOpen,
  pattern,
  totalMatches,
  matches,
  canLoadMore,
  onApply,
  onLoadMore,
  onClose,
}: WordLookupDialogProps) {
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  if (!isOpen) {
    return null;
  }

  const effectiveSelectedWord = selectedWord ?? matches[0] ?? "";

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className="word-lookup-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <h3>Find Words</h3>

        <div className="word-lookup-meta">
          <div>
            <strong>Pattern:</strong> {pattern}
          </div>
          <div>
            <strong>Matches:</strong> {totalMatches.toLocaleString()}
          </div>
        </div>

        <select
          size={12}
          value={effectiveSelectedWord}
          onChange={(event) => setSelectedWord(event.target.value)}
          onDoubleClick={(event) => {
            const target = event.target as HTMLSelectElement;
            const value = target.value;
            if (value) {
              onApply(value);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              if (effectiveSelectedWord) {
                onApply(effectiveSelectedWord);
              }
            }
          }}
          className="word-lookup-list"
        >
          {matches.map((word) => (
            <option key={word} value={word}>
              {word}
            </option>
          ))}
        </select>

        <div className="word-lookup-buttons">
          <button
            onClick={() => {
              if (effectiveSelectedWord) {
                onApply(effectiveSelectedWord);
              }
            }}
            disabled={!effectiveSelectedWord}
          >
            Apply
          </button>

          <button onClick={onClose}>Cancel</button>

          <button onClick={onLoadMore} disabled={!canLoadMore}>
            Load More
          </button>
        </div>
      </div>
    </div>
  );
}
