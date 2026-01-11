import { useRef } from 'react';
import { GripVertical, Trash2, Pencil, Package, Plus } from 'lucide-react';
import type { PageConfig, ColumnConfig, WidgetConfig } from '../types';
import { getWidgetDefinition, createDefaultWidget } from '../widgetDefinitions';

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
  onOpenWidgetPalette?: () => void;
}

export function LayoutEditor({
  page,
  selectedWidgetId,
  onColumnsChange,
  onWidgetSelect,
  onWidgetAdd,
  onWidgetDelete,
  onWidgetMove,
  onWidgetEdit,
  onOpenWidgetPalette,
}: LayoutEditorProps) {
  const { columns } = page;
  const maxColumns = page.width === 'slim' ? 2 : 3;
  const fullColumns = columns.filter((c) => c.size === 'full').length;
  
  // Track dragging element ref to add visual class
  const dragSourceRef = useRef<HTMLElement | null>(null);

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
    
    // Add dragging class directly to DOM
    const target = e.currentTarget as HTMLElement;
    dragSourceRef.current = target;
    // Use setTimeout to allow drag image to be captured first
    setTimeout(() => {
      target.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Remove dragging class
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('dragging');
    dragSourceRef.current = null;
    
    // Clean up any lingering drag-over classes and indicators
    document.querySelectorAll('.drag-over, .drag-target, .drop-indicator-before, .drop-indicator-after').forEach(el => {
      el.classList.remove('drag-over', 'drag-target', 'drop-indicator-before', 'drop-indicator-after');
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Accept both 'move' (reordering) and 'copy' (from palette)
    if (e.dataTransfer.effectAllowed === 'copy') {
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'move';
    }
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    // Don't highlight the source element
    if (target !== dragSourceRef.current) {
      target.classList.add('drag-over');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    const related = e.relatedTarget as HTMLElement;
    // Only remove if we're actually leaving this element (not entering a child)
    if (!target.contains(related)) {
      target.classList.remove('drag-over');
    }
  };

  const handleDrop = (
    e: React.DragEvent,
    toColumnIndex: number,
    toWidgetIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Clean up drag-over classes
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over', 'drag-target');
    clearInsertIndicators();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      // Handle new widget from palette
      if (data.newWidget && data.type) {
        const newWidget = createDefaultWidget(data.type);
        onWidgetAdd(toColumnIndex, newWidget);
        return;
      }

      // Handle existing widget move
      const { columnIndex: fromColumnIndex, widgetIndex: fromWidgetIndex } = data;
      if (fromColumnIndex !== undefined && fromWidgetIndex !== undefined) {
        onWidgetMove(fromColumnIndex, fromWidgetIndex, toColumnIndex, toWidgetIndex);
      }
    } catch {
      // Invalid drag data
    }
  };
  
  // Helper to clear all insertion indicators
  const clearInsertIndicators = () => {
    document.querySelectorAll('.drop-indicator-before, .drop-indicator-after').forEach(el => {
      el.classList.remove('drop-indicator-before', 'drop-indicator-after');
    });
  };
  
  // Show insertion indicator based on mouse position
  const showInsertIndicator = (e: React.DragEvent, element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    
    clearInsertIndicators();
    
    if (e.clientY < midY) {
      element.classList.add('drop-indicator-before');
    } else {
      element.classList.add('drop-indicator-after');
    }
  };

  const getWidgetKey = (columnIndex: number, widgetIndex: number): string => {
    return `${columnIndex}-${widgetIndex}`;
  };

  return (
    <div className="layout-editor">
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

      {(fullColumns < 1 || fullColumns > 2) && (
        <div className="layout-warning-banner">
          {fullColumns < 1 && 'At least 1 full column required'}
          {fullColumns > 2 && 'Maximum 2 full columns allowed'}
        </div>
      )}

      <div className="layout-columns">
        {columns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className={`layout-column ${column.size}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, columnIndex, column.widgets.length)}
          >
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

            <div className="layout-column-widgets">
              {column.widgets.length === 0 ? (
                <div
                  className="layout-column-empty layout-column-empty-clickable"
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    (e.currentTarget as HTMLElement).classList.add('drag-target');
                  }}
                  onDragLeave={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    const related = e.relatedTarget as HTMLElement;
                    if (!target.contains(related)) {
                      target.classList.remove('drag-target');
                    }
                  }}
                  onDrop={(e) => {
                    (e.currentTarget as HTMLElement).classList.remove('drag-target');
                    handleDrop(e, columnIndex, 0);
                  }}
                  onClick={onOpenWidgetPalette}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenWidgetPalette?.();
                    }
                  }}
                >
                  <span className="empty-icon"><Plus size={24} /></span>
                  <span className="empty-text">Drop widgets here</span>
                  <span className="empty-hint">or click to browse</span>
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
                      onDragEnd={handleDragEnd}
                      onClick={() => onWidgetSelect(columnIndex, widgetIndex)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                        // Show insertion indicator based on mouse position
                        if (e.currentTarget !== dragSourceRef.current) {
                          showInsertIndicator(e, e.currentTarget as HTMLElement);
                        }
                      }}
                      onDragEnter={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDragLeave={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        const related = e.relatedTarget as HTMLElement;
                        if (!target.contains(related)) {
                          target.classList.remove('drop-indicator-before', 'drop-indicator-after');
                        }
                      }}
                      onDrop={(e) => {
                        const target = e.currentTarget as HTMLElement;
                        const rect = target.getBoundingClientRect();
                        const insertAfter = e.clientY >= rect.top + rect.height / 2;
                        target.classList.remove('drop-indicator-before', 'drop-indicator-after');
                        // Adjust drop index based on indicator position
                        const dropIndex = insertAfter ? widgetIndex + 1 : widgetIndex;
                        handleDrop(e, columnIndex, dropIndex);
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

      <div className="layout-help">
        Drag widgets to reorder. Click to select, double-click to edit.
      </div>
    </div>
  );
}
