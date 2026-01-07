import { useState, useEffect, useCallback } from 'react';
import { useConfig, useWebSocket } from './hooks/useConfig';
import { Preview } from './components/Preview';
import { StatusBadge } from './components/StatusBadge';
import { PageList } from './components/PageList';
import { PageEditor } from './components/PageEditor';
import { ColumnDesigner } from './components/ColumnDesigner';
import { WidgetPalette } from './components/WidgetPalette';
import { createDefaultWidget, type WidgetDefinition } from './widgetDefinitions';
import type { GlanceConfig, PageConfig, ColumnConfig, WidgetConfig } from './types';

const GLANCE_URL = import.meta.env.VITE_GLANCE_URL || 'http://localhost:8080';

type EditorTab = 'page' | 'columns' | 'widgets';

function App() {
  const { config, rawConfig, loading, error, saving, reload, updateConfig } = useConfig();
  const { connected, lastMessage } = useWebSocket();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('columns');
  const [showRawConfig, setShowRawConfig] = useState(false);

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

  // Reset selection when page changes
  useEffect(() => {
    setSelectedWidgetId(null);
  }, [selectedPageIndex]);

  const selectedPage = config?.pages[selectedPageIndex];

  // Helper to update config
  const saveConfig = useCallback(
    async (newConfig: GlanceConfig) => {
      try {
        await updateConfig(newConfig);
        setRefreshKey((k) => k + 1);
      } catch {
        // Error handled by hook
      }
    },
    [updateConfig]
  );

  // Page handlers
  const handleAddPage = async () => {
    if (!config) return;
    const newPage: PageConfig = {
      name: `Page ${config.pages.length + 1}`,
      columns: [{ size: 'full', widgets: [] }],
    };
    await saveConfig({ ...config, pages: [...config.pages, newPage] });
    setSelectedPageIndex(config.pages.length);
  };

  const handleDeletePage = async (index: number) => {
    if (!config || config.pages.length <= 1) return;
    const newPages = config.pages.filter((_, i) => i !== index);
    await saveConfig({ ...config, pages: newPages });
    if (selectedPageIndex >= newPages.length) {
      setSelectedPageIndex(newPages.length - 1);
    }
  };

  const handleReorderPages = async (fromIndex: number, toIndex: number) => {
    if (!config) return;
    const newPages = [...config.pages];
    const [moved] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, moved);
    await saveConfig({ ...config, pages: newPages });
    setSelectedPageIndex(toIndex);
  };

  const handleRenamePage = async (index: number, newName: string) => {
    if (!config) return;
    const newPages = config.pages.map((p, i) =>
      i === index ? { ...p, name: newName } : p
    );
    await saveConfig({ ...config, pages: newPages });
  };

  const handlePageChange = async (updatedPage: PageConfig) => {
    if (!config) return;
    const newPages = config.pages.map((p, i) =>
      i === selectedPageIndex ? updatedPage : p
    );
    await saveConfig({ ...config, pages: newPages });
  };

  // Column handlers
  const handleColumnsChange = async (columns: ColumnConfig[]) => {
    if (!config || !selectedPage) return;
    const updatedPage = { ...selectedPage, columns };
    await handlePageChange(updatedPage);
  };

  // Widget handlers
  const handleWidgetSelect = (columnIndex: number, widgetIndex: number) => {
    setSelectedWidgetId(`${columnIndex}-${widgetIndex}`);
  };

  const handleWidgetAdd = async (columnIndex: number, widget: WidgetConfig) => {
    if (!config || !selectedPage) return;
    const newColumns = selectedPage.columns.map((col, i) =>
      i === columnIndex ? { ...col, widgets: [...col.widgets, widget] } : col
    );
    await handleColumnsChange(newColumns);
  };

  const handleWidgetDelete = async (columnIndex: number, widgetIndex: number) => {
    if (!config || !selectedPage) return;
    const newColumns = selectedPage.columns.map((col, i) =>
      i === columnIndex
        ? { ...col, widgets: col.widgets.filter((_, wi) => wi !== widgetIndex) }
        : col
    );
    await handleColumnsChange(newColumns);
    setSelectedWidgetId(null);
  };

  const handleWidgetMove = async (
    fromColumn: number,
    fromWidget: number,
    toColumn: number,
    toWidget: number
  ) => {
    if (!config || !selectedPage) return;

    const newColumns = [...selectedPage.columns];
    const [movedWidget] = newColumns[fromColumn].widgets.splice(fromWidget, 1);

    // Adjust target index if moving within the same column
    let targetIndex = toWidget;
    if (fromColumn === toColumn && fromWidget < toWidget) {
      targetIndex--;
    }

    newColumns[toColumn].widgets.splice(targetIndex, 0, movedWidget);
    await handleColumnsChange(newColumns);
  };

  const handlePaletteWidgetSelect = (definition: WidgetDefinition) => {
    if (!selectedPage || selectedPage.columns.length === 0) return;
    const widget = createDefaultWidget(definition.type);
    // Add to first column by default
    handleWidgetAdd(0, widget);
  };

  if (loading) {
    return <div className="loading">Loading configuration...</div>;
  }

  return (
    <div className="app">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1>Glance Editor</h1>
          <StatusBadge status={connected ? 'connected' : saving ? 'loading' : 'disconnected'} />
        </div>

        <div className="sidebar-content">
          {error && <div className="error-message">{error}</div>}

          {config && (
            <>
              <PageList
                pages={config.pages}
                selectedIndex={selectedPageIndex}
                onSelect={setSelectedPageIndex}
                onAdd={handleAddPage}
                onDelete={handleDeletePage}
                onReorder={handleReorderPages}
                onRename={handleRenamePage}
              />

              <div className="editor-tabs">
                <button
                  className={`tab-btn ${activeTab === 'page' ? 'active' : ''}`}
                  onClick={() => setActiveTab('page')}
                >
                  Page Settings
                </button>
                <button
                  className={`tab-btn ${activeTab === 'columns' ? 'active' : ''}`}
                  onClick={() => setActiveTab('columns')}
                >
                  Layout
                </button>
                <button
                  className={`tab-btn ${activeTab === 'widgets' ? 'active' : ''}`}
                  onClick={() => setActiveTab('widgets')}
                >
                  Widgets
                </button>
              </div>

              {selectedPage && (
                <div className="editor-content">
                  {activeTab === 'page' && (
                    <PageEditor page={selectedPage} onChange={handlePageChange} />
                  )}

                  {activeTab === 'columns' && (
                    <ColumnDesigner
                      columns={selectedPage.columns}
                      pageWidth={selectedPage.width}
                      selectedWidgetId={selectedWidgetId}
                      onColumnsChange={handleColumnsChange}
                      onWidgetSelect={handleWidgetSelect}
                      onWidgetAdd={handleWidgetAdd}
                      onWidgetDelete={handleWidgetDelete}
                      onWidgetMove={handleWidgetMove}
                    />
                  )}

                  {activeTab === 'widgets' && (
                    <WidgetPalette onWidgetSelect={handlePaletteWidgetSelect} />
                  )}
                </div>
              )}
            </>
          )}

          <div className="section">
            <button
              className="btn btn-secondary btn-block"
              onClick={() => setShowRawConfig(!showRawConfig)}
            >
              {showRawConfig ? 'Hide' : 'Show'} Raw Config
            </button>
            {showRawConfig && (
              <pre className="config-display">{rawConfig}</pre>
            )}
          </div>
        </div>
      </div>

      <Preview glanceUrl={GLANCE_URL} refreshKey={refreshKey} />
    </div>
  );
}

export default App;
