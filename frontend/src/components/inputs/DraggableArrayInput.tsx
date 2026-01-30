import { useState, useCallback, useRef, useMemo } from 'react';
import { Plus, Trash2, GripVertical, ChevronDown, ChevronRight } from 'lucide-react';

interface DraggableArrayInputProps<T> {
  value: T[] | undefined;
  onChange: (value: T[] | undefined) => void;
  renderItem: (item: T, index: number, onChange: (value: T) => void) => React.ReactNode;
  createItem: () => T;
  itemLabel?: string;
  minItems?: number;
  maxItems?: number;
  getItemTitle?: (item: T, index: number) => string|undefined;
}

export function DraggableArrayInput<T>({
  value,
  onChange,
  renderItem,
  createItem,
  itemLabel = 'Item',
  minItems = 0,
  maxItems,
  getItemTitle,
}: DraggableArrayInputProps<T>) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(() => new Set([0]));
  const items = useMemo(() => value || [], [value]);
  
  const draggedIndexRef = useRef<number | null>(null);
  const dragSourceRef = useRef<HTMLElement | null>(null);

  const toggleExpanded = useCallback((index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleAdd = useCallback(() => {
    if (maxItems !== undefined && items.length >= maxItems) return;
    const newIndex = items.length;
    onChange([...items, createItem()]);
    setExpandedItems(prev => new Set(prev).add(newIndex));
  }, [items, maxItems, onChange, createItem]);

  const handleRemove = useCallback((index: number) => {
    if (items.length <= minItems) return;
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems.length > 0 ? newItems : undefined);
    setExpandedItems(prev => new Set([...prev].filter(i => i !== index).sort()));
  }, [items, minItems, onChange]);

  const handleItemChange = useCallback((index: number, newValue: T) => {
    const newItems = items.map((item, i) => (i === index ? newValue : item));
    onChange(newItems);
  }, [items, onChange]);

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    draggedIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    
    const target = e.currentTarget as HTMLElement;
    dragSourceRef.current = target;
    
    setTimeout(() => {
      target.classList.add('dragging');
    }, 0);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const target = e.currentTarget as HTMLElement;
    if (target !== dragSourceRef.current) {
      target.classList.add('drag-over');
    }
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    if (target !== dragSourceRef.current) {
      target.classList.add('drag-over');
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    if (!target.contains(e.relatedTarget as Node)) {
      target.classList.remove('drag-over');
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
    
    const fromIndex = draggedIndexRef.current;
    if (fromIndex === null || fromIndex === toIndex) {
      return;
    }

    const newItems = [...items];
    const [removed] = newItems.splice(fromIndex, 1);
    newItems.splice(toIndex, 0, removed);

    onChange(newItems);

    const newExpanded = new Set<number>();
    expandedItems.forEach(index => {
      if (index === fromIndex) {
        newExpanded.add(toIndex);
      } else if (index > fromIndex && index <= toIndex) {
        newExpanded.add(index - 1);
      } else if (index >= toIndex && index < fromIndex) {
        newExpanded.add(index + 1);
      } else {
        newExpanded.add(index);
      }
    });
    setExpandedItems(newExpanded);
  }, [items, onChange, expandedItems]);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.currentTarget;
    target.classList.remove('dragging');
    dragSourceRef.current = null;
    draggedIndexRef.current = null;

    document.querySelectorAll('.array-item.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  }, []);

  const getItemDisplayName = (item: T, index: number): string => {
    if (getItemTitle) {
      const title = getItemTitle(item, index);
      if (title) return title;
    }
    return `${itemLabel} ${index + 1}`;
  };

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <div className="py-6 text-center text-text-muted text-sm border border-border border-dashed rounded-md bg-bg-secondary/30">
          No {itemLabel.toLowerCase()}s added
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item, index) => (
            <div
              key={index}
              className="array-item bg-bg-secondary border border-border rounded-lg overflow-hidden shadow-sm transition-shadow dragging:opacity-50 dragging:shadow-lg"
              draggable
              onDragStart={(e) => handleDragStart(e, index)}
              onDragOver={handleDragOver}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <div
                className="flex items-center gap-2 p-2 px-3 bg-bg-tertiary border-b border-border cursor-pointer hover:bg-bg-elevated transition-colors select-none"
                onClick={() => toggleExpanded(index)}
              >
                <div className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-primary">
                  <GripVertical size={14} />
                </div>
                <button
                  type="button"
                  className="p-0.5 text-text-muted hover:text-accent transition-colors"
                >
                  {expandedItems.has(index) ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>
                <span className="text-[0.85rem] font-medium text-text-primary flex-1 truncate">
                  {getItemDisplayName(item, index)}
                </span>
                <button
                  type="button"
                  className="p-1.5 text-error/60 hover:text-error hover:bg-error/10 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(index);
                  }}
                  disabled={items.length <= minItems}
                  title={`Remove ${itemLabel.toLowerCase()}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              {expandedItems.has(index) && (
                <div className="p-3 animate-in slide-in-from-top-2 duration-200">
                  {renderItem(item, index, (newValue) => handleItemChange(index, newValue))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className="flex items-center justify-center gap-2 px-4 py-2 bg-bg-tertiary text-text-secondary hover:bg-bg-elevated hover:text-text-primary rounded-md text-sm font-medium transition-colors border border-border border-dashed disabled:opacity-50"
        onClick={handleAdd}
        disabled={maxItems !== undefined && items.length >= maxItems}
      >
        <Plus size={16} />
        Add {itemLabel}
      </button>
    </div>
  );
}