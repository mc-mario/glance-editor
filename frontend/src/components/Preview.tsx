type PreviewDevice = 'desktop' | 'tablet' | 'phone';

interface PreviewProps {
  glanceUrl: string;
  refreshKey?: number;
  device?: PreviewDevice;
  pageSlug?: string;
}

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

  const deviceStyles = {
    desktop: '',
    tablet: 'w-[60vw] h-[calc(80vh-100px)] max-w-[768px] max-h-[1024px] border-[8px] border-[#333] rounded-[1rem]',
    phone: 'w-[375px] h-[calc(77vh-100px)] max-h-[667px] border-[6px] border-[#333] rounded-[2rem]',
  };

  const wrapperStyles = device === 'desktop' 
    ? 'rounded-0 shadow-none' 
    : 'bg-white overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.5)]';

  return (
    <div className="flex-1 flex flex-col bg-bg-primary items-center justify-center p-4 overflow-auto">
      <div className={`flex items-center justify-center flex-1 w-full h-full ${device}`}>
        <div className={`w-full h-[calc(100vh-100px)] ${wrapperStyles} ${deviceStyles[device]}`}>
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
