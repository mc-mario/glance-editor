import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

// Debounced text input component
function DebouncedArrayItemInput({
  value,
  onChange,
  placeholder,
  debounceMs = 500,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
}) {
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
    if (localValue !== lastPropValue.current) {
      flushChange(localValue);
    }
  };

  return (
    <input
      type="text"
      value={localValue}
      onChange={handleChange}
      onFocus={handleFocus}
      onBlur={handleBlur}
      placeholder={placeholder}
      className="w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent placeholder:text-text-muted"
    />
  );
}

interface ArrayInputProps<T> {
  value: T[] | undefined;
  onChange: (value: T[] | undefined) => void;
  renderItem: (item: T, index: number, onChange: (value: T) => void) => React.ReactNode;
  createItem: () => T;
  itemLabel?: string;
  minItems?: number;
  maxItems?: number;
}

export function ArrayInput<T>({
  value,
  onChange,
  renderItem,
  createItem,
  itemLabel = 'Item',
  minItems = 0,
  maxItems,
}: ArrayInputProps<T>) {
  const items = value || [];

  const handleAdd = () => {
    if (maxItems !== undefined && items.length >= maxItems) return;
    onChange([...items, createItem()]);
  };

  const handleRemove = (index: number) => {
    if (items.length <= minItems) return;
    const newItems = items.filter((_, i) => i !== index);
    onChange(newItems.length > 0 ? newItems : undefined);
  };

  const handleItemChange = (index: number, newValue: T) => {
    const newItems = items.map((item, i) => (i === index ? newValue : item));
    onChange(newItems);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newItems = [...items];
    [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
    onChange(newItems);
  };

  const handleMoveDown = (index: number) => {
    if (index === items.length - 1) return;
    const newItems = [...items];
    [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    onChange(newItems);
  };

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <div className="py-6 text-center text-text-muted text-sm border border-border border-dashed rounded-md bg-bg-secondary/30">
          No {itemLabel.toLowerCase()}s added
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item, index) => (
            <div key={index} className="bg-bg-secondary border border-border rounded-lg overflow-hidden shadow-sm">
              <div className="flex items-center justify-between p-2 px-3 bg-bg-tertiary border-b border-border">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="p-1 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                    title="Move up"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    type="button"
                    className="p-1 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === items.length - 1}
                    title="Move down"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
                <span className="text-[0.7rem] font-bold uppercase tracking-wider text-text-muted">
                  {itemLabel} {index + 1}
                </span>
                <button
                  type="button"
                  className="p-1 text-error/60 hover:text-error hover:bg-error/10 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                  onClick={() => handleRemove(index)}
                  disabled={items.length <= minItems}
                  title={`Remove ${itemLabel.toLowerCase()}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="p-3">
                {renderItem(item, index, (newValue) => handleItemChange(index, newValue))}
              </div>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className="flex items-center justify-center gap-2 px-4 py-2 bg-bg-tertiary text-text-secondary hover:bg-bg-elevated hover:text-text-primary rounded-md text-sm font-medium transition-colors border border-border border-dashed disabled:opacity-50"
        onClick={handleAdd}
        disabled={maxItems !== undefined && items.length >= maxItems}
      >
        <Plus size={16} />
        Add {itemLabel}
      </button>
    </div>
  );
}

// Simple string array input
interface StringArrayInputProps {
  value: string[] | undefined;
  onChange: (value: string[] | undefined) => void;
  placeholder?: string;
  itemLabel?: string;
  minItems?: number;
  maxItems?: number;
}

export function StringArrayInput({
  value,
  onChange,
  placeholder,
  itemLabel = 'Item',
  minItems = 0,
  maxItems,
}: StringArrayInputProps) {
  return (
    <ArrayInput<string>
      value={value}
      onChange={onChange}
      createItem={() => ''}
      itemLabel={itemLabel}
      minItems={minItems}
      maxItems={maxItems}
      renderItem={(item, _index, onItemChange) => (
        <DebouncedArrayItemInput
          value={item}
          onChange={onItemChange}
          placeholder={placeholder}
        />
      )}
    />
  );
}
