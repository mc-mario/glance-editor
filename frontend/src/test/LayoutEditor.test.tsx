import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LayoutEditor } from '../components/LayoutEditor';
import type { PageConfig } from '../types';

const mockPage: PageConfig = {
  name: 'Test Page',
  columns: [
    { size: 'full', widgets: [{ type: 'clock', title: 'My Clock' }] },
    { size: 'small', widgets: [{ type: 'weather' }] },
  ],
};

const defaultProps = {
  page: mockPage,
  selectedWidgetId: null,
  onColumnsChange: vi.fn(),
  onWidgetSelect: vi.fn(),
  onWidgetAdd: vi.fn(),
  onWidgetDelete: vi.fn(),
  onWidgetMove: vi.fn(),
};

describe('LayoutEditor', () => {
  it('renders the page name', () => {
    render(<LayoutEditor {...defaultProps} />);
    expect(screen.getByText('Test Page')).toBeInTheDocument();
  });

  it('renders column count info', () => {
    render(<LayoutEditor {...defaultProps} />);
    expect(screen.getByText(/2 columns/)).toBeInTheDocument();
  });

  it('renders full column badge', () => {
    render(<LayoutEditor {...defaultProps} />);
    expect(screen.getByText('1 full')).toBeInTheDocument();
  });

  it('renders widgets in columns', () => {
    render(<LayoutEditor {...defaultProps} />);
    expect(screen.getByText('My Clock')).toBeInTheDocument();
    expect(screen.getByText('Weather')).toBeInTheDocument();
  });

  it('renders widget types', () => {
    render(<LayoutEditor {...defaultProps} />);
    expect(screen.getByText('clock')).toBeInTheDocument();
    expect(screen.getByText('weather')).toBeInTheDocument();
  });

  it('renders add column button', () => {
    render(<LayoutEditor {...defaultProps} />);
    expect(screen.getByText('Add Column')).toBeInTheDocument();
  });

  it('calls onColumnsChange when adding a column', () => {
    const onColumnsChange = vi.fn();
    render(<LayoutEditor {...defaultProps} onColumnsChange={onColumnsChange} />);
    
    const addBtn = screen.getByText('Add Column');
    fireEvent.click(addBtn);
    
    expect(onColumnsChange).toHaveBeenCalled();
  });

  it('disables add column button when at max columns', () => {
    const fullPage: PageConfig = {
      name: 'Full Page',
      columns: [
        { size: 'full', widgets: [] },
        { size: 'small', widgets: [] },
        { size: 'small', widgets: [] },
      ],
    };
    render(<LayoutEditor {...defaultProps} page={fullPage} />);
    
    const addBtn = screen.getByText('Add Column');
    expect(addBtn.closest('button')).toBeDisabled();
  });

  it('calls onWidgetSelect when clicking a widget', () => {
    const onWidgetSelect = vi.fn();
    render(<LayoutEditor {...defaultProps} onWidgetSelect={onWidgetSelect} />);
    
    const widget = screen.getByText('My Clock').closest('div[draggable="true"]');
    fireEvent.click(widget!);
    
    expect(onWidgetSelect).toHaveBeenCalledWith(0, 0);
  });

  it('highlights selected widget', () => {
    render(<LayoutEditor {...defaultProps} selectedWidgetId="0-0" />);
    
    const widget = screen.getByText('My Clock').closest('div[draggable="true"]');
    expect(widget).toHaveClass('border-accent');
  });

  it('shows delete button on hover and calls onWidgetDelete', () => {
    const onWidgetDelete = vi.fn();
    render(<LayoutEditor {...defaultProps} onWidgetDelete={onWidgetDelete} />);
    
    const deleteBtn = screen.getAllByTitle('Delete widget')[0];
    fireEvent.click(deleteBtn);
    
    expect(onWidgetDelete).toHaveBeenCalledWith(0, 0);
  });

  it('renders column size badges', () => {
    render(<LayoutEditor {...defaultProps} />);
    expect(screen.getByText('FULL')).toBeInTheDocument();
    expect(screen.getByText('SMALL')).toBeInTheDocument();
  });

  it('toggles column size when clicking badge', () => {
    const onColumnsChange = vi.fn();
    // Start with 2 full columns to allow toggling to small
    const twoFullPage: PageConfig = {
      name: 'Two Full',
      columns: [
        { size: 'full', widgets: [] },
        { size: 'full', widgets: [] },
      ],
    };
    render(<LayoutEditor {...defaultProps} page={twoFullPage} onColumnsChange={onColumnsChange} />);
    
    const fullBadges = screen.getAllByText('FULL');
    fireEvent.click(fullBadges[0]);
    
    expect(onColumnsChange).toHaveBeenCalled();
  });

  it('renders help text', () => {
    render(<LayoutEditor {...defaultProps} />);
    expect(screen.getByText(/Drag widgets to reorder/)).toBeInTheDocument();
  });

  it('shows empty state for columns without widgets', () => {
    const emptyPage: PageConfig = {
      name: 'Empty',
      columns: [{ size: 'full', widgets: [] }],
    };
    render(<LayoutEditor {...defaultProps} page={emptyPage} />);
    
    expect(screen.getByText('Drop widgets here')).toBeInTheDocument();
  });

  it('renders widget count per column', () => {
    render(<LayoutEditor {...defaultProps} />);
    // Both columns have 1 widget each
    const widgetCounts = screen.getAllByText('1 widget');
    expect(widgetCounts).toHaveLength(2);
  });

  it('shows warning when no full columns', () => {
    const noFullPage: PageConfig = {
      name: 'No Full',
      columns: [{ size: 'small', widgets: [] }],
    };
    render(<LayoutEditor {...defaultProps} page={noFullPage} />);
    
    expect(screen.getByText('At least 1 full column required')).toBeInTheDocument();
  });
});
