import type { GlanceConfig, PageConfig, ColumnConfig, WidgetConfig } from '../types';
import { WIDGET_DEFINITIONS } from '../widgetDefinitions';

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  id: string;
  severity: ValidationSeverity;
  message: string;
  path: string;
  pageIndex?: number;
  columnIndex?: number;
  widgetIndex?: number;
  quickFix?: {
    label: string;
    action: () => void;
  };
}

// Reserved page slugs that cannot be used
const RESERVED_SLUGS = ['api', 'static', 'assets', 'login', 'logout', 'manifest.json'];

// Valid widget types
const VALID_WIDGET_TYPES = new Set(WIDGET_DEFINITIONS.map(w => w.type));

// Validate the entire configuration
export function validateConfig(config: GlanceConfig | null): ValidationIssue[] {
  if (!config) {
    return [{
      id: 'no-config',
      severity: 'error',
      message: 'No configuration loaded',
      path: '/',
    }];
  }

  const issues: ValidationIssue[] = [];

  // Validate pages
  if (!config.pages || config.pages.length === 0) {
    issues.push({
      id: 'no-pages',
      severity: 'error',
      message: 'Configuration must have at least one page',
      path: 'pages',
    });
  } else {
    const slugs = new Set<string>();

    config.pages.forEach((page, pageIndex) => {
      const pagePath = `pages[${pageIndex}]`;

      // Page name validation
      if (!page.name || page.name.trim() === '') {
        issues.push({
          id: `page-${pageIndex}-no-name`,
          severity: 'error',
          message: `Page ${pageIndex + 1} has no name`,
          path: `${pagePath}.name`,
          pageIndex,
        });
      }

      // Slug validation
      const slug = page.slug || '';
      if (pageIndex > 0 && !slug) {
        issues.push({
          id: `page-${pageIndex}-no-slug`,
          severity: 'warning',
          message: `Page "${page.name}" has no slug (will be auto-generated)`,
          path: `${pagePath}.slug`,
          pageIndex,
        });
      }

      if (slug && RESERVED_SLUGS.includes(slug.toLowerCase())) {
        issues.push({
          id: `page-${pageIndex}-reserved-slug`,
          severity: 'error',
          message: `Page "${page.name}" uses reserved slug "${slug}"`,
          path: `${pagePath}.slug`,
          pageIndex,
        });
      }

      if (slug && slugs.has(slug)) {
        issues.push({
          id: `page-${pageIndex}-duplicate-slug`,
          severity: 'error',
          message: `Duplicate page slug "${slug}"`,
          path: `${pagePath}.slug`,
          pageIndex,
        });
      }
      if (slug) slugs.add(slug);

      // Validate columns
      validateColumns(page, pageIndex, issues);
    });
  }

  // Validate theme
  if (config.theme) {
    validateTheme(config.theme, issues);
  }

  return issues;
}

// Validate page columns
function validateColumns(page: PageConfig, pageIndex: number, issues: ValidationIssue[]) {
  const pagePath = `pages[${pageIndex}]`;

  if (!page.columns || page.columns.length === 0) {
    issues.push({
      id: `page-${pageIndex}-no-columns`,
      severity: 'error',
      message: `Page "${page.name}" has no columns`,
      path: `${pagePath}.columns`,
      pageIndex,
    });
    return;
  }

  // Check column count based on page width
  const maxColumns = page.width === 'slim' ? 2 : 3;
  if (page.columns.length > maxColumns) {
    issues.push({
      id: `page-${pageIndex}-too-many-columns`,
      severity: 'error',
      message: `Page "${page.name}" has ${page.columns.length} columns (max ${maxColumns} for ${page.width || 'default'} width)`,
      path: `${pagePath}.columns`,
      pageIndex,
    });
  }

  // Count full columns
  const fullColumns = page.columns.filter(c => c.size === 'full').length;
  if (fullColumns === 0) {
    issues.push({
      id: `page-${pageIndex}-no-full-column`,
      severity: 'error',
      message: `Page "${page.name}" must have at least one full-width column`,
      path: `${pagePath}.columns`,
      pageIndex,
    });
  } else if (fullColumns > 2) {
    issues.push({
      id: `page-${pageIndex}-too-many-full-columns`,
      severity: 'error',
      message: `Page "${page.name}" has ${fullColumns} full columns (max 2)`,
      path: `${pagePath}.columns`,
      pageIndex,
    });
  }

  // Validate each column
  page.columns.forEach((column, columnIndex) => {
    validateColumn(column, pageIndex, columnIndex, page.name, issues);
  });
}

