import { useState, useCallback, useMemo } from 'react';
import { X } from 'lucide-react';
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
    <div className="flex flex-col gap-4 p-4 bg-bg-secondary rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <div
          className="w-8 h-8 rounded-md border-2 border-border flex-shrink-0"
          style={{ backgroundColor: hslToCSS(color) }}
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label className="w-4 text-[0.7rem] font-bold text-text-muted">H</label>
          <input
            type="range"
            min="0"
            max="360"
            value={color.h}
            onChange={(e) => handleChange('h', parseFloat(e.target.value))}
            className="flex-1 h-2 rounded-full cursor-pointer accent-accent bg-gradient-to-r from-[#ff0000] via-[#ffff00] via-[#00ff00] via-[#00ffff] via-[#0000ff] via-[#ff00ff] to-[#ff0000]"
          />
          <span className="w-8 text-[0.7rem] text-text-muted text-right">{Math.round(color.h)}</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-4 text-[0.7rem] font-bold text-text-muted">S</label>
          <input
            type="range"
            min="0"
            max="100"
            value={color.s}
            onChange={(e) => handleChange('s', parseFloat(e.target.value))}
            className="flex-1 h-2 rounded-full cursor-pointer accent-accent bg-bg-primary"
          />
          <span className="w-8 text-[0.7rem] text-text-muted text-right">{Math.round(color.s)}%</span>
        </div>
        <div className="flex items-center gap-2">
          <label className="w-4 text-[0.7rem] font-bold text-text-muted">L</label>
          <input
            type="range"
            min="0"
            max="100"
            value={color.l}
            onChange={(e) => handleChange('l', parseFloat(e.target.value))}
            className="flex-1 h-2 rounded-full cursor-pointer accent-accent bg-bg-primary"
          />
          <span className="w-8 text-[0.7rem] text-text-muted text-right">{Math.round(color.l)}%</span>
        </div>
      </div>
      <input
        type="text"
        className="w-full p-2 bg-bg-primary border border-border rounded-md text-sm font-mono focus:outline-none focus:border-accent transition-colors"
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
  const [_showQuickPresets, _setShowQuickPresets] = useState(false);

  const currentTheme = useMemo(()=> theme || {}, [theme]);
  const userPresets = currentTheme.presets || {};
  const allPresets = useMemo(() => ({ ...DEFAULT_PRESETS, ...userPresets }), [userPresets]);

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
    <div className="flex flex-col gap-8">
      {/* Quick Presets */}
      <section className="flex flex-col gap-4">
        <h4 className="text-[0.75rem] font-semibold uppercase tracking-wider text-accent pb-2 border-b border-border">Quick Presets</h4>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {Object.entries(allPresets).map(([name, preset]) => {
            const bgColor = parseHSLColor(preset['background-color']);
            const isUserPreset = currentTheme.presets && name in currentTheme.presets;

            return (
              <div key={name} className="relative group">
                <button
                  className={`w-full flex flex-col items-center justify-center p-3 rounded-md border-2 transition-all hover:scale-[1.02] active:scale-[0.98] ${activePreset === name ? 'border-accent shadow-lg shadow-accent/20' : 'border-transparent'}`}
                  onClick={() => handleApplyPreset(name, preset)}
                  style={{
                    backgroundColor: hslToCSS(bgColor),
                    color: preset.light ? '#333' : '#fff'
                  }}
                >
                  <span className="text-sm font-semibold truncate max-w-full">{name}</span>
                  {preset.light && <span className="mt-1 px-1.5 py-0.5 bg-black/10 rounded text-[0.6rem] font-bold uppercase">Light</span>}
                </button>
                {isUserPreset && (
                  <button
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center bg-error text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    onClick={() => handleDeletePreset(name)}
                    title="Delete preset"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {showNewPreset ? (
          <div className="flex flex-col gap-2 p-3 bg-bg-secondary rounded-md border border-border">
            <input
              type="text"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              placeholder="Preset name"
              className="w-full p-2 bg-bg-primary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
            />
            <div className="flex gap-2">
              <button className="flex-1 px-3 py-1.5 bg-accent text-bg-primary rounded text-sm font-medium hover:bg-accent-hover transition-colors" onClick={handleSaveAsPreset}>
                Save
              </button>
              <button className="flex-1 px-3 py-1.5 bg-bg-tertiary text-text-secondary rounded text-sm font-medium hover:bg-bg-elevated transition-colors" onClick={() => setShowNewPreset(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button className="px-3 py-2 bg-bg-tertiary text-text-secondary rounded text-sm font-medium hover:bg-bg-elevated transition-colors border border-border border-dashed" onClick={() => setShowNewPreset(true)}>
            + Save Current as Preset
          </button>
        )}
      </section>

      {/* Color Settings */}
      <section className="flex flex-col gap-4">
        <h4 className="text-[0.75rem] font-semibold uppercase tracking-wider text-accent pb-2 border-b border-border">Colors</h4>
        <div className="grid grid-cols-1 gap-4">
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
        </div>
      </section>

      {/* Appearance Settings */}
      <section className="flex flex-col gap-4">
        <h4 className="text-[0.75rem] font-semibold uppercase tracking-wider text-accent pb-2 border-b border-border">Appearance</h4>

        <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
          <input
            type="checkbox"
            className="w-4 h-4 accent-accent"
            checked={currentTheme.light || false}
            onChange={(e) => updateTheme({ light: e.target.checked })}
          />
          Light Mode
        </label>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">Contrast Multiplier</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={currentTheme['contrast-multiplier'] ?? 1}
              onChange={(e) => updateTheme({ 'contrast-multiplier': parseFloat(e.target.value) })}
              className="flex-1 h-2 bg-bg-tertiary rounded-full cursor-pointer accent-accent"
            />
            <span className="w-8 text-sm text-text-muted text-right font-mono">{currentTheme['contrast-multiplier'] ?? 1}</span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">Text Saturation Multiplier</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={currentTheme['text-saturation-multiplier'] ?? 1}
              onChange={(e) => updateTheme({ 'text-saturation-multiplier': parseFloat(e.target.value) })}
              className="flex-1 h-2 bg-bg-tertiary rounded-full cursor-pointer accent-accent"
            />
            <span className="w-8 text-sm text-text-muted text-right font-mono">{currentTheme['text-saturation-multiplier'] ?? 1}</span>
          </div>
        </div>
      </section>

      {/* Advanced Settings */}
      <section className="flex flex-col gap-4">
        <h4 className="text-[0.75rem] font-semibold uppercase tracking-wider text-accent pb-2 border-b border-border">Advanced</h4>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-secondary">Custom CSS File</label>
          <input
            type="text"
            className="w-full p-2 bg-bg-primary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
            value={currentTheme['custom-css-file'] || ''}
            onChange={(e) => updateTheme({ 'custom-css-file': e.target.value || undefined })}
            placeholder="/path/to/custom.css"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
          <input
            type="checkbox"
            className="w-4 h-4 accent-accent"
            checked={currentTheme['disable-picker'] || false}
            onChange={(e) => updateTheme({ 'disable-picker': e.target.checked })}
          />
          Disable Theme Picker in Glance
        </label>
      </section>
    </div>
  );
}
