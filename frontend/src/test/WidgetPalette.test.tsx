import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WidgetPalette } from '../components/WidgetPalette';
import { WIDGET_DEFINITIONS, getWidgetDefinition } from '../widgetDefinitions';

describe('WidgetPalette', () => {
  const mockOnWidgetSelect = vi.fn();
  const mockOnAddToColumn = vi.fn();
  const mockOnAddToHeader = vi.fn();

  it('renders all widgets count', () => {
    render(<WidgetPalette onWidgetSelect={mockOnWidgetSelect} />);
    expect(screen.getByText(`Widgets (${WIDGET_DEFINITIONS.length})`)).toBeInTheDocument();
  });

  it('renders target selector when onAddToHeader is provided', () => {
    render(
      <WidgetPalette
        onWidgetSelect={mockOnWidgetSelect}
        onAddToColumn={mockOnAddToColumn}
        onAddToHeader={mockOnAddToHeader}
      />
    );
    expect(screen.getByText('Add to:')).toBeInTheDocument();
    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByText('Column')).toBeInTheDocument();
  });

  it('sets default target to column', () => {
    render(
      <WidgetPalette
        onWidgetSelect={mockOnWidgetSelect}
        onAddToColumn={mockOnAddToColumn}
        onAddToHeader={mockOnAddToHeader}
      />
    );
    expect(screen.getByText('Column')).toHaveClass('bg-accent', 'text-bg-primary');
    expect(screen.getByText('Header')).not.toHaveClass('bg-accent', 'text-bg-primary');
  });

  it('can switch target to header', () => {
    render(
      <WidgetPalette
        onWidgetSelect={mockOnWidgetSelect}
        onAddToColumn={mockOnAddToColumn}
        onAddToHeader={mockOnAddToHeader}
      />
    );

    const headerButton = screen.getByText('Header');
    fireEvent.click(headerButton);

    expect(headerButton).toHaveClass('bg-accent', 'text-bg-primary');
    expect(screen.getByText('Column')).not.toHaveClass('bg-accent', 'text-bg-primary');
  });

  it('calls onAddToHeader when header is selected and widget is clicked', () => {
    render(
      <WidgetPalette
        onWidgetSelect={mockOnWidgetSelect}
        onAddToColumn={mockOnAddToColumn}
        onAddToHeader={mockOnAddToHeader}
        columns={[{ size: 'full', widgets: [] }]}
      />
    );

    // Switch to header
    const headerButton = screen.getByText('Header');
    fireEvent.click(headerButton);

    // Click a widget
    fireEvent.click(screen.getByText('Clock'));

    expect(mockOnAddToHeader).toHaveBeenCalledWith(expect.objectContaining({ type: 'clock' }));
    expect(mockOnAddToColumn).not.toHaveBeenCalled();
  });

  it('calls onAddToColumn when column is selected and widget is clicked', () => {
    const onWidgetSelect = vi.fn();
    const onAddToColumn = vi.fn();
    const onAddToHeader = vi.fn();
    
    render(
      <WidgetPalette
        onWidgetSelect={onWidgetSelect}
        onAddToColumn={onAddToColumn}
        onAddToHeader={onAddToHeader}
        columns={[{ size: 'full', widgets: [] }]}
      />
    );

    // Click a widget (column is default)
    fireEvent.click(screen.getByText('Clock'));

    expect(onAddToColumn).toHaveBeenCalledWith(0, expect.objectContaining({ type: 'clock' }));
    expect(onAddToHeader).not.toHaveBeenCalled();
  });

  it('does not show target selector when onAddToHeader is not provided', () => {
    render(
      <WidgetPalette
        onWidgetSelect={mockOnWidgetSelect}
        onAddToColumn={mockOnAddToColumn}
        columns={[{ size: 'full', widgets: [] }]}
      />
    );

    expect(screen.queryByText('Add to:')).not.toBeInTheDocument();
    expect(screen.queryByText('Header')).not.toBeInTheDocument();
  });

  it('renders search input', () => {
    render(<WidgetPalette onWidgetSelect={mockOnWidgetSelect} />);
    expect(screen.getByPlaceholderText('Search widgets...')).toBeInTheDocument();
  });

  it('renders category filters', () => {
    render(<WidgetPalette onWidgetSelect={mockOnWidgetSelect} />);
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Social')).toBeInTheDocument();
    expect(screen.getByText('Monitoring')).toBeInTheDocument();
    expect(screen.getByText('Utility')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
    expect(screen.getByText('Developer')).toBeInTheDocument();
  });

  it('renders widget names', () => {
    render(<WidgetPalette onWidgetSelect={mockOnWidgetSelect} />);
    expect(screen.getByText('RSS Feed')).toBeInTheDocument();
    expect(screen.getByText('Clock')).toBeInTheDocument();
    expect(screen.getByText('Weather')).toBeInTheDocument();
  });

  it('filters widgets by search query', () => {
    render(<WidgetPalette onWidgetSelect={mockOnWidgetSelect} />);
    const searchInput = screen.getByPlaceholderText('Search widgets...');
    
    fireEvent.change(searchInput, { target: { value: 'weather' } });
    
    expect(screen.getByText('Weather')).toBeInTheDocument();
    expect(screen.queryByText('Clock')).not.toBeInTheDocument();
  });

  it('filters widgets by category', () => {
    render(<WidgetPalette onWidgetSelect={mockOnWidgetSelect} />);
    
    fireEvent.click(screen.getByText('Content'));
    
    expect(screen.getByText('RSS Feed')).toBeInTheDocument();
    expect(screen.getByText('Bookmarks')).toBeInTheDocument();
    // Clock is in utility category
    expect(screen.queryByText('Clock')).not.toBeInTheDocument();
  });

  it('calls onWidgetSelect when widget is clicked', () => {
    render(<WidgetPalette onWidgetSelect={mockOnWidgetSelect} />);
    
    fireEvent.click(screen.getByText('Clock'));
    
    expect(mockOnWidgetSelect).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'clock', name: 'Clock' })
    );
  });

  it('shows empty message when no widgets match', () => {
    render(<WidgetPalette onWidgetSelect={mockOnWidgetSelect} />);
    const searchInput = screen.getByPlaceholderText('Search widgets...');
    
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    expect(screen.getByText('No widgets found')).toBeInTheDocument();
  });

  it('includes split-column widget in palette', () => {
    render(<WidgetPalette onWidgetSelect={mockOnWidgetSelect} />);
    expect(screen.getByText('Split Column')).toBeInTheDocument();
  });

  it('split-column widget has max-columns property', () => {
    const splitColumnDef = getWidgetDefinition('split-column');
    
    expect(splitColumnDef).toBeDefined();
    
    if (!splitColumnDef) return;
    
    expect(splitColumnDef.properties).toHaveProperty('max-columns');
    expect(splitColumnDef.properties['max-columns']).toMatchObject({
      type: 'number',
      label: 'Max Columns',
      min: 2,
      max: 6,
      default: 2,
    });
  });
});
