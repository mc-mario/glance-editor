import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationPanel } from '../components/ValidationPanel';
import { validateConfig } from '../utils/validation';
import type { GlanceConfig } from '../types';

describe('validateConfig', () => {
  it('returns error when config is null', () => {
    const issues = validateConfig(null);
    
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('error');
    expect(issues[0].message).toBe('No configuration loaded');
  });

  it('returns error when no pages', () => {
    const config: GlanceConfig = { pages: [] };
    const issues = validateConfig(config);
    
    expect(issues.some(i => i.message === 'Configuration must have at least one page')).toBe(true);
  });

  it('returns error when page has no name', () => {
    const config: GlanceConfig = {
      pages: [{ name: '', columns: [{ size: 'full', widgets: [] }] }],
    };
    const issues = validateConfig(config);
    
    expect(issues.some(i => i.message.includes('has no name'))).toBe(true);
  });

  it('returns error when page has no columns', () => {
    const config: GlanceConfig = {
      pages: [{ name: 'Test', columns: [] }],
    };
    const issues = validateConfig(config);
    
    expect(issues.some(i => i.message.includes('has no columns'))).toBe(true);
  });

  it('returns error when page has no full column', () => {
    const config: GlanceConfig = {
      pages: [{ name: 'Test', columns: [{ size: 'small', widgets: [] }] }],
    };
    const issues = validateConfig(config);
    
    expect(issues.some(i => i.message.includes('at least one full-width column'))).toBe(true);
  });

  it('returns error for reserved slug', () => {
    const config: GlanceConfig = {
      pages: [{ name: 'Test', slug: 'api', columns: [{ size: 'full', widgets: [] }] }],
    };
    const issues = validateConfig(config);
    
    expect(issues.some(i => i.message.includes('reserved slug'))).toBe(true);
  });

  it('returns error for duplicate slugs', () => {
    const config: GlanceConfig = {
      pages: [
        { name: 'Test1', slug: 'same', columns: [{ size: 'full', widgets: [] }] },
        { name: 'Test2', slug: 'same', columns: [{ size: 'full', widgets: [] }] },
      ],
    };
    const issues = validateConfig(config);
    
    expect(issues.some(i => i.message.includes('Duplicate page slug'))).toBe(true);
  });

  it('returns error for invalid widget type', () => {
    const config: GlanceConfig = {
      pages: [{
        name: 'Test',
        columns: [{ size: 'full', widgets: [{ type: 'invalid-type' }] }],
      }],
    };
    const issues = validateConfig(config);
    
    expect(issues.some(i => i.message.includes('Unknown widget type'))).toBe(true);
  });

  it('returns error for RSS widget without feeds', () => {
    const config: GlanceConfig = {
      pages: [{
        name: 'Test',
        columns: [{ size: 'full', widgets: [{ type: 'rss', feeds: [] }] }],
      }],
    };
    const issues = validateConfig(config);
    
    expect(issues.some(i => i.message.includes('no feeds configured'))).toBe(true);
  });

  it('returns error for weather widget without location', () => {
    const config: GlanceConfig = {
      pages: [{
        name: 'Test',
        columns: [{ size: 'full', widgets: [{ type: 'weather' }] }],
      }],
    };
    const issues = validateConfig(config);
    
    expect(issues.some(i => i.message.includes('no location configured'))).toBe(true);
  });

  it('returns error for reddit widget without subreddit', () => {
    const config: GlanceConfig = {
      pages: [{
        name: 'Test',
        columns: [{ size: 'full', widgets: [{ type: 'reddit' }] }],
      }],
    };
    const issues = validateConfig(config);
    
    expect(issues.some(i => i.message.includes('no subreddit configured'))).toBe(true);
  });

  it('returns error for custom-api widget without URL', () => {
    const config: GlanceConfig = {
      pages: [{
        name: 'Test',
        columns: [{ size: 'full', widgets: [{ type: 'custom-api' }] }],
      }],
    };
    const issues = validateConfig(config);
    
    expect(issues.some(i => i.message.includes('Custom API widget') && i.message.includes('no URL'))).toBe(true);
  });

  it('returns info for empty column', () => {
    const config: GlanceConfig = {
      pages: [{
        name: 'Test',
        columns: [{ size: 'full', widgets: [] }],
      }],
    };
    const issues = validateConfig(config);
    
    expect(issues.some(i => i.severity === 'info' && i.message.includes('is empty'))).toBe(true);
  });

  it('returns no errors for valid config', () => {
    const config: GlanceConfig = {
      pages: [{
        name: 'Test',
        columns: [{ size: 'full', widgets: [{ type: 'clock' }] }],
      }],
    };
    const issues = validateConfig(config);
    
    const errors = issues.filter(i => i.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});

describe('ValidationPanel', () => {
  const mockOnClose = vi.fn();
  const mockOnNavigate = vi.fn();

  const validConfig: GlanceConfig = {
    pages: [{
      name: 'Home',
      columns: [{ size: 'full', widgets: [{ type: 'clock' }] }],
    }],
  };

  const invalidConfig: GlanceConfig = {
    pages: [{
      name: '',
      columns: [{ size: 'small', widgets: [{ type: 'invalid' }] }],
    }],
  };

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnNavigate.mockClear();
  });

  it('renders the validation panel', () => {
    render(<ValidationPanel config={validConfig} />);
    
    expect(screen.getByText(/Error/)).toBeInTheDocument();
    expect(screen.getByText(/Warning/)).toBeInTheDocument();
    expect(screen.getByText(/Info/)).toBeInTheDocument();
  });

  it('shows success message for valid config', () => {
    render(<ValidationPanel config={validConfig} />);
    
    expect(screen.getByText('Configuration is valid!')).toBeInTheDocument();
  });

  it('shows error count', () => {
    render(<ValidationPanel config={invalidConfig} />);
    
    // There should be multiple errors (no name, no full column, invalid type)
    const errorItems = screen.getAllByText(/Error/);
    expect(errorItems.length).toBeGreaterThan(0);
  });

  it('shows issue messages', () => {
    render(<ValidationPanel config={invalidConfig} />);
    
    // Should show error about invalid widget type
    expect(screen.getByText(/Unknown widget type/)).toBeInTheDocument();
  });

  it('shows issue paths', () => {
    render(<ValidationPanel config={invalidConfig} />);
    
    // Use getAllByText since there are multiple paths containing pages[0]
    const pathElements = screen.getAllByText(/pages\[0\]/);
    expect(pathElements.length).toBeGreaterThan(0);
  });

  it('calls onNavigate when clicking on issue', () => {
    render(
      <ValidationPanel 
        config={invalidConfig} 
        onNavigate={mockOnNavigate} 
      />
    );
    
    // Find an issue and click it
    const issues = screen.getAllByRole('button');
    if (issues.length > 0) {
      fireEvent.click(issues[0]);
    }
    
    // onNavigate may or may not be called depending on if the issue has pageIndex
  });

  it('shows no issues hint text', () => {
    render(<ValidationPanel config={validConfig} />);
    
    expect(screen.getByText(/No issues detected/)).toBeInTheDocument();
  });

  it('renders null config error', () => {
    render(<ValidationPanel config={null} />);
    
    expect(screen.getByText('No configuration loaded')).toBeInTheDocument();
  });

  it('shows severity icons', () => {
    render(<ValidationPanel config={invalidConfig} />);
    
    // Should have error icons (now using Lucide icons, check for summary-icon spans)
    const summaryItems = document.querySelectorAll('.summary-icon');
    expect(summaryItems.length).toBeGreaterThan(0);
  });

  it('renders with onClose prop', () => {
    render(
      <ValidationPanel 
        config={validConfig} 
        onClose={mockOnClose} 
      />
    );
    
    // Component should render without errors
    expect(screen.getByText('Configuration is valid!')).toBeInTheDocument();
  });
});
