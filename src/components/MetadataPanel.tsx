type MetadataPanelProps = {
  title: string;
  author: string;
  publication: string;
  readOnly?: boolean;
  onTitleChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onPublicationChange: (value: string) => void;
};

export function MetadataPanel({
  title,
  author,
  publication,
  readOnly = false,
  onTitleChange,
  onAuthorChange,
  onPublicationChange,
}: MetadataPanelProps) {
  return (
    <section className="metadata-panel">
      <label>
        Title
        <input
          type="text"
          value={title}
          disabled={readOnly}
          onChange={(e) => onTitleChange(e.target.value)}
        />
      </label>
      <label>
        Author
        <input
          type="text"
          value={author}
          disabled={readOnly}
          onChange={(e) => onAuthorChange(e.target.value)}
        />
      </label>

      <label>
        Publication
        <input
          type="text"
          value={publication}
          disabled={readOnly}
          onChange={(e) => onPublicationChange(e.target.value)}
        />
      </label>
    </section>
  );
}
