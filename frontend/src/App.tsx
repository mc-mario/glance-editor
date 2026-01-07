import { useState, useEffect } from 'react';
import { useConfig, useWebSocket } from './hooks/useConfig';
import { Preview } from './components/Preview';
import { StatusBadge } from './components/StatusBadge';
import type { GlanceConfig } from './types';

// Get Glance URL from environment or default
const GLANCE_URL = import.meta.env.VITE_GLANCE_URL || 'http://localhost:8080';

function App() {
  const { config, rawConfig, loading, error, saving, reload, updateConfig } = useConfig();
  const { connected, lastMessage } = useWebSocket();
  const [refreshKey, setRefreshKey] = useState(0);

  // Reload config when WebSocket receives config-changed message
  useEffect(() => {
    if (lastMessage && typeof lastMessage === 'object' && 'type' in lastMessage) {
      const msg = lastMessage as { type: string };
      if (msg.type === 'config-changed') {
        reload();
        setRefreshKey((k) => k + 1);
      }
    }
  }, [lastMessage, reload]);

  const handleRefresh = () => {
    reload();
    setRefreshKey((k) => k + 1);
  };

  const handleAddPage = async () => {
    if (!config) return;

    const newPage = {
      name: `Page ${config.pages.length + 1}`,
      columns: [
        {
          size: 'full' as const,
          widgets: [],
        },
      ],
    };

    const updatedConfig: GlanceConfig = {
      ...config,
      pages: [...config.pages, newPage],
    };

    try {
      await updateConfig(updatedConfig);
      setRefreshKey((k) => k + 1);
    } catch {
      // Error is handled by useConfig hook
    }
  };

  if (loading) {
    return <div className="loading">Loading configuration...</div>;
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>Glance Editor</h1>
          <StatusBadge status={connected ? 'connected' : 'disconnected'} />
        </div>

        <div className="sidebar-content">
          {error && <div className="error-message">{error}</div>}

          <div className="section">
            <div className="section-title">Actions</div>
            <div className="actions">
              <button
                className="btn btn-primary"
                onClick={handleRefresh}
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Refresh'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={handleAddPage}
                disabled={saving || !config}
              >
                Add Page
              </button>
            </div>
          </div>

          {config && (
            <div className="section">
              <div className="section-title">Pages ({config.pages.length})</div>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {config.pages.map((page, index) => (
                  <li
                    key={index}
                    style={{
                      padding: '0.5rem 0.75rem',
                      backgroundColor: '#0f3460',
                      marginBottom: '0.5rem',
                      borderRadius: '0.375rem',
                      fontSize: '0.875rem',
                    }}
                  >
                    {page.name}
                    {page.slug && (
                      <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>
                        /{page.slug}
                      </span>
                    )}
                    <span style={{ color: '#64748b', marginLeft: '0.5rem' }}>
                      ({page.columns.length} columns,{' '}
                      {page.columns.reduce((sum, col) => sum + col.widgets.length, 0)} widgets)
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="section">
            <div className="section-title">Raw Config</div>
            <pre className="config-display">{rawConfig}</pre>
          </div>
        </div>
      </div>

      <Preview glanceUrl={GLANCE_URL} refreshKey={refreshKey} />
    </div>
  );
}

export default App;
