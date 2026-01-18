import { useState, useCallback } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import YAML from 'yaml';
import type { GlanceConfig } from '../types';

interface ExportPanelProps {
  config: GlanceConfig | null;
  selectedPageIndex: number;
  onClose: () => void;
}

type ExportFormat = 'yaml' | 'json';
type ExportScope = 'widget' | 'page' | 'config';

// Patterns that indicate sensitive data - these should be redacted in exports
const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /auth/i,
  /credential/i,
  /private[_-]?key/i,
];

// Pattern to detect environment variable references
const ENV_VAR_PATTERN = /\$\{(?:([a-zA-Z]+):)?([a-zA-Z0-9_-]+)\}/g;

/**
 * Redacts sensitive values from config while preserving env var references
 * Env vars like ${API_KEY} are kept as-is (since they don't expose the actual value)
 * Literal sensitive values are replaced with placeholders
 */
function redactSensitiveData(obj: unknown, preserveEnvVars = true): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'string') {
    // If it contains env var references, preserve them
    if (preserveEnvVars && ENV_VAR_PATTERN.test(obj)) {
      return obj;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactSensitiveData(item, preserveEnvVars));
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Check if key indicates sensitive data
      const isSensitiveKey = SENSITIVE_PATTERNS.some(pattern => pattern.test(key));

      if (isSensitiveKey && typeof value === 'string') {
        // If value is an env var reference, preserve it
        if (preserveEnvVars && ENV_VAR_PATTERN.test(value)) {
          result[key] = value;
        } else if (value.length > 0) {
          // Redact non-env-var sensitive values
          result[key] = '<REDACTED>';
        } else {
          result[key] = value;
        }
      } else {
        result[key] = redactSensitiveData(value, preserveEnvVars);
      }
    }
    return result;
  }

  return obj;
}

export function ExportPanel({
  config,
  selectedPageIndex,
  onClose,
}: ExportPanelProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('yaml');
  const [exportScope, setExportScope] = useState<ExportScope>('widget');
  const [selectedWidgetIndex, setSelectedWidgetIndex] = useState<{ column: number; widget: number } | null>(null);
  const [exportOutput, setExportOutput] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const currentPage = config?.pages[selectedPageIndex];
  const allWidgets = currentPage?.columns.flatMap((col, colIdx) =>
    col.widgets.map((widget, widgetIdx) => ({
      widget,
      columnIndex: colIdx,
      widgetIndex: widgetIdx,
      label: widget.title || `${widget.type} (column ${colIdx + 1})`,
    }))
  ) || [];

  const handleExport = useCallback(() => {
    if (!config) return;

    let dataToExport: unknown;

    switch (exportScope) {
      case 'widget':
        if (!selectedWidgetIndex || !currentPage) return;
        dataToExport = currentPage.columns[selectedWidgetIndex.column]?.widgets[selectedWidgetIndex.widget];
        break;
      case 'page':
        dataToExport = currentPage;
        break;
      case 'config': {
        // Export entire config but exclude auth section for safety
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { auth, ...configWithoutAuth } = config;
        dataToExport = configWithoutAuth;
        break;
      }
    }

    if (!dataToExport) return;

    // Always redact sensitive data for safety
    const processedData = redactSensitiveData(dataToExport);

    // Format output
    const output = exportFormat === 'yaml'
      ? YAML.stringify(processedData, { indent: 2, lineWidth: 0 })
      : JSON.stringify(processedData, null, 2);

    setExportOutput(output);
  }, [config, currentPage, exportFormat, exportScope, selectedWidgetIndex]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(exportOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [exportOutput]);

  const handleDownload = useCallback(() => {
    if (!exportOutput) return;

    const extension = exportFormat === 'yaml' ? 'yml' : 'json';
    const mimeType = exportFormat === 'yaml' ? 'text/yaml' : 'application/json';
    const filename = `glance-${exportScope}-export.${extension}`;

    const blob = new Blob([exportOutput], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [exportOutput, exportFormat, exportScope]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Export Scope */}
          <div className="space-y-2">
            <label className="text-[0.75rem] font-medium text-text-secondary">Export Scope</label>
            <div className="flex gap-2">
              <button
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${exportScope === 'widget' ? 'bg-accent text-bg-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-elevated'}`}
                onClick={() => setExportScope('widget')}
              >
                Widget
              </button>
              <button
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${exportScope === 'page' ? 'bg-accent text-bg-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-elevated'}`}
                onClick={() => setExportScope('page')}
              >
                Page
              </button>
              <button
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${exportScope === 'config' ? 'bg-accent text-bg-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-elevated'}`}
                onClick={() => setExportScope('config')}
              >
                Full Config
              </button>
            </div>
          </div>

          {/* Widget Selector (only for widget scope) */}
          {exportScope === 'widget' && (
            <div className="space-y-2">
              <label className="text-[0.75rem] font-medium text-text-secondary">Select Widget</label>
              <select
                className="w-full p-2 bg-bg-primary border border-border rounded-md text-sm"
                value={selectedWidgetIndex ? `${selectedWidgetIndex.column}-${selectedWidgetIndex.widget}` : ''}
                onChange={(e) => {
                  if (!e.target.value) {
                    setSelectedWidgetIndex(null);
                    return;
                  }
                  const [col, wid] = e.target.value.split('-').map(Number);
                  setSelectedWidgetIndex({ column: col, widget: wid });
                }}
              >
                <option value="">Select a widget...</option>
                {allWidgets.map((item, idx) => (
                  <option key={idx} value={`${item.columnIndex}-${item.widgetIndex}`}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Format Selection */}
          <div className="space-y-2">
            <label className="text-[0.75rem] font-medium text-text-secondary">Format</label>
            <div className="flex gap-2">
              <button
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${exportFormat === 'yaml' ? 'bg-accent text-bg-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-elevated'}`}
                onClick={() => setExportFormat('yaml')}
              >
                YAML
              </button>
              <button
                className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors ${exportFormat === 'json' ? 'bg-accent text-bg-primary' : 'bg-bg-tertiary text-text-secondary hover:bg-bg-elevated'}`}
                onClick={() => setExportFormat('json')}
              >
                JSON
              </button>
            </div>
          </div>

          {/* Export Button */}
          <button
            className="w-full py-2 px-4 bg-accent text-bg-primary rounded-md text-sm font-medium hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleExport}
            disabled={exportScope === 'widget' && !selectedWidgetIndex}
          >
            Generate Export
          </button>

          {/* Export Output */}
          {exportOutput && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-[0.75rem] font-medium text-text-secondary">Output</label>
                <div className="flex gap-2">
                  <button
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-bg-tertiary text-text-secondary rounded hover:bg-bg-elevated transition-colors"
                    onClick={handleCopy}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-bg-tertiary text-text-secondary rounded hover:bg-bg-elevated transition-colors"
                    onClick={handleDownload}
                  >
                    <Download size={14} />
                    Download
                  </button>
                </div>
              </div>
              <pre className="p-3 bg-bg-primary border border-border rounded-md text-xs overflow-auto max-h-64 whitespace-pre-wrap">
                {exportOutput}
              </pre>
            </div>
          )}
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
