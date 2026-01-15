import { AlertTriangle, Package } from 'lucide-react';
import type { ColumnConfig, WidgetConfig } from '../types';
import { getWidgetDefinition } from '../widgetDefinitions';

interface ColumnDesignerProps {
  columns: ColumnConfig[];
  pageWidth?: 'wide' | 'slim';
  selectedWidgetId: string | null;
  onColumnsChange: (columns: ColumnConfig[]) => void;
  onWidgetSelect: (columnIndex: number, widgetIndex: number) => void;
  onWidgetAdd: (columnIndex: number, widget: WidgetConfig) => void;
  onWidgetDelete: (columnIndex: number, widgetIndex: number) => void;
  onWidgetMove: (
    fromColumn: number,
    fromWidget: number,
    toColumn: number,
    toWidget: number
  ) => void;
}

export function ColumnDesigner({
  columns,
  pageWidth,
  selectedWidgetId,
  onColumnsChange,
  onWidgetSelect,
  onWidgetDelete,
  onWidgetMove,
}: ColumnDesignerProps) {
  const maxColumns = pageWidth === 'slim' ? 2 : 3;
  const fullColumns = columns.filter((c) => c.size === 'full').length;

  const handleAddColumn = () => {
    if (columns.length >= maxColumns) return;

    // New columns should be small, unless we don't have any full columns
    const newSize = fullColumns === 0 ? 'full' : 'small';
    onColumnsChange([...columns, { size: newSize, widgets: [] }]);
  };

  const handleRemoveColumn = (index: number) => {
    if (columns.length <= 1) return;
    const newColumns = columns.filter((_, i) => i !== index);
    onColumnsChange(newColumns);
  };

  const handleToggleSize = (index: number) => {
    const currentSize = columns[index].size;
    const newSize = currentSize === 'full' ? 'small' : 'full';

    // Validate: must have at least 1 full column, max 2 full columns
    const newFullCount = fullColumns + (newSize === 'full' ? 1 : -1);
    if (newFullCount < 1 || newFullCount > 2) return;

    const newColumns = columns.map((col, i) =>
      i === index ? { ...col, size: newSize } : col
    );
    onColumnsChange(newColumns as ColumnConfig[]);
  };

  const handleDragStart = (
    e: React.DragEvent,
    columnIndex: number,
    widgetIndex: number
  ) => {
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ columnIndex, widgetIndex })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (
    e: React.DragEvent,
    toColumnIndex: number,
    toWidgetIndex: number
  ) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      // Check if this is a new widget from palette
      if (data.newWidget) {
        // This will be handled by the parent
        return;
      }
      
      const { columnIndex: fromColumnIndex, widgetIndex: fromWidgetIndex } = data;
      if (fromColumnIndex !== undefined && fromWidgetIndex !== undefined) {
        onWidgetMove(fromColumnIndex, fromWidgetIndex, toColumnIndex, toWidgetIndex);
      }
    } catch {
      // Invalid drag data
    }
  };

  const getWidgetKey = (columnIndex: number, widgetIndex: number): string => {
    return `${columnIndex}-${widgetIndex}`;
  };

  return (
    <div className="column-designer">
      <div className="column-designer-header">
        <span className="section-title">
          Columns ({columns.length}/{maxColumns})
        </span>
        <button
          className="btn-icon"
          onClick={handleAddColumn}
          disabled={columns.length >= maxColumns}
          title="Add column"
        >
          +
        </button>
      </div>

      <div className="column-layout-info">
        <span className={`layout-badge ${fullColumns >= 1 ? 'valid' : 'invalid'}`}>
          {fullColumns} full column{fullColumns !== 1 ? 's' : ''}
        </span>
        {fullColumns < 1 && (
          <span className="layout-warning"><AlertTriangle size={14} /> At least 1 full column required</span>
        )}
        {fullColumns > 2 && (
          <span className="layout-warning"><AlertTriangle size={14} /> Maximum 2 full columns</span>
        )}
      </div>

      <div className="columns-container">
        {columns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className={`column-box ${column.size}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, columnIndex, column.widgets.length)}
          >
            <div className="column-header">
              <button
                className={`column-size-toggle ${column.size}`}
                onClick={() => handleToggleSize(columnIndex)}
                title={`Click to change to ${column.size === 'full' ? 'small' : 'full'}`}
              >
                {column.size}
              </button>
              <button
                className="btn-icon btn-icon-sm btn-danger"
                onClick={() => handleRemoveColumn(columnIndex)}
                disabled={columns.length <= 1}
                title="Remove column"
              >
                ×
              </button>
            </div>

            <div className="column-widgets">
              {column.widgets.length === 0 ? (
                <div className="column-empty">
                  Drop widgets here
                </div>
              ) : (
                column.widgets.map((widget, widgetIndex) => {
                  const def = getWidgetDefinition(widget.type);
                  const widgetKey = getWidgetKey(columnIndex, widgetIndex);
                  return (
                    <div
                      key={widgetKey}
                      className={`widget-card ${selectedWidgetId === widgetKey ? 'selected' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, columnIndex, widgetIndex)}
                      onClick={() => onWidgetSelect(columnIndex, widgetIndex)}
                    >
                      <span className="widget-icon">
                        {def?.icon ? <def.icon size={18} /> : <Package size={18} />}
                      </span>
                      <span className="widget-info">
                        <span className="widget-title">
                          {widget.title || def?.name || widget.type}
                        </span>
                        <span className="widget-type">{widget.type}</span>
                      </span>
                      <button
                        className="btn-icon btn-icon-sm btn-danger widget-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          onWidgetDelete(columnIndex, widgetIndex);
                        }}
                        title="Delete widget"
                      >
                        ×
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
