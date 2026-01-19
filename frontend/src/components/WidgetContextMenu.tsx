import { useState, useEffect, useRef } from 'react';
import { Copy, MoveRight, X, ChevronRight, FileCode, EyeOff, Eye } from 'lucide-react';
import type { PageConfig, WidgetConfig } from '../types';

interface WidgetContextMenuProps {
  widget: WidgetConfig;
  columnIndex: number;
  widgetIndex: number;
  pages: PageConfig[];
  currentPageIndex: number;
  position: { x: number; y: number };
  onClose: () => void;
  onCopyToPage: (targetPageIndex: number, widget: WidgetConfig) => void;
  onMoveToPage: (targetPageIndex: number, sourceColumnIndex: number, sourceWidgetIndex: number, widget: WidgetConfig) => void;
  onViewInYaml?: (columnIndex: number, widgetIndex: number) => void;
  onToggleDeactivate?: (columnIndex: number, widgetIndex: number, deactivated: boolean) => void;
}

export function WidgetContextMenu({
  widget,
  columnIndex,
  widgetIndex,
  pages,
  currentPageIndex,
  position,
  onClose,
  onCopyToPage,
  onMoveToPage,
  onViewInYaml,
  onToggleDeactivate,
}: WidgetContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenu, setSubmenu] = useState<'copy' | 'move' | null>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      let newX = position.x;
      let newY = position.y;
      
      if (position.x + rect.width > viewportWidth) {
        newX = viewportWidth - rect.width - 10;
      }
      if (position.y + rect.height > viewportHeight) {
        newY = viewportHeight - rect.height - 10;
      }
      
      if (newX !== position.x || newY !== position.y) {
        setAdjustedPosition({ x: newX, y: newY });
      }
    }
  }, [position]);

  const handleCopyToPage = (targetPageIndex: number) => {
    onCopyToPage(targetPageIndex, { ...widget });
    onClose();
  };

  const handleMoveToPage = (targetPageIndex: number) => {
    onMoveToPage(targetPageIndex, columnIndex, widgetIndex, { ...widget });
    onClose();
  };

  const otherPages = pages.filter((_, i) => i !== currentPageIndex);

  return (
    <div
      ref={menuRef}
      className="fixed z-[1000] min-w-[180px] bg-bg-elevated border border-border rounded-lg shadow-2xl"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
    >
      <div className="flex items-center justify-between px-3 py-2 bg-bg-tertiary border-b border-border rounded-t-lg">
        <span className="text-xs font-medium text-text-secondary truncate max-w-[140px]">
          {widget.title || widget.type}
        </span>
        <button 
          className="p-0.5 text-text-muted hover:text-text-primary transition-colors rounded hover:bg-bg-elevated"
          onClick={onClose}
        >
          <X size={14} />
        </button>
      </div>
      
      <div className="py-1">
        {onViewInYaml && (
          <button 
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:bg-accent/10 hover:text-accent transition-colors"
            onClick={() => {
              onViewInYaml(columnIndex, widgetIndex);
              onClose();
            }}
          >
            <FileCode size={14} />
            <span className="flex-1 text-left">View in YAML</span>
          </button>
        )}
        
        {onToggleDeactivate && (
          <button 
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors ${
              widget._deactivated 
                ? 'text-success hover:bg-success/10' 
                : 'text-warning hover:bg-warning/10'
            }`}
            onClick={() => {
              onToggleDeactivate(columnIndex, widgetIndex, !widget._deactivated);
              onClose();
            }}
            title={widget._deactivated 
              ? 'Reactivate this widget (uncomment in YAML)' 
              : 'Deactivate this widget (comment out in YAML). Useful for development or performance testing.'
            }
          >
            {widget._deactivated ? <Eye size={14} /> : <EyeOff size={14} />}
            <span className="flex-1 text-left">
              {widget._deactivated ? 'Activate Widget' : 'Deactivate Widget'}
            </span>
          </button>
        )}
        
        {(onViewInYaml || onToggleDeactivate) && <div className="my-1 border-t border-border" />}
        
        {otherPages.length === 0 ? (
          <>
            <div 
              className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted cursor-not-allowed"
              title="Add more pages to enable this option"
            >
              <Copy size={14} />
              <span className="flex-1">Copy to page</span>
              <ChevronRight size={14} />
            </div>
            <div 
              className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted cursor-not-allowed"
              title="Add more pages to enable this option"
            >
              <MoveRight size={14} />
              <span className="flex-1">Move to page</span>
              <ChevronRight size={14} />
            </div>
            <div className="px-3 py-2 text-xs text-text-muted italic border-t border-border mt-1">
              Add more pages to copy/move widgets
            </div>
          </>
        ) : (
          <>
            <div 
              className={`relative flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${submenu === 'copy' ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'}`}
              onMouseEnter={() => setSubmenu('copy')}
            >
              <Copy size={14} />
              <span className="flex-1">Copy to page</span>
              <ChevronRight size={14} />
              
              {submenu === 'copy' && (
                <div className="absolute left-full top-0 ml-1 min-w-[140px] bg-bg-elevated border border-border rounded-lg shadow-2xl py-1 z-[1001]">
                  {otherPages.map((page, i) => {
                    const actualIndex = i >= currentPageIndex ? i + 1 : i;
                    return (
                      <button
                        key={actualIndex}
                        className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-accent/10 hover:text-accent transition-colors"
                        onClick={() => handleCopyToPage(actualIndex)}
                      >
                        {page.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div 
              className={`relative flex items-center gap-2 px-3 py-2 text-sm cursor-pointer transition-colors ${submenu === 'move' ? 'bg-accent/10 text-accent' : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'}`}
              onMouseEnter={() => setSubmenu('move')}
            >
              <MoveRight size={14} />
              <span className="flex-1">Move to page</span>
              <ChevronRight size={14} />
              
              {submenu === 'move' && (
                <div className="absolute left-full top-0 ml-1 min-w-[140px] bg-bg-elevated border border-border rounded-lg shadow-2xl py-1 z-[1001]">
                  {otherPages.map((page, i) => {
                    const actualIndex = i >= currentPageIndex ? i + 1 : i;
                    return (
                      <button
                        key={actualIndex}
                        className="w-full text-left px-3 py-2 text-sm text-text-secondary hover:bg-accent/10 hover:text-accent transition-colors"
                        onClick={() => handleMoveToPage(actualIndex)}
                      >
                        {page.name}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
