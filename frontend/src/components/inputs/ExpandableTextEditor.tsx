import { useState, useEffect, useRef, useCallback } from 'react';
import { Maximize2, X } from 'lucide-react';

interface ExpandableTextEditorProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  rows?: number;
}

export function ExpandableTextEditor({
  id,
  value,
  onChange,
  placeholder,
  label,
  rows = 4,
}: ExpandableTextEditorProps) {
  const [localValue, setLocalValue] = useState(value);
  const [isExpanded, setIsExpanded] = useState(false);
  const debounceRef = useRef<number>();
  const isFocusedRef = useRef(false);
  const lastPropValue = useRef(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const expandedTextareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Focus the expanded textarea when modal opens
  useEffect(() => {
    if (isExpanded && expandedTextareaRef.current) {
      expandedTextareaRef.current.focus();
      // Move cursor to end
      const len = expandedTextareaRef.current.value.length;
      expandedTextareaRef.current.setSelectionRange(len, len);
    }
  }, [isExpanded]);

  // Handle escape key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    if (isExpanded) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isExpanded]);

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
      }, 500);
    },
    [onChange]
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

  const handleExpandClick = () => {
    setIsExpanded(true);
  };

  const handleCloseExpanded = () => {
    // Flush any pending changes before closing
    if (localValue !== lastPropValue.current) {
      flushChange(localValue);
    }
    setIsExpanded(false);
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleCloseExpanded();
    }
  };

  return (
    <>
      <div className="relative">
        <textarea
          ref={textareaRef}
          id={id}
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={rows}
          className="w-full p-2 px-3 pr-10 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent placeholder:text-text-muted resize-y font-mono"
        />
        <button
          type="button"
          className="absolute top-2 right-2 p-1.5 text-text-muted hover:text-text-primary hover:bg-bg-elevated rounded transition-colors"
          onClick={handleExpandClick}
          title="Expand editor"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[1000] p-8"
          onClick={handleOverlayClick}
        >
          <div className="w-full max-w-3xl max-h-[80vh] bg-bg-secondary rounded-xl border border-border shadow-2xl flex flex-col overflow-hidden">
            <div className="flex items-center justify-between py-3 px-4 border-b border-border shrink-0">
              <h3 className="text-sm font-semibold">{label || 'Edit Content'}</h3>
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center bg-transparent text-text-secondary cursor-pointer rounded-md transition-all duration-150 hover:bg-error/20 hover:text-error"
                onClick={handleCloseExpanded}
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-hidden">
              <textarea
                ref={expandedTextareaRef}
                value={localValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                className="w-full h-full min-h-[300px] p-3 bg-bg-primary border border-border rounded-md text-sm transition-colors focus:outline-none focus:border-accent placeholder:text-text-muted resize-none font-mono"
              />
            </div>
            <div className="flex items-center justify-between py-3 px-4 border-t border-border shrink-0">
              <span className="text-xs text-text-muted">Press Esc or click outside to close</span>
              <button
                type="button"
                className="px-4 py-2 bg-accent text-bg-primary rounded-md text-sm font-bold hover:bg-accent-hover transition-colors"
                onClick={handleCloseExpanded}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
