import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColumnDesigner } from '../components/ColumnDesigner';
import type { ColumnConfig } from '../types';

const mockColumns: ColumnConfig[] = [
  { size: 'small', widgets: [{ type: 'clock' }] },
  { size: 'full', widgets: [{ type: 'weather' }, { type: 'rss' }] },
];

describe('ColumnDesigner', () => {
  const defaultProps = {
    columns: mockColumns,
    pageWidth: undefined,
    selectedWidgetId: null,
    onColumnsChange: vi.fn(),
    onWidgetSelect: vi.fn(),
    onWidgetAdd: vi.fn(),
    onWidgetDelete: vi.fn(),
    onWidgetMove: vi.fn(),
  };

  it('renders column count', () => {
    render(<ColumnDesigner {...defaultProps} />);
    expect(screen.getByText(/Columns \(2\/3\)/)).toBeInTheDocument();
  });

  it('shows full column count', () => {
    render(<ColumnDesigner {...defaultProps} />);
    expect(screen.getByText('1 full column')).toBeInTheDocument();
  });

  it('renders column size toggles', () => {
    render(<ColumnDesigner {...defaultProps} />);
    expect(screen.getByText('small')).toBeInTheDocument();
    expect(screen.getByText('full')).toBeInTheDocument();
  });

  it('renders widgets in columns', () => {
    render(<ColumnDesigner {...defaultProps} />);
    expect(screen.getByText('Clock')).toBeInTheDocument();
    expect(screen.getByText('Weather')).toBeInTheDocument();
    expect(screen.getByText('RSS Feed')).toBeInTheDocument();
  });

  it('calls onWidgetSelect when widget is clicked', () => {
    render(<ColumnDesigner {...defaultProps} />);
    fireEvent.click(screen.getByText('Clock'));
    expect(defaultProps.onWidgetSelect).toHaveBeenCalledWith(0, 0);
  });

  it('respects slim page width (2 column max)', () => {
    render(<ColumnDesigner {...defaultProps} pageWidth="slim" />);
    expect(screen.getByText(/Columns \(2\/2\)/)).toBeInTheDocument();
  });

  it('shows warning when no full columns', () => {
    const noFullColumns: ColumnConfig[] = [
      { size: 'small', widgets: [] },
    ];
    render(<ColumnDesigner {...defaultProps} columns={noFullColumns} />);
    expect(screen.getByText(/At least 1 full column required/)).toBeInTheDocument();
  });

  it('disables remove column when only one column', () => {
    render(<ColumnDesigner {...defaultProps} columns={[mockColumns[0]]} />);
    const removeButtons = screen.getAllByTitle('Remove column');
    expect(removeButtons[0]).toBeDisabled();
  });

  it('calls onColumnsChange when add column is clicked', () => {
    render(<ColumnDesigner {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Add column'));
    expect(defaultProps.onColumnsChange).toHaveBeenCalled();
  });
});
