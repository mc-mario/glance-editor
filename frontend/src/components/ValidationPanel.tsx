import { useMemo } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import type { GlanceConfig } from '../types';
import {
  validateConfig,
  getSeverityIcon,
  type ValidationIssue,
} from '../utils/validation';

interface ValidationPanelProps {
  config: GlanceConfig | null;
  onClose?: () => void;
  onNavigate?: (pageIndex: number, columnIndex?: number, widgetIndex?: number) => void;
}

function getSeverityIconComponent(severity: 'error' | 'warning' | 'info') {
  switch (severity) {
    case 'error':
      return <XCircle size={16} />;
    case 'warning':
      return <AlertTriangle size={16} />;
    case 'info':
      return <Info size={16} />;
  }
}

interface ValidationPanelProps {
  config: GlanceConfig | null;
  onClose?: () => void;
  onNavigate?: (pageIndex: number, columnIndex?: number, widgetIndex?: number) => void;
}

export function ValidationPanel({ config, onNavigate }: ValidationPanelProps) {
  const issues = useMemo(() => validateConfig(config), [config]);

  const errorCount = issues.filter(i => i.severity === 'error').length;
  const warningCount = issues.filter(i => i.severity === 'warning').length;
  const infoCount = issues.filter(i => i.severity === 'info').length;

  const handleNavigate = (issue: ValidationIssue) => {
    if (onNavigate && issue.pageIndex !== undefined) {
      onNavigate(issue.pageIndex, issue.columnIndex, issue.widgetIndex);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-2">
        <div className={`flex flex-col items-center p-2 rounded-md border border-border bg-bg-secondary ${errorCount > 0 ? 'bg-error/5 border-error/20' : ''}`}>
          <span className="text-lg">❌</span>
          <span className="text-sm font-bold text-text-primary leading-none mt-1">{errorCount}</span>
          <span className="text-[0.65rem] uppercase tracking-wider text-text-muted mt-1">Error{errorCount !== 1 ? 's' : ''}</span>
        </div>
        <div className={`flex flex-col items-center p-2 rounded-md border border-border bg-bg-secondary ${warningCount > 0 ? 'bg-warning/5 border-warning/20' : ''}`}>
          <span className="text-lg">⚠️</span>
          <span className="text-sm font-bold text-text-primary leading-none mt-1">{warningCount}</span>
          <span className="text-[0.65rem] uppercase tracking-wider text-text-muted mt-1">Warning{warningCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="flex flex-col items-center p-2 rounded-md border border-border bg-bg-secondary">
          <span className="text-lg">ℹ️</span>
          <span className="text-sm font-bold text-text-primary leading-none mt-1">{infoCount}</span>
          <span className="text-[0.65rem] uppercase tracking-wider text-text-muted mt-1">Info</span>
        </div>
      </div>

      {/* Issues List */}
      {issues.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-bg-secondary rounded-lg border border-border border-dashed">
          <span className="text-4xl mb-4">✅</span>
          <p className="text-base font-semibold text-text-primary">Configuration is valid!</p>
          <p className="text-sm text-text-muted mt-1">No issues detected in your configuration.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={`flex items-start gap-3 p-3 rounded-md border border-border transition-all ${
                issue.pageIndex !== undefined ? 'cursor-pointer hover:border-accent hover:bg-bg-elevated' : 'bg-bg-secondary'
              } ${
                issue.severity === 'error' ? 'border-l-4 border-l-error' : 
                issue.severity === 'warning' ? 'border-l-4 border-l-warning' : 
                'border-l-4 border-l-accent'
              }`}
              onClick={() => handleNavigate(issue)}
              role={issue.pageIndex !== undefined ? 'button' : undefined}
            >
              <span className="text-lg shrink-0 mt-0.5">{getSeverityIcon(issue.severity)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary leading-snug">{issue.message}</p>
                <p className="text-[0.7rem] text-text-muted mt-1 truncate">
                  <code className="bg-bg-primary px-1 rounded font-mono text-accent">{issue.path}</code>
                </p>
              </div>
              {issue.pageIndex !== undefined && (
                <span className="text-text-muted group-hover:text-accent transition-colors" title="Go to location">→</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
