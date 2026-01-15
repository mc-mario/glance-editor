import { useState, useEffect, useCallback } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Plus,
  X,
  FileCode,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { useConfig, useWebSocket } from './hooks/useConfig';
import { Preview } from './components/Preview';
import { StatusBadge } from './components/StatusBadge';
import { PageList } from './components/PageList';
import { PageEditor } from './components/PageEditor';
import { LayoutEditor } from './components/LayoutEditor';
import { WidgetPalette } from './components/WidgetPalette';
import { WidgetEditor, type EditingPathItem } from './components/WidgetEditor';
import { ThemeDesigner } from './components/ThemeDesigner';
import { CodeEditor } from './components/CodeEditor';
import { EnvVarManager } from './components/EnvVarManager';
import { ValidationPanel } from './components/ValidationPanel';
import { validateConfig } from './utils/validation';
import { api } from './services/api';
import {
  createDefaultWidget,
  type WidgetDefinition,
} from './widgetDefinitions';
import type {
  GlanceConfig,
  PageConfig,
  ColumnConfig,
  WidgetConfig,
  ThemeConfig,
} from './types';

// Fallback to env var, then localhost
const DEFAULT_GLANCE_URL = import.meta.env.VITE_GLANCE_URL || 'http://localhost:8080';

type ViewMode = 'edit' | 'preview';
type PreviewDevice = 'desktop' | 'tablet' | 'phone';
type FloatingPanel = 'page-settings' | 'theme' | 'code' | 'env-vars' | 'validation' | null;
type RightSidebarContent = 'widget-editor' | 'widget-palette' | null;

interface SelectedWidget {
  columnIndex: number;
  widgetIndex: number;
}

