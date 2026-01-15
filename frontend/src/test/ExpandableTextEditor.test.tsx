import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExpandableTextEditor } from '../components/inputs/ExpandableTextEditor';

describe('ExpandableTextEditor', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the textarea with initial value', () => {
    render(<ExpandableTextEditor value="Hello world" onChange={vi.fn()} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('Hello world');
  });

  it('renders the expand button', () => {
    render(<ExpandableTextEditor value="" onChange={vi.fn()} />);

    expect(screen.getByTitle('Expand editor')).toBeInTheDocument();
  });

  it('shows placeholder text', () => {
    render(
      <ExpandableTextEditor
        value=""
        onChange={vi.fn()}
        placeholder="Enter your text..."
      />
    );

    const textarea = screen.getByPlaceholderText('Enter your text...');
    expect(textarea).toBeInTheDocument();
  });

  it('calls onChange after debounce when typing', async () => {
    const onChange = vi.fn();
    render(<ExpandableTextEditor value="" onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New text' } });

    // onChange should not be called immediately
    expect(onChange).not.toHaveBeenCalled();

    // Fast-forward past debounce delay
    vi.advanceTimersByTime(500);

    expect(onChange).toHaveBeenCalledWith('New text');
  });

  it('opens modal when clicking expand button', () => {
    render(<ExpandableTextEditor value="Test content" onChange={vi.fn()} />);

    const expandBtn = screen.getByTitle('Expand editor');
    fireEvent.click(expandBtn);

    // Modal should appear with header
    expect(screen.getByText('Edit Content')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('uses custom label in modal header', () => {
    render(
      <ExpandableTextEditor
        value="Test content"
        onChange={vi.fn()}
        label="Edit Description"
      />
    );

    const expandBtn = screen.getByTitle('Expand editor');
    fireEvent.click(expandBtn);

    expect(screen.getByText('Edit Description')).toBeInTheDocument();
  });

  it('closes modal when clicking Done button', () => {
    render(<ExpandableTextEditor value="Test content" onChange={vi.fn()} />);

    const expandBtn = screen.getByTitle('Expand editor');
    fireEvent.click(expandBtn);

    expect(screen.getByText('Edit Content')).toBeInTheDocument();

    const doneBtn = screen.getByText('Done');
    fireEvent.click(doneBtn);

    // Modal should be closed
    expect(screen.queryByText('Edit Content')).not.toBeInTheDocument();
  });

  it('closes modal when clicking close button', () => {
    render(<ExpandableTextEditor value="Test content" onChange={vi.fn()} />);

    const expandBtn = screen.getByTitle('Expand editor');
    fireEvent.click(expandBtn);

    const closeBtn = screen.getByTitle('Close (Esc)');
    fireEvent.click(closeBtn);

    expect(screen.queryByText('Edit Content')).not.toBeInTheDocument();
  });

  it('shows hint text in modal footer', () => {
    render(<ExpandableTextEditor value="Test content" onChange={vi.fn()} />);

    const expandBtn = screen.getByTitle('Expand editor');
    fireEvent.click(expandBtn);

    expect(screen.getByText('Press Esc or click outside to close')).toBeInTheDocument();
  });

  it('syncs content between inline and modal textarea', () => {
    render(<ExpandableTextEditor value="Initial" onChange={vi.fn()} />);

    // Modify inline textarea
    const inlineTextarea = screen.getByRole('textbox');
    fireEvent.change(inlineTextarea, { target: { value: 'Modified' } });

    // Open modal
    const expandBtn = screen.getByTitle('Expand editor');
    fireEvent.click(expandBtn);

    // Both textareas should have the modified value
    const textareas = screen.getAllByRole('textbox');
    expect(textareas).toHaveLength(2);
    textareas.forEach(ta => {
      expect(ta).toHaveValue('Modified');
    });
  });

  it('flushes changes on blur', () => {
    const onChange = vi.fn();
    render(<ExpandableTextEditor value="" onChange={onChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.focus(textarea);
    fireEvent.change(textarea, { target: { value: 'Blur test' } });
    fireEvent.blur(textarea);

    // Should flush immediately on blur, not wait for debounce
    expect(onChange).toHaveBeenCalledWith('Blur test');
  });

  it('uses custom row count', () => {
    render(<ExpandableTextEditor value="" onChange={vi.fn()} rows={8} />);

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('rows', '8');
  });
});
