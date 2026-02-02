import { useRef, useState } from 'react';
import { GripVertical, Trash2, Pencil, Package, Plus, EyeOff } from 'lucide-react';
import type { PageConfig, ColumnConfig, WidgetConfig } from '../types';
import { getWidgetDefinition, createDefaultWidget } from '../widgetDefinitions';
import { WidgetContextMenu } from './WidgetContextMenu';

interface ContextMenuState {
  widget: WidgetConfig;
  columnIndex: number;
  widgetIndex: number;
  position: { x: number; y: number };
}

interface LayoutEditorProps {
  page: PageConfig;
  pages?: PageConfig[];
  currentPageIndex?: number;
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
  onOpenWidgetPalette?: (target?: 'header' | 'column') => void;
  onCopyWidgetToPage?: (targetPageIndex: number, widget: WidgetConfig) => void;
  onMoveWidgetToPage?: (targetPageIndex: number, sourceColumnIndex: number, sourceWidgetIndex: number, widget: WidgetConfig) => void;
  onViewWidgetInYaml?: (columnIndex: number, widgetIndex: number) => void;
  onToggleWidgetDeactivate: (columnIndex: number, widgetIndex: number, deactivated: boolean) => void;
  onHeadWidgetSelect?: (widgetIndex: number) => void;
  onHeadWidgetAdd?: (widget: WidgetConfig) => void;
  onHeadWidgetDelete?: (widgetIndex: number) => void;
  onHeadWidgetMove?: (fromIndex: number, toIndex: number) => void;
  onHeadWidgetEdit?: (widgetIndex: number) => void;
}

