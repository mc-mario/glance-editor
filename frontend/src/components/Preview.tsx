type PreviewDevice = "desktop" | "tablet" | "phone";

interface PreviewProps {
  glanceUrl: string;
  refreshKey?: number;
  device?: PreviewDevice;
  pageSlug?: string;
}

export function Preview({
  glanceUrl,
  refreshKey = 0,
  device = "desktop",
  pageSlug,
}: PreviewProps) {
  // Build iframe URL with page slug and refresh key
  let iframeSrc = glanceUrl;
  
  // Add page slug to URL if provided
  if (pageSlug) {
    iframeSrc = `${glanceUrl}/${pageSlug}`;
  }
  
  // Add refresh key as query parameter to force reload
  if (refreshKey > 0) {
    iframeSrc = `${iframeSrc}?_refresh=${refreshKey}`;
  }

  return (
    <div className="preview-container">
      <div className={`preview-viewport ${device}`}>
        <div className="preview-frame-wrapper">
          <iframe
            key={refreshKey}
            src={iframeSrc}
            className="preview-frame"
            title="Glance Dashboard Preview"
          />
        </div>
      </div>
    </div>
  );
}
