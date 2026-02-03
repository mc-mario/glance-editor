import { useState, useRef } from 'react';
import { X, Plus, Trash2, GripVertical, Package, EyeOff } from 'lucide-react';
import type { WidgetConfig } from '../types';
import { getWidgetDefinition } from '../widgetDefinitions';
import { createDefaultWidget } from '../widgetDefinitions';

interface HeaderWidgetsModalProps {
  widgets: WidgetConfig[];
  onChange: (widgets: WidgetConfig[]) => void;
  onClose: () => void;
}

export function HeaderWidgetsModal({ widgets, onChange, onClose }: HeaderWidgetsModalProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set([0]));
  const draggedIndexRef = useRef<number | null>(null);
  const dragSourceRef = useRef<HTMLElement | null>(null);

  const toggleExpanded = (index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleAdd = () => {
    const newWidget = createDefaultWidget('clock');
    onChange([...widgets, newWidget]);
    setExpandedItems(prev => new Set(prev).add(widgets.length));
  };

  const handleRemove = (index: number) => {
    const newWidgets = widgets.filter((_, i) => i !== index);
    onChange(newWidgets);
    setExpandedItems(prev => new Set([...prev].filter(i => i !== index)));
  };

  const handleWidgetChange = (index: number, updatedWidget: WidgetConfig) => {
    const newWidgets = widgets.map((w, i) => (i === index ? updatedWidget : w));
    onChange(newWidgets);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    draggedIndexRef.current = index;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));

    const target = e.currentTarget as HTMLElement;
    dragSourceRef.current = target;

    setTimeout(() => {
      target.classList.add('dragging');
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const target = e.currentTarget as HTMLElement;
    if (target !== dragSourceRef.current) {
      target.classList.add('drag-over');
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    if (target !== dragSourceRef.current) {
      target.classList.add('drag-over');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    if (!target.contains(e.relatedTarget as Node)) {
      target.classList.remove('drag-over');
    }
  };

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();

    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');

    const fromIndex = draggedIndexRef.current;
    if (fromIndex === null || fromIndex === toIndex) {
      return;
    }

    const newWidgets = [...widgets];
    const [removed] = newWidgets.splice(fromIndex, 1);
    newWidgets.splice(toIndex, 0, removed);

    onChange(newWidgets);

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
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget;
    target.classList.remove('dragging');
    dragSourceRef.current = null;
    draggedIndexRef.current = null;

    document.querySelectorAll('.array-item.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between py-3 px-4 border-b border-border flex-shrink-0">
        <h3 className="text-sm font-semibold">Header Widgets</h3>
        <button
          className="w-7 h-7 border-none bg-transparent text-text-secondary text-xl cursor-pointer rounded flex items-center justify-center transition-all duration-150 hover:bg-error/20 hover:text-error"
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {widgets.length === 0 ? (
          <div className="py-8 text-center text-text-muted text-sm border border-border border-dashed rounded-md bg-bg-secondary/30">
            No header widgets added
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {widgets.map((widget, index) => {
              const def = getWidgetDefinition(widget.type);
              const Icon = def?.icon || Package;
              const isDeactivated = widget._deactivated === true;

              return (
                <div
                  key={index}
                  className="array-item bg-bg-secondary border border-border rounded-lg overflow-hidden shadow-sm transition-shadow dragging:opacity-50 dragging:shadow-lg"
                  onDragOver={handleDragOver}
                  onDragEnter={handleDragEnter}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <div
                    className="flex items-center gap-2 p-2 px-3 bg-bg-tertiary border-b border-border cursor-pointer hover:bg-bg-elevated transition-colors select-none"
                    onClick={() => toggleExpanded(index)}
                  >
                    <div
                      className="cursor-grab active:cursor-grabbing text-text-muted hover:text-text-primary"
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      <GripVertical size={14} />
                    </div>
                    <button
                      type="button"
                      className="p-0.5 text-text-muted hover:text-accent transition-colors"
                    >
                      {expandedItems.has(index) ? (
                        <span className="rotate-90">▶</span>
                      ) : (
                        <span>▶</span>
                      )}
                    </button>
                    <Icon size={14} className="text-text-secondary" />
                    <span className="text-[0.85rem] font-medium text-text-primary flex-1 truncate">
                      {widget.title || def?.name || widget.type}
                    </span>
                    {isDeactivated && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-warning/20 text-warning text-[0.65rem] font-semibold uppercase rounded">
                        <EyeOff size={10} />
                      </span>
                    )}
                    <button
                      type="button"
                      className="p-1.5 text-error/60 hover:text-error hover:bg-error/10 rounded transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(index);
                      }}
                      title="Remove widget"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {expandedItems.has(index) && (
                    <div className="p-3 animate-in slide-in-from-top-2 duration-200">
                      <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[0.75rem] font-medium text-text-secondary">
                            Widget Type
                          </label>
                          <span className="text-sm text-text-muted capitalize">{widget.type}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[0.75rem] font-medium text-text-secondary">
                            Title
                          </label>
                          <input
                            type="text"
                            value={widget.title || ''}
                            onChange={(e) =>
                              handleWidgetChange(index, { ...widget, title: e.target.value })
                            }
                            className="w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={!!isDeactivated}
                            onChange={(e) =>
                              handleWidgetChange(index, {
                                ...widget,
                                _deactivated: e.target.checked ? true : undefined,
                              })
                            }
                            className="w-4 h-4 accent-accent cursor-pointer"
                          />
                          <label className="text-sm text-text-secondary cursor-pointer">
                            Deactivate (comment out in YAML)
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border flex-shrink-0">
        <button
          type="button"
          className="flex items-center justify-center gap-2 px-4 py-2 w-full bg-bg-tertiary text-text-secondary hover:bg-bg-elevated hover:text-text-primary rounded-md text-sm font-medium transition-colors border border-border border-dashed"
          onClick={handleAdd}
        >
          <Plus size={16} />
          Add Widget
        </button>
      </div>
    </div>
  );
}