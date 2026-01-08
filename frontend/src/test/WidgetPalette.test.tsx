import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WidgetPalette } from '../components/WidgetPalette';
import { WIDGET_DEFINITIONS } from '../widgetDefinitions';

describe('WidgetPalette', () => {
  const mockOnWidgetSelect = vi.fn();

  it('renders all widgets count', () => {
    render(<WidgetPalette onWidgetSelect={mockOnWidgetSelect} />);
    expect(screen.getByText(`Widgets (${WIDGET_DEFINITIONS.length})`)).toBeInTheDocument();
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
});