// Validate a single column
function validateColumn(
  column: ColumnConfig,
  pageIndex: number,
  columnIndex: number,
  pageName: string,
  issues: ValidationIssue[]
) {
  const columnPath = `pages[${pageIndex}].columns[${columnIndex}]`;

  // Size validation
  if (column.size !== 'small' && column.size !== 'full') {
    issues.push({
      id: `column-${pageIndex}-${columnIndex}-invalid-size`,
      severity: 'error',
      message: `Column ${columnIndex + 1} on "${pageName}" has invalid size "${column.size}"`,
      path: `${columnPath}.size`,
      pageIndex,
      columnIndex,
    });
  }

  // Empty column warning
  if (!column.widgets || column.widgets.length === 0) {
    issues.push({
      id: `column-${pageIndex}-${columnIndex}-empty`,
      severity: 'info',
      message: `Column ${columnIndex + 1} on "${pageName}" is empty`,
      path: `${columnPath}.widgets`,
      pageIndex,
      columnIndex,
    });
  } else {
    // Validate widgets
    column.widgets.forEach((widget, widgetIndex) => {
      validateWidget(widget, pageIndex, columnIndex, widgetIndex, pageName, issues);
    });
  }
}

// Validate a single widget
function validateWidget(
  widget: WidgetConfig,
  pageIndex: number,
  columnIndex: number,
  widgetIndex: number,
  pageName: string,
  issues: ValidationIssue[]
) {
  const widgetPath = `pages[${pageIndex}].columns[${columnIndex}].widgets[${widgetIndex}]`;
  const widgetLabel = widget.title || widget.type || `Widget ${widgetIndex + 1}`;

  // Type validation
  if (!widget.type) {
    issues.push({
      id: `widget-${pageIndex}-${columnIndex}-${widgetIndex}-no-type`,
      severity: 'error',
      message: `Widget "${widgetLabel}" on "${pageName}" has no type`,
      path: `${widgetPath}.type`,
      pageIndex,
      columnIndex,
      widgetIndex,
    });
  } else if (!VALID_WIDGET_TYPES.has(widget.type)) {
    issues.push({
      id: `widget-${pageIndex}-${columnIndex}-${widgetIndex}-invalid-type`,
      severity: 'error',
      message: `Unknown widget type "${widget.type}" on "${pageName}"`,
      path: `${widgetPath}.type`,
      pageIndex,
      columnIndex,
      widgetIndex,
    });
  }

  // Widget-specific validation
  validateWidgetSpecific(widget, pageIndex, columnIndex, widgetIndex, pageName, issues);
}

