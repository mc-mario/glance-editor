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
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[0.75rem] font-semibold uppercase tracking-wider text-text-secondary">
          Columns ({columns.length}/{maxColumns})
        </span>
        <button
          className="w-7 h-7 flex items-center justify-center p-0 border-none rounded-md bg-bg-tertiary text-text-primary cursor-pointer transition-all duration-150 ease-in-out hover:bg-bg-elevated disabled:bg-bg-tertiary disabled:text-text-muted disabled:cursor-not-allowed"
          onClick={handleAddColumn}
          disabled={columns.length >= maxColumns}
          title="Add column"
        >
          +
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <span className={`px-2 py-1 rounded text-xs font-medium ${fullColumns >= 1 ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
          {fullColumns} full column{fullColumns !== 1 ? 's' : ''}
        </span>
        {fullColumns < 1 && (
          <span className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-warning/10 text-warning">
            <AlertTriangle size={14} /> At least 1 full column required
          </span>
        )}
        {fullColumns > 2 && (
          <span className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-warning/10 text-warning">
            <AlertTriangle size={14} /> Maximum 2 full columns
          </span>
        )}
      </div>

      <div className="flex gap-2">
        {columns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className={`flex-1 min-w-0 bg-bg-primary border-2 border-dashed border-border rounded-lg p-2 transition-all duration-150 ease-in-out hover:border-bg-elevated ${column.size === 'full' ? 'flex-[2]' : ''}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, columnIndex, column.widgets.length)}
          >
            <div className="flex items-center justify-between mb-2">
              <button
                className={`px-2 py-1 border-none rounded text-[0.7rem] font-semibold uppercase cursor-pointer transition-all duration-150 ease-in-out ${column.size === 'full' ? 'bg-success/20 text-success' : 'bg-nord5/20 text-text-secondary'}`}
                onClick={() => handleToggleSize(columnIndex)}
                title={`Click to change to ${column.size === 'full' ? 'small' : 'full'}`}
              >
                {column.size}
              </button>
              <button
                className="w-5.5 h-5.5 flex items-center justify-center p-0 border-none rounded-md bg-error/20 text-error text-xs cursor-pointer transition-all duration-150 ease-in-out hover:bg-error/30 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleRemoveColumn(columnIndex)}
                disabled={columns.length <= 1}
                title="Remove column"
              >
                ×
              </button>
            </div>

            <div className="flex flex-col gap-1 min-height-[60px]">
              {column.widgets.length === 0 ? (
                <div className="flex items-center justify-center h-[60px] text-text-muted text-xs border border-dashed border-border rounded">
                  Drop widgets here
                </div>
              ) : (
                column.widgets.map((widget, widgetIndex) => {
                  const def = getWidgetDefinition(widget.type);
                  const widgetKey = getWidgetKey(columnIndex, widgetIndex);
                  return (
                    <div
                      key={widgetKey}
                      className={`flex items-center gap-2 p-2 bg-bg-secondary rounded-md cursor-grab transition-all duration-150 ease-in-out border-2 ${selectedWidgetId === widgetKey ? 'border-accent' : ''} hover:bg-bg-elevated active:cursor-grabbing group`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, columnIndex, widgetIndex)}
                      onClick={() => onWidgetSelect(columnIndex, widgetIndex)}
                    >
                      <span className="text-[1.25rem] flex items-center justify-center text-text-secondary">
                        {def?.icon ? <def.icon size={18} /> : <Package size={18} />}
                      </span>
                      <span className="flex-1 min-w-0 flex flex-col">
                        <span className="text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                          {widget.title || def?.name || widget.type}
                        </span>
                        <span className="text-[0.65rem] text-text-muted">{widget.type}</span>
                      </span>
                      <button
                        className="w-5.5 h-5.5 flex items-center justify-center p-0 border-none rounded-md bg-error/20 text-error text-xs cursor-pointer transition-all duration-150 ease-in-out hover:bg-error/30 opacity-0 group-hover:opacity-100"
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
