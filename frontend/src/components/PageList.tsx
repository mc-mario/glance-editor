import { useState, useCallback, useRef } from 'react';
import { GripVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import type { PageConfig } from '../types';

interface PageListProps {
  pages: PageConfig[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAdd: () => void;
  onDelete: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRename: (index: number, newName: string) => void;
  onOpenSettings: (index: number) => void;
}

interface PageDragState {
  isDragging: boolean;
  sourceIndex: number;
  targetIndex: number | null;
}

export function PageList({
  pages,
  selectedIndex,
  onSelect,
  onAdd,
  onDelete,
  onReorder,
  onRename,
  onOpenSettings,
}: PageListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [dragState, setDragState] = useState<PageDragState>({
    isDragging: false,
    sourceIndex: -1,
    targetIndex: null,
  });
  const [droppedIndex, setDroppedIndex] = useState<number | null>(null);
  
  // Throttle drag updates to prevent flickering
  const lastDragUpdateRef = useRef<number>(0);
  const DRAG_THROTTLE_MS = 50;

  const handleStartEdit = (index: number, name: string) => {
    setEditingIndex(index);
    setEditingName(name);
  };

  const handleFinishEdit = () => {
    if (editingIndex !== null && editingName.trim()) {
      onRename(editingIndex, editingName.trim());
    }
    setEditingIndex(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFinishEdit();
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
      setEditingName('');
    }
  };

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    
    // Create custom drag image
    const dragElement = e.currentTarget as HTMLElement;
    const rect = dragElement.getBoundingClientRect();
    const ghost = dragElement.cloneNode(true) as HTMLElement;
    ghost.style.width = `${rect.width}px`;
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.style.left = '-1000px';
    ghost.style.opacity = '0.9';
    ghost.style.transform = 'rotate(2deg) scale(1.02)';
    ghost.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, rect.width / 2, 20);
    
    requestAnimationFrame(() => {
      setTimeout(() => ghost.remove(), 0);
    });
    
    setDragState({
      isDragging: true,
      sourceIndex: index,
      targetIndex: null,
    });
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Throttle updates to prevent flickering
    const now = Date.now();
    if (now - lastDragUpdateRef.current < DRAG_THROTTLE_MS) return;
    lastDragUpdateRef.current = now;
    
    // Use functional setState to avoid stale closure issues
    setDragState(prev => {
      if (!prev.isDragging) return prev;
      if (prev.targetIndex === index) return prev;
      return { ...prev, targetIndex: index };
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    
    if (dragState.sourceIndex !== -1 && dragState.sourceIndex !== toIndex) {
      setDroppedIndex(toIndex);
      setTimeout(() => setDroppedIndex(null), 400);
      onReorder(dragState.sourceIndex, toIndex);
    }
    
    setDragState({
      isDragging: false,
      sourceIndex: -1,
      targetIndex: null,
    });
  }, [dragState.sourceIndex, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      sourceIndex: -1,
      targetIndex: null,
    });
  }, []);

  const getPageInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="page-list">
      <div className="page-list-header">
        <span className="section-title">Pages</span>
        <button className="btn-icon btn-icon-sm" onClick={onAdd} title="Add page">
          <Plus size={14} />
        </button>
      </div>
      <ul className="page-list-items">
        {pages.map((page, index) => {
          const isDragging = dragState.isDragging && dragState.sourceIndex === index;
          const isDropped = droppedIndex === index;
          const isDropTarget = dragState.isDragging && dragState.targetIndex === index && dragState.sourceIndex !== index;
          
          return (
            <li
              key={index}
              className={`page-item ${selectedIndex === index ? 'selected' : ''} ${
                isDragging ? 'dragging' : ''
              } ${isDropped ? 'dropped' : ''} ${isDropTarget ? 'drop-target' : ''}`}
              draggable={editingIndex !== index}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              onClick={() => onSelect(index)}
            >
              <div className="page-item-main">
                <div 
                  className="page-icon-wrapper"
                  onClick={(e) => {
                    if (selectedIndex === index) {
                      e.stopPropagation();
                      onOpenSettings(index);
                    }
                  }}
                  title={selectedIndex === index ? 'Edit page settings' : undefined}
                >
                  <span className="page-icon">{getPageInitial(page.name)}</span>
                  {selectedIndex === index && (
                    <span className="page-icon-edit">
                      <Pencil size={12} />
                    </span>
                  )}
                </div>
                
                {editingIndex === index ? (
                  <input
                    type="text"
                    className="page-name-input"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={handleFinishEdit}
                    onKeyDown={handleKeyDown}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span
                    className="page-name"
                    onDoubleClick={() => handleStartEdit(index, page.name)}
                    title={page.name}
                  >
                    {page.name}
                  </span>
                )}
              </div>
              
              {selectedIndex === index && (
                <div className="page-item-actions">
                  <span className="page-drag-handle" title="Drag to reorder">
                    <GripVertical size={14} />
                  </span>
                  <button
                    className="btn-icon btn-icon-xs btn-danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (pages.length > 1 && confirm(`Delete page "${page.name}"?`)) {
                        onDelete(index);
                      }
                    }}
                    title="Delete page"
                    disabled={pages.length <= 1}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
