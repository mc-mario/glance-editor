interface PreviewProps {
  glanceUrl: string;
  refreshKey?: number;
}

export function Preview({ glanceUrl, refreshKey = 0 }: PreviewProps) {
  // Add refresh key to URL to force iframe reload
  const iframeSrc = refreshKey > 0 
    ? `${glanceUrl}?_refresh=${refreshKey}` 
    : glanceUrl;

  return (
    <div className="preview-container">
      <div className="preview-header">
        <h2>Live Preview</h2>
        <a
          href={glanceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ fontSize: '0.75rem', padding: '0.25rem 0.75rem' }}
        >
          Open in new tab ↗
        </a>
      </div>
      <iframe
        key={refreshKey}
        src={iframeSrc}
        className="preview-frame"
        title="Glance Dashboard Preview"
      />
    </div>
  );
}
