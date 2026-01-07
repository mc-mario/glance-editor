type PreviewDevice = 'desktop' | 'tablet' | 'phone';

interface PreviewProps {
  glanceUrl: string;
  refreshKey?: number;
  device?: PreviewDevice;
}

// Device viewport sizes
const DEVICE_SIZES = {
  desktop: { width: 1920, height: 1080 },
  tablet: { width: 768, height: 1024 },
  phone: { width: 375, height: 667 },
} as const;

export function Preview({ glanceUrl, refreshKey = 0, device = 'desktop' }: PreviewProps) {
  // Add refresh key to URL to force iframe reload
  const iframeSrc = refreshKey > 0 
    ? `${glanceUrl}?_refresh=${refreshKey}` 
    : glanceUrl;

  const deviceSize = DEVICE_SIZES[device];
  const isScaled = device !== 'desktop';

  return (
    <div className="preview-container">
      <div className={`preview-viewport ${device}`}>
        <div 
          className="preview-frame-wrapper"
          style={isScaled ? {
            width: deviceSize.width,
            height: deviceSize.height,
          } : undefined}
        >
          <iframe
            key={refreshKey}
            src={iframeSrc}
            className="preview-frame"
            title="Glance Dashboard Preview"
            style={isScaled ? {
              width: deviceSize.width,
              height: deviceSize.height,
            } : undefined}
          />
        </div>
      </div>
      <div className="preview-device-info">
        {device.charAt(0).toUpperCase() + device.slice(1)} - {deviceSize.width} x {deviceSize.height}
      </div>
    </div>
  );
}
