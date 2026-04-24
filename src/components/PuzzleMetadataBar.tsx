type PuzzleMetadataBarProps = {
  isConstruct: boolean;
  publication: string;
  title: string;
  author: string;
  onPublicationChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
};

export function PuzzleMetadataBar({
  isConstruct,
  publication,
  title,
  author,
  onPublicationChange,
  onTitleChange,
  onAuthorChange,
}: PuzzleMetadataBarProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        marginBottom: "0.5rem",
        gap: "0.5rem",
      }}
    >
      <div
        style={{
          textAlign: "left",
          fontSize: "0.9rem",
          color: "#555",
        }}
      >
        {isConstruct ? (
          <input
            type="text"
            value={publication}
            onChange={(e) => onPublicationChange(e.target.value)}
            style={{
              width: "100%",
              border: "none",
              borderBottom: "1px solid #ccc",
            }}
          />
        ) : (
          publication
        )}
      </div>

      <div
        style={{
          textAlign: "center",
          fontWeight: 600,
          fontSize: "1.1rem",
        }}
      >
        {isConstruct ? (
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            style={{
              textAlign: "center",
              border: "none",
              borderBottom: "1px solid #ccc",
              width: "100%",
            }}
          />
        ) : (
          title
        )}
      </div>

      <div style={{ textAlign: "right", fontSize: "0.9rem" }}>
        {isConstruct ? (
          <input
            type="text"
            value={author}
            onChange={(e) => onAuthorChange(e.target.value)}
            style={{
              textAlign: "right",
              border: "none",
              borderBottom: "1px solid #ccc",
              width: "100%",
            }}
          />
        ) : (
          author
        )}
      </div>
    </div>
  );
}
