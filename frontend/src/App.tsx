import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Monitor,
  Tablet,
  Smartphone,
  Plus,
  X,
  FileCode,
  PanelRightClose,
  PanelRightOpen,
  Undo2,
  Redo2,
  Import,
  Palette,
  Braces,
  ChevronDown,
  ChevronRight,
  Check,
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
import { CodeEditor, type CodeEditorRef } from './components/CodeEditor';
import { EnvVarManager } from './components/EnvVarManager';
import { ValidationPanel } from './components/ValidationPanel';
import { ImportExportPanel } from './components/ImportExportPanel';
import { validateConfig } from './utils/validation';
import { findWidgetLine } from './utils/yamlPosition';
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
type FloatingPanel = 'page-settings' | 'theme' | 'code' | 'validation' | 'import-export' | null;
type RightSidebarContent = 'widget-editor' | 'widget-palette' | null;

interface SelectedWidget {
  columnIndex: number;
  widgetIndex: number;
}

function App() {
  const {
    config,
    rawConfig,
    loading,
    error,
    parseError,
    saving,
    reload,
    updateConfig,
    updateRawConfig,
    canUndo,
    canRedo,
    undoDescription,
    redoDescription,
    undo,
    redo,
  } = useConfig();
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
  const [showEnvPanel, setShowEnvPanel] = useState(false);
  const codeEditorRef = useRef<CodeEditorRef>(null);

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
    async (newConfig: GlanceConfig, description: string = 'Update config') => {
      try {
        await updateConfig(newConfig, description);
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
    await saveConfig({ ...config, pages: [...config.pages, newPage] }, `Add page "${newPage.name}"`);
    setSelectedPageIndex(config.pages.length);
  };

  const handleDeletePage = async (index: number) => {
    if (!config || config.pages.length <= 1) return;
    const deletedPageName = config.pages[index].name;
    const newPages = config.pages.filter((_, i) => i !== index);
    await saveConfig({ ...config, pages: newPages }, `Delete page "${deletedPageName}"`);
    if (selectedPageIndex >= newPages.length) {
      setSelectedPageIndex(newPages.length - 1);
    }
  };

  const handleReorderPages = async (fromIndex: number, toIndex: number) => {
    if (!config) return;
    const newPages = [...config.pages];
    const [moved] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, moved);
    await saveConfig({ ...config, pages: newPages }, `Reorder page "${moved.name}"`);
    setSelectedPageIndex(toIndex);
  };

  const handleRenamePage = async (index: number, newName: string) => {
    if (!config) return;
    const oldName = config.pages[index].name;
    const newPages = config.pages.map((p, i) =>
      i === index ? { ...p, name: newName } : p,
    );
    await saveConfig({ ...config, pages: newPages }, `Rename page "${oldName}" to "${newName}"`);
  };

  const handlePageChange = async (updatedPage: PageConfig) => {
    if (!config) return;
    const newPages = config.pages.map((p, i) =>
      i === selectedPageIndex ? updatedPage : p,
    );
    await saveConfig({ ...config, pages: newPages }, `Update page "${updatedPage.name}" settings`);
  };

  const handleColumnsChange = async (columns: ColumnConfig[], description?: string) => {
    if (!config || !selectedPage) return;
    const updatedPage = { ...selectedPage, columns };
    const newPages = config.pages.map((p, i) =>
      i === selectedPageIndex ? updatedPage : p,
    );
    await saveConfig({ ...config, pages: newPages }, description || `Update columns on "${selectedPage.name}"`);
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
    await handleColumnsChange(newColumns, `Add ${widget.type} widget`);
  };

  const handleWidgetDelete = async (
    columnIndex: number,
    widgetIndex: number,
  ) => {
    if (!config || !selectedPage) return;
    const widgetToDelete = selectedPage.columns[columnIndex]?.widgets[widgetIndex];
    const widgetName = widgetToDelete?.title || widgetToDelete?.type || 'widget';
    const newColumns = selectedPage.columns.map((col, i) =>
      i === columnIndex
        ? { ...col, widgets: col.widgets.filter((_, wi) => wi !== widgetIndex) }
        : col,
    );
    await handleColumnsChange(newColumns, `Delete ${widgetName}`);
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
    const widgetName = movedWidget?.title || movedWidget?.type || 'widget';

    let targetIndex = toWidget;
    if (fromColumn === toColumn && fromWidget < toWidget) {
      targetIndex--;
    }

    newColumns[toColumn].widgets.splice(targetIndex, 0, movedWidget);
    await handleColumnsChange(newColumns, `Move ${widgetName}`);
  };

  const handleWidgetChange = async (updatedWidget: WidgetConfig) => {
    if (!config || !selectedPage || !editingWidget) return;
    const widgetName = updatedWidget.title || updatedWidget.type;
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
    await handleColumnsChange(newColumns, `Update ${widgetName} settings`);
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

    const widgetName = widget.title || widget.type;
    // Add to the first column of the target page
    const newColumns = targetPage.columns.map((col, i) =>
      i === 0 ? { ...col, widgets: [...col.widgets, { ...widget }] } : col
    );
    const newPages = config.pages.map((p, i) =>
      i === targetPageIndex ? { ...p, columns: newColumns } : p
    );
    await saveConfig({ ...config, pages: newPages }, `Copy ${widgetName} to "${targetPage.name}"`);
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

    const widgetName = widget.title || widget.type;
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

    await saveConfig({ ...config, pages: newPages }, `Move ${widgetName} to "${targetPage.name}"`);

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
    await saveConfig({ ...config, theme }, 'Update theme');
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

  // Import handlers
  const handleImportWidget = async (widget: WidgetConfig, columnIndex: number) => {
    if (!config || !selectedPage) return;
    const newColumns = selectedPage.columns.map((col, i) =>
      i === columnIndex ? { ...col, widgets: [...col.widgets, widget] } : col,
    );
    await handleColumnsChange(newColumns, `Import ${widget.type} widget`);
    setActivePanel(null);
  };

  const handleImportPage = async (page: PageConfig) => {
    if (!config) return;
    await saveConfig({ ...config, pages: [...config.pages, page] }, `Import page "${page.name}"`);
    setSelectedPageIndex(config.pages.length);
    setActivePanel(null);
  };

  // Handler for "View in YAML" - opens code panel and scrolls to widget
  const handleViewWidgetInYaml = useCallback((columnIndex: number, widgetIndex: number) => {
    if (!rawConfig) return;

    // Find the line number for this widget
    const line = findWidgetLine(rawConfig, selectedPageIndex, columnIndex, widgetIndex);

    // Open the code panel
    setActivePanel('code');

    // Scroll to line after a brief delay to allow panel to open
    if (line) {
      setTimeout(() => {
        codeEditorRef.current?.scrollToLine(line);
      }, 100);
    }
  }, [rawConfig, selectedPageIndex]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo: Ctrl/Cmd + Z
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        // Don't intercept if focus is in an input/textarea/monaco
        const activeElement = document.activeElement;
        const isInEditor = activeElement?.closest('.monaco-editor') ||
                          activeElement?.tagName === 'INPUT' ||
                          activeElement?.tagName === 'TEXTAREA';
        if (!isInEditor && canUndo) {
          e.preventDefault();
          undo();
        }
      }
      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if ((e.ctrlKey || e.metaKey) && ((e.key === 'z' && e.shiftKey) || e.key === 'y')) {
        const activeElement = document.activeElement;
        const isInEditor = activeElement?.closest('.monaco-editor') ||
                          activeElement?.tagName === 'INPUT' ||
                          activeElement?.tagName === 'TEXTAREA';
        if (!isInEditor && canRedo) {
          e.preventDefault();
          redo();
        }
      }
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
  }, [rightSidebarContent, canUndo, canRedo, undo, redo]);

  if (loading) {
    return <div className="loading">Loading configuration...</div>;
  }

  // If there's a YAML parse error, show the YAML editor to fix it
  // Only allow YAML editing mode when config is broken
  const hasParseError = parseError !== null;

  const editingWidgetConfig = getEditingWidgetConfig();

  return (
    <div className="flex flex-col h-full w-full">
      <header className="flex items-center justify-between py-2 pl-4 pr-2 bg-bg-secondary border-b border-border h-14 shrink-0">
        <div className="flex items-center gap-3 flex-1">
          <h1 className="text-lg font-semibold text-accent">Glance Editor</h1>
          {/* Undo/Redo buttons */}
          <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
            <button
              className={`w-8 h-7 border-none bg-transparent cursor-pointer rounded-md transition-all duration-150 flex items-center justify-center ${canUndo ? 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary' : 'text-text-muted opacity-50 cursor-not-allowed'}`}
              onClick={() => canUndo && undo()}
              disabled={!canUndo}
              title={undoDescription ? `Undo: ${undoDescription} (Ctrl+Z)` : 'Nothing to undo'}
            >
              <Undo2 size={16} />
            </button>
            <button
              className={`w-8 h-7 border-none bg-transparent cursor-pointer rounded-md transition-all duration-150 flex items-center justify-center ${canRedo ? 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary' : 'text-text-muted opacity-50 cursor-not-allowed'}`}
              onClick={() => canRedo && redo()}
              disabled={!canRedo}
              title={redoDescription ? `Redo: ${redoDescription} (Ctrl+Shift+Z)` : 'Nothing to redo'}
            >
              <Redo2 size={16} />
            </button>
          </div>
          <button
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-150 bg-bg-tertiary text-text-primary hover:bg-bg-elevated ${activePanel === 'code' ? 'bg-accent text-bg-primary' : ''} ${hasParseError ? 'bg-warning/20 text-warning border border-warning/50' : ''}`}
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

        <div className="flex items-center gap-4 flex-shrink-0">
          <div className="flex bg-bg-tertiary rounded-lg p-1">
            <button
              className={`py-1.5 px-4 border-none text-sm font-medium cursor-pointer rounded-md transition-all duration-150 ${viewMode === 'edit' ? 'bg-accent text-bg-primary shadow-sm' : 'text-text-primary hover:bg-bg-elevated'}`}
              onClick={() => setViewMode('edit')}
            >
              Edit
            </button>
            <button
              className={`py-1.5 px-4 border-none text-sm font-medium cursor-pointer rounded-md transition-all duration-150 ${viewMode === 'preview' ? 'bg-accent text-bg-primary shadow-sm' : 'text-text-primary hover:bg-bg-elevated'}`}
              onClick={() => setViewMode('preview')}
            >
              Preview
            </button>
          </div>

          {viewMode === 'preview' && (
            <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
              <button
                className={`w-9 h-8 border-none bg-transparent cursor-pointer rounded-md transition-all duration-150 flex items-center justify-center text-base hover:bg-accent/10 text-text-secondary hover:text-text-primary ${previewDevice === 'desktop' ? 'bg-accent text-bg-primary' : ''}`}
                onClick={() => setPreviewDevice('desktop')}
                title="Desktop (1920px)"
              >
                <Monitor size={18} />
              </button>
              <button
                className={`w-9 h-8 border-none bg-transparent cursor-pointer rounded-md transition-all duration-150 flex items-center justify-center text-base hover:bg-accent/10 text-text-secondary hover:text-text-primary ${previewDevice === 'tablet' ? 'bg-accent text-bg-primary' : ''}`}
                onClick={() => setPreviewDevice('tablet')}
                title="Tablet (768px)"
              >
                <Tablet size={18} />
              </button>
              <button
                className={`w-9 h-8 border-none bg-transparent cursor-pointer rounded-md transition-all duration-150 flex items-center justify-center text-base hover:bg-accent/10 text-text-secondary hover:text-text-primary ${previewDevice === 'phone' ? 'bg-accent text-bg-primary' : ''}`}
                onClick={() => setPreviewDevice('phone')}
                title="Phone (375px)"
              >
                <Smartphone size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-1 justify-end">
          {error && <span className="text-xs text-error px-2 py-1 bg-error/10 rounded">{error}</span>}
          {hasParseError && (
            <span className="text-xs text-error px-2 py-1 bg-error/10 rounded">
              YAML Error{parseError.line ? ` at line ${parseError.line}` : ''}: {parseError.message}
            </span>
          )}
          <button
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-medium cursor-pointer transition-all duration-150 border-none bg-bg-tertiary text-text-primary hover:bg-bg-elevated ${activePanel === 'import-export' ? 'bg-accent text-bg-primary' : ''}`}
            onClick={() => togglePanel('import-export')}
            title="Import/Export Widgets"
            disabled={hasParseError}
          >
            <Import size={16} />
            Import/Export
          </button>
          <button
            className={`flex items-center justify-center w-9 h-9 rounded-md cursor-pointer transition-all duration-150 bg-bg-tertiary hover:bg-bg-elevated relative ${activePanel === 'validation' ? 'bg-accent text-bg-primary' : ''} ${hasErrors ? 'border border-error' : hasWarnings ? 'border border-warning' : ''}`}
            onClick={() => togglePanel('validation')}
            title={hasErrors ? `${validationIssues.filter(i => i.severity === 'error').length} errors` : hasWarnings ? `${validationIssues.filter(i => i.severity === 'warning').length} warnings` : 'No validation issues'}
            disabled={hasParseError}
          >
            {hasErrors ? (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[0.65rem] font-semibold leading-none bg-error text-bg-primary">
                {validationIssues.filter(i => i.severity === 'error').length}
              </span>
            ) : hasWarnings ? (
              <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full text-[0.65rem] font-semibold leading-none bg-warning text-bg-primary">
                {validationIssues.filter(i => i.severity === 'warning').length}
              </span>
            ) : (
              <Check size={16} className="text-success" />
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <aside className="w-20 min-w-20 bg-bg-secondary border-r border-border flex flex-col overflow-hidden">
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
          {/* Theme button at bottom of left sidebar */}
          <div className="p-2 border-t border-border shrink-0">
            <button
              className={`flex flex-col items-center gap-1 w-full py-2 px-1.5 rounded-lg transition-all duration-150 ${
                activePanel === 'theme'
                  ? 'bg-accent/20 text-accent'
                  : 'bg-bg-tertiary text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              }`}
              onClick={() => togglePanel('theme')}
              title="Theme Designer"
              disabled={hasParseError}
            >
              <Palette size={18} />
              <span className="text-[0.6rem] font-semibold uppercase tracking-wider">Theme</span>
            </button>
          </div>
        </aside>

        {activePanel === 'page-settings' && selectedPage && (
          <div className="absolute left-24 top-4 w-80 max-h-[calc(100%-32px)] bg-bg-secondary border border-border rounded-lg shadow-[0_10px_40px_rgba(0,0,0,0.4)] z-[100] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between py-3 px-4 border-b border-border flex-shrink-0">
              <h3 className="text-sm font-semibold">Page Settings</h3>
              <button
                className="w-7 h-7 border-none bg-transparent text-text-secondary text-xl cursor-pointer rounded flex items-center justify-center transition-all duration-150 hover:bg-error/20 hover:text-error"
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
          <div className="absolute left-24 top-4 w-[480px] max-h-[calc(100%-32px)] bg-bg-secondary border border-border rounded-lg shadow-2xl z-[100] flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between py-3 px-4 border-b border-border shrink-0">
              <h3 className="text-sm font-semibold">Theme Designer</h3>
              <button
                className="w-7 h-7 border-none bg-transparent text-text-secondary text-xl cursor-pointer rounded flex items-center justify-center transition-all duration-150 hover:bg-error/20 hover:text-error"
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
          <div className="absolute left-24 top-4 w-[500px] max-w-[calc(100%-112px)] h-[calc(100vh-120px)] bg-bg-secondary border border-border rounded-lg shadow-2xl z-[100] flex flex-col">
            <div className="flex items-center justify-between py-3 px-4 border-b border-border shrink-0">
              <h3 className="text-sm font-semibold">YAML Editor</h3>
              <button className="w-7 h-7 flex items-center justify-center bg-transparent text-text-secondary cursor-pointer rounded-md transition-all duration-150 hover:bg-error/20 hover:text-error" onClick={() => setActivePanel(null)}>
                <X size={18} />
              </button>
            </div>
            <CodeEditor
              ref={codeEditorRef}
              value={rawConfig}
              onChange={handleCodeChange}
              onClose={() => setActivePanel(null)}
              onRefresh={reload}
              hasError={!!codeError}
              errorMessage={codeError || undefined}
            />
          </div>
        )}

        {activePanel === 'validation' && (
          <div className="absolute right-4 top-4 w-[480px] max-h-[calc(100%-32px)] bg-bg-secondary border border-border rounded-lg shadow-2xl z-[100] flex flex-col overflow-y-auto">
            <div className="flex items-center justify-between py-3 px-4 border-b border-border shrink-0">
              <h3 className="text-sm font-semibold">Validation</h3>
              <button className="w-7 h-7 flex items-center justify-center bg-transparent text-text-secondary cursor-pointer rounded-md transition-all duration-150 hover:bg-error/20 hover:text-error" onClick={() => setActivePanel(null)}>
                <X size={18} />
              </button>
            </div>
            <ValidationPanel
              config={config}
              onClose={() => setActivePanel(null)}
              onNavigate={handleValidationNavigate}
            />
          </div>
        )}

        {activePanel === 'import-export' && (
          <div className="absolute right-4 top-4 w-[480px] max-h-[calc(100%-32px)] bg-bg-secondary border border-border rounded-lg shadow-2xl z-[100] flex flex-col overflow-hidden">
            <div className="flex items-center justify-between py-3 px-4 border-b border-border shrink-0">
              <h3 className="text-sm font-semibold">Import / Export</h3>
              <button className="w-7 h-7 flex items-center justify-center bg-transparent text-text-secondary cursor-pointer rounded-md transition-all duration-150 hover:bg-error/20 hover:text-error" onClick={() => setActivePanel(null)}>
                <X size={18} />
              </button>
            </div>
            <ImportExportPanel
              config={config}
              selectedPageIndex={selectedPageIndex}
              onImportWidget={handleImportWidget}
              onImportPage={handleImportPage}
              onClose={() => setActivePanel(null)}
            />
          </div>
        )}

        <main className="flex-1 overflow-auto bg-bg-primary">
          {hasParseError ? (
            <div className="flex items-center justify-center h-full p-8 bg-bg-primary">
              <div className="max-w-md w-full bg-bg-secondary p-8 rounded-xl border border-border shadow-lg text-center">
                <h2 className="text-xl font-bold text-error mb-4">YAML Configuration Error</h2>
                <p className="text-sm text-text-secondary mb-2">
                  {parseError.line && <span className="font-bold text-error">Line {parseError.line}{parseError.column ? `, Column ${parseError.column}` : ''}: </span>}
                  {parseError.message}
                </p>
                <p className="text-xs text-text-muted mb-6">
                  Use the YAML editor to fix the error. The visual editor is disabled until the configuration is valid.
                </p>
                <button
                  className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-accent text-bg-primary rounded-md font-bold hover:bg-accent-hover transition-colors"
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
                onViewWidgetInYaml={handleViewWidgetInYaml}
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
          <aside className={`hidden lg:flex bg-bg-secondary border-l border-border flex-col overflow-hidden transition-[width_min-width] duration-200 ease-in-out ${rightSidebarCollapsed ? 'w-12 min-w-12' : 'w-96 min-w-96'} ${rightSidebarContent ? 'has-content' : ''}`}>
            {/* Widgets header section */}
            <div className={`flex flex-col gap-2 p-3 border-b border-border flex-shrink-0 ${rightSidebarCollapsed ? 'items-center p-2' : ''}`}>
              <div className={`flex items-center gap-2 ${rightSidebarCollapsed ? 'justify-center' : 'justify-between'}`}>
                {!rightSidebarCollapsed && <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">Widgets</span>}
                <button
                  className="w-7 h-7 flex items-center justify-center p-0 border-none rounded-md bg-bg-tertiary text-text-primary cursor-pointer transition-all duration-150 hover:bg-bg-elevated"
                  onClick={() => setRightSidebarCollapsed(!rightSidebarCollapsed)}
                  title={rightSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {rightSidebarCollapsed ? <PanelRightOpen size={16} /> : <PanelRightClose size={16} />}
                </button>
              </div>
              <button
                className={`flex items-center gap-2 p-2 border border-border rounded-md bg-transparent text-accent cursor-pointer transition-all duration-150 hover:bg-accent/10 hover:border-accent ${rightSidebarContent === 'widget-palette' ? 'bg-accent/15 border-accent' : ''} ${rightSidebarCollapsed ? 'w-auto p-1.5 border-none' : 'w-full justify-center'}`}
                onClick={handleOpenWidgetPalette}
                title="Add Widget"
              >
                <Plus size={18} />
                {!rightSidebarCollapsed && <span className="text-sm font-medium">Add Widget</span>}
              </button>
            </div>

            {/* Content section */}
            <div className={`flex-1 overflow-y-auto overflow-x-hidden ${rightSidebarCollapsed ? 'hidden' : ''}`}>
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
                <div className="flex flex-col items-center justify-center h-full p-8 text-center text-text-muted">
                  <p className="m-0 text-sm">Select a widget to edit its properties</p>
                </div>
              )}
            </div>

            {/* Environment Variables Section - Sticky at bottom */}
            {!rightSidebarCollapsed && rawConfig && (
              <div className="border-t border-border shrink-0">
                <button
                  className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-bg-tertiary transition-colors"
                  onClick={() => setShowEnvPanel(!showEnvPanel)}
                >
                  {showEnvPanel ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Braces size={14} className="text-text-secondary" />
                  <span className="text-xs font-medium text-text-secondary">Environment</span>
                </button>
                {showEnvPanel && (
                  <div className="max-h-64 overflow-y-auto border-t border-border">
                    <EnvVarManager
                      rawConfig={rawConfig}
                      compact
                    />
                  </div>
                )}
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

export default App;
