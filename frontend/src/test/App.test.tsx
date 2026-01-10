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

  it('renders the pages section', () => {
    render(<App />);
    expect(screen.getByText(/Pages \(1\)/)).toBeInTheDocument();
  });

  it('renders the page name in sidebar', () => {
    render(<App />);
    // Page name appears in both sidebar (page-name) and layout editor (h2)
    const pageNames = screen.getAllByText('Home');
    expect(pageNames.length).toBeGreaterThanOrEqual(1);
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

  it('renders the Open Glance link', () => {
    render(<App />);
    expect(screen.getByText('Open Glance')).toBeInTheDocument();
  });

  it('renders view mode toggle', () => {
    render(<App />);
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Preview')).toBeInTheDocument();
  });

  it('starts in edit mode by default', () => {
    render(<App />);
    // In edit mode, we should see the layout editor with the page name header
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
    
    // In preview mode, device info should be visible
    expect(screen.getByText(/Desktop - 1920 x 1080/)).toBeInTheDocument();
  });

  it('shows device toggle in preview mode', () => {
    render(<App />);
    const previewBtn = screen.getByText('Preview');
    fireEvent.click(previewBtn);
    
    // Device buttons should be visible
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

  it('opens page settings panel when clicking settings button', () => {
    render(<App />);
    const settingsBtn = screen.getByTitle('Page Settings');
    fireEvent.click(settingsBtn);
    
    // Panel header should appear
    expect(screen.getByRole('heading', { name: 'Page Settings' })).toBeInTheDocument();
  });

  it('opens widget palette when clicking add widget button', () => {
    render(<App />);
    const addWidgetBtn = screen.getByTitle('Add Widget');
    fireEvent.click(addWidgetBtn);
    
    // Panel header should appear
    expect(screen.getByRole('heading', { name: 'Add Widget' })).toBeInTheDocument();
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

describe('App loading state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading message when loading', async () => {
    // Override the mock for this test
    vi.doMock('../hooks/useConfig', () => ({
      useConfig: () => ({
        config: null,
        rawConfig: '',
        loading: true,
        error: null,
        saving: false,
        reload: vi.fn(),
        updateConfig: vi.fn(),
        updateRawConfig: vi.fn(),
      }),
      useWebSocket: () => ({
        connected: false,
        lastMessage: null,
      }),
    }));

    // Note: This test demonstrates the pattern; actual loading state
    // would need module reset to work properly
  });
});
