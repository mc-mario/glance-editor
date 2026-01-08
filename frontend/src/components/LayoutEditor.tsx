import { GripVertical, Trash2, Pencil, Package } from 'lucide-react';
import type { PageConfig, ColumnConfig, WidgetConfig } from '../types';
import { getWidgetDefinition } from '../widgetDefinitions';

interface LayoutEditorProps {
  page: PageConfig;
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
  onWidgetEdit?: (columnIndex: number, widgetIndex: number) => void;
}

export function LayoutEditor({
  page,
  selectedWidgetId,
  onColumnsChange,
  onWidgetSelect,
  onWidgetDelete,
  onWidgetMove,
  onWidgetEdit,
}: LayoutEditorProps) {
  const { columns } = page;
  const maxColumns = page.width === 'slim' ? 2 : 3;
  const fullColumns = columns.filter((c) => c.size === 'full').length;

  const handleAddColumn = () => {
    if (columns.length >= maxColumns) return;
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

      if (data.newWidget) {
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
    <div className="layout-editor">
      {/* Page Header */}
      <div className="layout-editor-header">
        <div className="layout-header-info">
          <h2 className="layout-page-name">{page.name}</h2>
          <span className="layout-page-meta">
            {columns.length} column{columns.length !== 1 ? 's' : ''} | {page.width || 'default'} width
          </span>
        </div>
        <div className="layout-header-actions">
          <span className={`layout-badge ${fullColumns >= 1 ? 'valid' : 'invalid'}`}>
            {fullColumns} full
          </span>
          <button
            className="btn btn-secondary"
            onClick={handleAddColumn}
            disabled={columns.length >= maxColumns}
          >
            + Add Column
          </button>
        </div>
      </div>

      {/* Layout Warnings */}
      {(fullColumns < 1 || fullColumns > 2) && (
        <div className="layout-warning-banner">
          {fullColumns < 1 && 'At least 1 full column required'}
          {fullColumns > 2 && 'Maximum 2 full columns allowed'}
        </div>
      )}

      {/* Column Grid */}
      <div className="layout-columns">
        {columns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className={`layout-column ${column.size}`}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, columnIndex, column.widgets.length)}
          >
            {/* Column Header */}
            <div className="layout-column-header">
              <button
                className={`column-size-badge ${column.size}`}
                onClick={() => handleToggleSize(columnIndex)}
                title={`Click to change to ${column.size === 'full' ? 'small' : 'full'}`}
              >
                {column.size.toUpperCase()}
              </button>
              <span className="column-widget-count">
                {column.widgets.length} widget{column.widgets.length !== 1 ? 's' : ''}
              </span>
              <button
                className="btn-icon btn-icon-sm btn-danger"
                onClick={() => handleRemoveColumn(columnIndex)}
                disabled={columns.length <= 1}
                title="Remove column"
              >
                <Trash2 size={14} />
              </button>
            </div>

            {/* Widgets */}
            <div className="layout-column-widgets">
              {column.widgets.length === 0 ? (
                <div
                  className="layout-column-empty"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, columnIndex, 0)}
                >
                  <span className="empty-icon">+</span>
                  <span className="empty-text">Drop widgets here</span>
                </div>
              ) : (
                column.widgets.map((widget, widgetIndex) => {
                  const def = getWidgetDefinition(widget.type);
                  const widgetKey = getWidgetKey(columnIndex, widgetIndex);
                  const isSelected = selectedWidgetId === widgetKey;
                  const WidgetIcon = def?.icon || Package;

                  return (
                    <div
                      key={widgetKey}
                      className={`layout-widget ${isSelected ? 'selected' : ''}`}
                      draggable
                      onDragStart={(e) => handleDragStart(e, columnIndex, widgetIndex)}
                      onClick={() => onWidgetSelect(columnIndex, widgetIndex)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => {
                        e.stopPropagation();
                        handleDrop(e, columnIndex, widgetIndex);
                      }}
                    >
                      <div className="layout-widget-drag-handle">
                        <GripVertical size={14} />
                      </div>
                      <span className="layout-widget-icon">
                        <WidgetIcon size={18} />
                      </span>
                      <div className="layout-widget-info">
                        <span className="layout-widget-title">
                          {widget.title || def?.name || widget.type}
                        </span>
                        <span className="layout-widget-type">{widget.type}</span>
                      </div>
                      <div className="layout-widget-actions">
                        {onWidgetEdit && (
                          <button
                            className="layout-widget-edit"
                            onClick={(e) => {
                              e.stopPropagation();
                              onWidgetEdit(columnIndex, widgetIndex);
                            }}
                            title="Edit widget"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                        <button
                          className="layout-widget-delete"
                          onClick={(e) => {
                            e.stopPropagation();
                            onWidgetDelete(columnIndex, widgetIndex);
                          }}
                          title="Delete widget"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Help Text */}
      <div className="layout-help">
        Drag widgets to reorder. Click to select, double-click to edit. Use the sidebar to add new widgets or edit page settings.
      </div>
    </div>
  );
}
