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
      {...props}
    />
  );
}

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
            className="form-input"
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
            className="form-input"
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
            className="form-input"
          />
        );

      case 'boolean':
        return (
          <label className="checkbox-label">
            <input
              type="checkbox"
              id={inputId}
              checked={Boolean(value)}
              onChange={(e) => onNestedChange(key, e.target.checked || undefined)}
              className="form-checkbox"
            />
            <span className="checkbox-text">{prop.description || prop.label}</span>
          </label>
        );

      case 'select':
        return (
          <select
            id={inputId}
            value={(value as string) || (prop.default as string) || ''}
            onChange={(e) => onNestedChange(key, e.target.value || undefined)}
            className="form-select"
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
        return <div className="form-unsupported">Unsupported type: {prop.type}</div>;
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
            className="form-input"
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
            className="form-input"
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
            className="form-input"
          />
        );

      case 'boolean':
        return (
          <label className="checkbox-label">
            <input
              type="checkbox"
              id={inputId}
              checked={Boolean(value)}
              onChange={(e) => handlePropertyChange(key, e.target.checked || undefined)}
              className="form-checkbox"
            />
            <span className="checkbox-text">{prop.description || prop.label}</span>
          </label>
        );

      case 'select':
        return (
          <select
            id={inputId}
            value={(value as string) || (prop.default as string) || ''}
            onChange={(e) => handlePropertyChange(key, e.target.value || undefined)}
            className="form-select"
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
                <div className="nested-properties">
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
                        <div key={itemKey} className="form-field nested-field">
                          <label className="form-label">
                            {itemProp.label}
                            {itemProp.required && <span className="required">*</span>}
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
        return <div className="form-unsupported">Unsupported array type</div>;

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
          <div className="nested-properties">
            {prop.properties &&
              Object.entries(prop.properties).map(([subKey, subProp]) => {
                const objValue = (value as Record<string, unknown>) || {};
                return (
                  <div key={subKey} className="form-field nested-field">
                    <label className="form-label">
                      {subProp.label}
                      {subProp.required && <span className="required">*</span>}
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
        return <div className="form-unsupported">Unsupported type: {prop.type}</div>;
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
        <div key={key} className="form-field form-field-checkbox">
          {renderPropertyInput(key, prop, value)}
        </div>
      );
    }

    return (
      <div key={key} className="form-field">
        <label htmlFor={inputId} className="form-label">
          {prop.label}
          {prop.required && <span className="required">*</span>}
          {prop.description && (
            <span className="form-hint" title={prop.description}>
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
    <div className="widget-editor">
      {/* Breadcrumb navigation for nested editing */}
      {isEditingNested && (
        <div className="widget-editor-breadcrumb">
          <button 
            className="breadcrumb-back"
            onClick={handleNavigateBack}
            title="Go back"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            className="breadcrumb-item breadcrumb-root"
            onClick={() => onEditingPathChange?.([])}
          >
            {widget.title || getWidgetDefinition(widget.type)?.name || widget.type}
          </button>
          {editingPath.map((item, index) => (
            <span key={index} className="breadcrumb-separator">
              <ChevronRight size={14} />
              {index === editingPath.length - 1 ? (
                <span className="breadcrumb-item breadcrumb-current">{item.label}</span>
              ) : (
                <button
                  className="breadcrumb-item"
                  onClick={() => onEditingPathChange?.(editingPath.slice(0, index + 1))}
                >
                  {item.label}
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      <div className="widget-editor-header">
        <div className="widget-editor-title">
          {Icon && <Icon size={20} className="widget-editor-icon" />}
          <div>
            <h3>{definition?.name || currentWidget.type}</h3>
            <span className="widget-editor-type">{currentWidget.type}</span>
          </div>
        </div>
        <button className="btn-close" onClick={onClose} title="Close">
          <X size={20} />
        </button>
      </div>

      <div className="widget-editor-content">
        {/* Common Properties Section */}
        <div className="widget-editor-section">
          <h4 className="widget-editor-section-title">General</h4>
          <div className="widget-editor-fields">
            {Object.entries(COMMON_PROPERTIES).map(([key, prop]) =>
              renderPropertyField(key, prop)
            )}
          </div>
        </div>

        {/* Child Widgets Section for container widgets */}
        {isContainerWidget && (
          <div className="widget-editor-section">
            <h4 className="widget-editor-section-title">
              Child Widgets
              <span className="section-count">{childWidgets.length}</span>
            </h4>
            
            {childWidgets.length === 0 ? (
              <div className="child-widgets-empty">
                No child widgets. Add widgets to this group.
              </div>
            ) : (
              <div className="child-widgets-list">
                {childWidgets.map((child, index) => {
                  const childDef = getWidgetDefinition(child.type);
                  const ChildIcon = childDef?.icon;
                  return (
                    <div key={index} className="child-widget-item">
                      <div className="child-widget-reorder">
                        <button
                          className="btn-icon btn-icon-xs"
                          onClick={() => handleMoveChildWidget(index, 'up')}
                          disabled={index === 0}
                          title="Move up"
                        >
                          <GripVertical size={12} />
                        </button>
                      </div>
                      {ChildIcon && <ChildIcon size={16} className="child-widget-icon" />}
                      <div className="child-widget-info">
                        <span className="child-widget-title">
                          {child.title || childDef?.name || child.type}
                        </span>
                        <span className="child-widget-type">{child.type}</span>
                      </div>
                      <div className="child-widget-actions">
                        <button
                          className="btn-icon btn-icon-sm"
                          onClick={() => handleEditChildWidget(index)}
                          title="Edit widget"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn-icon btn-icon-sm btn-danger"
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
            <div className="child-widgets-add">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setShowAddWidget(!showAddWidget)}
              >
                <Plus size={14} />
                Add Widget
              </button>
              {showAddWidget && (
                <div className="add-widget-dropdown">
                  {WIDGET_DEFINITIONS.filter(w => w.type !== 'group' && w.type !== 'split-column').map((def) => {
                    const DefIcon = def.icon;
                    return (
                      <button
                        key={def.type}
                        className="add-widget-option"
                        onClick={() => {
                          handleAddChildWidget(def.type);
                          setShowAddWidget(false);
                        }}
                      >
                        <DefIcon size={14} />
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
          <div className="widget-editor-section">
            <h4 className="widget-editor-section-title">Widget Settings</h4>
            <div className="widget-editor-fields">
              {Object.entries(definition.properties).map(([key, prop]) =>
                renderPropertyField(key, prop)
              )}
            </div>
          </div>
        )}

        {/* Unknown Widget Warning */}
        {!definition && (
          <div className="widget-editor-warning">
            <Info size={16} />
            <span>Unknown widget type. Only common properties are available.</span>
          </div>
        )}
      </div>
    </div>
  );
}