export function LayoutEditor({
  page,
  pages = [],
  currentPageIndex = 0,
  selectedWidgetId,
  onColumnsChange,
  onWidgetSelect,
  onWidgetAdd,
  onWidgetDelete,
  onWidgetMove,
  onWidgetEdit,
  onOpenWidgetPalette,
  onCopyWidgetToPage,
  onMoveWidgetToPage,
  onViewWidgetInYaml,
  onToggleWidgetDeactivate,
  onHeadWidgetSelect,
  onHeadWidgetAdd,
  onHeadWidgetDelete,
  onHeadWidgetMove: _onHeadWidgetMove,
  onHeadWidgetEdit,
}: LayoutEditorProps) {
  const { columns } = page;
  const maxColumns = page.width === 'slim' ? 2 : 3;
  const fullColumns = columns.filter((c) => c.size === 'full').length;
  const dragSourceRef = useRef<HTMLElement | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

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
    
    const target = e.currentTarget as HTMLElement;
    dragSourceRef.current = target;
    setTimeout(() => {
      target.classList.add('dragging');
    }, 0);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('dragging');
    dragSourceRef.current = null;
    document.querySelectorAll('.drag-over, .drag-target, .drop-indicator-before, .drop-indicator-after').forEach(el => {
      el.classList.remove('drag-over', 'drag-target', 'drop-indicator-before', 'drop-indicator-after');
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.effectAllowed === 'copy') {
      e.dataTransfer.dropEffect = 'copy';
    } else {
      e.dataTransfer.dropEffect = 'move';
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
    const related = e.relatedTarget as HTMLElement;
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
    
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over', 'drag-target');
    clearInsertIndicators();
    
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      
      if (data.newWidget && data.type) {
        const newWidget = createDefaultWidget(data.type);
        onWidgetAdd(toColumnIndex, newWidget);
        return;
      }

      const { columnIndex: fromColumnIndex, widgetIndex: fromWidgetIndex } = data;
      if (fromColumnIndex !== undefined && fromWidgetIndex !== undefined) {
        onWidgetMove(fromColumnIndex, fromWidgetIndex, toColumnIndex, toWidgetIndex);
      }
    } catch {
      // Invalid drag data, ignore
    }
  };
  
  const clearInsertIndicators = () => {
    document.querySelectorAll('.drop-indicator-before, .drop-indicator-after').forEach(el => {
      el.classList.remove('drop-indicator-before', 'drop-indicator-after');
    });
  };
  
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

  const handleWidgetContextMenu = (
    e: React.MouseEvent,
    widget: WidgetConfig,
    columnIndex: number,
    widgetIndex: number
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      widget,
      columnIndex,
      widgetIndex,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  return (
    <div className="flex flex-col h-full p-6">
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-semibold">{page.name}</h2>
          <span className="text-xs text-text-secondary">
            {columns.length} column{columns.length !== 1 ? 's' : ''} | {page.width || 'default'} width
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className={`px-2 py-1 rounded text-xs font-medium ${fullColumns >= 1 ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
            {fullColumns} full
          </span>
          <button
            className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-150 ease-in-out border-none bg-bg-tertiary text-text-primary hover:bg-bg-elevated disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleAddColumn}
            disabled={columns.length >= maxColumns}
          >
            <Plus size={16} />
            Add Column
          </button>
        </div>
      </div>

      {(fullColumns < 1 || fullColumns > 2) && (
        <div className="px-4 py-3 bg-warning/10 border border-warning/30 rounded-md text-warning text-sm mb-4">
          {fullColumns < 1 && 'At least 1 full column required'}
          {fullColumns > 2 && 'Maximum 2 full columns allowed'}
        </div>
      )}

      {onHeadWidgetAdd && (
        <div className="mb-4 pb-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-accent">Header Widgets</h3>
              {(page['head-widgets']?.length || 0) > 0 && (
                <span className="text-xs text-text-muted">({page['head-widgets']!.length} widget{page['head-widgets']!.length !== 1 ? 's' : ''})</span>
              )}
            </div>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-all duration-150 ease-in-out border-none bg-bg-tertiary text-text-primary hover:bg-bg-elevated"
              onClick={() => onOpenWidgetPalette?.('header')}
              title="Add widget to header"
            >
              <Plus size={14} />
              Add
            </button>
          </div>
          {page['head-widgets'] && page['head-widgets'].length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {page['head-widgets'].map((widget, widgetIndex) => {
                const def = getWidgetDefinition(widget.type);
                const headWidgetKey = `head-${widgetIndex}`;
                const isSelected = selectedWidgetId === headWidgetKey;
                const isDeactivated = widget._deactivated === true;
                const WidgetIcon = def?.icon || Package;

                return (
                  <div
                    key={headWidgetKey}
                    className={`flex items-center gap-2 px-3 py-2 bg-bg-secondary border-2 rounded-lg transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] relative group whitespace-nowrap min-w-fit cursor-pointer ${
                      isDeactivated
                        ? 'opacity-50 cursor-not-allowed bg-bg-secondary/50 border-dashed border-border'
                        : 'hover:bg-bg-elevated hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
                    } ${isSelected ? 'border-accent bg-accent/15 shadow-[0_0_0_1px_rgba(141,212,224,0.3),0_4px_12px_rgba(141,212,224,0.15)]' : 'border-transparent'}`}
                    draggable={!isDeactivated}
                    onDragStart={(e) => {
                      if (!isDeactivated) {
                        e.dataTransfer.setData('application/json', JSON.stringify({ headWidgetIndex: true, widgetIndex }));
                        e.dataTransfer.effectAllowed = 'move';
                      }
                    }}
                    onClick={() => onHeadWidgetSelect?.(widgetIndex)}
                    onDoubleClick={() => onHeadWidgetEdit?.(widgetIndex)}
                    onContextMenu={(e) => handleWidgetContextMenu(e, widget, -1, widgetIndex)}
                  >
                    <span className="text-xl flex items-center justify-center text-text-secondary">
                      <WidgetIcon size={16} />
                    </span>
                    <div className="flex flex-col gap-0.5">
                      <span className={`text-sm font-medium ${isDeactivated ? 'line-through' : ''}`}>
                        {widget.title || def?.name || widget.type}
                      </span>
                      <span className="text-xs text-text-secondary">{widget.type}</span>
                    </div>
                    {onHeadWidgetDelete && (
                      <button
                        className="w-6 h-6 flex items-center justify-center p-0 border-none rounded bg-transparent text-text-muted cursor-pointer transition-all duration-150 hover:bg-error/20 hover:text-error opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          onHeadWidgetDelete(widgetIndex);
                        }}
                        title="Remove widget"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="border-2 border-dashed border-border rounded-lg p-4 text-center text-text-sm text-text-muted cursor-pointer hover:border-accent hover:text-accent transition-all duration-200"
              onClick={() => onOpenWidgetPalette?.('header')}
            >
              No header widgets. Click to add widgets that will appear above all columns.
            </div>
          )}
        </div>
      )}

      <div className="flex gap-4 flex-1 min-h-0">
        {columns.map((column, columnIndex) => (
          <div
            key={columnIndex}
            className={`flex-1 min-w-0 bg-nord2/30 border-2 border-dashed border-border rounded-xl p-4 flex flex-col transition-all duration-150 ease-in-out hover:border-bg-elevated ${column.size === 'full' ? 'flex-[2]' : ''}`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, columnIndex, column.widgets.length)}
          >
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-border">
              <button
                className={`px-2 py-1 border-none rounded text-[10px] font-semibold cursor-pointer transition-all duration-150 ease-in-out hover:brightness-110 ${column.size === 'full' ? 'bg-success/20 text-success' : 'bg-nord4/20 text-text-secondary'}`}
                onClick={() => handleToggleSize(columnIndex)}
                title={`Click to change to ${column.size === 'full' ? 'small' : 'full'}`}
              >
                {column.size.toUpperCase()}
              </button>
              <span className="flex-1 text-xs text-text-secondary">
                {column.widgets.length} widget{column.widgets.length !== 1 ? 's' : ''}
              </span>
              <button
                className="w-7 h-7 flex items-center justify-center p-0 border-none rounded-md bg-error/20 text-error text-base cursor-pointer transition-all duration-150 ease-in-out hover:bg-error/30 disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => handleRemoveColumn(columnIndex)}
                disabled={columns.length <= 1}
                title="Remove column"
              >
                <Trash2 size={14} />
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto min-h-24">
              {column.widgets.length === 0 ? (
                <div
                  className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg text-text-secondary cursor-pointer min-h-24 transition-all duration-200 ease-in-out bg-accent/5 hover:bg-accent/10 hover:border-accent hover:text-accent focus:outline-none focus:border-accent focus:shadow-[0_0_0_2px_rgba(136,192,208,0.2)]"
                  onDragOver={handleDragOver}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    (e.currentTarget as HTMLElement).classList.add('bg-accent/15', 'border-accent');
                  }}
                  onDragLeave={(e) => {
                    const target = e.currentTarget as HTMLElement;
                    const related = e.relatedTarget as HTMLElement;
                    if (!target.contains(related)) {
                      target.classList.remove('bg-accent/15', 'border-accent');
                    }
                  }}
                  onDrop={(e) => {
                    (e.currentTarget as HTMLElement).classList.remove('bg-accent/15', 'border-accent');
                    handleDrop(e, columnIndex, 0);
                  }}
                  onClick={() => onOpenWidgetPalette?.()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onOpenWidgetPalette?.();
                    }
                  }}
                >
                  <span className="text-3xl mb-2 opacity-50"><Plus size={24} /></span>
                  <span className="text-sm">Drop widgets here</span>
                  <span className="text-xs mt-1 opacity-70">or click to browse</span>
                </div>
              ) : (
                column.widgets.map((widget, widgetIndex) => {
                  const def = getWidgetDefinition(widget.type);
                  const widgetKey = getWidgetKey(columnIndex, widgetIndex);
                  const isSelected = selectedWidgetId === widgetKey;
                  const isDeactivated = widget._deactivated === true;
                  const WidgetIcon = def?.icon || Package;

                  return (
                    <div
                      key={widgetKey}
                      className={`flex items-center gap-3 p-3 bg-bg-secondary rounded-lg transition-all duration-200 ease-[cubic-bezier(0.2,0,0,1)] border-2 border-transparent relative group ${
                        isDeactivated 
                          ? 'opacity-50 cursor-not-allowed bg-bg-secondary/50 border-dashed border-border' 
                          : 'cursor-grab hover:bg-bg-elevated hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)]'
                      } ${isSelected ? 'border-accent bg-accent/15 shadow-[0_0_0_1px_rgba(141,212,224,0.3),0_4px_12px_rgba(141,212,224,0.15)]' : ''}`}
                      draggable={!isDeactivated}
                      onDragStart={(e) => !isDeactivated && handleDragStart(e, columnIndex, widgetIndex)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onWidgetSelect(columnIndex, widgetIndex)}
                      onDoubleClick={() => onWidgetEdit?.(columnIndex, widgetIndex)}
                      onContextMenu={(e) => handleWidgetContextMenu(e, widget, columnIndex, widgetIndex)}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
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
                        const dropIndex = insertAfter ? widgetIndex + 1 : widgetIndex;
                        handleDrop(e, columnIndex, dropIndex);
                      }}
                    >
                      <div className={`text-text-secondary text-sm select-none ${isDeactivated ? '' : 'cursor-grab group-active:cursor-grabbing'}`}>
                        <GripVertical size={14} />
                      </div>
                      <span className="text-2xl flex items-center justify-center text-text-secondary">
                        <WidgetIcon size={18} />
                      </span>
                      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis ${isDeactivated ? 'line-through' : ''}`}>
                            {widget.title || def?.name || widget.type}
                          </span>
                          {isDeactivated && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-warning/20 text-warning text-[0.6rem] font-semibold uppercase rounded" title="This widget is deactivated and will be commented out in YAML">
                              <EyeOff size={10} />
                              Off
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-text-secondary">{widget.type}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                        {onWidgetEdit && (
                          <button
                            className="w-7 h-7 flex items-center justify-center p-0 border-none rounded bg-transparent text-text-muted cursor-pointer transition-all duration-150 hover:bg-accent/20 hover:text-accent"
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
                          className="w-7 h-7 flex items-center justify-center p-0 border-none rounded bg-transparent text-text-muted cursor-pointer transition-all duration-150 hover:bg-error/20 hover:text-error"
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

      <div className="mt-4 pt-4 border-t border-border text-xs text-text-secondary text-center">
        Drag widgets to reorder. Click to select, double-click to edit. Right-click for more options.
      </div>

      {contextMenu && (
        <WidgetContextMenu
          widget={contextMenu.widget}
          columnIndex={contextMenu.columnIndex}
          widgetIndex={contextMenu.widgetIndex}
          pages={pages}
          currentPageIndex={currentPageIndex}
          position={contextMenu.position}
          onClose={() => setContextMenu(null)}
          onCopyToPage={(targetPageIndex, widget) => {
            onCopyWidgetToPage?.(targetPageIndex, widget);
          }}
          onMoveToPage={(targetPageIndex, sourceColumnIndex, sourceWidgetIndex, widget) => {
            onMoveWidgetToPage?.(targetPageIndex, sourceColumnIndex, sourceWidgetIndex, widget);
          }}
          onViewInYaml={onViewWidgetInYaml}
          onToggleDeactivate={onToggleWidgetDeactivate}
        />
      )}
    </div>
  );
}
