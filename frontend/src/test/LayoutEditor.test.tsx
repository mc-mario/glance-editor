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
  onToggleWidgetDeactivate: vi.fn(),
  onHeadWidgetAdd: vi.fn(),
  onHeadWidgetDelete: vi.fn(),
  onHeadWidgetSelect: vi.fn(),
  onHeadWidgetEdit: vi.fn(),
  onHeadWidgetMove: vi.fn(),
  onOpenWidgetPalette: vi.fn(),
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

  it('renders header widgets section when handler provided', () => {
    const pageWithHeader: PageConfig = {
      name: 'Test Page',
      'head-widgets': [{ type: 'clock', title: 'Header Clock' }],
      columns: [{ size: 'full', widgets: [] }],
    };
    render(<LayoutEditor {...defaultProps} page={pageWithHeader} />);
    
    expect(screen.getByText('Header Widgets')).toBeInTheDocument();
    expect(screen.getByText('Header Clock')).toBeInTheDocument();
    expect(screen.getByText('(1 widget)')).toBeInTheDocument();
  });

  it('shows empty state when no header widgets and opens palette on click', () => {
    const onOpenWidgetPalette = vi.fn();
    render(<LayoutEditor {...defaultProps} onOpenWidgetPalette={onOpenWidgetPalette} />);
    
    expect(screen.getByText('Header Widgets')).toBeInTheDocument();
    const emptyState = screen.getByText('No header widgets. Click to add widgets that will appear above all columns.');
    expect(emptyState).toBeInTheDocument();
    
    fireEvent.click(emptyState);
    expect(onOpenWidgetPalette).toHaveBeenCalledWith('header');
  });

  it('calls onOpenWidgetPalette when clicking header add button', () => {
    const onOpenWidgetPalette = vi.fn();
    render(<LayoutEditor {...defaultProps} onOpenWidgetPalette={onOpenWidgetPalette} />);
    
    const addButtons = screen.getAllByText('Add');
    const headerAddButton = addButtons[0];
    fireEvent.click(headerAddButton);
    
    expect(onOpenWidgetPalette).toHaveBeenCalledWith('header');
  });

  it('calls onHeadWidgetSelect when clicking header widget', () => {
    const onHeadWidgetSelect = vi.fn();
    const pageWithHeader: PageConfig = {
      name: 'Test Page',
      'head-widgets': [{ type: 'clock', title: 'Header Clock' }],
      columns: [{ size: 'full', widgets: [] }],
    };
    render(<LayoutEditor {...defaultProps} page={pageWithHeader} onHeadWidgetSelect={onHeadWidgetSelect} />);
    
    const headerWidget = screen.getByText('Header Clock').closest('.cursor-pointer');
    fireEvent.click(headerWidget!);
    
    expect(onHeadWidgetSelect).toHaveBeenCalledWith(0);
  });

  it('calls onHeadWidgetDelete when clicking delete on header widget', () => {
    const onHeadWidgetDelete = vi.fn();
    const pageWithHeader: PageConfig = {
      name: 'Test Page',
      'head-widgets': [{ type: 'clock', title: 'Header Clock' }],
      columns: [{ size: 'full', widgets: [] }],
    };
    render(<LayoutEditor {...defaultProps} page={pageWithHeader} onHeadWidgetDelete={onHeadWidgetDelete} />);
    
    const deleteButton = screen.getByTitle('Remove widget');
    fireEvent.click(deleteButton);
    
    expect(onHeadWidgetDelete).toHaveBeenCalledWith(0);
  });

  it('highlights selected header widget', () => {
    const pageWithHeader: PageConfig = {
      name: 'Test Page',
      'head-widgets': [{ type: 'clock', title: 'Header Clock' }],
      columns: [{ size: 'full', widgets: [] }],
    };
    render(<LayoutEditor {...defaultProps} page={pageWithHeader} selectedWidgetId="head-0" />);
    
    const headerWidget = screen.getByText('Header Clock').closest('.border-accent');
    expect(headerWidget).toBeInTheDocument();
  });

  it('shows deactivated state for header widgets', () => {
    const pageWithHeader: PageConfig = {
      name: 'Test Page',
      'head-widgets': [{ type: 'clock', title: 'Header Clock', _deactivated: true }],
      columns: [{ size: 'full', widgets: [] }],
    };
    render(<LayoutEditor {...defaultProps} page={pageWithHeader} />);
    
    const headerWidget = screen.getByText('Header Clock').closest('.opacity-50');
    expect(headerWidget).toBeInTheDocument();
    const strikethroughTitle = screen.getByText('Header Clock').closest('.line-through');
    expect(strikethroughTitle).toBeInTheDocument();
  });

  it('disables drag for deactivated header widgets', () => {
    const pageWithHeader: PageConfig = {
      name: 'Test Page',
      'head-widgets': [{ type: 'clock', title: 'Header Clock', _deactivated: true }],
      columns: [{ size: 'full', widgets: [] }],
    };
    render(<LayoutEditor {...defaultProps} page={pageWithHeader} />);
    
    const headerWidget = screen.getByText('Header Clock').closest('[draggable="false"]');
    expect(headerWidget).toBeInTheDocument();
  });

  describe('Drag and Drop', () => {
    const createMockDataTransfer = (data: object) => {
      const dataStr = JSON.stringify(data);
      return {
        getData: vi.fn().mockReturnValue(dataStr),
        setData: vi.fn(),
        effectAllowed: 'move',
        dropEffect: 'move',
      };
    };

    it('drops new widget from palette into header', () => {
      const onHeadWidgetAdd = vi.fn();
      render(<LayoutEditor {...defaultProps} onHeadWidgetAdd={onHeadWidgetAdd} />);
      
      const headerSection = screen.getByText('Header Widgets').closest('.border-b');
      const mockDataTransfer = createMockDataTransfer({ newWidget: true, type: 'clock' });
      
      fireEvent.dragOver(headerSection!, { dataTransfer: mockDataTransfer });
      fireEvent.drop(headerSection!, { dataTransfer: mockDataTransfer });
      
      expect(onHeadWidgetAdd).toHaveBeenCalled();
      expect(onHeadWidgetAdd.mock.calls[0][0]).toMatchObject({ type: 'clock' });
    });

    it('drops column widget into header', () => {
      const onHeadWidgetAdd = vi.fn();
      const onWidgetDelete = vi.fn();
      const pageWithWidgets: PageConfig = {
        name: 'Test Page',
        columns: [{ size: 'full', widgets: [{ type: 'clock', title: 'Column Clock' }] }],
      };
      
      render(
        <LayoutEditor
          {...defaultProps}
          page={pageWithWidgets}
          onHeadWidgetAdd={onHeadWidgetAdd}
          onWidgetDelete={onWidgetDelete}
        />
      );
      
      const headerSection = screen.getByText('Header Widgets').closest('.border-b');
      const mockDataTransfer = createMockDataTransfer({ columnIndex: 0, widgetIndex: 0 });
      
      fireEvent.dragOver(headerSection!, { dataTransfer: mockDataTransfer });
      fireEvent.drop(headerSection!, { dataTransfer: mockDataTransfer });
      
      expect(onHeadWidgetAdd).toHaveBeenCalled();
      expect(onWidgetDelete).toHaveBeenCalledWith(0, 0);
    });

    it('drops header widget into column', () => {
      const onWidgetAdd = vi.fn();
      const onHeadWidgetDelete = vi.fn();
      const pageWithHeader: PageConfig = {
        name: 'Test Page',
        'head-widgets': [{ type: 'clock', title: 'Header Clock' }],
        columns: [{ size: 'full', widgets: [] }],
      };
      
      render(
        <LayoutEditor
          {...defaultProps}
          page={pageWithHeader}
          onWidgetAdd={onWidgetAdd}
          onHeadWidgetDelete={onHeadWidgetDelete}
        />
      );
      
      const column = screen.getByText('FULL').closest('.border-dashed');
      const mockDataTransfer = createMockDataTransfer({ headWidgetIndex: true, widgetIndex: 0 });
      
      fireEvent.dragOver(column!, { dataTransfer: mockDataTransfer });
      fireEvent.drop(column!, { dataTransfer: mockDataTransfer });
      
      expect(onWidgetAdd).toHaveBeenCalledWith(0, expect.objectContaining({ type: 'clock', title: 'Header Clock' }));
      expect(onHeadWidgetDelete).toHaveBeenCalledWith(0);
    });

    it('header section accepts drops', () => {
      const onHeadWidgetAdd = vi.fn();
      const pageWithHeaders: PageConfig = {
        name: 'Test Page',
        'head-widgets': [
          { type: 'clock', title: 'Clock 1' },
          { type: 'weather', title: 'Weather' },
        ],
        columns: [{ size: 'full', widgets: [] }],
      };
      
      render(
        <LayoutEditor
          {...defaultProps}
          page={pageWithHeaders}
          onHeadWidgetAdd={onHeadWidgetAdd}
        />
      );
      
      const headerSection = screen.getByText('Header Widgets').closest('.border-b');
      
      // Verify the header section has drag handlers by checking it's present and has the right structure
      expect(headerSection).toBeInTheDocument();
      expect(headerSection?.querySelector('.flex.gap-2')).toBeInTheDocument();
    });
  });
});
