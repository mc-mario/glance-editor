import { useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronRight, X } from 'lucide-react';
import type { ThemeConfig, ThemeProperties } from '../types';

interface ThemeDesignerProps {
  theme: ThemeConfig | undefined;
  onChange: (theme: ThemeConfig) => void;
  onClose?: () => void;
}

interface HSLColor {
  h: number;
  s: number;
  l: number;
}

// Parse HSL color string "240 13 95" or "hsl(240, 13%, 95%)"
function parseHSLColor(value: string | undefined): HSLColor {
  if (!value) return { h: 0, s: 0, l: 16 };

  // Try parsing "240 13 95" format
  const spaceMatch = value.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/);
  if (spaceMatch) {
    return {
      h: parseFloat(spaceMatch[1]),
      s: parseFloat(spaceMatch[2]),
      l: parseFloat(spaceMatch[3]),
    };
  }

  // Try parsing "hsl(240, 13%, 95%)" format
  const hslMatch = value.match(/hsl\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%?\s*,\s*(\d+(?:\.\d+)?)%?\s*\)/i);
  if (hslMatch) {
    return {
      h: parseFloat(hslMatch[1]),
      s: parseFloat(hslMatch[2]),
      l: parseFloat(hslMatch[3]),
    };
  }

  return { h: 0, s: 0, l: 16 };
}

// Format HSL color to string "240 13 95"
function formatHSLColor(color: HSLColor): string {
  return `${Math.round(color.h)} ${Math.round(color.s)} ${Math.round(color.l)}`;
}

