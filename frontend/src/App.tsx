import { useState, useEffect, useCallback } from 'react';
import { useConfig, useWebSocket } from './hooks/useConfig';
import { Preview } from './components/Preview';
import { StatusBadge } from './components/StatusBadge';
import { PageList } from './components/PageList';
import { PageEditor } from './components/PageEditor';
import { LayoutEditor } from './components/LayoutEditor';
import { WidgetPalette } from './components/WidgetPalette';
import { ThemeDesigner } from './components/ThemeDesigner';
import { CodeEditor } from './components/CodeEditor';
import { EnvVarManager } from './components/EnvVarManager';
import { ValidationPanel, validateConfig } from './components/ValidationPanel';
import { createDefaultWidget, type WidgetDefinition } from './widgetDefinitions';
import type { GlanceConfig, PageConfig, ColumnConfig, WidgetConfig, ThemeConfig } from './types';

const GLANCE_URL = import.meta.env.VITE_GLANCE_URL || 'http://localhost:8080';

type ViewMode = 'edit' | 'preview';
type PreviewDevice = 'desktop' | 'tablet' | 'phone';
type FloatingPanel = 'page-settings' | 'widget-palette' | 'theme' | 'code' | 'env-vars' | 'validation' | null;

function App() {
  const { config, rawConfig, loading, error, saving, reload, updateConfig, updateRawConfig } = useConfig();
  const { connected, lastMessage } = useWebSocket();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [activePanel, setActivePanel] = useState<FloatingPanel>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

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
  
  // Validation status
  const validationIssues = validateConfig(config);
  const hasErrors = validationIssues.some(i => i.severity === 'error');
  const hasWarnings = validationIssues.some(i => i.severity === 'warning');

  // Helper to toggle floating panels
  const togglePanel = (panel: FloatingPanel) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  // Helper to update config
  const saveConfig = useCallback(
    async (newConfig: GlanceConfig) => {
      try {
        await updateConfig(newConfig);
        setRefreshKey((k) => k + 1);
        setCodeError(null);
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

    const newColumns = selectedPage.columns.map(col => ({
      ...col,
      widgets: [...col.widgets]
    }));
    const [movedWidget] = newColumns[fromColumn].widgets.splice(fromWidget, 1);

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
    handleWidgetAdd(0, widget);
    setActivePanel(null);
  };

  // Theme handlers
  const handleThemeChange = async (theme: ThemeConfig) => {
    if (!config) return;
    await saveConfig({ ...config, theme });
  };

  // Code editor handlers
  const handleCodeChange = async (newRawConfig: string) => {
    try {
      await updateRawConfig(newRawConfig);
      setRefreshKey((k) => k + 1);
      setCodeError(null);
    } catch (err) {
      setCodeError(err instanceof Error ? err.message : 'Failed to parse YAML');
    }
  };

  // Validation navigation
  const handleValidationNavigate = (pageIndex: number, columnIndex?: number, widgetIndex?: number) => {
    setSelectedPageIndex(pageIndex);
    if (columnIndex !== undefined && widgetIndex !== undefined) {
      setSelectedWidgetId(`${columnIndex}-${widgetIndex}`);
    }
    setActivePanel(null);
    setViewMode('edit');
  };

  if (loading) {
    return <div className="loading">Loading configuration...</div>;
  }

  return (
    <div className="app">
      {/* Top Toolbar */}
      <header className="toolbar">
        <div className="toolbar-left">
          <h1 className="logo">Glance Editor</h1>
          <StatusBadge status={connected ? 'connected' : saving ? 'loading' : 'disconnected'} />
          {/* Validation Badge */}
          {hasErrors && (
            <button 
              className="validation-badge error"
              onClick={() => togglePanel('validation')}
              title="Configuration has errors"
            >
              {validationIssues.filter(i => i.severity === 'error').length} errors
            </button>
          )}
          {!hasErrors && hasWarnings && (
            <button 
              className="validation-badge warning"
              onClick={() => togglePanel('validation')}
              title="Configuration has warnings"
            >
              {validationIssues.filter(i => i.severity === 'warning').length} warnings
            </button>
          )}
        </div>

        <div className="toolbar-center">
          {/* View Mode Toggle */}
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === 'edit' ? 'active' : ''}`}
              onClick={() => setViewMode('edit')}
            >
              Edit
            </button>
            <button
              className={`view-btn ${viewMode === 'preview' ? 'active' : ''}`}
              onClick={() => setViewMode('preview')}
            >
              Preview
            </button>
          </div>

          {/* Device Toggle (only in preview mode) */}
          {viewMode === 'preview' && (
            <div className="device-toggle">
              <button
                className={`device-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
                onClick={() => setPreviewDevice('desktop')}
                title="Desktop (1920px)"
              >
                Desktop
              </button>
              <button
                className={`device-btn ${previewDevice === 'tablet' ? 'active' : ''}`}
                onClick={() => setPreviewDevice('tablet')}
                title="Tablet (768px)"
              >
                Tablet
              </button>
              <button
                className={`device-btn ${previewDevice === 'phone' ? 'active' : ''}`}
                onClick={() => setPreviewDevice('phone')}
                title="Phone (375px)"
              >
                Phone
              </button>
            </div>
          )}
        </div>

        <div className="toolbar-right">
          {error && <span className="toolbar-error">{error}</span>}
          <button
            className={`btn btn-secondary ${activePanel === 'theme' ? 'active' : ''}`}
            onClick={() => togglePanel('theme')}
            title="Theme Designer"
          >
            Theme
          </button>
          <button
            className={`btn btn-secondary ${activePanel === 'env-vars' ? 'active' : ''}`}
            onClick={() => togglePanel('env-vars')}
            title="Environment Variables"
          >
            Env
          </button>
          <button
            className={`btn btn-secondary ${activePanel === 'code' ? 'active' : ''}`}
            onClick={() => togglePanel('code')}
            title="Edit YAML directly"
          >
            YAML
          </button>
          <button
            className={`btn btn-secondary ${activePanel === 'validation' ? 'active' : ''}`}
            onClick={() => togglePanel('validation')}
            title="Validation"
          >
            Validate
          </button>
          <a
            href={GLANCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            Open Glance
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="main-container">
        {/* Left Sidebar - Pages */}
        <aside className="sidebar-mini">
          {config && (
            <PageList
              pages={config.pages}
              selectedIndex={selectedPageIndex}
              onSelect={setSelectedPageIndex}
              onAdd={handleAddPage}
              onDelete={handleDeletePage}
              onReorder={handleReorderPages}
              onRename={handleRenamePage}
            />
          )}
          
          <div className="sidebar-actions">
            <button
              className={`sidebar-action-btn ${activePanel === 'page-settings' ? 'active' : ''}`}
              onClick={() => togglePanel('page-settings')}
              title="Page Settings"
            >
              Settings
            </button>
            <button
              className={`sidebar-action-btn ${activePanel === 'widget-palette' ? 'active' : ''}`}
              onClick={() => togglePanel('widget-palette')}
              title="Add Widget"
            >
              + Widget
            </button>
          </div>
        </aside>

        {/* Floating Panels */}
        {activePanel === 'page-settings' && selectedPage && (
          <div className="floating-panel">
            <div className="floating-panel-header">
              <h3>Page Settings</h3>
              <button className="btn-close" onClick={() => setActivePanel(null)}>x</button>
            </div>
            <PageEditor page={selectedPage} onChange={handlePageChange} />
          </div>
        )}

        {activePanel === 'widget-palette' && (
          <div className="floating-panel floating-panel-wide">
            <div className="floating-panel-header">
              <h3>Add Widget</h3>
              <button className="btn-close" onClick={() => setActivePanel(null)}>x</button>
            </div>
            <WidgetPalette onWidgetSelect={handlePaletteWidgetSelect} />
          </div>
        )}

        {activePanel === 'theme' && (
          <div className="floating-panel floating-panel-wide floating-panel-scrollable">
            <div className="floating-panel-header">
              <h3>Theme Designer</h3>
              <button className="btn-close" onClick={() => setActivePanel(null)}>x</button>
            </div>
            <ThemeDesigner 
              theme={config?.theme}
              onChange={handleThemeChange}
              onClose={() => setActivePanel(null)}
            />
          </div>
        )}

        {activePanel === 'code' && rawConfig && (
          <div className="floating-panel floating-panel-code floating-panel-fullheight">
            <div className="floating-panel-header">
              <h3>YAML Editor</h3>
              <button className="btn-close" onClick={() => setActivePanel(null)}>x</button>
            </div>
            <CodeEditor 
              value={rawConfig}
              onChange={handleCodeChange}
              onClose={() => setActivePanel(null)}
              hasError={!!codeError}
              errorMessage={codeError || undefined}
            />
          </div>
        )}

        {activePanel === 'env-vars' && rawConfig && (
          <div className="floating-panel floating-panel-wide floating-panel-scrollable">
            <div className="floating-panel-header">
              <h3>Environment Variables</h3>
              <button className="btn-close" onClick={() => setActivePanel(null)}>x</button>
            </div>
            <EnvVarManager 
              rawConfig={rawConfig}
              onClose={() => setActivePanel(null)}
            />
          </div>
        )}

        {activePanel === 'validation' && (
          <div className="floating-panel floating-panel-wide floating-panel-scrollable">
            <div className="floating-panel-header">
              <h3>Validation</h3>
              <button className="btn-close" onClick={() => setActivePanel(null)}>x</button>
            </div>
            <ValidationPanel 
              config={config}
              onClose={() => setActivePanel(null)}
              onNavigate={handleValidationNavigate}
            />
          </div>
        )}

        {/* Main Content Area */}
        <main className="content-area">
          {viewMode === 'edit' ? (
            selectedPage && (
              <LayoutEditor
                page={selectedPage}
                selectedWidgetId={selectedWidgetId}
                onColumnsChange={handleColumnsChange}
                onWidgetSelect={handleWidgetSelect}
                onWidgetAdd={handleWidgetAdd}
                onWidgetDelete={handleWidgetDelete}
                onWidgetMove={handleWidgetMove}
              />
            )
          ) : (
            <Preview
              glanceUrl={GLANCE_URL}
              refreshKey={refreshKey}
              device={previewDevice}
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
