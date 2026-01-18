import { useRef, useCallback, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import Editor, { OnMount, OnChange } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';

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

export const CodeEditor = forwardRef<CodeEditorRef, CodeEditorProps>(function CodeEditor(
  { value, onChange, onRefresh, hasError, errorMessage },
  ref
) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [localValue, setLocalValue] = useState(value);
  const [isDirty, setIsDirty] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  
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
    if (!isDirty) {
      setLocalValue(value);
    }
  }, [value, isDirty]);

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
      setLocalValue(newValue);
      setIsDirty(true);
      
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

  const displayError = hasError ? errorMessage : parseError;

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] rounded-lg overflow-hidden border border-border">
      <div className="flex items-center justify-between p-2 px-3 bg-bg-tertiary border-b border-border shrink-0">
        <div className="flex flex-col">
          {isDirty && <span className="text-[0.65rem] font-bold text-accent uppercase tracking-wider">Unsaved changes</span>}
          {displayError && <span className="text-[0.65rem] font-bold text-error uppercase tracking-wider">{displayError}</span>}
        </div>
        <div className="flex items-center gap-2">
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
        </div>
      </div>
      
      <div className="flex-1 min-h-0 bg-[#1e1e1e]">
        <Editor
          height="100%"
          defaultLanguage="yaml"
          value={localValue}
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
      
      <div className="p-2 px-3 bg-bg-tertiary border-t border-border shrink-0">
        <span className="text-[0.7rem] text-text-muted">Tip: Edit the YAML directly. Click "Apply Changes" to update the visual editor.</span>
      </div>
    </div>
  );
});
