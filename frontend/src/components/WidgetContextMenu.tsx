import { useState, useEffect, useRef } from 'react';
import { Copy, MoveRight, X } from 'lucide-react';
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
}: WidgetContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [submenu, setSubmenu] = useState<'copy' | 'move' | null>(null);

  // Close on click outside
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

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      if (rect.right > viewportWidth) {
        menuRef.current.style.left = `${viewportWidth - rect.width - 10}px`;
      }
      if (rect.bottom > viewportHeight) {
        menuRef.current.style.top = `${viewportHeight - rect.height - 10}px`;
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
      className="widget-context-menu"
      style={{ left: position.x, top: position.y }}
    >
      <div className="context-menu-header">
        <span className="context-menu-title">{widget.title || widget.type}</span>
        <button className="context-menu-close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      
      {otherPages.length === 0 ? (
        <>
          {/* Show disabled options with explanation */}
          <div 
            className="context-menu-item has-submenu disabled"
            title="Add more pages to enable this option"
          >
            <Copy size={14} />
            <span>Copy to page</span>
            <span className="context-menu-arrow">&#9656;</span>
          </div>
          <div 
            className="context-menu-item has-submenu disabled"
            title="Add more pages to enable this option"
          >
            <MoveRight size={14} />
            <span>Move to page</span>
            <span className="context-menu-arrow">&#9656;</span>
          </div>
          <div className="context-menu-hint">
            Add more pages to copy/move widgets
          </div>
        </>
      ) : (
        <>
          {/* Copy submenu */}
          <div 
            className={`context-menu-item has-submenu ${submenu === 'copy' ? 'active' : ''}`}
            onMouseEnter={() => setSubmenu('copy')}
          >
            <Copy size={14} />
            <span>Copy to page</span>
            <span className="context-menu-arrow">&#9656;</span>
            
            {submenu === 'copy' && (
              <div className="context-submenu">
                {otherPages.map((page, i) => {
                  const actualIndex = i >= currentPageIndex ? i + 1 : i;
                  return (
                    <button
                      key={actualIndex}
                      className="context-menu-item"
                      onClick={() => handleCopyToPage(actualIndex)}
                    >
                      {page.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Move submenu */}
          <div 
            className={`context-menu-item has-submenu ${submenu === 'move' ? 'active' : ''}`}
            onMouseEnter={() => setSubmenu('move')}
          >
            <MoveRight size={14} />
            <span>Move to page</span>
            <span className="context-menu-arrow">&#9656;</span>
            
            {submenu === 'move' && (
              <div className="context-submenu">
                {otherPages.map((page, i) => {
                  const actualIndex = i >= currentPageIndex ? i + 1 : i;
                  return (
                    <button
                      key={actualIndex}
                      className="context-menu-item"
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
  );
}
