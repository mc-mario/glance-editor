import { useState, useCallback, useRef } from 'react';
import { Upload, AlertTriangle } from 'lucide-react';
import YAML from 'yaml';
import type { WidgetConfig, PageConfig, GlanceConfig } from '../types';

interface ImportPanelProps {
  config: GlanceConfig | null;
  selectedPageIndex: number;
  onImportWidget: (widget: WidgetConfig, columnIndex: number) => void;
  onImportPage: (page: PageConfig) => void;
  onClose: () => void;
}

/**
 * Validates imported data is a valid widget config
 */
function isValidWidget(data: unknown): data is WidgetConfig {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.type === 'string' && obj.type.length > 0;
}

/**
 * Validates imported data is a valid page config
 */
function isValidPage(data: unknown): data is PageConfig {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.name === 'string' && Array.isArray(obj.columns);
}

export function ImportPanel({
  config,
  selectedPageIndex,
  onImportWidget,
  onImportPage,
  onClose,
}: ImportPanelProps) {
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importTargetColumn, setImportTargetColumn] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPage = config?.pages[selectedPageIndex];

  const handleImport = useCallback(() => {
    setImportError(null);

    if (!importText.trim()) {
      setImportError('Please enter YAML or JSON to import');
      return;
    }

    let parsed: unknown;
    try {
      // Try YAML first (YAML is a superset of JSON)
      parsed = YAML.parse(importText);
    } catch (err) {
      setImportError(`Parse error: ${err instanceof Error ? err.message : 'Invalid YAML/JSON'}`);
      return;
    }

    // Determine what was imported
    if (isValidWidget(parsed)) {
      onImportWidget(parsed, importTargetColumn);
      setImportText('');
      setImportError(null);
    } else if (isValidPage(parsed)) {
      onImportPage(parsed);
      setImportText('');
      setImportError(null);
    } else {
      setImportError('Invalid format. Expected a widget (with "type" property) or page (with "name" and "columns").');
    }
  }, [importText, importTargetColumn, onImportWidget, onImportPage]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportText(content);
    };
    reader.onerror = () => {
      setImportError('Failed to read file');
    };
    reader.readAsText(file);

    // Reset input so the same file can be selected again
    event.target.value = '';
  }, []);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Target Column (for widget import) */}
          {currentPage && currentPage.columns.length > 1 && (
            <div className="space-y-2">
              <label className="text-[0.75rem] font-medium text-text-secondary">Target Column</label>
              <select
                className="w-full p-2 bg-bg-primary border border-border rounded-md text-sm"
                value={importTargetColumn}
                onChange={(e) => setImportTargetColumn(Number(e.target.value))}
              >
                {currentPage.columns.map((col, idx) => (
                  <option key={idx} value={idx}>
                    Column {idx + 1} ({col.size})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* File Upload */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".yml,.yaml,.json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              className="w-full py-2 px-4 bg-bg-tertiary text-text-primary rounded-md text-sm font-medium hover:bg-bg-elevated transition-colors flex items-center justify-center gap-2 border border-border"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={16} />
              Upload File (.yml, .json)
            </button>
          </div>

          {/* Text Input */}
          <div className="space-y-2">
            <label className="text-[0.75rem] font-medium text-text-secondary">Or paste YAML/JSON</label>
            <textarea
              className="w-full p-3 bg-bg-primary border border-border rounded-md text-xs font-mono h-32 resize-none"
              placeholder="Paste widget or page configuration here..."
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
          </div>

          {/* Import Error */}
          {importError && (
            <div className="flex items-start gap-2 p-3 bg-error/10 border border-error/30 rounded-md">
              <AlertTriangle size={16} className="text-error shrink-0 mt-0.5" />
              <span className="text-xs text-error">{importError}</span>
            </div>
          )}

          {/* Import Button */}
          <button
            className="w-full py-2 px-4 bg-accent text-bg-primary rounded-md text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleImport}
            disabled={!importText.trim()}
          >
            Import
          </button>

          {/* Help Text */}
          <div className="text-xs text-text-muted space-y-1">
            <p>Supported imports:</p>
            <ul className="list-disc list-inside ml-2">
              <li><strong>Widget:</strong> Object with a "type" property</li>
              <li><strong>Page:</strong> Object with "name" and "columns" properties</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border shrink-0">
        <button
          className="w-full py-2 px-4 bg-bg-tertiary text-text-secondary rounded-md text-sm font-medium hover:bg-bg-elevated transition-colors"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
