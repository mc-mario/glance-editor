import { useRef, useCallback, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { ChevronDown, ChevronRight, FileText, Plus, Trash2, RefreshCw, Check, X, FolderOpen } from 'lucide-react';
import { api, IncludeFile } from '../services/api';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onRefresh?: () => void;
  hasError?: boolean;
  errorMessage?: string;
}

export interface CodeEditorRef {
  scrollToLine: (line: number) => void;
  getEditor: () => Monaco.editor.IStandaloneCodeEditor | null;
}

type EditingFile = { type: 'main' } | { type: 'include'; path: string };

export const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(function CodeEditor(
  { value, onChange, onRefresh, hasError, errorMessage },
  ref
) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [localValue, setLocalValue] = useState(value);
  const [isDirty, setIsDirty] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  
  // Files panel state
  const [showFilesPanel, setShowFilesPanel] = useState(false);
  const [includeFiles, setIncludeFiles] = useState<IncludeFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [editingFile, setEditingFile] = useState<EditingFile>({ type: 'main' });
  const [includeFileContent, setIncludeFileContent] = useState<string>('');
  const [includeFileDirty, setIncludeFileDirty] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const newFileInputRef = useRef<HTMLInputElement>(null);
  
  // Expose scrollToLine method via ref
  useImperativeHandle(ref, () => ({
    scrollToLine: (line: number) => {
      if (editorRef.current) {
        editorRef.current.revealLineInCenter(line);
        editorRef.current.setPosition({ lineNumber: line, column: 1 });
        editorRef.current.focus();
      }
    },
    getEditor: () => editorRef.current,
  }), []);
  
  // Sync external value changes - update local value when external value changes and editor is not dirty
  useEffect(() => {
    if (!isDirty && editingFile.type === 'main') {
      setLocalValue(value);
    }
  }, [value, isDirty, editingFile.type]);

  // Load include files list
  const loadIncludeFiles = useCallback(async () => {
    setFilesLoading(true);
    setFileError(null);
    try {
      const result = await api.listIncludeFiles();
      setIncludeFiles(result.files);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setFilesLoading(false);
    }
  }, []);

  // Load files when panel is opened
  useEffect(() => {
    if (showFilesPanel && includeFiles.length === 0) {
      loadIncludeFiles();
    }
  }, [showFilesPanel, includeFiles.length, loadIncludeFiles]);

  // Switch to editing an include file
  const handleSelectIncludeFile = async (filePath: string) => {
    // If there are unsaved changes, warn the user
    if (editingFile.type === 'main' && isDirty) {
      if (!window.confirm('You have unsaved changes. Switch files anyway?')) {
        return;
      }
    }
    if (editingFile.type === 'include' && includeFileDirty) {
      if (!window.confirm('You have unsaved changes. Switch files anyway?')) {
        return;
      }
    }

    setFilesLoading(true);
    setFileError(null);
    try {
      const result = await api.readIncludeFile(filePath);
      setIncludeFileContent(result.content);
      setEditingFile({ type: 'include', path: filePath });
      setIncludeFileDirty(false);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Failed to read file');
    } finally {
      setFilesLoading(false);
    }
  };

  // Switch back to main config
  const handleSelectMainConfig = () => {
    if (editingFile.type === 'include' && includeFileDirty) {
      if (!window.confirm('You have unsaved changes. Switch files anyway?')) {
        return;
      }
    }
    setEditingFile({ type: 'main' });
    setIncludeFileContent('');
    setIncludeFileDirty(false);
  };

  // Save include file
  const handleSaveIncludeFile = async () => {
    if (editingFile.type !== 'include') return;
    
    setFilesLoading(true);
    setFileError(null);
    try {
      await api.writeIncludeFile(editingFile.path, includeFileContent);
      setIncludeFileDirty(false);
      loadIncludeFiles(); // Refresh file list
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Failed to save file');
    } finally {
      setFilesLoading(false);
    }
  };

  // Create new file
  const handleCreateFile = async () => {
    if (!newFileName.trim()) return;
    
    let filename = newFileName.trim();
    if (!filename.endsWith('.yml') && !filename.endsWith('.yaml')) {
      filename += '.yml';
    }
    
    setFilesLoading(true);
    setFileError(null);
    try {
      await api.writeIncludeFile(filename, '# New include file\n');
      setNewFileName('');
      setShowNewFileInput(false);
      await loadIncludeFiles();
      // Open the new file for editing
      handleSelectIncludeFile(filename);
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Failed to create file');
    } finally {
      setFilesLoading(false);
    }
  };

  // Delete file
  const handleDeleteFile = async (filePath: string) => {
    setFilesLoading(true);
    setFileError(null);
    try {
      await api.deleteIncludeFile(filePath);
      setDeleteConfirm(null);
      // If we're editing the deleted file, switch to main
      if (editingFile.type === 'include' && editingFile.path === filePath) {
        setEditingFile({ type: 'main' });
        setIncludeFileContent('');
        setIncludeFileDirty(false);
      }
      loadIncludeFiles();
    } catch (err) {
      setFileError(err instanceof Error ? err.message : 'Failed to delete file');
    } finally {
      setFilesLoading(false);
    }
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Configure YAML language features
    monaco.languages.registerCompletionItemProvider('yaml', {
      provideCompletionItems: (model: Monaco.editor.ITextModel, position: Monaco.Position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        
        // Glance-specific completions
        const suggestions: Monaco.languages.CompletionItem[] = [
          // Top-level keys
          { label: 'pages', kind: monaco.languages.CompletionItemKind.Property, insertText: 'pages:\n  - name: ', range },
          { label: 'theme', kind: monaco.languages.CompletionItemKind.Property, insertText: 'theme:\n  background-color: ', range },
          { label: 'branding', kind: monaco.languages.CompletionItemKind.Property, insertText: 'branding:\n  logo-text: ', range },
          { label: 'server', kind: monaco.languages.CompletionItemKind.Property, insertText: 'server:\n  port: 8080', range },
          
          // Widget types
          { label: 'type: rss', kind: monaco.languages.CompletionItemKind.Value, insertText: 'type: rss\n        feeds:\n          - url: ', range },
          { label: 'type: weather', kind: monaco.languages.CompletionItemKind.Value, insertText: 'type: weather\n        location: ', range },
          { label: 'type: clock', kind: monaco.languages.CompletionItemKind.Value, insertText: 'type: clock\n        hour-format: 24h', range },
          { label: 'type: bookmarks', kind: monaco.languages.CompletionItemKind.Value, insertText: 'type: bookmarks\n        groups:\n          - title: Links\n            links:', range },
          { label: 'type: monitor', kind: monaco.languages.CompletionItemKind.Value, insertText: 'type: monitor\n        sites:\n          - url: ', range },
          { label: 'type: hacker-news', kind: monaco.languages.CompletionItemKind.Value, insertText: 'type: hacker-news\n        limit: 15', range },
          { label: 'type: reddit', kind: monaco.languages.CompletionItemKind.Value, insertText: 'type: reddit\n        subreddit: ', range },
          { label: 'type: custom-api', kind: monaco.languages.CompletionItemKind.Value, insertText: 'type: custom-api\n        url: \n        template: |', range },
          
          // Common properties
          { label: 'title', kind: monaco.languages.CompletionItemKind.Property, insertText: 'title: ', range },
          { label: 'cache', kind: monaco.languages.CompletionItemKind.Property, insertText: 'cache: 1h', range },
          { label: 'columns', kind: monaco.languages.CompletionItemKind.Property, insertText: 'columns:\n      - size: full\n        widgets:', range },
        ];
        
        return { suggestions };
      },
    });
    
    // Set editor options
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      renderLineHighlight: 'line',
      fontSize: 13,
      tabSize: 2,
    });
  };

  const handleEditorChange: OnChange = (newValue) => {
    if (newValue !== undefined) {
      if (editingFile.type === 'main') {
        setLocalValue(newValue);
        setIsDirty(true);
      } else {
        setIncludeFileContent(newValue);
        setIncludeFileDirty(true);
      }
      
      // Basic YAML validation
      try {
        // Simple check for common YAML errors
        if (newValue.includes('\t')) {
          setParseError('Warning: Tabs detected. YAML prefers spaces for indentation.');
        } else if (/^\s*-[^\s]/.test(newValue)) {
          setParseError('Warning: List items should have a space after the dash (- item)');
        } else {
          setParseError(null);
        }
      } catch {
        setParseError('YAML syntax error');
      }
    }
  };

  const handleApply = useCallback(() => {
    onChange(localValue);
    setIsDirty(false);
  }, [localValue, onChange]);

  const handleRevert = useCallback(() => {
    setLocalValue(value);
    setIsDirty(false);
    setParseError(null);
  }, [value]);

  const handleRefresh = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    }
    setLocalValue(value);
    setIsDirty(false);
    setParseError(null);
  }, [onRefresh, value]);

  const handleFormat = useCallback(() => {
    if (editorRef.current) {
      editorRef.current.getAction('editor.action.formatDocument')?.run();
    }
  }, []);

  const displayError = hasError ? errorMessage : (parseError || fileError);
  const currentDirty = editingFile.type === 'main' ? isDirty : includeFileDirty;
  const currentValue = editingFile.type === 'main' ? localValue : includeFileContent;

  // Get files that are not the main config
  const editableFiles = includeFiles.filter(f => !f.isMainConfig);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] rounded-lg overflow-hidden border border-border">
      {/* Header with buttons */}
      <div className="flex items-center justify-between p-2 px-3 bg-bg-tertiary border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex flex-col">
            {currentDirty && <span className="text-[0.65rem] font-bold text-accent uppercase tracking-wider">Unsaved changes</span>}
            {displayError && <span className="text-[0.65rem] font-bold text-error uppercase tracking-wider">{displayError}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {editingFile.type === 'main' ? (
            <>
              <button 
                className="px-2.5 py-1 bg-bg-primary text-text-secondary hover:text-text-primary rounded text-[0.75rem] font-medium transition-colors border border-border"
                onClick={handleRefresh}
                title="Refresh from server"
              >
                Refresh
              </button>
              <button 
                className="px-2.5 py-1 bg-bg-primary text-text-secondary hover:text-text-primary rounded text-[0.75rem] font-medium transition-colors border border-border"
                onClick={handleFormat}
                title="Format document"
              >
                Format
              </button>
              <button 
                className="px-2.5 py-1 bg-bg-primary text-text-secondary hover:text-text-primary rounded text-[0.75rem] font-medium transition-colors border border-border disabled:opacity-30"
                onClick={handleRevert}
                disabled={!isDirty}
              >
                Revert
              </button>
              <button 
                className="px-3 py-1 bg-accent text-bg-primary hover:bg-accent-hover rounded text-[0.75rem] font-bold transition-colors disabled:opacity-30 shadow-sm"
                onClick={handleApply}
                disabled={!isDirty || !!hasError}
              >
                Apply Changes
              </button>
            </>
          ) : (
            <>
              <button 
                className="px-2.5 py-1 bg-bg-primary text-text-secondary hover:text-text-primary rounded text-[0.75rem] font-medium transition-colors border border-border"
                onClick={handleFormat}
                title="Format document"
              >
                Format
              </button>
              <button 
                className="px-2.5 py-1 bg-bg-primary text-text-secondary hover:text-text-primary rounded text-[0.75rem] font-medium transition-colors border border-border disabled:opacity-30"
                onClick={() => {
                  if (editingFile.type === 'include') {
                    handleSelectIncludeFile(editingFile.path);
                  }
                }}
                disabled={!includeFileDirty}
              >
                Revert
              </button>
              <button 
                className="px-3 py-1 bg-accent text-bg-primary hover:bg-accent-hover rounded text-[0.75rem] font-bold transition-colors disabled:opacity-30 shadow-sm"
                onClick={handleSaveIncludeFile}
                disabled={!includeFileDirty || filesLoading}
              >
                Save File
              </button>
            </>
          )}
        </div>
      </div>

      {/* Files toggle section */}
      <div className="bg-bg-secondary border-b border-border shrink-0">
        <button
          className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-bg-tertiary transition-colors"
          onClick={() => setShowFilesPanel(!showFilesPanel)}
        >
          {showFilesPanel ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <FolderOpen size={14} className="text-text-secondary" />
          <span className="text-xs font-medium text-text-secondary">Files</span>
          {filesLoading && <RefreshCw size={12} className="animate-spin text-text-muted ml-auto" />}
        </button>

        {showFilesPanel && (
          <div className="px-2 pb-2 space-y-1">
            {/* Main config file */}
            <button
              className={`flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-left transition-colors ${
                editingFile.type === 'main' 
                  ? 'bg-accent/20 text-accent' 
                  : 'hover:bg-bg-tertiary text-text-primary'
              }`}
              onClick={handleSelectMainConfig}
            >
              <FileText size={12} />
              <span className="truncate flex-1">glance.yml</span>
              <span className="text-[0.6rem] px-1 py-0.5 bg-accent/20 text-accent rounded">main</span>
              {isDirty && editingFile.type === 'main' && (
                <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
              )}
            </button>

            {/* Include files */}
            {editableFiles.map((file) => (
              <div key={file.relativePath} className="flex items-center gap-1">
                <button
                  className={`flex items-center gap-2 flex-1 px-2 py-1.5 rounded text-xs text-left transition-colors ${
                    editingFile.type === 'include' && editingFile.path === file.relativePath
                      ? 'bg-accent/20 text-accent'
                      : 'hover:bg-bg-tertiary text-text-primary'
                  }`}
                  onClick={() => handleSelectIncludeFile(file.relativePath)}
                >
                  <FileText size={12} />
                  <span className="truncate flex-1">{file.name}</span>
                  {file.isIncluded && (
                    <span className="text-[0.6rem] px-1 py-0.5 bg-success/20 text-success rounded">used</span>
                  )}
                  {editingFile.type === 'include' && editingFile.path === file.relativePath && includeFileDirty && (
                    <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                  )}
                </button>
                {/* Delete button */}
                {deleteConfirm === file.relativePath ? (
                  <div className="flex items-center gap-0.5">
                    <button
                      className="p-1 text-error hover:bg-error/20 rounded transition-colors"
                      onClick={() => handleDeleteFile(file.relativePath)}
                      title="Confirm Delete"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      className="p-1 text-text-secondary hover:bg-bg-tertiary rounded transition-colors"
                      onClick={() => setDeleteConfirm(null)}
                      title="Cancel"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="p-1 text-text-muted hover:text-error hover:bg-error/10 rounded transition-colors"
                    onClick={() => setDeleteConfirm(file.relativePath)}
                    title="Delete file"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            ))}

            {/* New file input */}
            {showNewFileInput ? (
              <div className="flex items-center gap-1 mt-1">
                <input
                  ref={newFileInputRef}
                  type="text"
                  className="flex-1 px-2 py-1 bg-bg-primary border border-border rounded text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="filename.yml"
                  value={newFileName}
                  onChange={(e) => setNewFileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateFile();
                    if (e.key === 'Escape') {
                      setShowNewFileInput(false);
                      setNewFileName('');
                    }
                  }}
                  autoFocus
                />
                <button
                  className="p-1 text-accent hover:bg-accent/20 rounded transition-colors"
                  onClick={handleCreateFile}
                  disabled={!newFileName.trim() || filesLoading}
                >
                  <Check size={14} />
                </button>
                <button
                  className="p-1 text-text-secondary hover:bg-bg-tertiary rounded transition-colors"
                  onClick={() => {
                    setShowNewFileInput(false);
                    setNewFileName('');
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <button
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-xs text-text-secondary hover:bg-bg-tertiary hover:text-text-primary transition-colors"
                onClick={() => {
                  setShowNewFileInput(true);
                  setTimeout(() => newFileInputRef.current?.focus(), 50);
                }}
              >
                <Plus size={12} />
                <span>New file</span>
              </button>
            )}

            {/* Help text */}
            <p className="text-[0.65rem] text-text-muted px-2 pt-1">
              Use <code className="px-1 py-0.5 bg-bg-tertiary rounded">$include: file.yml</code> to embed files
            </p>
          </div>
        )}
      </div>

      {/* Current file indicator */}
      <div className="px-3 py-1.5 bg-bg-tertiary/50 border-b border-border shrink-0">
        <span className="text-[0.7rem] text-text-muted">
          Editing: <span className="text-text-primary font-medium">
            {editingFile.type === 'main' ? 'glance.yml' : editingFile.path}
          </span>
        </span>
      </div>
      
      {/* Monaco Editor */}
      <div className="flex-1 min-h-0 bg-[#1e1e1e]">
        <Editor
          height="100%"
          defaultLanguage="yaml"
          value={currentValue}
          onChange={handleEditorChange}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            fontSize: 13,
            tabSize: 2,
            automaticLayout: true,
          }}
        />
      </div>
      
      {/* Footer tip */}
      <div className="p-2 px-3 bg-bg-tertiary border-t border-border shrink-0">
        <span className="text-[0.7rem] text-text-muted">
          {editingFile.type === 'main' 
            ? 'Tip: Edit the YAML directly. Click "Apply Changes" to update the visual editor.'
            : 'Tip: Changes to include files are saved separately from the main config.'
          }
        </span>
      </div>
    </div>
  );
});
