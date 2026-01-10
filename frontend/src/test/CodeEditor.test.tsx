import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CodeEditor } from '../components/CodeEditor';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value, onChange }: { value: string; onChange?: (value: string) => void }) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

describe('CodeEditor', () => {
  const mockOnChange = vi.fn();
  const mockOnClose = vi.fn();
  const defaultYaml = `pages:
  - name: Home
    columns:
      - size: full
        widgets:
          - type: clock`;

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnClose.mockClear();
  });

  it('renders the code editor', () => {
    render(
      <CodeEditor 
        value={defaultYaml} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('renders the toolbar buttons', () => {
    render(
      <CodeEditor 
        value={defaultYaml} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    expect(screen.getByText('Format')).toBeInTheDocument();
    expect(screen.getByText('Revert')).toBeInTheDocument();
    expect(screen.getByText('Apply Changes')).toBeInTheDocument();
  });

  it('shows help text', () => {
    render(
      <CodeEditor 
        value={defaultYaml} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    expect(screen.getByText(/Edit the YAML directly/)).toBeInTheDocument();
  });

  it('displays the yaml content', () => {
    render(
      <CodeEditor 
        value={defaultYaml} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe(defaultYaml);
  });

  it('shows unsaved changes indicator when modified', () => {
    render(
      <CodeEditor 
        value={defaultYaml} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    const editor = screen.getByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: defaultYaml + '\n# modified' } });
    
    expect(screen.getByText('Unsaved changes')).toBeInTheDocument();
  });

  it('enables revert button when modified', () => {
    render(
      <CodeEditor 
        value={defaultYaml} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    const revertBtn = screen.getByText('Revert');
    expect(revertBtn).toBeDisabled();
    
    const editor = screen.getByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: defaultYaml + '\n# modified' } });
    
    expect(revertBtn).not.toBeDisabled();
  });

  it('calls onChange when Apply Changes is clicked', () => {
    render(
      <CodeEditor 
        value={defaultYaml} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    const editor = screen.getByTestId('monaco-editor');
    const newValue = defaultYaml + '\n# modified';
    fireEvent.change(editor, { target: { value: newValue } });
    
    fireEvent.click(screen.getByText('Apply Changes'));
    
    expect(mockOnChange).toHaveBeenCalledWith(newValue);
  });

  it('reverts changes when Revert is clicked', () => {
    render(
      <CodeEditor 
        value={defaultYaml} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    fireEvent.change(editor, { target: { value: 'modified content' } });
    
    fireEvent.click(screen.getByText('Revert'));
    
    expect(editor.value).toBe(defaultYaml);
  });

  it('shows error message when hasError is true', () => {
    render(
      <CodeEditor 
        value={defaultYaml} 
        onChange={mockOnChange} 
        onClose={mockOnClose}
        hasError={true}
        errorMessage="Invalid YAML syntax"
      />
    );
    
    expect(screen.getByText('Invalid YAML syntax')).toBeInTheDocument();
  });

  it('disables Apply button when there is an error', () => {
    render(
      <CodeEditor 
        value={defaultYaml} 
        onChange={mockOnChange} 
        onClose={mockOnClose}
        hasError={true}
        errorMessage="Invalid YAML"
      />
    );
    
    const editor = screen.getByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: 'modified' } });
    
    expect(screen.getByText('Apply Changes')).toBeDisabled();
  });

  it('shows tab warning when tabs are detected', () => {
    render(
      <CodeEditor 
        value={defaultYaml} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    const editor = screen.getByTestId('monaco-editor');
    fireEvent.change(editor, { target: { value: 'pages:\n\t- name: Home' } });
    
    expect(screen.getByText(/Tabs detected/)).toBeInTheDocument();
  });
});
