import { useMemo } from 'react';
import type { GlanceConfig } from '../types';
import {
  validateConfig,
  getSeverityIcon,
  getSeverityClass,
  type ValidationIssue,
} from '../utils/validation';

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
          <span className="summary-icon">❌</span>
          <span className="summary-count">{errorCount}</span>
          <span className="summary-label">Error{errorCount !== 1 ? 's' : ''}</span>
        </div>
        <div className={`summary-item ${warningCount > 0 ? 'has-issues' : ''}`}>
          <span className="summary-icon">⚠️</span>
          <span className="summary-count">{warningCount}</span>
          <span className="summary-label">Warning{warningCount !== 1 ? 's' : ''}</span>
        </div>
        <div className="summary-item">
          <span className="summary-icon">ℹ️</span>
          <span className="summary-count">{infoCount}</span>
          <span className="summary-label">Info</span>
        </div>
      </div>

      {/* Issues List */}
      {issues.length === 0 ? (
        <div className="validation-empty">
          <span className="validation-success-icon">✅</span>
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
              <span className="issue-icon">{getSeverityIcon(issue.severity)}</span>
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
