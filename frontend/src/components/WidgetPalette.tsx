import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import {
  WIDGET_DEFINITIONS,
  WIDGET_CATEGORIES,
  type WidgetDefinition,
  createDefaultWidget,
} from '../widgetDefinitions';
import type { ColumnConfig, WidgetConfig } from '../types';

interface WidgetPaletteProps {
  onWidgetSelect: (definition: WidgetDefinition) => void;
  onAddToColumn?: (columnIndex: number, widget: WidgetConfig) => void;
  onAddToHeader?: (widget: WidgetConfig) => void;
  columns?: ColumnConfig[];
}

export function WidgetPalette({ onWidgetSelect, onAddToColumn, onAddToHeader, columns }: WidgetPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedColumnIndex, setSelectedColumnIndex] = useState(0);
  const [target, setTarget] = useState<'column' | 'header'>('column');

  const filteredWidgets = useMemo(() => {
    let widgets = WIDGET_DEFINITIONS;

    // Filter by category
    if (selectedCategory) {
      widgets = widgets.filter((w) => w.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      widgets = widgets.filter(
        (w) =>
          w.name.toLowerCase().includes(query) ||
          w.type.toLowerCase().includes(query) ||
          w.description.toLowerCase().includes(query)
      );
    }

    return widgets;
  }, [searchQuery, selectedCategory]);

  const handleDragStart = (e: React.DragEvent, widget: WidgetDefinition) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ newWidget: true, type: widget.type })
    );
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleWidgetClick = (widget: WidgetDefinition) => {
    const newWidget = createDefaultWidget(widget.type);
    
    if (target === 'header' && onAddToHeader) {
      onAddToHeader(newWidget);
    } else if (target === 'column' && onAddToColumn && columns && columns.length > 0) {
      onAddToColumn(selectedColumnIndex, newWidget);
    } else {
      onWidgetSelect(widget);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 h-full">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Widgets ({WIDGET_DEFINITIONS.length})</span>
      </div>

      {/* Target selector */}
      {onAddToHeader && (
        <div className="py-2 border-b border-border">
          <label className="text-xs text-text-muted block mb-1.5">Add to:</label>
          <div className="flex gap-1.5">
            <button
              className={`flex-1 py-1.5 px-2 text-[11px] bg-bg-tertiary border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-150 hover:bg-bg-elevated hover:text-text-primary ${target === 'header' ? 'bg-accent text-bg-primary border-accent shadow-sm shadow-accent/20' : ''}`}
              onClick={() => setTarget('header')}
            >
              Header
            </button>
            <button
              className={`flex-1 py-1.5 px-2 text-[11px] bg-bg-tertiary border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-150 hover:bg-bg-elevated hover:text-text-primary ${target === 'column' ? 'bg-accent text-bg-primary border-accent shadow-sm shadow-accent/20' : ''}`}
              onClick={() => setTarget('column')}
            >
              Column
            </button>
          </div>
        </div>
      )}

      {/* Column selector if multiple columns exist */}
      {target === 'column' && columns && columns.length > 1 && (
        <div className="py-2 border-b border-border">
          <label className="text-xs text-text-muted block mb-1.5">Add to column:</label>
          <div className="flex gap-1.5">
            {columns.map((col, idx) => (
              <button
                key={idx}
                className={`flex-1 py-1.5 px-2 text-[11px] bg-bg-tertiary border border-border rounded-md text-text-secondary cursor-pointer transition-all duration-150 hover:bg-bg-elevated hover:text-text-primary ${selectedColumnIndex === idx ? 'bg-accent text-bg-primary border-accent shadow-sm shadow-accent/20' : ''}`}
                onClick={() => setSelectedColumnIndex(idx)}
              >
                {idx + 1} ({col.size})
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="relative mb-2">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        <input
          type="text"
          placeholder="Search widgets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-3 py-2 bg-bg-primary border border-border rounded-md text-text-primary text-sm focus:outline-none focus:border-accent transition-colors placeholder:text-text-muted"
        />
      </div>

      <div className="flex flex-wrap gap-1 mb-2">
        <button
          className={`flex items-center gap-1 px-2 py-1.5 border-none bg-bg-tertiary text-text-secondary text-[11px] rounded-md cursor-pointer transition-all duration-150 hover:bg-bg-elevated font-medium ${selectedCategory === null ? 'bg-accent text-bg-primary' : ''}`}
          onClick={() => setSelectedCategory(null)}
        >
          All
        </button>
        {WIDGET_CATEGORIES.map((cat) => {
          const CategoryIcon = cat.icon;
          return (
            <button
              key={cat.id}
              className={`flex items-center gap-1 px-2 py-1.5 border-none bg-bg-tertiary text-text-secondary text-[11px] rounded-md cursor-pointer transition-all duration-150 hover:bg-bg-elevated font-medium ${selectedCategory === cat.id ? 'bg-accent text-bg-primary' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
              title={cat.name}
            >
              <CategoryIcon size={14} />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-1 overflow-y-auto flex-1 h-full scrollbar-thin">
        {filteredWidgets.length === 0 ? (
          <div className="text-center text-text-muted text-sm p-4 bg-bg-secondary/30 rounded-md border border-border border-dashed">
            No widgets found
          </div>
        ) : (
          filteredWidgets.map((widget) => {
            const WidgetIcon = widget.icon;
            return (
              <div
                key={widget.type}
                className="flex items-center gap-3 p-2.5 bg-bg-tertiary rounded-md border border-transparent cursor-pointer transition-all duration-150 hover:bg-bg-elevated hover:border-border active:cursor-grabbing group shadow-sm"
                draggable
                onDragStart={(e) => handleDragStart(e, widget)}
                onClick={() => handleWidgetClick(widget)}
                title={widget.description}
              >
                <span className="flex items-center justify-center text-text-muted group-hover:text-accent transition-colors">
                  <WidgetIcon size={20} />
                </span>
                <div className="flex-1 min-w-0 flex flex-col">
                  <span className="text-sm font-semibold truncate group-hover:text-accent transition-colors">{widget.name}</span>
                  <span className="text-[10px] text-text-muted font-mono">{widget.type}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
