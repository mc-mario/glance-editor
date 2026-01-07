import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PageEditor } from '../components/PageEditor';
import type { PageConfig } from '../types';

const mockPage: PageConfig = {
  name: 'Test Page',
  slug: 'test-page',
  width: undefined,
  'show-mobile-header': true,
  'hide-desktop-navigation': false,
  'center-vertically': false,
  columns: [{ size: 'full', widgets: [] }],
};

describe('PageEditor', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    mockOnChange.mockClear();
  });

  it('renders page name input', () => {
    render(<PageEditor page={mockPage} onChange={mockOnChange} />);
    const input = screen.getByLabelText('Page Name');
    expect(input).toHaveValue('Test Page');
  });

  it('renders slug input', () => {
    render(<PageEditor page={mockPage} onChange={mockOnChange} />);
    const input = screen.getByLabelText('Slug (URL path)');
    expect(input).toHaveValue('test-page');
  });

  it('renders page width select', () => {
    render(<PageEditor page={mockPage} onChange={mockOnChange} />);
    const select = screen.getByLabelText('Page Width');
    expect(select).toBeInTheDocument();
  });

  it('renders checkbox options', () => {
    render(<PageEditor page={mockPage} onChange={mockOnChange} />);
    expect(screen.getByLabelText('Show mobile header')).toBeChecked();
    expect(screen.getByLabelText('Hide desktop navigation')).not.toBeChecked();
    expect(screen.getByLabelText('Center content vertically')).not.toBeChecked();
  });

  it('calls onChange when name is updated', () => {
    render(<PageEditor page={mockPage} onChange={mockOnChange} />);
    const input = screen.getByLabelText('Page Name');
    
    fireEvent.change(input, { target: { value: 'New Name' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'New Name' })
    );
  });

  it('calls onChange when checkbox is toggled', () => {
    render(<PageEditor page={mockPage} onChange={mockOnChange} />);
    const checkbox = screen.getByLabelText('Hide desktop navigation');
    
    fireEvent.click(checkbox);
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ 'hide-desktop-navigation': true })
    );
  });

  it('calls onChange when width is changed', () => {
    render(<PageEditor page={mockPage} onChange={mockOnChange} />);
    const select = screen.getByLabelText('Page Width');
    
    fireEvent.change(select, { target: { value: 'wide' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ width: 'wide' })
    );
  });
});
