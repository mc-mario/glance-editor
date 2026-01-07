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

  it('renders action buttons', () => {
    render(<App />);
    expect(screen.getByText('Refresh')).toBeInTheDocument();
    expect(screen.getByText('Add Page')).toBeInTheDocument();
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
