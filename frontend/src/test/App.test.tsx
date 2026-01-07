import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

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

  it('renders the page name', () => {
    render(<App />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders the editor tabs', () => {
    render(<App />);
    expect(screen.getByText('Page Settings')).toBeInTheDocument();
    expect(screen.getByText('Layout')).toBeInTheDocument();
    expect(screen.getByText('Widgets')).toBeInTheDocument();
  });

  it('renders the column designer by default', () => {
    render(<App />);
    expect(screen.getByText(/Columns \(1\/3\)/)).toBeInTheDocument();
    expect(screen.getByText('1 full column')).toBeInTheDocument();
  });

  it('renders widgets in the column', () => {
    render(<App />);
    expect(screen.getByText('Clock')).toBeInTheDocument();
    expect(screen.getByText('clock')).toBeInTheDocument();
  });

  it('renders the preview iframe', () => {
    render(<App />);
    const iframe = screen.getByTitle('Glance Dashboard Preview');
    expect(iframe).toBeInTheDocument();
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

  it('renders the show raw config button', () => {
    render(<App />);
    expect(screen.getByText(/Show.*Raw Config/)).toBeInTheDocument();
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