// Convert HSL to CSS hsl() string
function hslToCSS(color: HSLColor): string {
  return `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
}

interface ColorPickerProps {
  label: string;
  value: string | undefined;
  onChange: (value: string) => void;
}

function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const color = parseHSLColor(value);

  const handleChange = (key: keyof HSLColor, newValue: number) => {
    const newColor = { ...color, [key]: newValue };
    onChange(formatHSLColor(newColor));
  };

  return (
    <div className="color-picker">
      <div className="color-picker-header">
        <span className="color-picker-label">{label}</span>
        <div
          className="color-preview"
          style={{ backgroundColor: hslToCSS(color) }}
        />
      </div>
      <div className="color-sliders">
        <div className="slider-group">
          <label>H</label>
          <input
            type="range"
            min="0"
            max="360"
            value={color.h}
            onChange={(e) => handleChange('h', parseFloat(e.target.value))}
            className="slider hue-slider"
          />
          <span className="slider-value">{Math.round(color.h)}</span>
        </div>
        <div className="slider-group">
          <label>S</label>
          <input
            type="range"
            min="0"
            max="100"
            value={color.s}
            onChange={(e) => handleChange('s', parseFloat(e.target.value))}
            className="slider"
          />
          <span className="slider-value">{Math.round(color.s)}%</span>
        </div>
        <div className="slider-group">
          <label>L</label>
          <input
            type="range"
            min="0"
            max="100"
            value={color.l}
            onChange={(e) => handleChange('l', parseFloat(e.target.value))}
            className="slider"
          />
          <span className="slider-value">{Math.round(color.l)}%</span>
        </div>
      </div>
      <input
        type="text"
        className="color-text-input"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="240 13 95"
      />
    </div>
  );
}

const DEFAULT_PRESETS: Record<string, ThemeProperties> = {
  'dark-default': {
    'background-color': '0 0 16',
    'primary-color': '0 0 0',
    light: false,
    'contrast-multiplier': 1.0,
  },
  'light-default': {
    'background-color': '240 13 95',
    'primary-color': '230 100 30',
    'negative-color': '0 70 50',
    light: true,
    'contrast-multiplier': 1.3,
    'text-saturation-multiplier': 0.5,
  },
  'nord': {
    'background-color': '220 16 22',
    'primary-color': '193 43 67',
    light: false,
    'contrast-multiplier': 1.1,
  },
  'gruvbox': {
    'background-color': '0 0 16',
    'primary-color': '27 91 64',
    light: false,
    'contrast-multiplier': 1.2,
  },
  'dracula': {
    'background-color': '231 15 18',
    'primary-color': '265 89 78',
    light: false,
    'contrast-multiplier': 1.0,
  },
  'solarized-dark': {
    'background-color': '192 100 11',
    'primary-color': '175 59 40',
    light: false,
    'contrast-multiplier': 1.1,
  },
  'solarized-light': {
    'background-color': '44 87 94',
    'primary-color': '175 59 40',
    light: true,
    'contrast-multiplier': 1.2,
  },
};

export function ThemeDesigner({ theme, onChange }: ThemeDesignerProps) {
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  const [showNewPreset, setShowNewPreset] = useState(false);
  const [showQuickPresets, setShowQuickPresets] = useState(false);

  const currentTheme = useMemo(()=> theme || {}, [theme]);
  const userPresets = currentTheme.presets || {};

  const updateTheme = useCallback((updates: Partial<ThemeConfig>) => {
    onChange({ ...currentTheme, ...updates });
  }, [currentTheme, onChange]);

  const handleApplyPreset = (presetName: string, preset: ThemeProperties) => {
    setActivePreset(presetName);
    updateTheme({
      'background-color': preset['background-color'],
      'primary-color': preset['primary-color'],
      'positive-color': preset['positive-color'],
      'negative-color': preset['negative-color'],
      light: preset.light,
      'contrast-multiplier': preset['contrast-multiplier'],
      'text-saturation-multiplier': preset['text-saturation-multiplier'],
    });
  };

  const handleSaveAsPreset = () => {
    if (!newPresetName.trim()) return;

    const newPreset: ThemeProperties = {
      'background-color': currentTheme['background-color'],
      'primary-color': currentTheme['primary-color'],
      'positive-color': currentTheme['positive-color'],
      'negative-color': currentTheme['negative-color'],
      light: currentTheme.light,
      'contrast-multiplier': currentTheme['contrast-multiplier'],
      'text-saturation-multiplier': currentTheme['text-saturation-multiplier'],
    };

    const presets = { ...currentTheme.presets, [newPresetName]: newPreset };
    updateTheme({ presets });
    setNewPresetName('');
    setShowNewPreset(false);
  };

  const handleDeletePreset = (presetName: string) => {
    if (!currentTheme.presets) return;
    const { [presetName]: _, ...remainingPresets } = currentTheme.presets;
    _;
    updateTheme({ presets: Object.keys(remainingPresets).length > 0 ? remainingPresets : undefined });
  };

  return (
    <div className="theme-designer">
      {/* Your Themes (User Presets) */}
      <section className="theme-section">
        <h4 className="theme-section-title">Your Themes</h4>
        {Object.keys(userPresets).length > 0 ? (
          <div className="preset-grid">
            {Object.entries(userPresets).map(([name, preset]) => {
              const bgColor = parseHSLColor(preset['background-color']);
              return (
                <div key={name} className="preset-item-wrapper">
                  <button
                    className={`preset-item ${activePreset === name ? 'active' : ''}`}
                    onClick={() => handleApplyPreset(name, preset)}
                    style={{
                      backgroundColor: hslToCSS(bgColor),
                      color: preset.light ? '#333' : '#fff'
                    }}
                  >
                    <span className="preset-name">{name}</span>
                    {preset.light && <span className="preset-badge">Light</span>}
                  </button>
                  <button
                    className="preset-delete"
                    onClick={() => handleDeletePreset(name)}
                    title="Delete preset"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="no-presets-hint">No saved themes yet. Customize colors below and save as a preset.</p>
        )}

        {showNewPreset ? (
          <div className="new-preset-form">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Preset name"
              className="preset-name-input"
            />
            <button className="btn btn-primary btn-sm" onClick={handleSaveAsPreset}>
              Save
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowNewPreset(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-secondary btn-sm" onClick={() => setShowNewPreset(true)}>
            + Save Current as Preset
          </button>
        )}
      </section>

      {/* Quick Presets (Built-in) - Collapsed by default */}
      <section className="theme-section">
        <button 
          className="theme-section-toggle"
          onClick={() => setShowQuickPresets(!showQuickPresets)}
        >
          {showQuickPresets ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <span>Quick Presets</span>
          <span className="toggle-hint">(built-in themes)</span>
        </button>
        {showQuickPresets && (
          <div className="preset-grid">
            {Object.entries(DEFAULT_PRESETS).map(([name, preset]) => {
              const bgColor = parseHSLColor(preset['background-color']);
              return (
                <div key={name} className="preset-item-wrapper">
                  <button
                    className={`preset-item ${activePreset === name ? 'active' : ''}`}
                    onClick={() => handleApplyPreset(name, preset)}
                    style={{
                      backgroundColor: hslToCSS(bgColor),
                      color: preset.light ? '#333' : '#fff'
                    }}
                  >
                    <span className="preset-name">{name}</span>
                    {preset.light && <span className="preset-badge">Light</span>}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Color Settings */}
      <section className="theme-section">
        <h4 className="theme-section-title">Colors</h4>

        <ColorPicker
          label="Background Color"
          value={currentTheme['background-color']}
          onChange={(value) => updateTheme({ 'background-color': value })}
        />

        <ColorPicker
          label="Primary Color"
          value={currentTheme['primary-color']}
          onChange={(value) => updateTheme({ 'primary-color': value })}
        />

        <ColorPicker
          label="Positive Color"
          value={currentTheme['positive-color']}
          onChange={(value) => updateTheme({ 'positive-color': value })}
        />

        <ColorPicker
          label="Negative Color"
          value={currentTheme['negative-color']}
          onChange={(value) => updateTheme({ 'negative-color': value })}
        />
      </section>

      {/* Appearance Settings */}
      <section className="theme-section">
        <h4 className="theme-section-title">Appearance</h4>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={currentTheme.light || false}
            onChange={(e) => updateTheme({ light: e.target.checked })}
          />
          Light Mode
        </label>

        <div className="form-group">
          <label>Contrast Multiplier</label>
          <div className="slider-row">
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={currentTheme['contrast-multiplier'] ?? 1}
              onChange={(e) => updateTheme({ 'contrast-multiplier': parseFloat(e.target.value) })}
              className="slider"
            />
            <span className="slider-value">{currentTheme['contrast-multiplier'] ?? 1}</span>
          </div>
        </div>

        <div className="form-group">
          <label>Text Saturation Multiplier</label>
          <div className="slider-row">
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={currentTheme['text-saturation-multiplier'] ?? 1}
              onChange={(e) => updateTheme({ 'text-saturation-multiplier': parseFloat(e.target.value) })}
              className="slider"
            />
            <span className="slider-value">{currentTheme['text-saturation-multiplier'] ?? 1}</span>
          </div>
        </div>
      </section>

      {/* Advanced Settings */}
      <section className="theme-section">
        <h4 className="theme-section-title">Advanced</h4>

        <div className="form-group">
          <label>Custom CSS File</label>
          <input
            type="text"
            value={currentTheme['custom-css-file'] || ''}
            onChange={(e) => updateTheme({ 'custom-css-file': e.target.value || undefined })}
            placeholder="/path/to/custom.css"
          />
        </div>

        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={currentTheme['disable-picker'] || false}
            onChange={(e) => updateTheme({ 'disable-picker': e.target.checked })}
          />
          Disable Theme Picker in Glance
        </label>
      </section>
    </div>
  );
}
