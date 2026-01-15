import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WidgetContextMenu } from '../components/WidgetContextMenu';
import type { PageConfig, WidgetConfig } from '../types';

const mockWidget: WidgetConfig = {
  type: 'clock',
  title: 'My Clock',
};

const mockPages: PageConfig[] = [
  { name: 'Home', columns: [{ size: 'full', widgets: [mockWidget] }] },
  { name: 'Dashboard', columns: [{ size: 'full', widgets: [] }] },
  { name: 'Settings', columns: [{ size: 'small', widgets: [] }] },
];

const defaultProps = {
  widget: mockWidget,
  columnIndex: 0,
  widgetIndex: 0,
  pages: mockPages,
  currentPageIndex: 0,
  position: { x: 100, y: 100 },
  onClose: vi.fn(),
  onCopyToPage: vi.fn(),
  onMoveToPage: vi.fn(),
};

describe('WidgetContextMenu', () => {
  it('renders the context menu', () => {
    render(<WidgetContextMenu {...defaultProps} />);
    expect(screen.getByText('My Clock')).toBeInTheDocument();
  });

  it('shows widget type if no title', () => {
    const widgetNoTitle: WidgetConfig = { type: 'weather' };
    render(<WidgetContextMenu {...defaultProps} widget={widgetNoTitle} />);
    expect(screen.getByText('weather')).toBeInTheDocument();
  });

  it('renders copy and move menu items', () => {
    render(<WidgetContextMenu {...defaultProps} />);
    expect(screen.getByText('Copy to page')).toBeInTheDocument();
    expect(screen.getByText('Move to page')).toBeInTheDocument();
  });

  it('shows other pages in copy submenu on hover', () => {
    render(<WidgetContextMenu {...defaultProps} />);
    
    const copyItem = screen.getByText('Copy to page').closest('.context-menu-item');
    fireEvent.mouseEnter(copyItem!);
    
    // Should show Dashboard and Settings, not Home (current page)
    expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('calls onCopyToPage when clicking a page in copy submenu', () => {
    const onCopyToPage = vi.fn();
    const onClose = vi.fn();
    render(
      <WidgetContextMenu 
        {...defaultProps} 
        onCopyToPage={onCopyToPage}
        onClose={onClose}
      />
    );
    
    const copyItem = screen.getByText('Copy to page').closest('.context-menu-item');
    fireEvent.mouseEnter(copyItem!);
    
    const dashboardBtn = screen.getByRole('button', { name: 'Dashboard' });
    fireEvent.click(dashboardBtn);
    
    expect(onCopyToPage).toHaveBeenCalledWith(1, expect.objectContaining({ type: 'clock' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('shows other pages in move submenu on hover', () => {
    render(<WidgetContextMenu {...defaultProps} />);
    
    const moveItem = screen.getByText('Move to page').closest('.context-menu-item');
    fireEvent.mouseEnter(moveItem!);
    
    // Should show Dashboard and Settings, not Home (current page)
    expect(screen.getByRole('button', { name: 'Dashboard' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });

  it('calls onMoveToPage when clicking a page in move submenu', () => {
    const onMoveToPage = vi.fn();
    const onClose = vi.fn();
    render(
      <WidgetContextMenu 
        {...defaultProps} 
        onMoveToPage={onMoveToPage}
        onClose={onClose}
      />
    );
    
    const moveItem = screen.getByText('Move to page').closest('.context-menu-item');
    fireEvent.mouseEnter(moveItem!);
    
    const settingsBtn = screen.getByRole('button', { name: 'Settings' });
    fireEvent.click(settingsBtn);
    
    expect(onMoveToPage).toHaveBeenCalledWith(
      2, // target page index
      0, // source column index
      0, // source widget index
      expect.objectContaining({ type: 'clock' })
    );
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when clicking close button', () => {
    const onClose = vi.fn();
    render(<WidgetContextMenu {...defaultProps} onClose={onClose} />);
    
    const closeBtn = screen.getByRole('button', { name: '' });
    fireEvent.click(closeBtn);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('shows disabled options with hint when only one page exists', () => {
    const singlePage: PageConfig[] = [
      { name: 'Home', columns: [{ size: 'full', widgets: [] }] },
    ];
    render(<WidgetContextMenu {...defaultProps} pages={singlePage} />);
    
    // Should show disabled menu items
    expect(screen.getByText('Copy to page')).toBeInTheDocument();
    expect(screen.getByText('Move to page')).toBeInTheDocument();
    
    // Should show hint about adding more pages
    expect(screen.getByText('Add more pages to copy/move widgets')).toBeInTheDocument();
    
    // Menu items should have disabled class
    const copyItem = screen.getByText('Copy to page').closest('.context-menu-item');
    expect(copyItem).toHaveClass('disabled');
  });

  it('excludes current page from target list', () => {
    render(<WidgetContextMenu {...defaultProps} currentPageIndex={1} />);
    
    const copyItem = screen.getByText('Copy to page').closest('.context-menu-item');
    fireEvent.mouseEnter(copyItem!);
    
    // Dashboard (index 1) should not appear since it's the current page
    expect(screen.queryByRole('button', { name: 'Dashboard' })).not.toBeInTheDocument();
    // Home and Settings should appear
    expect(screen.getByRole('button', { name: 'Home' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument();
  });
});
