import { useState, useEffect } from 'react';

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

  useEffect(() => {
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
  }, [value]);

  const handleSliderChange = (newH: number, newS: number, newL: number) => {
    setH(newH);
    setS(newS);
    setL(newL);
    const formatted = formatHSL(newH, newS, newL);
    setTextValue(formatted);
    onChange(formatted);
  };

  const handleTextChange = (text: string) => {
    setTextValue(text);
    if (!text) {
      onChange(undefined);
      return;
    }
    const parsed = parseHSL(text);
    if (parsed) {
      setH(parsed.h);
      setS(parsed.s);
      setL(parsed.l);
      onChange(text);
    }
  };

  const previewColor = `hsl(${h}, ${s}%, ${l}%)`;

  return (
    <div className="color-input">
      <div className="color-input-row">
        <div
          className="color-preview"
          style={{ backgroundColor: previewColor }}
        />
        <input
          type="text"
          id={id}
          value={textValue}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={placeholder || '240 13 95'}
          className="color-text"
        />
      </div>
      <div className="color-sliders">
        <div className="color-slider-row">
          <label>H</label>
          <input
            type="range"
            min={0}
            max={360}
            value={h}
            onChange={(e) => handleSliderChange(parseInt(e.target.value), s, l)}
            className="color-slider hue-slider"
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
          <span className="color-value">{h}</span>
        </div>
        <div className="color-slider-row">
          <label>S</label>
          <input
            type="range"
            min={0}
            max={100}
            value={s}
            onChange={(e) => handleSliderChange(h, parseInt(e.target.value), l)}
            className="color-slider"
            style={{
              background: `linear-gradient(to right, hsl(${h}, 0%, ${l}%), hsl(${h}, 100%, ${l}%))`
            }}
          />
          <span className="color-value">{s}</span>
        </div>
        <div className="color-slider-row">
          <label>L</label>
          <input
            type="range"
            min={0}
            max={100}
            value={l}
            onChange={(e) => handleSliderChange(h, s, parseInt(e.target.value))}
            className="color-slider"
            style={{
              background: `linear-gradient(to right, hsl(${h}, ${s}%, 0%), hsl(${h}, ${s}%, 50%), hsl(${h}, ${s}%, 100%))`
            }}
          />
          <span className="color-value">{l}</span>
        </div>
      </div>
    </div>
  );
}
