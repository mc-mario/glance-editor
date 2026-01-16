import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Trash2 } from 'lucide-react';

interface KeyValueInputProps {
  value: Record<string, string> | undefined;
  onChange: (value: Record<string, string> | undefined) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

interface KeyValuePair {
  key: string;
  value: string;
}

// Debounced text input for key-value pairs
function DebouncedKVInput({
  value,
  onChange,
  placeholder,
  className,
  debounceMs = 500,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
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
      className={`w-full p-2 px-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent placeholder:text-text-muted ${className || ''}`}
    />
  );
}

export function KeyValueInput({
  value,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: KeyValueInputProps) {
  // Convert object to array of pairs for editing
  const pairs: KeyValuePair[] = value
    ? Object.entries(value).map(([key, val]) => ({ key, value: val }))
    : [];

  const handleAdd = () => {
    const newPairs = [...pairs, { key: '', value: '' }];
    updateFromPairs(newPairs);
  };

  const handleRemove = (index: number) => {
    const newPairs = pairs.filter((_, i) => i !== index);
    updateFromPairs(newPairs);
  };

  const handleKeyChange = (index: number, newKey: string) => {
    const newPairs = pairs.map((pair, i) =>
      i === index ? { ...pair, key: newKey } : pair
    );
    updateFromPairs(newPairs);
  };

  const handleValueChange = (index: number, newValue: string) => {
    const newPairs = pairs.map((pair, i) =>
      i === index ? { ...pair, value: newValue } : pair
    );
    updateFromPairs(newPairs);
  };

  const updateFromPairs = (newPairs: KeyValuePair[]) => {
    // Filter out pairs with empty keys and convert back to object
    const validPairs = newPairs.filter((p) => p.key.trim() !== '');
    if (validPairs.length === 0 && newPairs.length === 0) {
      onChange(undefined);
    } else {
      const obj = newPairs.reduce((acc, pair) => {
        if (pair.key.trim()) {
          acc[pair.key] = pair.value;
        }
        return acc;
      }, {} as Record<string, string>);
      onChange(Object.keys(obj).length > 0 ? obj : undefined);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {pairs.length === 0 ? (
        <div className="py-4 text-center text-text-muted text-sm border border-border border-dashed rounded-md bg-bg-secondary/30">
          No entries
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {pairs.map((pair, index) => (
            <div key={index} className="flex gap-2">
              <DebouncedKVInput
                value={pair.key}
                onChange={(newKey) => handleKeyChange(index, newKey)}
                placeholder={keyPlaceholder}
                className="flex-1"
              />
              <DebouncedKVInput
                value={pair.value}
                onChange={(newValue) => handleValueChange(index, newValue)}
                placeholder={valuePlaceholder}
                className="flex-1"
              />
              <button
                type="button"
                className="p-2 text-error/60 hover:text-error hover:bg-error/10 rounded-md transition-colors"
                onClick={() => handleRemove(index)}
                title="Remove"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
      <button
        type="button"
        className="flex items-center justify-center gap-2 px-4 py-2 bg-bg-tertiary text-text-secondary hover:bg-bg-elevated hover:text-text-primary rounded-md text-sm font-medium transition-colors border border-border border-dashed"
        onClick={handleAdd}
      >
        <Plus size={16} />
        Add Entry
      </button>
    </div>
  );
}
