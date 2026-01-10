import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnvVarManager } from '../components/EnvVarManager';

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(),
};
Object.assign(navigator, { clipboard: mockClipboard });

describe('EnvVarManager', () => {
  const mockOnClose = vi.fn();
  
  const configWithEnvVars = `pages:
  - name: Home
    columns:
      - size: full
        widgets:
          - type: weather
            api-key: \${WEATHER_API_KEY}
          - type: custom-api
            url: https://api.example.com
            headers:
              Authorization: Bearer \${API_TOKEN}
              X-Secret: \${secret:my-secret}
          - type: rss
            feeds:
              - url: \${readFileFromEnv:RSS_URL}`;

  const configWithoutEnvVars = `pages:
  - name: Home
    columns:
      - size: full
        widgets:
          - type: clock`;

  beforeEach(() => {
    mockOnClose.mockClear();
    mockClipboard.writeText.mockClear();
  });

  it('renders the env var manager', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    expect(screen.getByPlaceholderText('Filter variables...')).toBeInTheDocument();
  });

  it('detects environment variables', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    // Use getAllByText since there can be multiple matches in the UI
    expect(screen.getAllByText(/WEATHER_API_KEY/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/API_TOKEN/).length).toBeGreaterThan(0);
  });

  it('detects docker secrets', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    expect(screen.getByText(/secret:my-secret/)).toBeInTheDocument();
  });

  it('detects readFileFromEnv variables', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    expect(screen.getByText(/readFileFromEnv:RSS_URL/)).toBeInTheDocument();
  });

  it('shows correct variable count', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    expect(screen.getByText('4 variables detected')).toBeInTheDocument();
  });

  it('shows empty state when no variables detected', () => {
    render(<EnvVarManager rawConfig={configWithoutEnvVars} />);
    
    expect(screen.getByText('No environment variables detected in your configuration.')).toBeInTheDocument();
  });

  it('filters variables by name', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    const filterInput = screen.getByPlaceholderText('Filter variables...');
    fireEvent.change(filterInput, { target: { value: 'WEATHER' } });
    
    // The filtered list should show WEATHER_API_KEY
    expect(screen.getAllByText(/WEATHER_API_KEY/).length).toBeGreaterThan(0);
    // Should still show total count of 4 variables detected
    expect(screen.getByText('4 variables detected')).toBeInTheDocument();
  });

  it('shows no match message when filter has no results', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    const filterInput = screen.getByPlaceholderText('Filter variables...');
    fireEvent.change(filterInput, { target: { value: 'nonexistent' } });
    
    expect(screen.getByText('No variables match your filter.')).toBeInTheDocument();
  });

  it('shows copy button for each variable', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    const copyButtons = screen.getAllByText('Copy');
    expect(copyButtons.length).toBeGreaterThan(0);
  });

  it('copies variable to clipboard when copy button is clicked', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    const copyButtons = screen.getAllByText('Copy');
    fireEvent.click(copyButtons[0]);
    
    expect(mockClipboard.writeText).toHaveBeenCalled();
  });

  it('shows export section when variables exist', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    expect(screen.getByText('Export')).toBeInTheDocument();
    expect(screen.getByText('Copy docker-compose snippet')).toBeInTheDocument();
    expect(screen.getByText('Copy .env file')).toBeInTheDocument();
  });

  it('does not show export section when no variables', () => {
    render(<EnvVarManager rawConfig={configWithoutEnvVars} />);
    
    expect(screen.queryByText('Export')).not.toBeInTheDocument();
  });

  it('shows docker-compose preview', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    expect(screen.getByText('docker-compose.yml snippet:')).toBeInTheDocument();
  });

  it('shows location info for variables', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    // Multiple variables means multiple location labels
    expect(screen.getAllByText('Locations:').length).toBeGreaterThan(0);
  });

  it('shows Set Mock Value button for env vars', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    // Multiple env vars means multiple Set Mock Value buttons
    expect(screen.getAllByText('Set Mock Value').length).toBeGreaterThan(0);
  });

  it('shows mock value editor when Set Mock Value is clicked', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    // Click the first Set Mock Value button
    const mockValueButtons = screen.getAllByText('Set Mock Value');
    fireEvent.click(mockValueButtons[0]);
    
    expect(screen.getByPlaceholderText('Enter mock value for preview...')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('shows type descriptions', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    // Multiple variables of each type
    expect(screen.getAllByText('Environment variable').length).toBeGreaterThan(0);
    expect(screen.getByText('Docker secret (from /run/secrets/)')).toBeInTheDocument();
    expect(screen.getByText('Read file path from environment variable')).toBeInTheDocument();
  });

  it('copies docker-compose snippet to clipboard', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    fireEvent.click(screen.getByText('Copy docker-compose snippet'));
    
    expect(mockClipboard.writeText).toHaveBeenCalled();
  });

  it('copies .env file to clipboard', () => {
    render(<EnvVarManager rawConfig={configWithEnvVars} />);
    
    fireEvent.click(screen.getByText('Copy .env file'));
    
    expect(mockClipboard.writeText).toHaveBeenCalled();
  });
});