function App() {
  const { config, rawConfig, loading, error, parseError, saving, reload, updateConfig, updateRawConfig } =
    useConfig();
  const { connected, lastMessage } = useWebSocket();
  const [glanceUrl, setGlanceUrl] = useState<string>(DEFAULT_GLANCE_URL);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [editingWidget, setEditingWidget] = useState<SelectedWidget | null>(null);
  const [editingPath, setEditingPath] = useState<EditingPathItem[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('edit');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [activePanel, setActivePanel] = useState<FloatingPanel>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [rightSidebarContent, setRightSidebarContent] = useState<RightSidebarContent>(null);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);

  // Fetch runtime settings (GLANCE_URL from backend)
  useEffect(() => {
    api.getSettings()
      .then(settings => {
        if (settings.glanceUrl) {
          setGlanceUrl(settings.glanceUrl);
        }
      })
      .catch(err => {
        console.warn('Failed to fetch settings, using default GLANCE_URL:', err);
      });
  }, []);

  useEffect(() => {
    if (
      lastMessage &&
      typeof lastMessage === 'object' &&
      'type' in lastMessage
    ) {
      const msg = lastMessage as { type: string };
      if (msg.type === 'config-changed') {
        reload();
        if (viewMode === 'preview') {
          setRefreshKey((k) => k + 1);
        }
      }
    }
  }, [lastMessage, reload, viewMode]);

  useEffect(() => {
    setSelectedWidgetId(null);
    setEditingWidget(null);
    setEditingPath([]);
    setRightSidebarContent(null);
  }, [selectedPageIndex]);

  useEffect(() => {
    if (viewMode === 'preview') {
      setRefreshKey((k) => k + 1);
    }
  }, [viewMode]);

  const selectedPage = config?.pages[selectedPageIndex];

  // Validation status
  const validationIssues = validateConfig(config);
  const hasErrors = validationIssues.some(i => i.severity === 'error');
  const hasWarnings = validationIssues.some(i => i.severity === 'warning');

  // Helper to toggle floating panels
  const togglePanel = (panel: FloatingPanel) => {
    setActivePanel(prev => prev === panel ? null : panel);
  };

  const getEditingWidgetConfig = (): WidgetConfig | null => {
    if (!editingWidget || !selectedPage) return null;
    const column = selectedPage.columns[editingWidget.columnIndex];
    if (!column) return null;
    return column.widgets[editingWidget.widgetIndex] || null;
  };

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
    [updateConfig],
  );

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
      i === index ? { ...p, name: newName } : p,
    );
    await saveConfig({ ...config, pages: newPages });
  };

  const handlePageChange = async (updatedPage: PageConfig) => {
    if (!config) return;
    const newPages = config.pages.map((p, i) =>
      i === selectedPageIndex ? updatedPage : p,
    );
    await saveConfig({ ...config, pages: newPages });
  };

  const handleColumnsChange = async (columns: ColumnConfig[]) => {
    if (!config || !selectedPage) return;
    const updatedPage = { ...selectedPage, columns };
    await handlePageChange(updatedPage);
  };

  const handleWidgetSelect = (columnIndex: number, widgetIndex: number) => {
    setSelectedWidgetId(`${columnIndex}-${widgetIndex}`);
    // Auto-open widget editor in right sidebar when selecting a widget
    setEditingWidget({ columnIndex, widgetIndex });
    setRightSidebarContent('widget-editor');
  };

  const handleWidgetEdit = (columnIndex: number, widgetIndex: number) => {
    setEditingWidget({ columnIndex, widgetIndex });
    setRightSidebarContent('widget-editor');
    setRightSidebarCollapsed(false);
  };

  const handleWidgetAdd = async (columnIndex: number, widget: WidgetConfig) => {
    if (!config || !selectedPage) return;
    const newColumns = selectedPage.columns.map((col, i) =>
      i === columnIndex ? { ...col, widgets: [...col.widgets, widget] } : col,
    );
    await handleColumnsChange(newColumns);
  };

  const handleWidgetDelete = async (
    columnIndex: number,
    widgetIndex: number,
  ) => {
    if (!config || !selectedPage) return;
    const newColumns = selectedPage.columns.map((col, i) =>
      i === columnIndex
        ? { ...col, widgets: col.widgets.filter((_, wi) => wi !== widgetIndex) }
        : col,
    );
    await handleColumnsChange(newColumns);
    setSelectedWidgetId(null);
    if (
      editingWidget &&
      editingWidget.columnIndex === columnIndex &&
      editingWidget.widgetIndex === widgetIndex
    ) {
      setEditingWidget(null);
    }
  };

  const handleWidgetMove = async (
    fromColumn: number,
    fromWidget: number,
    toColumn: number,
    toWidget: number,
  ) => {
    if (!config || !selectedPage) return;

    const newColumns = selectedPage.columns.map((col) => ({
      ...col,
      widgets: [...col.widgets],
    }));
    const [movedWidget] = newColumns[fromColumn].widgets.splice(fromWidget, 1);

    let targetIndex = toWidget;
    if (fromColumn === toColumn && fromWidget < toWidget) {
      targetIndex--;
    }

    newColumns[toColumn].widgets.splice(targetIndex, 0, movedWidget);
    await handleColumnsChange(newColumns);
  };

  const handleWidgetChange = async (updatedWidget: WidgetConfig) => {
    if (!config || !selectedPage || !editingWidget) return;
    const newColumns = selectedPage.columns.map((col, colIdx) =>
      colIdx === editingWidget.columnIndex
        ? {
            ...col,
            widgets: col.widgets.map((w, wIdx) =>
              wIdx === editingWidget.widgetIndex ? updatedWidget : w,
            ),
          }
        : col,
    );
    await handleColumnsChange(newColumns);
  };

  const handlePaletteWidgetSelect = (definition: WidgetDefinition) => {
    if (!selectedPage || selectedPage.columns.length === 0) return;
    const widget = createDefaultWidget(definition.type);
    handleWidgetAdd(0, widget);
    // Keep the palette open in case user wants to add more widgets
  };

  // Copy widget to another page
  const handleCopyWidgetToPage = async (targetPageIndex: number, widget: WidgetConfig) => {
    if (!config) return;
    const targetPage = config.pages[targetPageIndex];
    if (!targetPage || targetPage.columns.length === 0) return;

    // Add to the first column of the target page
    const newColumns = targetPage.columns.map((col, i) =>
      i === 0 ? { ...col, widgets: [...col.widgets, { ...widget }] } : col
    );
    const newPages = config.pages.map((p, i) =>
      i === targetPageIndex ? { ...p, columns: newColumns } : p
    );
    await saveConfig({ ...config, pages: newPages });
  };

  // Move widget to another page (copy + delete from source)
  const handleMoveWidgetToPage = async (
    targetPageIndex: number,
    sourceColumnIndex: number,
    sourceWidgetIndex: number,
    widget: WidgetConfig
  ) => {
    if (!config || !selectedPage) return;
    const targetPage = config.pages[targetPageIndex];
    if (!targetPage || targetPage.columns.length === 0) return;

    // Add to target page's first column
    const targetNewColumns = targetPage.columns.map((col, i) =>
      i === 0 ? { ...col, widgets: [...col.widgets, { ...widget }] } : col
    );

    // Remove from source page
    const sourceNewColumns = selectedPage.columns.map((col, i) =>
      i === sourceColumnIndex
        ? { ...col, widgets: col.widgets.filter((_, wi) => wi !== sourceWidgetIndex) }
        : col
    );

    const newPages = config.pages.map((p, i) => {
      if (i === targetPageIndex) return { ...p, columns: targetNewColumns };
      if (i === selectedPageIndex) return { ...p, columns: sourceNewColumns };
      return p;
    });

    await saveConfig({ ...config, pages: newPages });

    // Clear selection since widget was moved
    setSelectedWidgetId(null);
    if (
      editingWidget &&
      editingWidget.columnIndex === sourceColumnIndex &&
      editingWidget.widgetIndex === sourceWidgetIndex
    ) {
      setEditingWidget(null);
      setRightSidebarContent(null);
    }
  };

  // Open widget palette in right sidebar
  const handleOpenWidgetPalette = () => {
    setRightSidebarContent('widget-palette');
    setRightSidebarCollapsed(false);
    setEditingWidget(null);
    setSelectedWidgetId(null);
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
      setEditingWidget({ columnIndex, widgetIndex });
      setRightSidebarContent('widget-editor');
    }
    setActivePanel(null);
    setViewMode('edit');
  };

  const handleOpenPageSettings = (index: number) => {
    setSelectedPageIndex(index);
    setActivePanel('page-settings');
    setEditingWidget(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePanel(null);
        // Close right sidebar content
        if (rightSidebarContent === 'widget-editor') {
          setEditingWidget(null);
          setSelectedWidgetId(null);
        }
        setRightSidebarContent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rightSidebarContent]);

  if (loading) {
    return <div className="loading">Loading configuration...</div>;
  }

  // If there's a YAML parse error, show the YAML editor to fix it
  // Only allow YAML editing mode when config is broken
  const hasParseError = parseError !== null;

  const editingWidgetConfig = getEditingWidgetConfig();

  return (
    <div className="app">
      <header className="toolbar">
        <div className="toolbar-left">
          <h1 className="logo">Glance Editor</h1>
          <button
            className={`btn btn-secondary ${activePanel === 'code' ? 'active' : ''} ${hasParseError ? 'btn-warning' : ''}`}
            onClick={() => togglePanel('code')}
            title={hasParseError ? 'Fix YAML errors' : 'Edit YAML directly'}
          >
            <FileCode size={16} />
            {hasParseError ? 'Fix YAML' : 'YAML'}
          </button>
          <StatusBadge
            status={
              connected ? 'connected' : saving ? 'loading' : 'disconnected'
            }
            onClick={() => window.open(glanceUrl, '_blank')}
          />
        </div>

        <div className="toolbar-center">
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

          {viewMode === 'preview' && (
            <div className="device-toggle">
              <button
                className={`device-btn ${previewDevice === 'desktop' ? 'active' : ''}`}
                onClick={() => setPreviewDevice('desktop')}
                title="Desktop (1920px)"
              >
                <Monitor size={18} />
              </button>
              <button
                className={`device-btn ${previewDevice === 'tablet' ? 'active' : ''}`}
                onClick={() => setPreviewDevice('tablet')}
                title="Tablet (768px)"
              >
                <Tablet size={18} />
              </button>
              <button
                className={`device-btn ${previewDevice === 'phone' ? 'active' : ''}`}
                onClick={() => setPreviewDevice('phone')}
                title="Phone (375px)"
              >
                <Smartphone size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="toolbar-right">
          {error && <span className="toolbar-error">{error}</span>}
          {hasParseError && (
            <span className="toolbar-error yaml-error">
              YAML Error{parseError.line ? ` at line ${parseError.line}` : ''}: {parseError.message}
            </span>
          )}
          <button
            className={`btn btn-secondary ${activePanel === 'theme' ? 'active' : ''}`}
            onClick={() => togglePanel('theme')}
            title="Theme Designer"
            disabled={hasParseError}
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
            className={`btn btn-secondary validation-btn ${activePanel === 'validation' ? 'active' : ''} ${hasErrors ? 'has-errors' : hasWarnings ? 'has-warnings' : ''}`}
            onClick={() => togglePanel('validation')}
            title={hasErrors ? `${validationIssues.filter(i => i.severity === 'error').length} errors` : hasWarnings ? `${validationIssues.filter(i => i.severity === 'warning').length} warnings` : 'Validation'}
            disabled={hasParseError}
          >
            {hasErrors && (
              <span className="validation-count error">
                {validationIssues.filter(i => i.severity === 'error').length}
              </span>
            )}
            {!hasErrors && hasWarnings && (
              <span className="validation-count warning">
                {validationIssues.filter(i => i.severity === 'warning').length}
              </span>
            )}
            Validate
          </button>
        </div>
      </header>

      <div className="main-container">
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
              onOpenSettings={handleOpenPageSettings}
            />
          )}
        </aside>

        {activePanel === 'page-settings' && selectedPage && (
          <div className="floating-panel">
            <div className="floating-panel-header">
              <h3>Page Settings</h3>
              <button
                className="btn-close"
                onClick={() => setActivePanel(null)}
              >
                <X size={18} />
              </button>
            </div>
            <PageEditor
              page={selectedPage}
              onChange={handlePageChange}
              onDelete={() => {
                if (config && config.pages.length > 1 && confirm(`Delete page "${selectedPage.name}"?`)) {
                  handleDeletePage(selectedPageIndex);
                  setActivePanel(null);
                }
              }}
              canDelete={config ? config.pages.length > 1 : false}
            />
          </div>
        )}

        {activePanel === 'theme' && (
          <div className={`floating-panel floating-panel-wide floating-panel-right floating-panel-scrollable ${rightSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <div className="floating-panel-header">
              <h3>Theme Designer</h3>
              <button
                className="btn-close"
                onClick={() => setActivePanel(null)}
              >
                <X size={18} />
              </button>
            </div>
            <ThemeDesigner
              theme={config?.theme}
              onChange={handleThemeChange}
              onClose={() => setActivePanel(null)}
            />
          </div>
        )}

        {activePanel === 'code' && rawConfig && (
          <div className="floating-panel floating-panel-code floating-panel-left floating-panel-fullheight">
            <div className="floating-panel-header">
              <h3>YAML Editor</h3>
              <button className="btn-close" onClick={() => setActivePanel(null)}><X size={18} /></button>
            </div>
            <CodeEditor
              value={rawConfig}
              onChange={handleCodeChange}
              onClose={() => setActivePanel(null)}
              onRefresh={reload}
              hasError={!!codeError}
              errorMessage={codeError || undefined}
            />
          </div>
        )}

        {activePanel === 'env-vars' && rawConfig && (
          <div className={`floating-panel floating-panel-wide floating-panel-right floating-panel-scrollable ${rightSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <div className="floating-panel-header">
              <h3>Environment Variables</h3>
              <button className="btn-close" onClick={() => setActivePanel(null)}><X size={18} /></button>
            </div>
            <EnvVarManager
              rawConfig={rawConfig}
              onClose={() => setActivePanel(null)}
            />
          </div>
        )}

        {activePanel === 'validation' && (
          <div className={`floating-panel floating-panel-wide floating-panel-right floating-panel-scrollable ${rightSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
            <div className="floating-panel-header">
              <h3>Validation</h3>
              <button className="btn-close" onClick={() => setActivePanel(null)}><X size={18} /></button>
            </div>
            <ValidationPanel
              config={config}
              onClose={() => setActivePanel(null)}
              onNavigate={handleValidationNavigate}
            />
          </div>
        )}

        <main className="content-area">
          {hasParseError ? (
            <div className="parse-error-view">
              <div className="parse-error-message">
                <h2>YAML Configuration Error</h2>
                <p className="error-detail">
                  {parseError.line && <span className="error-location">Line {parseError.line}{parseError.column ? `, Column ${parseError.column}` : ''}: </span>}
                  {parseError.message}
                </p>
                <p className="error-hint">
                  Use the YAML editor to fix the error. The visual editor is disabled until the configuration is valid.
                </p>
                <button
                  className="btn btn-primary"
                  onClick={() => setActivePanel('code')}
                >
                  <FileCode size={16} />
                  Open YAML Editor
                </button>
              </div>
            </div>
          ) : viewMode === 'edit' ? (
            selectedPage && (
              <LayoutEditor
                page={selectedPage}
                pages={config?.pages}
                currentPageIndex={selectedPageIndex}
                selectedWidgetId={selectedWidgetId}
                onColumnsChange={handleColumnsChange}
                onWidgetSelect={handleWidgetSelect}
                onWidgetAdd={handleWidgetAdd}
                onWidgetDelete={handleWidgetDelete}
                onWidgetMove={handleWidgetMove}
                onWidgetEdit={handleWidgetEdit}
                onOpenWidgetPalette={handleOpenWidgetPalette}
                onCopyWidgetToPage={handleCopyWidgetToPage}
                onMoveWidgetToPage={handleMoveWidgetToPage}
              />
            )
          ) : (
            <Preview
              glanceUrl={glanceUrl}
              refreshKey={refreshKey}
              device={previewDevice}
              pageSlug={
                selectedPage?.slug ??
                selectedPage?.name?.toLowerCase().replace(' ', '-')
              }
            />
          )}
        </main>

        {/* Right Sidebar for Widget Editor / Widget Palette */}
        {viewMode === 'edit' && (
          <aside className={`sidebar-right ${rightSidebarCollapsed ? 'collapsed' : ''} ${rightSidebarContent ? 'has-content' : ''}`}>
            {/* Widgets header section */}
            <div className="sidebar-right-widgets-header">
              <div className="widgets-header-content">
                {!rightSidebarCollapsed && <span className="section-title">Widgets</span>}
                <button
                  className="btn-icon btn-icon-sm"
                  onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
                  title={rightSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {rightSidebarCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
                </button>
              </div>
              <button
                className={`btn-icon btn-icon-sm sidebar-add-widget-btn ${rightSidebarContent === 'widget-palette' ? 'active' : ''}`}
                onClick={handleOpenWidgetPalette}
                title="Add Widget"
              >
                <Plus size={18} />
                {!rightSidebarCollapsed && <span>Add Widget</span>}
              </button>
            </div>

            {/* Content section */}
            <div className="sidebar-right-content">
              {rightSidebarContent === 'widget-editor' && editingWidget && editingWidgetConfig ? (
                <WidgetEditor
                  widget={editingWidgetConfig}
                  columnIndex={editingWidget.columnIndex}
                  widgetIndex={editingWidget.widgetIndex}
                  onChange={handleWidgetChange}
                  onClose={() => {
                    setEditingWidget(null);
                    setEditingPath([]);
                    setSelectedWidgetId(null);
                    setRightSidebarContent(null);
                  }}
                  editingPath={editingPath}
                  onEditingPathChange={setEditingPath}
                />
              ) : rightSidebarContent === 'widget-palette' ? (
                <WidgetPalette
                  onWidgetSelect={handlePaletteWidgetSelect}
                  onAddToColumn={(columnIndex, widget) => handleWidgetAdd(columnIndex, widget)}
                  columns={selectedPage?.columns || []}
                />
              ) : (
                <div className="sidebar-right-empty">
                  <p>Select a widget to edit its properties</p>
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

export default App;
