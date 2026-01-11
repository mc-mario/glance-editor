import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  default: ({ value }: { value: string }) => (
    <textarea data-testid="monaco-editor" defaultValue={value} />
  ),
}));

// Mock the hooks
vi.mock('../hooks/useConfig', () => ({
  useConfig: () => ({
    config: {
      pages: [
        {
          name: 'Home',
          columns: [
            { size: 'full', widgets: [{ type: 'clock' }] },
          ],
        },
      ],
    },
    rawConfig: 'pages:\n  - name: Home',
    loading: false,
    error: null,
    saving: false,
    reload: vi.fn(),
    updateConfig: vi.fn(),
    updateRawConfig: vi.fn(),
  }),
  useWebSocket: () => ({
    connected: true,
    lastMessage: null,
  }),
}));

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the app title', () => {
    render(<App />);
    expect(screen.getByText('Glance Editor')).toBeInTheDocument();
  });

  it('renders pages section title', () => {
    render(<App />);
    expect(screen.getByText('Pages')).toBeInTheDocument();
  });

  it('renders the page name in layout editor', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });

  it('renders page initial in sidebar', () => {
    render(<App />);
    expect(screen.getByText('H')).toBeInTheDocument();
  });

  it('shows connected status when WebSocket is connected', () => {
    render(<App />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('renders the add page button', () => {
    render(<App />);
    const addButton = screen.getByTitle('Add page');
    expect(addButton).toBeInTheDocument();
  });

  it('renders the YAML button', () => {
    render(<App />);
    expect(screen.getByText('YAML')).toBeInTheDocument();
  });

  it('renders view mode toggle', () => {
    render(<App />);
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('starts in edit mode by default', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
  });

  it('renders widgets in the layout editor', () => {
    render(<App />);
    expect(screen.getByText('Clock')).toBeInTheDocument();
    expect(screen.getByText('clock')).toBeInTheDocument();
  });

  it('switches to preview mode when clicking Preview button', () => {
    render(<App />);
    const previewBtn = screen.getByText('Preview');
    fireEvent.click(previewBtn);
    expect(screen.getByTitle('Glance Dashboard Preview')).toBeInTheDocument();
  });

  it('shows device toggle in preview mode', () => {
    render(<App />);
    const previewBtn = screen.getByText('Preview');
    fireEvent.click(previewBtn);
    expect(screen.getByTitle('Desktop (1920px)')).toBeInTheDocument();
    expect(screen.getByTitle('Tablet (768px)')).toBeInTheDocument();
    expect(screen.getByTitle('Phone (375px)')).toBeInTheDocument();
  });

  it('renders the preview iframe in preview mode', () => {
    render(<App />);
    const previewBtn = screen.getByText('Preview');
    fireEvent.click(previewBtn);
    const iframe = screen.getByTitle('Glance Dashboard Preview');
    expect(iframe).toBeInTheDocument();
  });

  it('opens widget palette when clicking add widget button', () => {
    render(<App />);
    // Find all "Add Widget" buttons and click the first one (in the header)
    const addWidgetButtons = screen.getAllByRole('button', { name: /Add Widget/i });
    fireEvent.click(addWidgetButtons[0]);
    // Check that widget palette is open by looking for the search input
    expect(screen.getByPlaceholderText('Search widgets...')).toBeInTheDocument();
  });

  it('shows raw YAML when clicking YAML button', () => {
    render(<App />);
    const yamlBtn = screen.getByText('YAML');
    fireEvent.click(yamlBtn);

    // Panel header should appear
    expect(screen.getByRole('heading', { name: 'YAML Editor' })).toBeInTheDocument();
    // Monaco editor should render with the config
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });
});
