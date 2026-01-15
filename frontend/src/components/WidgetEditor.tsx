import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Info, ChevronRight, Plus, Trash2, GripVertical, Pencil, ChevronLeft } from 'lucide-react';
import type { WidgetConfig } from '../types';
import {
  getWidgetDefinition,
  COMMON_PROPERTIES,
  WIDGET_DEFINITIONS,
  type PropertyDefinition,
} from '../widgetDefinitions';
import { DurationInput } from './inputs/DurationInput';
import { ColorInput } from './inputs/ColorInput';
import { ArrayInput, StringArrayInput } from './inputs/ArrayInput';
import { KeyValueInput } from './inputs/KeyValueInput';
import { ExpandableTextEditor } from './inputs/ExpandableTextEditor';

// Breadcrumb path item for nested widget editing
export interface EditingPathItem {
  widget: WidgetConfig;
  label: string;
  childIndex?: number;
}

interface WidgetEditorProps {
  widget: WidgetConfig;
  columnIndex: number;
  widgetIndex: number;
  onChange: (widget: WidgetConfig) => void;
  onClose: () => void;
  // For nested widget editing (group/split-column)
  editingPath?: EditingPathItem[];
  onEditingPathChange?: (path: EditingPathItem[]) => void;
}

// Debounced text input component to prevent state conflicts
function DebouncedInput({
  value,
  onChange,
  type = 'text',
  debounceMs = 500,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  type?: 'text' | 'url';
  debounceMs?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'>) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<number>();
  const isFocusedRef = useRef(false);
  const lastPropValue = useRef(value);

  // Only sync from props when NOT focused and the prop actually changed
  useEffect(() => {
    if (!isFocusedRef.current && value !== lastPropValue.current) {
      setLocalValue(value);
    }
    lastPropValue.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const flushChange = useCallback((newValue: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = undefined;
    }
    onChange(newValue);
  }, [onChange]);

  const debouncedOnChange = useCallback(
    (newValue: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = undefined;
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    // Flush any pending changes immediately on blur
    if (localValue !== lastPropValue.current) {
      flushChange(localValue);
    }
  };

  return (
      <input
      type={type}
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent placeholder:text-text-muted ${props.className || ''}`}
      {...props}
    />
  );
}

<<<<<<< HEAD
=======
// Debounced textarea component
function DebouncedTextarea({
  value,
  onChange,
  debounceMs = 500,
  ...props
}: {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
} & Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'>) {
  const [localValue, setLocalValue] = useState(value);
  const debounceRef = useRef<number>();
  const isFocusedRef = useRef(false);
  const lastPropValue = useRef(value);

  // Only sync from props when NOT focused and the prop actually changed
  useEffect(() => {
    if (!isFocusedRef.current && value !== lastPropValue.current) {
      setLocalValue(value);
    }
    lastPropValue.current = value;
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const flushChange = useCallback((newValue: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = undefined;
    }
    onChange(newValue);
  }, [onChange]);

  const debouncedOnChange = useCallback(
    (newValue: string) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = window.setTimeout(() => {
        debounceRef.current = undefined;
        onChange(newValue);
      }, debounceMs);
    },
    [onChange, debounceMs]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    debouncedOnChange(newValue);
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    // Flush any pending changes immediately on blur
    if (localValue !== lastPropValue.current) {
      flushChange(localValue);
    }
  };

  return (
      <textarea
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent placeholder:text-text-muted min-h-[80px] resize-y font-mono text-[0.75rem] ${props.className || ''}`}
      {...props}
    />
  );
}

>>>>>>> 0c73617 (Migrate index.css to tailwind classes)
export function WidgetEditor({
  widget,
  columnIndex,
  widgetIndex,
  onChange,
  onClose,
  editingPath = [],
  onEditingPathChange,
}: WidgetEditorProps) {
  // Determine if we're editing a nested widget
  const isEditingNested = editingPath.length > 0;
  const currentPathItem = editingPath[editingPath.length - 1];
  const currentWidget = isEditingNested ? currentPathItem.widget : widget;
  
  // Get root widget for updating
  const rootWidget = widget;
  const definition = getWidgetDefinition(currentWidget.type);
  const Icon = definition?.icon;

  // Check if this is a container widget (group/split-column)
  const isContainerWidget = currentWidget.type === 'group' || currentWidget.type === 'split-column';
  const childWidgets = isContainerWidget ? (currentWidget.widgets as WidgetConfig[] || []) : [];

  // Update widget - handles both direct and nested editing
  const updateCurrentWidget = useCallback((updatedWidget: WidgetConfig) => {
    if (!isEditingNested) {
      // Direct editing - just call onChange
      onChange(updatedWidget);
    } else {
      // Nested editing - need to update the root widget with the nested change
      const updateNestedWidget = (
        root: WidgetConfig,
        path: EditingPathItem[],
        newWidget: WidgetConfig
      ): WidgetConfig => {
        if (path.length === 0) return newWidget;
        
        const [first, ...rest] = path;
        const childIndex = first.childIndex;
        if (childIndex === undefined) return root;
        
        const widgets = [...(root.widgets as WidgetConfig[] || [])];
        if (rest.length === 0) {
          widgets[childIndex] = newWidget;
        } else {
          widgets[childIndex] = updateNestedWidget(widgets[childIndex], rest, newWidget);
        }
        return { ...root, widgets };
      };
      
      onChange(updateNestedWidget(rootWidget, editingPath, updatedWidget));
    }
  }, [isEditingNested, editingPath, rootWidget, onChange]);

  const handlePropertyChange = (key: string, value: unknown) => {
    const newWidget = { ...currentWidget };
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      delete newWidget[key];
    } else {
      newWidget[key] = value;
    }
    updateCurrentWidget(newWidget);
  };

  // Navigate into a child widget
  const handleEditChildWidget = (childIndex: number) => {
    const child = childWidgets[childIndex];
    if (!child || !onEditingPathChange) return;
    
    const childDef = getWidgetDefinition(child.type);
    const newPath: EditingPathItem[] = [
      ...editingPath,
      {
        widget: child,
        label: child.title || childDef?.name || child.type,
        childIndex,
      },
    ];
    onEditingPathChange(newPath);
  };

  // Navigate back in breadcrumb
  const handleNavigateBack = () => {
    if (!onEditingPathChange || editingPath.length === 0) return;
    onEditingPathChange(editingPath.slice(0, -1));
  };

  // Add a child widget to the group
  const handleAddChildWidget = (widgetType: string) => {
    const newChild: WidgetConfig = { type: widgetType };
    const newWidget = {
      ...currentWidget,
      widgets: [...childWidgets, newChild],
    };
    updateCurrentWidget(newWidget);
  };

  // Remove a child widget
  const handleRemoveChildWidget = (childIndex: number) => {
    const newWidgets = childWidgets.filter((_, i) => i !== childIndex);
    updateCurrentWidget({ ...currentWidget, widgets: newWidgets });
  };

  // Reorder child widgets
  const handleMoveChildWidget = (fromIndex: number, direction: 'up' | 'down') => {
    const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= childWidgets.length) return;
    
    const newWidgets = [...childWidgets];
    [newWidgets[fromIndex], newWidgets[toIndex]] = [newWidgets[toIndex], newWidgets[fromIndex]];
    updateCurrentWidget({ ...currentWidget, widgets: newWidgets });
  };

  // Render input for nested properties inside arrays/objects
  const renderNestedPropertyInput = (
    key: string,
    prop: PropertyDefinition,
    value: unknown,
    onNestedChange: (key: string, value: unknown) => void
  ): React.ReactNode => {
    const inputId = `nested-${key}`;

    switch (prop.type) {
      case 'string':
        return (
          <DebouncedInput
            type="text"
            id={inputId}
            value={(value as string) || ''}
            onChange={(val) => onNestedChange(key, val || undefined)}
            placeholder={prop.placeholder}
            className="w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent placeholder:text-text-muted"
          />
        );

      case 'url':
        return (
          <DebouncedInput
            type="url"
            id={inputId}
            value={(value as string) || ''}
            onChange={(val) => onNestedChange(key, val || undefined)}
            placeholder={prop.placeholder}
            className="w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent placeholder:text-text-muted"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            id={inputId}
            value={value !== undefined ? String(value) : ''}
            onChange={(e) => {
              const numVal = e.target.value ? parseFloat(e.target.value) : undefined;
              onNestedChange(key, numVal);
            }}
            min={prop.min}
            max={prop.max}
            step={prop.step || 1}
            placeholder={prop.default !== undefined ? String(prop.default) : undefined}
            className="w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent placeholder:text-text-muted"
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              id={inputId}
              checked={Boolean(value)}
              onChange={(e) => onNestedChange(key, e.target.checked || undefined)}
              className="w-4 h-4 accent-accent cursor-pointer"
            />
            <span className="text-sm text-text-secondary">{prop.description || prop.label}</span>
          </label>
        );

      case 'select':
        return (
          <select
            id={inputId}
            value={(value as string) || (prop.default as string) || ''}
            onChange={(e) => onNestedChange(key, e.target.value || undefined)}
            className="w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent"
          >
            {!prop.required && <option value="">Select...</option>}
            {prop.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'duration':
        return (
          <DurationInput
            id={inputId}
            value={value as string | undefined}
            onChange={(val) => onNestedChange(key, val)}
            placeholder={prop.placeholder}
          />
        );

      case 'color':
        return (
          <ColorInput
            id={inputId}
            value={value as string | undefined}
            onChange={(val) => onNestedChange(key, val)}
            placeholder={prop.placeholder}
          />
        );

      case 'text':
        return (
          <ExpandableTextEditor
            id={inputId}
            value={(value as string) || ''}
            onChange={(val) => onNestedChange(key, val || undefined)}
            placeholder={prop.placeholder}
            label={prop.label}
            rows={3}
<<<<<<< HEAD
=======
            className="w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent placeholder:text-text-muted min-h-[80px] resize-y font-mono text-[0.75rem]"
>>>>>>> 0c73617 (Migrate index.css to tailwind classes)
          />
        );

      case 'array':
        if (prop.itemType === 'string') {
          return (
            <StringArrayInput
              value={value as string[] | undefined}
              onChange={(val) => onNestedChange(key, val)}
              placeholder={prop.placeholder}
              itemLabel={prop.label?.replace(/s$/, '') || 'Item'}
              minItems={prop.minItems}
              maxItems={prop.maxItems}
            />
          );
        }
        if (prop.itemType === 'object' && prop.itemProperties) {
          return (
            <ArrayInput<Record<string, unknown>>
              value={value as Record<string, unknown>[] | undefined}
              onChange={(val) => onNestedChange(key, val)}
              createItem={() => {
                const item: Record<string, unknown> = {};
                if (prop.itemProperties) {
                  for (const [itemKey, itemProp] of Object.entries(prop.itemProperties)) {
                    if (itemProp.default !== undefined) {
                      item[itemKey] = itemProp.default;
                    }
                  }
                }
                return item;
              }}
              itemLabel={prop.label?.replace(/s$/, '') || 'Item'}
              minItems={prop.minItems}
              maxItems={prop.maxItems}
              renderItem={(item, _idx, onItemChange) => (
                <div className="nested-properties">
                  {prop.itemProperties &&
                    Object.entries(prop.itemProperties).map(([itemKey, itemProp]) => {
                      const handleDeepNestedChange = (nestedKey: string, nestedValue: unknown) => {
                        const newItem = { ...item };
                        if (nestedValue === undefined || nestedValue === '') {
                          delete newItem[nestedKey];
                        } else {
                          newItem[nestedKey] = nestedValue;
                        }
                        onItemChange(newItem);
                      };
                      return (
                        <div key={itemKey} className="form-field nested-field">
                          <label className="form-label">
                            {itemProp.label}
                            {itemProp.required && <span className="required">*</span>}
                          </label>
                          {renderNestedPropertyInput(
                            itemKey,
                            itemProp,
                            item[itemKey],
                            handleDeepNestedChange
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            />
          );
        }
        return <div className="form-unsupported">Unsupported nested array type</div>;

      default:
        return <div className="p-2 bg-error/10 rounded text-[0.75rem] text-error">Unsupported type: {prop.type}</div>;
    }
  };

  const renderPropertyInput = (
    key: string,
    prop: PropertyDefinition,
    value: unknown
  ): React.ReactNode => {
    const inputId = `widget-${columnIndex}-${widgetIndex}-${key}`;

    switch (prop.type) {
      case 'string':
        return (
          <DebouncedInput
            type="text"
            id={inputId}
            value={(value as string) || ''}
            onChange={(val) => handlePropertyChange(key, val || undefined)}
            placeholder={prop.placeholder}
            className="w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent placeholder:text-text-muted"
          />
        );

      case 'url':
        return (
          <DebouncedInput
            type="url"
            id={inputId}
            value={(value as string) || ''}
            onChange={(val) => handlePropertyChange(key, val || undefined)}
            placeholder={prop.placeholder}
            className="w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent placeholder:text-text-muted"
          />
        );

      case 'number':
        return (
          <input
            type="number"
            id={inputId}
            value={value !== undefined ? String(value) : ''}
            onChange={(e) => {
              const numVal = e.target.value ? parseFloat(e.target.value) : undefined;
              handlePropertyChange(key, numVal);
            }}
            min={prop.min}
            max={prop.max}
            step={prop.step || 1}
            placeholder={prop.default !== undefined ? String(prop.default) : undefined}
            className="w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent placeholder:text-text-muted"
          />
        );

      case 'boolean':
        return (
          <label className="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              id={inputId}
              checked={Boolean(value)}
              onChange={(e) => handlePropertyChange(key, e.target.checked || undefined)}
              className="w-4 h-4 accent-accent cursor-pointer"
            />
            <span className="text-sm text-text-secondary">{prop.description || prop.label}</span>
          </label>
        );

      case 'select':
        return (
          <select
            id={inputId}
            value={(value as string) || (prop.default as string) || ''}
            onChange={(e) => handlePropertyChange(key, e.target.value || undefined)}
            className="w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent"
          >
            {!prop.required && <option value="">Select...</option>}
            {prop.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      case 'duration':
        return (
          <DurationInput
            id={inputId}
            value={value as string | undefined}
            onChange={(val) => handlePropertyChange(key, val)}
            placeholder={prop.placeholder}
          />
        );

      case 'color':
        return (
          <ColorInput
            id={inputId}
            value={value as string | undefined}
            onChange={(val) => handlePropertyChange(key, val)}
            placeholder={prop.placeholder}
          />
        );

      case 'text':
        return (
          <ExpandableTextEditor
            id={inputId}
            value={(value as string) || ''}
            onChange={(val) => handlePropertyChange(key, val || undefined)}
            placeholder={prop.placeholder}
            label={prop.label}
            rows={4}
<<<<<<< HEAD
=======
            className="w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent placeholder:text-text-muted min-h-[80px] resize-y font-mono text-[0.75rem]"
>>>>>>> 0c73617 (Migrate index.css to tailwind classes)
          />
        );

      case 'array':
        if (prop.itemType === 'string') {
          return (
            <StringArrayInput
              value={value as string[] | undefined}
              onChange={(val) => handlePropertyChange(key, val)}
              placeholder={prop.placeholder}
              itemLabel={prop.label?.replace(/s$/, '') || 'Item'}
              minItems={prop.minItems}
              maxItems={prop.maxItems}
            />
          );
        }
        if (prop.itemType === 'object' && prop.itemProperties) {
          return (
            <ArrayInput<Record<string, unknown>>
              value={value as Record<string, unknown>[] | undefined}
              onChange={(val) => handlePropertyChange(key, val)}
              createItem={() => {
                const item: Record<string, unknown> = {};
                if (prop.itemProperties) {
                  for (const [itemKey, itemProp] of Object.entries(prop.itemProperties)) {
                    if (itemProp.default !== undefined) {
                      item[itemKey] = itemProp.default;
                    }
                  }
                }
                return item;
              }}
              itemLabel={prop.label?.replace(/s$/, '') || 'Item'}
              minItems={prop.minItems}
              maxItems={prop.maxItems}
              renderItem={(item, _idx, onItemChange) => (
                <div className="flex flex-col gap-3">
                  {prop.itemProperties &&
                    Object.entries(prop.itemProperties).map(([itemKey, itemProp]) => {
                      const handleNestedChange = (nestedKey: string, nestedValue: unknown) => {
                        const newItem = { ...item };
                        if (nestedValue === undefined || nestedValue === '') {
                          delete newItem[nestedKey];
                        } else {
                          newItem[nestedKey] = nestedValue;
                        }
                        onItemChange(newItem);
                      };
                      return (
                        <div key={itemKey} className="flex flex-col gap-1.5 last:mb-0">
                          <label className="flex items-center gap-1.5 text-[0.75rem] font-medium text-text-secondary">
                            {itemProp.label}
                            {itemProp.required && <span className="text-error">*</span>}
                          </label>
                          {renderNestedPropertyInput(
                            itemKey,
                            itemProp,
                            item[itemKey],
                            handleNestedChange
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            />
          );
        }
        return <div className="p-2 bg-error/10 rounded text-[0.75rem] text-error">Unsupported array type</div>;

      case 'object':
        if (Object.keys(prop.properties || {}).length === 0) {
          // Dynamic key-value object (like headers)
          return (
            <KeyValueInput
              value={value as Record<string, string> | undefined}
              onChange={(val) => handlePropertyChange(key, val)}
              keyPlaceholder="Header name"
              valuePlaceholder="Header value"
            />
          );
        }
        // Structured object with defined properties
        return (
          <div className="flex flex-col gap-3">
            {prop.properties &&
              Object.entries(prop.properties).map(([subKey, subProp]) => {
                const objValue = (value as Record<string, unknown>) || {};
                return (
                  <div key={subKey} className="flex flex-col gap-1.5 last:mb-0">
                    <label className="flex items-center gap-1.5 text-[0.75rem] font-medium text-text-secondary">
                      {subProp.label}
                      {subProp.required && <span className="text-error">*</span>}
                    </label>
                    {renderPropertyInput(
                      subKey,
                      subProp,
                      objValue[subKey]
                    )}
                  </div>
                );
              })}
          </div>
        );

      default:
        return <div className="p-2 bg-error/10 rounded text-[0.75rem] text-error">Unsupported type: {prop.type}</div>;
    }
  };

  const renderPropertyField = (key: string, prop: PropertyDefinition) => {
    const value = currentWidget[key];
    const inputId = `widget-${columnIndex}-${widgetIndex}-${key}`;

    // Skip the 'widgets' property for container widgets - we handle it separately
    if (key === 'widgets' && isContainerWidget) {
      return null;
    }

    // For boolean type, render inline without separate label
    if (prop.type === 'boolean') {
      return (
        <div key={key} className="flex items-center gap-1.5">
          {renderPropertyInput(key, prop, value)}
        </div>
      );
    }

    return (
      <div key={key} className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="flex items-center gap-1.5 text-[0.75rem] font-medium text-text-secondary">
          {prop.label}
          {prop.required && <span className="text-error">*</span>}
          {prop.description && (
            <span className="text-text-muted cursor-help flex items-center" title={prop.description}>
              <Info size={14} />
            </span>
          )}
        </label>
        {renderPropertyInput(key, prop, value)}
      </div>
    );
  };

  // State for add widget dropdown
  const [showAddWidget, setShowAddWidget] = useState(false);

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-100px)]">
      {/* Breadcrumb navigation for nested editing */}
      {isEditingNested && (
        <div className="flex items-center gap-1 p-2 px-3 bg-bg-tertiary border-b border-border shrink-0">
          <button 
            className="p-1 hover:bg-bg-elevated rounded transition-colors text-text-secondary hover:text-text-primary"
            onClick={handleNavigateBack}
            title="Go back"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="text-[0.7rem] font-medium px-1.5 py-0.5 rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
            onClick={() => onEditingPathChange?.([])}
          >
            {widget.title || getWidgetDefinition(widget.type)?.name || widget.type}
          </button>
          {editingPath.map((item, index) => (
            <span key={index} className="flex items-center gap-1 text-text-muted">
              <ChevronRight size={14} />
              {index === editingPath.length - 1 ? (
                <span className="text-[0.7rem] font-bold text-accent px-1.5 py-0.5">{item.label}</span>
              ) : (
                <button
                  className="text-[0.7rem] font-medium px-1.5 py-0.5 rounded hover:bg-bg-elevated text-text-muted hover:text-text-primary transition-colors"
                  onClick={() => onEditingPathChange?.(editingPath.slice(0, index + 1))}
                >
                  {item.label}
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between p-3 px-4 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          {Icon && <Icon size={20} className="text-accent" />}
          <div>
            <h3 className="text-base font-semibold m-0">{definition?.name || currentWidget.type}</h3>
            <span className="text-[0.75rem] text-text-muted block">{currentWidget.type}</span>
          </div>
        </div>
          </div>
        </div>
        <button className="p-1 hover:bg-bg-elevated rounded-md text-text-muted hover:text-text-primary transition-colors" onClick={onClose} title="Close">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Common Properties Section */}
        <div className="mb-6 last:mb-0">
          <h4 className="text-[0.75rem] font-semibold uppercase tracking-wider text-accent mb-3 pb-2 border-b border-border">General</h4>
          <div className="flex flex-col gap-3">
            {Object.entries(COMMON_PROPERTIES).map(([key, prop]) =>
              renderPropertyField(key, prop)
            )}
          </div>
        </div>

        {/* Child Widgets Section for container widgets */}
        {isContainerWidget && (
          <div className="mb-6 last:mb-0">
            <h4 className="text-[0.75rem] font-semibold uppercase tracking-wider text-accent mb-3 pb-2 border-b border-border flex items-center justify-between">
              Child Widgets
              <span className="bg-accent/10 text-accent px-1.5 py-0.5 rounded-full text-[0.65rem]">{childWidgets.length}</span>
            </h4>
            
            {childWidgets.length === 0 ? (
              <div className="p-8 text-center border-2 border-dashed border-border rounded-lg text-text-muted text-sm bg-bg-secondary">
                No child widgets. Add widgets to this group.
              </div>
            ) : (
              <div className="flex flex-col gap-2 mb-3">
                {childWidgets.map((child, index) => {
                  const childDef = getWidgetDefinition(child.type);
                  const ChildIcon = childDef?.icon;
                  return (
                    <div key={index} className="flex items-center gap-3 p-2 bg-bg-secondary border border-border rounded-md hover:border-accent/50 transition-colors group">
                      <div className="flex flex-col gap-0.5">
                        <button
                          className="p-0.5 text-text-muted hover:text-accent disabled:opacity-20 transition-colors"
                          onClick={() => handleMoveChildWidget(index, 'up')}
                          disabled={index === 0}
                          title="Move up"
                        >
                          <ChevronRight size={12} className="-rotate-90" />
                        </button>
                        <button
                          className="p-0.5 text-text-muted hover:text-accent disabled:opacity-20 transition-colors"
                          onClick={() => handleMoveChildWidget(index, 'down')}
                          disabled={index === childWidgets.length - 1}
                          title="Move down"
                        >
                          <ChevronRight size={12} className="rotate-90" />
                        </button>
                      </div>
                      {ChildIcon && <ChildIcon size={16} className="text-text-secondary" />}
                      <div className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-text-primary truncate">
                          {child.title || childDef?.name || child.type}
                        </span>
                        <span className="block text-[0.65rem] text-text-muted uppercase tracking-wider">{child.type}</span>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          className="p-1.5 text-text-muted hover:text-accent hover:bg-accent/10 rounded transition-all"
                          onClick={() => handleEditChildWidget(index)}
                          title="Edit widget"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="p-1.5 text-text-muted hover:text-error hover:bg-error/10 rounded transition-all"
                          onClick={() => handleRemoveChildWidget(index)}
                          title="Remove widget"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Add widget dropdown */}
            <div className="relative">
              <button
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-bg-tertiary text-text-secondary rounded-md text-sm font-medium hover:bg-bg-elevated transition-colors border border-border border-dashed"
                onClick={() => setShowAddWidget(!showAddWidget)}
              >
                <Plus size={14} />
                Add Widget
              </button>
              {showAddWidget && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-bg-elevated border border-border rounded-md shadow-xl z-50 max-h-[200px] overflow-y-auto">
                  {WIDGET_DEFINITIONS.filter(w => w.type !== 'group' && w.type !== 'split-column').map((def) => {
                    const DefIcon = def.icon;
                    return (
                      <button
                        key={def.type}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-accent/10 transition-colors text-left"
                        onClick={() => {
                          handleAddChildWidget(def.type);
                          setShowAddWidget(false);
                        }}
                      >
                        <DefIcon size={14} className="text-accent" />
                        <span>{def.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Widget-Specific Properties Section */}
        {definition && Object.keys(definition.properties).filter(k => !(k === 'widgets' && isContainerWidget)).length > 0 && (
          <div className="mb-6 last:mb-0">
            <h4 className="text-[0.75rem] font-semibold uppercase tracking-wider text-accent mb-3 pb-2 border-b border-border">Widget Settings</h4>
            <div className="flex flex-col gap-3">
              {Object.entries(definition.properties).map(([key, prop]) =>
                renderPropertyField(key, prop)
              )}
            </div>
          </div>
        )}

        {/* Unknown Widget Warning */}
        {!definition && (
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-md text-warning text-sm">
            <Info size={16} />
            <span>Unknown widget type. Only common properties are available.</span>
          </div>
        )}
      </div>
    </div>
  );
}
