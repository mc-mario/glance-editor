import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Info } from 'lucide-react';
import type { WidgetConfig } from '../types';
import {
  getWidgetDefinition,
  COMMON_PROPERTIES,
  type PropertyDefinition,
} from '../widgetDefinitions';
import { DurationInput } from './inputs/DurationInput';
import { ColorInput } from './inputs/ColorInput';
import { ArrayInput, StringArrayInput } from './inputs/ArrayInput';
import { KeyValueInput } from './inputs/KeyValueInput';

interface WidgetEditorProps {
  widget: WidgetConfig;
  columnIndex: number;
  widgetIndex: number;
  onChange: (widget: WidgetConfig) => void;
  onClose: () => void;
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
}: WidgetEditorProps) {
  const definition = getWidgetDefinition(widget.type);
  const Icon = definition?.icon;

  const handlePropertyChange = (key: string, value: unknown) => {
    const newWidget = { ...widget };
    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      delete newWidget[key];
    } else {
      newWidget[key] = value;
    }
    onChange(newWidget);
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
          <DebouncedTextarea
            id={inputId}
            value={(value as string) || ''}
            onChange={(val) => onNestedChange(key, val || undefined)}
            placeholder={prop.placeholder}
            rows={3}
            className="form-textarea"
          />
        );

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
          <DebouncedTextarea
            id={inputId}
            value={(value as string) || ''}
            onChange={(val) => handlePropertyChange(key, val || undefined)}
            placeholder={prop.placeholder}
            rows={4}
            className="form-textarea"
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
    const value = widget[key];
    const inputId = `widget-${columnIndex}-${widgetIndex}-${key}`;

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

  return (
    <div className="widget-editor">
      <div className="widget-editor-header">
        <div className="widget-editor-title">
          {Icon && <Icon size={20} className="widget-editor-icon" />}
          <div>
            <h3>{definition?.name || widget.type}</h3>
            <span className="widget-editor-type">{widget.type}</span>
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

        {/* Widget-Specific Properties Section */}
        {definition && Object.keys(definition.properties).length > 0 && (
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
