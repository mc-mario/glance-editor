import { useState, useEffect, useRef, useCallback } from 'react';

interface ColorInputProps {
  value: string | undefined;
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  id?: string;
}

// Parse HSL string to components
function parseHSL(value: string): { h: number; s: number; l: number } | null {
  // Format: "240 13 95" or "hsl(240, 13%, 95%)"
  const spaceMatch = value.match(/^(\d+)\s+(\d+)\s+(\d+)$/);
  if (spaceMatch) {
    return {
      h: parseInt(spaceMatch[1]),
      s: parseInt(spaceMatch[2]),
      l: parseInt(spaceMatch[3]),
    };
  }

  const hslMatch = value.match(/^hsl\((\d+),\s*(\d+)%?,\s*(\d+)%?\)$/);
  if (hslMatch) {
    return {
      h: parseInt(hslMatch[1]),
      s: parseInt(hslMatch[2]),
      l: parseInt(hslMatch[3]),
    };
  }

  return null;
}

// Format HSL values to string
function formatHSL(h: number, s: number, l: number): string {
  return `${h} ${s} ${l}`;
}

export function ColorInput({ value, onChange, placeholder, id }: ColorInputProps) {
  const [h, setH] = useState(0);
  const [s, setS] = useState(50);
  const [l, setL] = useState(50);
  const [textValue, setTextValue] = useState('');
  const debounceRef = useRef<number>();
  const isFocusedRef = useRef(false);
  const lastPropValue = useRef(value);

  // Only sync from props when NOT focused and the prop actually changed
  useEffect(() => {
    if (!isFocusedRef.current && value !== lastPropValue.current) {
      if (value) {
        setTextValue(value);
        const parsed = parseHSL(value);
        if (parsed) {
          setH(parsed.h);
          setS(parsed.s);
          setL(parsed.l);
        }
      } else {
        setTextValue('');
        setH(0);
        setS(50);
        setL(50);
      }
    }
    lastPropValue.current = value;
  }, [value]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const flushChange = useCallback((newValue: string | undefined) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = undefined;
    }
    onChange(newValue);
  }, [onChange]);

  const debouncedOnChange = useCallback(
    (newValue: string | undefined) => {
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

  const handleSliderChange = (newH: number, newS: number, newL: number) => {
    setH(newH);
    setS(newS);
    setL(newL);
    const formatted = formatHSL(newH, newS, newL);
    setTextValue(formatted);
    onChange(formatted); // Sliders can update immediately
  };

  const handleTextChange = (text: string) => {
    setTextValue(text);
    if (!text) {
      debouncedOnChange(undefined);
      return;
    }
    const parsed = parseHSL(text);
    if (parsed) {
      setH(parsed.h);
      setS(parsed.s);
      setL(parsed.l);
    }
    // Always debounce text changes, even if not valid HSL yet
    debouncedOnChange(text);
  };

  const handleTextFocus = () => {
    isFocusedRef.current = true;
  };

  const handleTextBlur = () => {
    isFocusedRef.current = false;
    // Flush any pending changes on blur
    if (textValue !== lastPropValue.current) {
      if (!textValue) {
        flushChange(undefined);
      } else {
        flushChange(textValue);
      }
    }
  };

  const previewColor = `hsl(${h}, ${s}%, ${l}%)`;

  return (
    <div className="flex flex-col gap-3 p-3 bg-bg-secondary rounded-lg border border-border">
      <div className="flex gap-3 items-center">
        <div
          className="w-10 h-10 rounded-md border-2 border-border shrink-0 shadow-sm"
          style={{ backgroundColor: previewColor }}
        />
        <input
          type="text"
          id={id}
          value={textValue}
          onChange={(e) => handleTextChange(e.target.value)}
          onFocus={handleTextFocus}
          onBlur={handleTextBlur}
          placeholder={placeholder || '240 13 95'}
          className="flex-1 p-2 bg-bg-primary border border-border rounded-md text-sm font-mono focus:outline-none focus:border-accent transition-colors"
        />
      </div>
      <div className="flex flex-col gap-2 p-2 bg-bg-primary/50 rounded-md">
        <div className="flex items-center gap-2">
          <label className="w-4 text-[0.7rem] font-bold text-text-muted">H</label>
          <input
            type="range"
            min={0}
            max={360}
            value={h}
            onChange={(e) => handleSliderChange(parseInt(e.target.value), s, l)}
            className="flex-1 h-2 rounded-full cursor-pointer accent-accent"
            style={{
              background: `linear-gradient(to right, 
                hsl(0, ${s}%, ${l}%), 
                hsl(60, ${s}%, ${l}%), 
                hsl(120, ${s}%, ${l}%), 
                hsl(180, ${s}%, ${l}%), 
                hsl(240, ${s}%, ${l}%), 
                hsl(300, ${s}%, ${l}%), 
                hsl(360, ${s}%, ${l}%))`
            }}
          />
          <span className="w-6 text-[0.7rem] text-text-muted text-right font-mono">{h}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-4 text-[0.7rem] font-bold text-text-muted">S</label>
          <input
            type="range"
            min={0}
            max={100}
            value={s}
            onChange={(e) => handleSliderChange(h, parseInt(e.target.value), l)}
            className="flex-1 h-2 rounded-full cursor-pointer accent-accent"
            style={{
              background: `linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))`
            }}
          />
          <span className="w-6 text-[0.7rem] text-text-muted text-right font-mono">{s}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-4 text-[0.7rem] font-bold text-text-muted">L</label>
          <input
            type="range"
            min={0}
            max={100}
            value={l}
            onChange={(e) => handleSliderChange(h, s, parseInt(e.target.value))}
            className="flex-1 h-2 rounded-full cursor-pointer accent-accent"
            style={{
              background: `linear-gradient(to right, hsl(${h}, ${s}%, 0%), hsl(${h}, ${s}%, 50%), hsl(${h}, ${s}%, 100%))`
            }}
          />
          <span className="w-6 text-[0.7rem] text-text-muted text-right font-mono">{l}</span>
        </div>
      </div>
    </div>
  );
}
