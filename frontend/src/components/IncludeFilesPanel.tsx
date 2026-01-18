import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  FileText, 
  Trash2, 
  Edit3, 
  Plus, 
  Save, 
  X, 
  AlertTriangle, 
  Check,
  RefreshCw,
  Link,
  FileCode
} from 'lucide-react';
import { api, IncludeFile } from '../services/api';

interface IncludeFilesPanelProps {
  onClose: () => void;
  onOpenInEditor?: (content: string, filename: string) => void;
}

export function IncludeFilesPanel({ onClose, onOpenInEditor }: IncludeFilesPanelProps) {
  const [files, setFiles] = useState<IncludeFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileForm, setShowNewFileForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);

  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.listIncludeFiles();
      setFiles(result.files);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleEditFile = async (filePath: string) => {
    setEditLoading(true);
    setError(null);
    try {
      const result = await api.readIncludeFile(filePath);
      setEditContent(result.content);
      setEditingFile(filePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
    } finally {
      setEditLoading(false);
    }
  };

  const handleSaveFile = async () => {
    if (!editingFile) return;
    
    setEditLoading(true);
    setError(null);
    try {
      await api.writeIncludeFile(editingFile, editContent);
      showSuccess(`Saved ${editingFile}`);
      setEditingFile(null);
      setEditContent('');
      loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    
    // Ensure .yml extension
    let filename = newFileName.trim();
    if (!filename.endsWith('.yml') && !filename.endsWith('.yaml')) {
      filename += '.yml';
    }
    
    setEditLoading(true);
    setError(null);
    try {
      await api.writeIncludeFile(filename, '# New include file\n');
      showSuccess(`Created ${filename}`);
      setNewFileName('');
      setShowNewFileForm(false);
      loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create file');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteFile = async (filePath: string) => {
    setEditLoading(true);
    setError(null);
    try {
      await api.deleteIncludeFile(filePath);
      showSuccess(`Deleted ${filePath}`);
      setDeleteConfirm(null);
      loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete file');
    } finally {
      setEditLoading(false);
    }
  };

  const handleOpenInMainEditor = async (filePath: string) => {
    if (!onOpenInEditor) return;
    
    try {
      const result = await api.readIncludeFile(filePath);
      onOpenInEditor(result.content, filePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Render editing view
  if (editingFile) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <FileCode size={16} className="text-accent" />
            <span className="text-sm font-medium text-text-primary truncate">{editingFile}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-1 px-2 py-1 text-xs bg-accent text-bg-primary rounded hover:bg-accent-hover transition-colors disabled:opacity-50"
              onClick={handleSaveFile}
              disabled={editLoading}
            >
              <Save size={14} />
              Save
            </button>
            <button
              className="flex items-center gap-1 px-2 py-1 text-xs bg-bg-tertiary text-text-secondary rounded hover:bg-bg-elevated transition-colors"
              onClick={() => {
                setEditingFile(null);
                setEditContent('');
              }}
            >
              <X size={14} />
              Cancel
            </button>
          </div>
        </div>

        {/* Editor */}
        <div className="flex-1 p-2 overflow-hidden">
          <textarea
            className="w-full h-full p-3 bg-bg-primary border border-border rounded-md text-xs font-mono resize-none focus:outline-none focus:ring-1 focus:ring-accent"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="# YAML content..."
            spellCheck={false}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="mx-3 mb-3 flex items-start gap-2 p-2 bg-error/10 border border-error/30 rounded-md">
            <AlertTriangle size={14} className="text-error shrink-0 mt-0.5" />
            <span className="text-xs text-error">{error}</span>
          </div>
        )}
      </div>
    );
  }

  // Main file list view
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-border shrink-0">
        <h3 className="text-sm font-semibold text-text-primary">Config Files</h3>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-1 px-2 py-1 text-xs bg-bg-tertiary text-text-secondary rounded hover:bg-bg-elevated transition-colors"
            onClick={loadFiles}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            className="flex items-center gap-1 px-2 py-1 text-xs bg-accent text-bg-primary rounded hover:bg-accent-hover transition-colors"
            onClick={() => {
              setShowNewFileForm(true);
              setTimeout(() => newFileInputRef.current?.focus(), 100);
            }}
          >
            <Plus size={14} />
            New
          </button>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="mx-3 mt-3 flex items-center gap-2 p-2 bg-success/10 border border-success/30 rounded-md">
          <Check size={14} className="text-success shrink-0" />
          <span className="text-xs text-success">{successMessage}</span>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="mx-3 mt-3 flex items-start gap-2 p-2 bg-error/10 border border-error/30 rounded-md">
          <AlertTriangle size={14} className="text-error shrink-0 mt-0.5" />
          <span className="text-xs text-error">{error}</span>
        </div>
      )}

      {/* New file form */}
      {showNewFileForm && (
        <div className="mx-3 mt-3 p-3 bg-bg-tertiary border border-border rounded-md">
          <label className="text-[0.75rem] font-medium text-text-secondary">New File Name</label>
          <div className="flex gap-2 mt-1">
            <input
              ref={newFileInputRef}
              type="text"
              className="flex-1 px-2 py-1.5 bg-bg-primary border border-border rounded text-sm focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="widgets.yml"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFile();
                if (e.key === 'Escape') {
                  setShowNewFileForm(false);
                  setNewFileName('');
                }
              }}
            />
            <button
              className="px-3 py-1.5 text-xs bg-accent text-bg-primary rounded hover:bg-accent-hover transition-colors disabled:opacity-50"
              onClick={handleCreateFile}
              disabled={!newFileName.trim() || editLoading}
            >
              Create
            </button>
            <button
              className="px-3 py-1.5 text-xs bg-bg-tertiary text-text-secondary border border-border rounded hover:bg-bg-elevated transition-colors"
              onClick={() => {
                setShowNewFileForm(false);
                setNewFileName('');
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="mx-3 mt-3 p-2 bg-bg-tertiary rounded-md">
        <p className="text-xs text-text-secondary">
          Use <code className="px-1 py-0.5 bg-bg-elevated rounded text-accent">$include: filename.yml</code> in your main config to embed these files.
        </p>
      </div>

      {/* File list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading && files.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-text-secondary">
            <RefreshCw size={20} className="animate-spin" />
          </div>
        ) : files.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-text-secondary">
            <FileText size={32} className="mb-2 opacity-50" />
            <p className="text-sm">No YAML files found</p>
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.relativePath}
              className={`p-3 rounded-md border transition-colors ${
                file.isMainConfig 
                  ? 'bg-accent/5 border-accent/30' 
                  : file.isIncluded
                    ? 'bg-success/5 border-success/30'
                    : 'bg-bg-tertiary border-border hover:border-accent/50'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText size={14} className={file.isMainConfig ? 'text-accent' : 'text-text-secondary'} />
                    <span className="text-sm font-medium text-text-primary truncate">
                      {file.name}
                    </span>
                    {file.isMainConfig && (
                      <span className="px-1.5 py-0.5 text-[0.65rem] bg-accent/20 text-accent rounded">
                        Main Config
                      </span>
                    )}
                    {file.isIncluded && !file.isMainConfig && (
                      <span className="flex items-center gap-0.5 px-1.5 py-0.5 text-[0.65rem] bg-success/20 text-success rounded">
                        <Link size={10} />
                        Included
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-text-secondary">
                    {formatFileSize(file.size)} • {formatDate(file.modified)}
                  </div>
                </div>

                {/* Actions */}
                {!file.isMainConfig && (
                  <div className="flex items-center gap-1 shrink-0">
                    {onOpenInEditor && (
                      <button
                        className="p-1.5 text-text-secondary hover:text-accent hover:bg-bg-elevated rounded transition-colors"
                        onClick={() => handleOpenInMainEditor(file.relativePath)}
                        title="Open in Monaco Editor"
                      >
                        <FileCode size={14} />
                      </button>
                    )}
                    <button
                      className="p-1.5 text-text-secondary hover:text-accent hover:bg-bg-elevated rounded transition-colors"
                      onClick={() => handleEditFile(file.relativePath)}
                      title="Edit"
                    >
                      <Edit3 size={14} />
                    </button>
                    {deleteConfirm === file.relativePath ? (
                      <div className="flex items-center gap-1">
                        <button
                          className="p-1.5 text-error hover:bg-error/20 rounded transition-colors"
                          onClick={() => handleDeleteFile(file.relativePath)}
                          title="Confirm Delete"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          className="p-1.5 text-text-secondary hover:bg-bg-elevated rounded transition-colors"
                          onClick={() => setDeleteConfirm(null)}
                          title="Cancel"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="p-1.5 text-text-secondary hover:text-error hover:bg-error/10 rounded transition-colors"
                        onClick={() => setDeleteConfirm(file.relativePath)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border shrink-0">
        <button
          className="w-full py-2 px-4 bg-bg-tertiary text-text-secondary rounded-md text-sm font-medium hover:bg-bg-elevated transition-colors"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
