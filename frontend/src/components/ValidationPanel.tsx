import { useMemo } from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle } from 'lucide-react';
import type { GlanceConfig } from '../types';
import {
  validateConfig,
  getSeverityClass,
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
    <div className="validation-panel">
      {/* Summary */}
      <div className="validation-summary">
        <div className={`summary-item ${errorCount > 0 ? 'has-issues' : ''}`}>
          <span className="summary-icon"><XCircle size={16} /></span>
          <span className="summary-count">{errorCount}</span>
          <span className="summary-label">Error{errorCount !== 1 ? 's' : ''}</span>
        </div>
        <div className={`summary-item ${warningCount > 0 ? 'has-issues' : ''}`}>
          <span className="summary-icon"><AlertTriangle size={16} /></span>
          <span className="summary-count">{warningCount}</span>
          <span className="summary-label">Warning{warningCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="summary-item">
          <span className="summary-icon"><Info size={16} /></span>
          <span className="summary-count">{infoCount}</span>
          <span className="summary-label">Info</span>
        </div>
      </div>

      {/* Issues List */}
      {issues.length === 0 ? (
        <div className="validation-empty">
          <span className="validation-success-icon"><CheckCircle size={24} /></span>
          <p>Configuration is valid!</p>
          <p className="validation-hint">No issues detected in your configuration.</p>
        </div>
      ) : (
        <div className="validation-issues">
          {issues.map((issue) => (
            <div
              key={issue.id}
              className={`validation-issue ${getSeverityClass(issue.severity)}`}
              onClick={() => handleNavigate(issue)}
              role={issue.pageIndex !== undefined ? 'button' : undefined}
            >
              <span className="issue-icon">{getSeverityIconComponent(issue.severity)}</span>
              <div className="issue-content">
                <p className="issue-message">{issue.message}</p>
                <p className="issue-path">
                  <code>{issue.path}</code>
                </p>
              </div>
              {issue.pageIndex !== undefined && (
                <span className="issue-navigate" title="Go to location">→</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
