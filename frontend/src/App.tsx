import { useState, useEffect, useCallback } from "react";
import {
  Monitor,
  Tablet,
  Smartphone,
  Settings,
  Plus,
  X,
  ExternalLink,
  FileCode,
} from "lucide-react";
import { useConfig, useWebSocket } from "./hooks/useConfig";
import { Preview } from "./components/Preview";
import { StatusBadge } from "./components/StatusBadge";
import { PageList } from "./components/PageList";
import { PageEditor } from "./components/PageEditor";
import { LayoutEditor } from "./components/LayoutEditor";
import { WidgetPalette } from "./components/WidgetPalette";
import { WidgetEditor } from "./components/WidgetEditor";
import {
  createDefaultWidget,
  type WidgetDefinition,
} from "./widgetDefinitions";
import type {
  GlanceConfig,
  PageConfig,
  ColumnConfig,
  WidgetConfig,
} from "./types";

const GLANCE_URL = import.meta.env.VITE_GLANCE_URL || "http://localhost:8080";

type ViewMode = "edit" | "preview";
type PreviewDevice = "desktop" | "tablet" | "phone";

interface SelectedWidget {
  columnIndex: number;
  widgetIndex: number;
}

function App() {
  const { config, rawConfig, loading, error, saving, reload, updateConfig } =
    useConfig();
  const { connected, lastMessage } = useWebSocket();
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPageIndex, setSelectedPageIndex] = useState(0);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [editingWidget, setEditingWidget] = useState<SelectedWidget | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>("desktop");
  const [showPageSettings, setShowPageSettings] = useState(false);
  const [showWidgetPalette, setShowWidgetPalette] = useState(false);
  const [showRawConfig, setShowRawConfig] = useState(false);

  // Reload config when WebSocket receives config-changed message
  useEffect(() => {
    if (
      lastMessage &&
      typeof lastMessage === "object" &&
      "type" in lastMessage
    ) {
      const msg = lastMessage as { type: string };
      if (msg.type === "config-changed") {
        reload();
        setRefreshKey((k) => k + 1);
      }
    }
  }, [lastMessage, reload]);

  // Reset selection when page changes
  useEffect(() => {
    setSelectedWidgetId(null);
    setEditingWidget(null);
    // Refresh preview when page changes
    if (viewMode === "preview") {
      setRefreshKey((k) => k + 1);
    }
  }, [selectedPageIndex, viewMode]);

  // Refresh preview when switching to preview mode
  useEffect(() => {
    if (viewMode === "preview") {
      setRefreshKey((k) => k + 1);
    }
  }, [viewMode]);

  const selectedPage = config?.pages[selectedPageIndex];

  // Get the widget being edited
  const getEditingWidgetConfig = (): WidgetConfig | null => {
    if (!editingWidget || !selectedPage) return null;
    const column = selectedPage.columns[editingWidget.columnIndex];
    if (!column) return null;
    return column.widgets[editingWidget.widgetIndex] || null;
  };

  // Helper to update config
  const saveConfig = useCallback(
    async (newConfig: GlanceConfig) => {
      try {
        await updateConfig(newConfig);
        // Only refresh preview if in preview mode
        if (viewMode === "preview") {
          setRefreshKey((k) => k + 1);
        }
      } catch {
        // Error handled by hook
      }
    },
    [updateConfig, viewMode],
  );

  // Page handlers
  const handleAddPage = async () => {
    if (!config) return;
    const newPage: PageConfig = {
      name: `Page ${config.pages.length + 1}`,
      columns: [{ size: "full", widgets: [] }],
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

  const handleWidgetEdit = (columnIndex: number, widgetIndex: number) => {
    setEditingWidget({ columnIndex, widgetIndex });
    setShowPageSettings(false);
    setShowWidgetPalette(false);
    setShowRawConfig(false);
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
    // Close editor if deleting the widget being edited
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
    setShowWidgetPalette(false);
  };

  // Close panels with Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowPageSettings(false);
        setShowWidgetPalette(false);
        setShowRawConfig(false);
        setEditingWidget(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  if (loading) {
    return <div className="loading">Loading configuration...</div>;
  }

  const editingWidgetConfig = getEditingWidgetConfig();

  return (
    <div className="app">
      {/* Top Toolbar */}
      <header className="toolbar">
        <div className="toolbar-left">
          <h1 className="logo">Glance Editor</h1>
          <StatusBadge
            status={
              connected ? "connected" : saving ? "loading" : "disconnected"
            }
          />
        </div>

        <div className="toolbar-center">
          {/* View Mode Toggle */}
          <div className="view-toggle">
            <button
              className={`view-btn ${viewMode === "edit" ? "active" : ""}`}
              onClick={() => setViewMode("edit")}
            >
              Edit
            </button>
            <button
              className={`view-btn ${viewMode === "preview" ? "active" : ""}`}
              onClick={() => setViewMode("preview")}
            >
              Preview
            </button>
          </div>

          {/* Device Toggle (only in preview mode) */}
          {viewMode === "preview" && (
            <div className="device-toggle">
              <button
                className={`device-btn ${previewDevice === "desktop" ? "active" : ""}`}
                onClick={() => setPreviewDevice("desktop")}
                title="Desktop (1920px)"
              >
                <Monitor size={18} />
              </button>
              <button
                className={`device-btn ${previewDevice === "tablet" ? "active" : ""}`}
                onClick={() => setPreviewDevice("tablet")}
                title="Tablet (768px)"
              >
                <Tablet size={18} />
              </button>
              <button
                className={`device-btn ${previewDevice === "phone" ? "active" : ""}`}
                onClick={() => setPreviewDevice("phone")}
                title="Phone (375px)"
              >
                <Smartphone size={18} />
              </button>
            </div>
          )}
        </div>

        <div className="toolbar-right">
          {error && <span className="toolbar-error">{error}</span>}
          <button
            className={`btn btn-secondary ${showRawConfig ? "active" : ""}`}
            onClick={() => {
              setShowRawConfig(!showRawConfig);
              if (!showRawConfig) {
                setShowPageSettings(false);
                setShowWidgetPalette(false);
                setEditingWidget(null);
              }
            }}
          >
            <FileCode size={16} />
            YAML
          </button>
          <a
            href={GLANCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
          >
            <ExternalLink size={16} />
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
              className={`sidebar-action-btn ${showPageSettings ? "active" : ""}`}
              onClick={() => {
                setShowPageSettings(!showPageSettings);
                setShowWidgetPalette(false);
                setShowRawConfig(false);
                setEditingWidget(null);
              }}
              title="Page Settings"
            >
              <Settings size={18} />
            </button>
            <button
              className={`sidebar-action-btn ${showWidgetPalette ? "active" : ""}`}
              onClick={() => {
                setShowWidgetPalette(!showWidgetPalette);
                setShowPageSettings(false);
                setShowRawConfig(false);
                setEditingWidget(null);
              }}
              title="Add Widget"
            >
              <Plus size={18} />
            </button>
          </div>
        </aside>

        {/* Floating Panels */}
        {showPageSettings && selectedPage && (
          <div className="floating-panel">
            <div className="floating-panel-header">
              <h3>Page Settings</h3>
              <button
                className="btn-close"
                onClick={() => setShowPageSettings(false)}
              >
                <X size={18} />
              </button>
            </div>
            <PageEditor page={selectedPage} onChange={handlePageChange} />
          </div>
        )}

        {showWidgetPalette && (
          <div className="floating-panel floating-panel-wide">
            <div className="floating-panel-header">
              <h3>Add Widget</h3>
              <button
                className="btn-close"
                onClick={() => setShowWidgetPalette(false)}
              >
                <X size={18} />
              </button>
            </div>
            <WidgetPalette onWidgetSelect={handlePaletteWidgetSelect} />
          </div>
        )}

        {showRawConfig && (
          <div className="floating-panel floating-panel-code">
            <div className="floating-panel-header">
              <h3>Raw YAML</h3>
              <button
                className="btn-close"
                onClick={() => setShowRawConfig(false)}
              >
                <X size={18} />
              </button>
            </div>
            <pre className="config-display">{rawConfig}</pre>
          </div>
        )}

        {/* Widget Editor Panel */}
        {editingWidget && editingWidgetConfig && (
          <div className="floating-panel floating-panel-editor">
            <WidgetEditor
              widget={editingWidgetConfig}
              columnIndex={editingWidget.columnIndex}
              widgetIndex={editingWidget.widgetIndex}
              onChange={handleWidgetChange}
              onClose={() => setEditingWidget(null)}
            />
          </div>
        )}

        {/* Main Content Area */}
        <main className="content-area">
          {viewMode === "edit" ? (
            selectedPage && (
              <LayoutEditor
                page={selectedPage}
                selectedWidgetId={selectedWidgetId}
                onColumnsChange={handleColumnsChange}
                onWidgetSelect={handleWidgetSelect}
                onWidgetAdd={handleWidgetAdd}
                onWidgetDelete={handleWidgetDelete}
                onWidgetMove={handleWidgetMove}
                onWidgetEdit={handleWidgetEdit}
              />
            )
          ) : (
            <Preview
              glanceUrl={GLANCE_URL}
              refreshKey={refreshKey}
              device={previewDevice}
              pageSlug={
                selectedPage?.slug ??
                selectedPage?.name?.toLowerCase().replace(" ", "-")
              }
            />
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
