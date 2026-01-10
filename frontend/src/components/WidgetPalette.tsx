import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import {
  WIDGET_DEFINITIONS,
  WIDGET_CATEGORIES,
  type WidgetDefinition,
} from '../widgetDefinitions';

interface WidgetPaletteProps {
  onWidgetSelect: (definition: WidgetDefinition) => void;
}

export function WidgetPalette({ onWidgetSelect }: WidgetPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  return (
    <div className="widget-palette">
      <div className="palette-header">
        <span className="section-title">Widgets ({WIDGET_DEFINITIONS.length})</span>
      </div>

      <div className="palette-search">
        <Search size={16} className="palette-search-icon" />
        <input
          type="text"
          placeholder="Search widgets..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="palette-categories">
        <button
          className={`category-btn ${selectedCategory === null ? 'active' : ''}`}
          onClick={() => setSelectedCategory(null)}
        >
          All
        </button>
        {WIDGET_CATEGORIES.map((cat) => {
          const CategoryIcon = cat.icon;
          return (
            <button
              key={cat.id}
              className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
              title={cat.name}
            >
              <CategoryIcon size={14} />
              <span>{cat.name}</span>
            </button>
          );
        })}
      </div>

      <div className="palette-widgets">
        {filteredWidgets.length === 0 ? (
          <div className="palette-empty">
            No widgets found
          </div>
        ) : (
          filteredWidgets.map((widget) => {
            const WidgetIcon = widget.icon;
            return (
              <div
                key={widget.type}
                className="palette-widget"
                draggable
                onDragStart={(e) => handleDragStart(e, widget)}
                onClick={() => onWidgetSelect(widget)}
                title={widget.description}
              >
                <span className="palette-widget-icon">
                  <WidgetIcon size={18} />
                </span>
                <div className="palette-widget-info">
                  <span className="palette-widget-name">{widget.name}</span>
                  <span className="palette-widget-type">{widget.type}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
