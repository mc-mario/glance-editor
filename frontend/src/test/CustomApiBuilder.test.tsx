import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CustomApiBuilder } from '../components/CustomApiBuilder';
import type { WidgetConfig } from '../types';

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

// Mock fetch for test requests
const mockFetch = vi.fn();
window.fetch = mockFetch;

describe('CustomApiBuilder', () => {
  const mockOnChange = vi.fn();
  const mockOnClose = vi.fn();

  const defaultWidget: WidgetConfig = {
    type: 'custom-api',
    title: 'My API Widget',
  };

  const configuredWidget: WidgetConfig = {
    type: 'custom-api',
    title: 'Configured Widget',
    url: 'https://api.example.com/data',
    method: 'GET',
    headers: { 'Authorization': 'Bearer token' },
    template: '{{ .JSON.String "name" }}',
  };

  beforeEach(() => {
    mockOnChange.mockClear();
    mockOnClose.mockClear();
    mockFetch.mockClear();
  });

  it('renders the custom api builder', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    expect(screen.getByText('Request')).toBeInTheDocument();
    expect(screen.getByText('Template')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('renders request tab by default', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    expect(screen.getByText('Method')).toBeInTheDocument();
    expect(screen.getByText('URL')).toBeInTheDocument();
    expect(screen.getByText('Headers')).toBeInTheDocument();
  });

  it('shows method dropdown', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    const methodSelect = screen.getByRole('combobox');
    expect(methodSelect).toHaveValue('GET');
  });

  it('shows URL input', () => {
    render(
      <CustomApiBuilder 
        widget={configuredWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    const urlInput = screen.getByPlaceholderText('https://api.example.com/data');
    expect(urlInput).toHaveValue('https://api.example.com/data');
  });

  it('shows add header button', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    expect(screen.getByText('+ Add Header')).toBeInTheDocument();
  });

  it('switches to template tab', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    fireEvent.click(screen.getByText('Template'));
    
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('shows sample templates in template tab', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    fireEvent.click(screen.getByText('Template'));
    
    expect(screen.getByText('Simple JSON Response')).toBeInTheDocument();
    expect(screen.getByText('API with Stats')).toBeInTheDocument();
    expect(screen.getByText('Weather-like Data')).toBeInTheDocument();
    expect(screen.getByText('Status List')).toBeInTheDocument();
  });

  it('shows function reference toggle in template tab', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    fireEvent.click(screen.getByText('Template'));
    
    expect(screen.getByText('Show Function Reference')).toBeInTheDocument();
  });

  it('shows function reference when toggled', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    fireEvent.click(screen.getByText('Template'));
    fireEvent.click(screen.getByText('Show Function Reference'));
    
    expect(screen.getByText('Go Template Functions')).toBeInTheDocument();
    expect(screen.getByText('toFloat value')).toBeInTheDocument();
    expect(screen.getByText('formatNumber value format')).toBeInTheDocument();
  });

  it('switches to test tab', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    fireEvent.click(screen.getByText('Test'));
    
    expect(screen.getByText('Send Request')).toBeInTheDocument();
  });

  it('shows warning in test tab when no URL', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    fireEvent.click(screen.getByText('Test'));
    
    expect(screen.getByText('Enter a URL in the Request tab first')).toBeInTheDocument();
  });

  it('disables send button when no URL', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    fireEvent.click(screen.getByText('Test'));
    
    expect(screen.getByText('Send Request')).toBeDisabled();
  });

  it('enables send button when URL is provided', () => {
    render(
      <CustomApiBuilder 
        widget={configuredWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    fireEvent.click(screen.getByText('Test'));
    
    expect(screen.getByText('Send Request')).not.toBeDisabled();
  });

  it('shows frameless checkbox', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    expect(screen.getByLabelText(/Frameless/)).toBeInTheDocument();
  });

  it('shows Done button', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('calls onClose when Done is clicked', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    fireEvent.click(screen.getByText('Done'));
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows request body field for POST method', () => {
    render(
      <CustomApiBuilder 
        widget={{ ...defaultWidget, method: 'POST' }} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    // Change method to POST
    const methodSelect = screen.getByRole('combobox');
    fireEvent.change(methodSelect, { target: { value: 'POST' } });
    
    expect(screen.getByText('Request Body')).toBeInTheDocument();
  });

  it('shows parameters section', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    expect(screen.getByText('Parameters')).toBeInTheDocument();
    expect(screen.getByText('+ Add Parameter')).toBeInTheDocument();
  });

  it('shows template help text', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    fireEvent.click(screen.getByText('Template'));
    
    expect(screen.getByText(/Use Go template syntax/)).toBeInTheDocument();
  });

  it('shows test help text', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    fireEvent.click(screen.getByText('Test'));
    
    expect(screen.getByText(/Test your API request/)).toBeInTheDocument();
  });

  it('adds header row when Add Header is clicked', () => {
    render(
      <CustomApiBuilder 
        widget={defaultWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    const addHeaderBtn = screen.getByText('+ Add Header');
    fireEvent.click(addHeaderBtn);
    
    // Should have input fields for headers
    const headerInputs = screen.getAllByPlaceholderText('Header name');
    expect(headerInputs.length).toBeGreaterThanOrEqual(1);
  });

  it('loads existing headers from widget', () => {
    render(
      <CustomApiBuilder 
        widget={configuredWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    // Should have the Authorization header loaded
    const headerInputs = screen.getAllByPlaceholderText('Header name');
    const firstHeaderInput = headerInputs[0] as HTMLInputElement;
    expect(firstHeaderInput.value).toBe('Authorization');
  });

  it('loads existing template from widget', () => {
    render(
      <CustomApiBuilder 
        widget={configuredWidget} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    fireEvent.click(screen.getByText('Template'));
    
    const editor = screen.getByTestId('monaco-editor') as HTMLTextAreaElement;
    expect(editor.value).toBe('{{ .JSON.String "name" }}');
  });

  it('displays object parameter values as JSON strings', () => {
    const widgetWithObjectParams: WidgetConfig = {
      type: 'custom-api',
      title: 'Widget with Objects',
      url: 'https://api.example.com/data',
      parameters: {
        simple: 'string value',
        nested: { foo: 'bar', count: 42 },
        array: [1, 2, 3],
      } as Record<string, unknown>,
    };

    render(
      <CustomApiBuilder 
        widget={widgetWithObjectParams} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    // Check that parameters section shows the values properly
    // The object should be serialized to JSON, not shown as [object Object]
    const valueInputs = screen.getAllByPlaceholderText('Default value');
    const values = valueInputs.map((input) => (input as HTMLInputElement).value);
    
    expect(values).toContain('string value');
    expect(values).toContain('{"foo":"bar","count":42}');
    expect(values).toContain('[1,2,3]');
  });

  it('displays array parameter values as JSON strings', () => {
    const widgetWithArrayParam: WidgetConfig = {
      type: 'custom-api',
      title: 'Widget with Array',
      url: 'https://api.example.com/data',
      parameters: {
        items: ['apple', 'banana', 'cherry'],
      } as Record<string, unknown>,
    };

    render(
      <CustomApiBuilder 
        widget={widgetWithArrayParam} 
        onChange={mockOnChange} 
        onClose={mockOnClose} 
      />
    );
    
    const valueInputs = screen.getAllByPlaceholderText('Default value');
    const values = valueInputs.map((input) => (input as HTMLInputElement).value);
    
    expect(values).toContain('["apple","banana","cherry"]');
  });
});
