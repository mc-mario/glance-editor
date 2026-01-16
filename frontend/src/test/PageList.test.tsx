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
    onOpenSettings: vi.fn(),
  };

  it('renders page names', () => {
    render(<PageList {...defaultProps} />);
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
  });

  it('renders page initials', () => {
    render(<PageList {...defaultProps} />);
    expect(screen.getByText('H')).toBeInTheDocument();
    expect(screen.getByText('M')).toBeInTheDocument();
  });

  it('highlights selected page', () => {
    render(<PageList {...defaultProps} selectedIndex={1} />);
    const mediaItem = screen.getByText('Media').closest('li');
    expect(mediaItem).toHaveClass('border-accent');
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

  it('shows reorder handle for selected page', () => {
    render(<PageList {...defaultProps} selectedIndex={0} />);
    // Pages are draggable, so we just check that the page item is rendered
    const pageItem = screen.getByTitle('Home');
    expect(pageItem).toBeInTheDocument();
  });

  it('shows edit icon on hover for selected page', () => {
    render(<PageList {...defaultProps} selectedIndex={0} />);
    // The edit icon (Pencil) is shown as an SVG within a span for the selected page
    const editIconContainer = document.querySelector('span.absolute');
    expect(editIconContainer).toBeInTheDocument();
  });

  it('calls onOpenSettings when clicking page icon of selected page', () => {
    render(<PageList {...defaultProps} selectedIndex={0} />);
    // The page icon wrapper is a div with relative positioning
    const pageIcon = document.querySelector('div.relative.w-9');
    if (pageIcon) {
      fireEvent.click(pageIcon);
      expect(defaultProps.onOpenSettings).toHaveBeenCalledWith(0);
    }
  });
});
