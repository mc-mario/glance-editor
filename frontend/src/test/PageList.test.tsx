import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageList } from '../components/PageList';
import type { PageConfig } from '../types';

const mockPages: PageConfig[] = [
  {
    name: 'Home',
    columns: [{ size: 'full', widgets: [{ type: 'clock' }] }],
  },
  {
    name: 'Media',
    slug: 'media',
    columns: [
      { size: 'small', widgets: [] },
      { size: 'full', widgets: [{ type: 'videos' }, { type: 'rss' }] },
    ],
  },
];

describe('PageList', () => {
  const defaultProps = {
    pages: mockPages,
    selectedIndex: 0,
    onSelect: vi.fn(),
    onAdd: vi.fn(),
    onDelete: vi.fn(),
    onReorder: vi.fn(),
    onRename: vi.fn(),
  };

  it('renders page count', () => {
    render(<PageList {...defaultProps} />);
    expect(screen.getByText(/Pages \(2\)/)).toBeInTheDocument();
  });

  it('renders all pages', () => {
    render(<PageList {...defaultProps} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
  });

  it('displays page slug', () => {
    render(<PageList {...defaultProps} />);
    expect(screen.getByText('/media')).toBeInTheDocument();
  });

  it('displays column and widget counts', () => {
    render(<PageList {...defaultProps} />);
    expect(screen.getByText('1c · 1w')).toBeInTheDocument(); // Home
    expect(screen.getByText('2c · 2w')).toBeInTheDocument(); // Media
  });

  it('highlights selected page', () => {
    render(<PageList {...defaultProps} selectedIndex={1} />);
    const mediaItem = screen.getByText('Media').closest('.page-item');
    expect(mediaItem).toHaveClass('selected');
  });

  it('calls onSelect when page is clicked', () => {
    render(<PageList {...defaultProps} />);
    fireEvent.click(screen.getByText('Media'));
    expect(defaultProps.onSelect).toHaveBeenCalledWith(1);
  });

  it('calls onAdd when add button is clicked', () => {
    render(<PageList {...defaultProps} />);
    fireEvent.click(screen.getByTitle('Add page'));
    expect(defaultProps.onAdd).toHaveBeenCalled();
  });

  it('disables delete button when only one page exists', () => {
    render(<PageList {...defaultProps} pages={[mockPages[0]]} />);
    const deleteButton = screen.getByTitle('Delete');
    expect(deleteButton).toBeDisabled();
  });
});
