import { useState, useRef, useCallback } from 'react';
import { GripVertical, Trash2, Pencil, Package, Plus } from 'lucide-react';
import type { PageConfig, ColumnConfig, WidgetConfig } from '../types';
import { getWidgetDefinition } from '../widgetDefinitions';

interface DragState {
  isDragging: boolean;
  sourceColumn: number;
  sourceWidget: number;
  targetColumn: number | null;
  targetWidget: number | null;
}

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
  onWidgetDelete,
  onWidgetMove,
  onWidgetEdit,
  onOpenWidgetPalette,
}: LayoutEditorProps) {
  const { columns } = page;
  const maxColumns = page.width === 'slim' ? 2 : 3;
  const fullColumns = columns.filter((c) => c.size === 'full').length;
  
  // Drag state for animations
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    sourceColumn: -1,
    sourceWidget: -1,
    targetColumn: null,
    targetWidget: null,
  });
  
  // Track recently dropped widget for bounce animation
  const [droppedWidget, setDroppedWidget] = useState<string | null>(null);
  
  // Throttle drag updates to prevent flickering
  const lastDragUpdateRef = useRef<number>(0);
  const DRAG_THROTTLE_MS = 50;

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

  const handleDragStart = useCallback((
    e: React.DragEvent,
    columnIndex: number,
    widgetIndex: number
  ) => {
    // Set drag data
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({ columnIndex, widgetIndex })
    );
    e.dataTransfer.effectAllowed = 'move';
    
    // Create custom drag image (ghost)
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
    ghost.classList.add('drag-ghost');
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, rect.width / 2, 20);
    
    // Clean up ghost element after drag starts
    requestAnimationFrame(() => {
      setTimeout(() => ghost.remove(), 0);
    });
    
    // Update drag state
    setDragState({
      isDragging: true,
      sourceColumn: columnIndex,
      sourceWidget: widgetIndex,
      targetColumn: null,
      targetWidget: null,
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState({
      isDragging: false,
      sourceColumn: -1,
      sourceWidget: -1,
      targetColumn: null,
      targetWidget: null,
    });
  }, []);

  const handleDragOver = useCallback((
    e: React.DragEvent,
    columnIndex: number,
    widgetIndex: number
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Throttle updates to prevent flickering
    const now = Date.now();
    if (now - lastDragUpdateRef.current < DRAG_THROTTLE_MS) return;
    lastDragUpdateRef.current = now;
    
    // Use functional setState to avoid stale closure issues
    setDragState(prev => {
      if (!prev.isDragging) return prev;
      if (prev.targetColumn === columnIndex && prev.targetWidget === widgetIndex) return prev;
      return { ...prev, targetColumn: columnIndex, targetWidget: widgetIndex };
    });
  }, []);

  const handleDrop = useCallback((
    e: React.DragEvent,
    toColumnIndex: number,
    toWidgetIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.newWidget) return;

      const { columnIndex: fromColumnIndex, widgetIndex: fromWidgetIndex } = data;
      if (fromColumnIndex !== undefined && fromWidgetIndex !== undefined) {
        // Calculate the actual target index after the move
        let actualTargetWidget = toWidgetIndex;
        if (fromColumnIndex === toColumnIndex && fromWidgetIndex < toWidgetIndex) {
          actualTargetWidget = toWidgetIndex;
        }
        
        // Set dropped widget for bounce animation
        const droppedKey = `${toColumnIndex}-${actualTargetWidget}`;
        setDroppedWidget(droppedKey);
        setTimeout(() => setDroppedWidget(null), 400);
        
        onWidgetMove(fromColumnIndex, fromWidgetIndex, toColumnIndex, toWidgetIndex);
      }
    } catch {
      // Invalid drag data
    }
    
    // Reset drag state
    setDragState({
      isDragging: false,
      sourceColumn: -1,
      sourceWidget: -1,
      targetColumn: null,
      targetWidget: null,
    });
  }, [onWidgetMove]);

  const getWidgetKey = (columnIndex: number, widgetIndex: number): string => {
    return `${columnIndex}-${widgetIndex}`;
  };
  
  // Check if this widget position should show a drop placeholder
  const shouldShowPlaceholder = (columnIndex: number, widgetIndex: number): boolean => {
    if (!dragState.isDragging) return false;
    if (dragState.targetColumn !== columnIndex) return false;
    if (dragState.targetWidget !== widgetIndex) return false;
    // Don't show placeholder at the source widget's exact position
    if (dragState.sourceColumn === columnIndex && dragState.sourceWidget === widgetIndex) return false;
    return true;
  };
  
  // Check if widget is being dragged
  const isWidgetDragging = (columnIndex: number, widgetIndex: number): boolean => {
    return dragState.isDragging && 
           dragState.sourceColumn === columnIndex && 
           dragState.sourceWidget === widgetIndex;
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
            className={`layout-column ${column.size} ${
              dragState.isDragging && dragState.targetColumn === columnIndex ? 'drag-over' : ''
            }`}
            onDragOver={(e) => handleDragOver(e, columnIndex, column.widgets.length)}
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
                  className={`layout-column-empty layout-column-empty-clickable ${
                    dragState.isDragging && dragState.targetColumn === columnIndex ? 'drag-target' : ''
                  }`}
                  onDragOver={(e) => handleDragOver(e, columnIndex, 0)}
                  onDrop={(e) => handleDrop(e, columnIndex, 0)}
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
                  const isDragging = isWidgetDragging(columnIndex, widgetIndex);
                  const showPlaceholder = shouldShowPlaceholder(columnIndex, widgetIndex);
                  const isDropped = droppedWidget === widgetKey;

                  return (
                    <div key={widgetKey} className="layout-widget-wrapper">
                      {showPlaceholder && (
                        <div className="layout-widget-placeholder" />
                      )}
                      <div
                        className={`layout-widget ${isSelected ? 'selected' : ''} ${
                          isDragging ? 'dragging' : ''
                        } ${isDropped ? 'dropped' : ''}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, columnIndex, widgetIndex)}
                        onDragEnd={handleDragEnd}
                        onClick={() => onWidgetSelect(columnIndex, widgetIndex)}
                        onDragOver={(e) => {
                          e.stopPropagation();
                          handleDragOver(e, columnIndex, widgetIndex);
                        }}
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
                    </div>
                  );
                })
              )}
              {/* Show placeholder at end of column if dragging to end */}
              {column.widgets.length > 0 && 
               dragState.isDragging && 
               dragState.targetColumn === columnIndex && 
               dragState.targetWidget === column.widgets.length && (
                <div className="layout-widget-placeholder" />
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
