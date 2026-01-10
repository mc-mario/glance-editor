type PreviewDevice = 'desktop' | 'tablet' | 'phone';

interface PreviewProps {
  glanceUrl: string;
  refreshKey?: number;
  device?: PreviewDevice;
  pageSlug?: string;
}

const deviceStyles = {
  desktop: 'rounded-none shadow-none',
  tablet: 'w-[60vw] h-[calc(80vh-100px)] max-w-[768px] max-h-[1024px] border-8 border-neutral-700 rounded-2xl',
  phone: 'w-[375px] h-[calc(77vh-100px)] max-h-[667px] border-6 border-neutral-700 rounded-[2rem]',
};

export function Preview({
  glanceUrl,
  refreshKey = 0,
  device = 'desktop',
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

  const isDesktop = device === 'desktop';

  return (
    <div className="flex-1 flex flex-col bg-bg-primary items-center justify-center p-4 overflow-auto">
      <div className="flex items-center justify-center flex-1 w-full h-full">
        <div
          className={`bg-white overflow-hidden ${isDesktop ? 'w-full h-[calc(100vh-100px)] rounded-none shadow-none' : ''} ${!isDesktop ? `shadow-[0_10px_40px_rgba(0,0,0,0.5)] ${deviceStyles[device]}` : ''}`}
        >
          <iframe
            key={refreshKey}
            src={iframeSrc}
            className="border-none bg-white block w-full h-full"
            title="Glance Dashboard Preview"
          />
        </div>
      </div>
    </div>
  );
}
