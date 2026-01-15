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
      <div className="expandable-text-editor">
        <textarea
          ref={textareaRef}
          id={id}
          value={localValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          rows={rows}
          className="form-textarea"
        />
        <button
          type="button"
          className="expand-btn"
          onClick={handleExpandClick}
          title="Expand editor"
        >
          <Maximize2 size={14} />
        </button>
      </div>

      {isExpanded && (
        <div className="text-editor-modal-overlay" onClick={handleOverlayClick}>
          <div className="text-editor-modal">
            <div className="text-editor-modal-header">
              <h3>{label || 'Edit Content'}</h3>
              <button
                type="button"
                className="btn-close"
                onClick={handleCloseExpanded}
                title="Close (Esc)"
              >
                <X size={20} />
              </button>
            </div>
            <div className="text-editor-modal-content">
              <textarea
                ref={expandedTextareaRef}
                value={localValue}
                onChange={handleChange}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                className="form-textarea expanded"
              />
            </div>
            <div className="text-editor-modal-footer">
              <span className="text-editor-hint">Press Esc or click outside to close</span>
              <button
                type="button"
                className="btn btn-primary"
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
