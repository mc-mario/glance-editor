import { useState, useRef } from 'react';
import { Pencil, Plus } from 'lucide-react';
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

export function PageList({
  pages,
  selectedIndex,
  onSelect,
  onAdd,
  onReorder,
  onRename,
  onOpenSettings,
}: PageListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  // Use ref instead of state to avoid re-renders during drag
  const draggedIndexRef = useRef<number | null>(null);
  const dragSourceRef = useRef<HTMLElement | null>(null);

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

  const handleDragStart = (e: React.DragEvent, index: number) => {
    draggedIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    
    // Add dragging class directly to DOM (after drag image captured)
    const target = e.currentTarget as HTMLElement;
    dragSourceRef.current = target;
    setTimeout(() => {
      target.classList.add('dragging');
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Show insertion indicator based on mouse position
    const target = e.currentTarget as HTMLElement;
    if (target !== dragSourceRef.current) {
      showInsertIndicator(e, target);
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    const related = e.relatedTarget as HTMLElement;
    // Only remove if we're actually leaving this element
    if (!target.contains(related)) {
      target.classList.remove('drop-indicator-before', 'drop-indicator-after');
    }
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const insertAfter = e.clientY >= rect.top + rect.height / 2;
    target.classList.remove('drop-indicator-before', 'drop-indicator-after');
    
    if (draggedIndexRef.current !== null && draggedIndexRef.current !== toIndex) {
      // Adjust index based on indicator position
      const adjustedIndex = insertAfter ? toIndex + 1 : toIndex;
      // Account for removal of source element when calculating final position
      const finalIndex = draggedIndexRef.current < adjustedIndex ? adjustedIndex - 1 : adjustedIndex;
      onReorder(draggedIndexRef.current, finalIndex);
    }
    draggedIndexRef.current = null;
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Remove dragging class
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('dragging');
    dragSourceRef.current = null;
    draggedIndexRef.current = null;
    
    // Clean up any lingering drag-over classes and indicators
    document.querySelectorAll('.page-item.drag-over, .page-item.drop-indicator-before, .page-item.drop-indicator-after').forEach(el => {
      el.classList.remove('drag-over', 'drop-indicator-before', 'drop-indicator-after');
    });
  };
  
  // Helper to show insertion indicator
  const showInsertIndicator = (e: React.DragEvent, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    
    // Clear all indicators first
    document.querySelectorAll('.page-item.drop-indicator-before, .page-item.drop-indicator-after').forEach(el => {
      el.classList.remove('drop-indicator-before', 'drop-indicator-after');
    });
    
    if (e.clientY < midY) {
      element.classList.add('drop-indicator-before');
    } else {
      element.classList.add('drop-indicator-after');
    }
  };

  const getPageInitial = (name: string): string => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <div className="flex flex-col items-center gap-2 mb-2 pb-2 border-b border-border">
        <span className="text-[0.6rem] font-semibold uppercase tracking-wider text-text-secondary">Pages</span>
        <button className="w-6 h-6 flex items-center justify-center p-0 border-none rounded-md bg-bg-tertiary text-text-primary cursor-pointer transition-all duration-150 ease-in-out hover:bg-bg-elevated" onClick={onAdd} title="Add page">
          <Plus size={14} />
        </button>
      </div>
      <ul className="list-none flex flex-col gap-1.5">
        {pages.map((page, index) => (
          <li
            key={index}
            className={`flex flex-col items-center gap-1 py-2 px-1.5 bg-bg-tertiary rounded-lg cursor-grab active:cursor-grabbing transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] border-2 border-transparent relative group hover:bg-bg-elevated ${selectedIndex === index ? 'border-accent bg-accent/15' : ''}`}
            draggable={editingIndex !== index}
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            onClick={() => onSelect(index)}
          >
            <div 
              className="relative w-9 h-9 flex items-center justify-center group/icon"
              onClick={(e) => {
                if (selectedIndex === index) {
                  e.stopPropagation();
                  onOpenSettings(index);
                }
              }}
              title={selectedIndex === index ? 'Edit page settings' : undefined}
            >
              <span className={`w-9 h-9 flex items-center justify-center bg-bg-secondary rounded-lg text-base font-semibold text-text-secondary transition-all duration-200 group-hover/icon:blur-[1px] ${selectedIndex === index ? 'bg-accent text-bg-primary' : ''}`}>
                {getPageInitial(page.name)}
              </span>
              {selectedIndex === index && (
                <span className="absolute inset-0 flex items-center justify-center bg-accent/95 rounded-lg opacity-0 transition-opacity duration-200 text-bg-primary backdrop-blur-[2px] shadow-[0_0_12px_rgba(136,192,208,0.5)] group-hover/icon:opacity-100">
                  <Pencil size={12} />
                </span>
              )}
            </div>
            
            {editingIndex === index ? (
              <input
                type="text"
                className="w-full py-0.5 px-1 bg-bg-primary border border-accent rounded text-text-primary text-[0.65rem] text-center"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                onBlur={handleFinishEdit}
                onKeyDown={handleKeyDown}
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span
                className={`text-[0.65rem] font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-full text-center text-text-secondary ${selectedIndex === index ? 'text-text-primary' : ''}`}
                onDoubleClick={() => handleStartEdit(index, page.name)}
                title={page.name}
              >
                {page.name}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