// Widget-specific validations
function validateWidgetSpecific(
  widget: WidgetConfig,
  pageIndex: number,
  columnIndex: number,
  widgetIndex: number,
  pageName: string,
  issues: ValidationIssue[]
) {
  const widgetPath = `pages[${pageIndex}].columns[${columnIndex}].widgets[${widgetIndex}]`;

  switch (widget.type) {
    case 'rss':
      if (!widget.feeds || !Array.isArray(widget.feeds) || widget.feeds.length === 0) {
        issues.push({
          id: `widget-${pageIndex}-${columnIndex}-${widgetIndex}-rss-no-feeds`,
          severity: 'error',
          message: `RSS widget "${widget.title || 'RSS Feed'}" on "${pageName}" has no feeds configured`,
          path: `${widgetPath}.feeds`,
          pageIndex,
          columnIndex,
          widgetIndex,
        });
      } else {
        (widget.feeds as { url?: string }[]).forEach((feed, feedIndex) => {
          if (!feed.url) {
            issues.push({
              id: `widget-${pageIndex}-${columnIndex}-${widgetIndex}-rss-feed-${feedIndex}-no-url`,
              severity: 'error',
              message: `RSS feed ${feedIndex + 1} in "${widget.title || 'RSS Feed'}" has no URL`,
              path: `${widgetPath}.feeds[${feedIndex}].url`,
              pageIndex,
              columnIndex,
              widgetIndex,
            });
          }
        });
      }
      break;

    case 'weather':
      if (!widget.location) {
        issues.push({
          id: `widget-${pageIndex}-${columnIndex}-${widgetIndex}-weather-no-location`,
          severity: 'error',
          message: `Weather widget on "${pageName}" has no location configured`,
          path: `${widgetPath}.location`,
          pageIndex,
          columnIndex,
          widgetIndex,
        });
      }
      break;

    case 'reddit':
      if (!widget.subreddit) {
        issues.push({
          id: `widget-${pageIndex}-${columnIndex}-${widgetIndex}-reddit-no-subreddit`,
          severity: 'error',
          message: `Reddit widget on "${pageName}" has no subreddit configured`,
          path: `${widgetPath}.subreddit`,
          pageIndex,
          columnIndex,
          widgetIndex,
        });
      }
      break;

    case 'monitor':
      if (!widget.sites || !Array.isArray(widget.sites) || widget.sites.length === 0) {
        issues.push({
          id: `widget-${pageIndex}-${columnIndex}-${widgetIndex}-monitor-no-sites`,
          severity: 'warning',
          message: `Monitor widget on "${pageName}" has no sites configured`,
          path: `${widgetPath}.sites`,
          pageIndex,
          columnIndex,
          widgetIndex,
        });
      }
      break;

    case 'iframe':
      if (!widget.url) {
        issues.push({
          id: `widget-${pageIndex}-${columnIndex}-${widgetIndex}-iframe-no-url`,
          severity: 'error',
          message: `IFrame widget on "${pageName}" has no URL configured`,
          path: `${widgetPath}.url`,
          pageIndex,
          columnIndex,
          widgetIndex,
        });
      }
      break;

    case 'custom-api':
      if (!widget.url) {
        issues.push({
          id: `widget-${pageIndex}-${columnIndex}-${widgetIndex}-customapi-no-url`,
          severity: 'error',
          message: `Custom API widget on "${pageName}" has no URL configured`,
          path: `${widgetPath}.url`,
          pageIndex,
          columnIndex,
          widgetIndex,
        });
      }
      if (!widget.template) {
        issues.push({
          id: `widget-${pageIndex}-${columnIndex}-${widgetIndex}-customapi-no-template`,
          severity: 'warning',
          message: `Custom API widget on "${pageName}" has no template configured`,
          path: `${widgetPath}.template`,
          pageIndex,
          columnIndex,
          widgetIndex,
        });
      }
      break;
  }
}

// Validate theme configuration
function validateTheme(theme: GlanceConfig['theme'], issues: ValidationIssue[]) {
  if (!theme) return;

  // Validate color formats
  const colorFields = ['background-color', 'primary-color', 'positive-color', 'negative-color'] as const;

  colorFields.forEach(field => {
    const value = theme[field];
    if (value && !isValidHSLColor(value)) {
      issues.push({
        id: `theme-invalid-${field}`,
        severity: 'warning',
        message: `Theme ${field} "${value}" may not be a valid HSL color format`,
        path: `theme.${field}`,
      });
    }
  });

  // Validate multipliers
  if (theme['contrast-multiplier'] !== undefined) {
    const val = theme['contrast-multiplier'];
    if (val < 0.5 || val > 2) {
      issues.push({
        id: 'theme-contrast-out-of-range',
        severity: 'warning',
        message: `Contrast multiplier ${val} is outside recommended range (0.5 - 2.0)`,
        path: 'theme.contrast-multiplier',
      });
    }
  }
}

// Check if a string is a valid HSL color format
function isValidHSLColor(value: string): boolean {
  // "240 13 95" format
  if (/^\d+(\.\d+)?\s+\d+(\.\d+)?\s+\d+(\.\d+)?$/.test(value)) {
    return true;
  }
  // "hsl(240, 13%, 95%)" format
  if (/^hsl\(\s*\d+(\.\d+)?\s*,\s*\d+(\.\d+)?%?\s*,\s*\d+(\.\d+)?%?\s*\)$/i.test(value)) {
    return true;
  }
  return false;
}

// Get severity icon
export function getSeverityIcon(severity: ValidationSeverity): string {
  switch (severity) {
    case 'error': return 'X';
    case 'warning': return 'Warn';
    case 'info': return 'ℹ';
  }
}

// Get severity class
export function getSeverityClass(severity: ValidationSeverity): string {
  return `validation-${severity}`;
}
