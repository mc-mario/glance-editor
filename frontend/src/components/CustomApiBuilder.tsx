import { useState, useCallback, useRef, useEffect } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import type { WidgetConfig } from '../types';

interface CustomApiBuilderProps {
  widget: WidgetConfig;
  onChange: (widget: WidgetConfig) => void;
  onClose: () => void;
}

// Go template functions available in Glance custom-api widget
const GO_TEMPLATE_FUNCTIONS = [
  { name: 'toFloat', signature: 'toFloat value', description: 'Convert value to float' },
  { name: 'toInt', signature: 'toInt value', description: 'Convert value to integer' },
  { name: 'toString', signature: 'toString value', description: 'Convert value to string' },
  { name: 'add', signature: 'add a b', description: 'Add two numbers' },
  { name: 'sub', signature: 'sub a b', description: 'Subtract b from a' },
  { name: 'mul', signature: 'mul a b', description: 'Multiply two numbers' },
  { name: 'div', signature: 'div a b', description: 'Divide a by b' },
  { name: 'mod', signature: 'mod a b', description: 'Modulo operation' },
  { name: 'formatNumber', signature: 'formatNumber value format', description: 'Format a number' },
  { name: 'formatTime', signature: 'formatTime time format', description: 'Format a time value' },
  { name: 'parseTime', signature: 'parseTime value layout', description: 'Parse a time string' },
  { name: 'now', signature: 'now', description: 'Current time' },
  { name: 'offsetNow', signature: 'offsetNow duration', description: 'Current time with offset' },
  { name: 'duration', signature: 'duration string', description: 'Parse duration string' },
  { name: 'trimPrefix', signature: 'trimPrefix s prefix', description: 'Remove prefix from string' },
  { name: 'trimSuffix', signature: 'trimSuffix s suffix', description: 'Remove suffix from string' },
  { name: 'trimSpace', signature: 'trimSpace s', description: 'Remove leading/trailing whitespace' },
  { name: 'replaceAll', signature: 'replaceAll s old new', description: 'Replace all occurrences' },
  { name: 'contains', signature: 'contains s substr', description: 'Check if string contains substring' },
  { name: 'hasPrefix', signature: 'hasPrefix s prefix', description: 'Check if string has prefix' },
  { name: 'hasSuffix', signature: 'hasSuffix s suffix', description: 'Check if string has suffix' },
  { name: 'toUpper', signature: 'toUpper s', description: 'Convert to uppercase' },
  { name: 'toLower', signature: 'toLower s', description: 'Convert to lowercase' },
  { name: 'split', signature: 'split s sep', description: 'Split string by separator' },
  { name: 'join', signature: 'join arr sep', description: 'Join array with separator' },
  { name: 'len', signature: 'len collection', description: 'Length of array/string/map' },
  { name: 'index', signature: 'index arr i', description: 'Get element at index' },
  { name: 'first', signature: 'first arr', description: 'Get first element' },
  { name: 'last', signature: 'last arr', description: 'Get last element' },
  { name: 'slice', signature: 'slice arr start end', description: 'Get slice of array' },
  { name: 'sortAsc', signature: 'sortAsc arr key', description: 'Sort ascending by key' },
  { name: 'sortDesc', signature: 'sortDesc arr key', description: 'Sort descending by key' },
  { name: 'unique', signature: 'unique arr key', description: 'Get unique elements by key' },
  { name: 'filter', signature: 'filter arr key value', description: 'Filter array by key=value' },
  { name: 'findMatch', signature: 'findMatch s pattern', description: 'Find regex match' },
  { name: 'findAllMatches', signature: 'findAllMatches s pattern', description: 'Find all regex matches' },
  { name: 'concat', signature: 'concat arr1 arr2', description: 'Concatenate arrays' },
  { name: 'json', signature: 'json value', description: 'Encode value as JSON' },
  { name: 'sjson', signature: 'sjson json path value', description: 'Set value at JSON path' },
];

// HTTP methods
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

// Sample templates for common use cases
const SAMPLE_TEMPLATES = [
  {
    name: 'Simple JSON Response',
    template: `{{ range .JSON.Array "items" }}
<li>{{ .String "name" }} - {{ .String "value" }}</li>
{{ end }}`,
  },
  {
    name: 'API with Stats',
    template: `<ul class="list list-gap-14">
  {{ range .JSON.Array "data" }}
  <li>
    <a href="{{ .String "url" }}">{{ .String "title" }}</a>
    <span class="color-subdue">{{ .Int "count" }} views</span>
  </li>
  {{ end }}
</ul>`,
  },
  {
    name: 'Weather-like Data',
    template: `<div class="flex flex-column gap-10">
  <div class="size-h3">{{ .JSON.String "location" }}</div>
  <div class="size-h1">{{ .JSON.Float "temperature" | formatNumber 1 }}°C</div>
  <div class="color-subdue">{{ .JSON.String "condition" }}</div>
</div>`,
  },
  {
    name: 'Status List',
    template: `{{ $services := .JSON.Array "services" }}
{{ range $services }}
<div class="flex justify-between">
  <span>{{ .String "name" }}</span>
  {{ if eq (.String "status") "up" }}
  <span class="color-positive">Online</span>
  {{ else }}
  <span class="color-negative">Offline</span>
  {{ end }}
</div>
{{ end }}`,
  },
];

interface TestResult {
  success: boolean;
  data?: unknown;
  error?: string;
  statusCode?: number;
  headers?: Record<string, string>;
}

export function CustomApiBuilder({ widget, onChange, onClose }: CustomApiBuilderProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [activeTab, setActiveTab] = useState<'request' | 'template' | 'test'>('request');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testing, setTesting] = useState(false);
  const [showFunctionRef, setShowFunctionRef] = useState(false);
  
  // Local state for editing
  const [url, setUrl] = useState(widget.url as string || '');
  const [method, setMethod] = useState(widget.method as string || 'GET');
  const [headers, setHeaders] = useState<Array<{key: string; value: string}>>(
    parseHeaders(widget.headers as Record<string, string> | undefined)
  );
  const [body, setBody] = useState(widget.body as string || '');
  const [template, setTemplate] = useState(widget.template as string || '');
  const [frameless, setFrameless] = useState(widget.frameless as boolean || false);
  const [parameters, setParameters] = useState<Array<{key: string; value: string}>>(
    parseParameters(widget.parameters as Record<string, string> | undefined)
  );
  
  // Convert headers object to array
  function parseHeaders(headersObj?: Record<string, string>): Array<{key: string; value: string}> {
    if (!headersObj) return [{ key: '', value: '' }];
    const entries = Object.entries(headersObj);
    return entries.length > 0 ? entries.map(([key, value]) => ({ key, value })) : [{ key: '', value: '' }];
  }
  
  // Convert parameters object to array
  // Handle both string values and object values (serialize objects to JSON for display)
  function parseParameters(paramsObj?: Record<string, unknown>): Array<{key: string; value: string}> {
    if (!paramsObj) return [];
    return Object.entries(paramsObj).map(([key, value]) => ({
      key,
      value: typeof value === 'string' ? value : JSON.stringify(value),
    }));
  }
  
  // Convert headers array back to object
  function headersToObject(headersArr: Array<{key: string; value: string}>): Record<string, string> | undefined {
    const obj: Record<string, string> = {};
    headersArr.forEach(({ key, value }) => {
      if (key.trim()) obj[key.trim()] = value;
    });
    return Object.keys(obj).length > 0 ? obj : undefined;
  }
  
  // Convert parameters array back to object
  function parametersToObject(paramsArr: Array<{key: string; value: string}>): Record<string, string> | undefined {
    const obj: Record<string, string> = {};
    paramsArr.forEach(({ key, value }) => {
      if (key.trim()) obj[key.trim()] = value;
    });
    return Object.keys(obj).length > 0 ? obj : undefined;
  }

  // Save changes to parent
  const handleSave = useCallback(() => {
    const updatedWidget: WidgetConfig = {
      ...widget,
      url: url || undefined,
      method: method !== 'GET' ? method : undefined,
      headers: headersToObject(headers),
      body: body || undefined,
      template: template || undefined,
      frameless: frameless || undefined,
      parameters: parametersToObject(parameters),
    };
    onChange(updatedWidget);
  }, [widget, url, method, headers, body, template, frameless, parameters, onChange]);

  // Auto-save on changes
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSave();
    }, 500);
    return () => clearTimeout(timer);
  }, [url, method, headers, body, template, frameless, parameters, handleSave]);

  // Test the API request
  const handleTest = async () => {
    if (!url) {
      setTestResult({ success: false, error: 'URL is required' });
      return;
    }
    
    setTesting(true);
    setTestResult(null);
    
    try {
      const fetchOptions: RequestInit = {
        method,
        headers: headersToObject(headers) || {},
      };
      
      if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
        fetchOptions.body = body;
      }
      
      // Use proxy endpoint to avoid CORS issues
      const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url,
          method,
          headers: headersToObject(headers),
          body: body || undefined,
        }),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        setTestResult({
          success: true,
          data: result.data,
          statusCode: result.statusCode,
          headers: result.headers,
        });
      } else {
        setTestResult({
          success: false,
          error: result.error || 'Request failed',
          statusCode: result.statusCode,
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        error: err instanceof Error ? err.message : 'Network error',
      });
    } finally {
      setTesting(false);
    }
  };
  
  // Add header row
  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };
  
  // Update header
  const updateHeader = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };
  
  // Remove header
  const removeHeader = (index: number) => {
    if (headers.length > 1) {
      setHeaders(headers.filter((_, i) => i !== index));
    } else {
      setHeaders([{ key: '', value: '' }]);
    }
  };
  
  // Add parameter row
  const addParameter = () => {
    setParameters([...parameters, { key: '', value: '' }]);
  };
  
  // Update parameter
  const updateParameter = (index: number, field: 'key' | 'value', value: string) => {
    const newParams = [...parameters];
    newParams[index][field] = value;
    setParameters(newParams);
  };
  
  // Remove parameter
  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };
  
  // Insert sample template
  const insertSampleTemplate = (sampleTemplate: string) => {
    setTemplate(sampleTemplate);
    if (editorRef.current) {
      editorRef.current.setValue(sampleTemplate);
    }
  };

  // Monaco editor mount handler with Go template syntax support
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    
    // Register custom language for Go templates
    monaco.languages.register({ id: 'gotemplate' });
    
    // Set tokenizer for Go template syntax
    monaco.languages.setMonarchTokensProvider('gotemplate', {
      tokenizer: {
        root: [
          [/\{\{-?\s*/, 'delimiter.bracket', '@template'],
          [/<[^>]+>/, 'tag'],
          [/[^{<]+/, 'string'],
        ],
        template: [
          [/\s*-?\}\}/, 'delimiter.bracket', '@pop'],
          [/\b(if|else|end|range|with|define|template|block)\b/, 'keyword'],
          [/\b(eq|ne|lt|le|gt|ge|and|or|not)\b/, 'keyword.operator'],
          [/\.\w+/, 'variable'],
          [/\$\w+/, 'variable.predefined'],
          [/"[^"]*"/, 'string'],
          [/'[^']*'/, 'string'],
          [/\d+/, 'number'],
          [/\|/, 'operator'],
          [/\b\w+\b/, 'identifier'],
        ],
      },
    });
    
    // Register completions for template functions
    monaco.languages.registerCompletionItemProvider('gotemplate', {
      provideCompletionItems: (model: Monaco.editor.ITextModel, position: Monaco.Position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };
        
        const suggestions: Monaco.languages.CompletionItem[] = [
          // Control structures
          { label: 'range', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'range .JSON.Array "${1:path}" }}\n  $0\n{{ end }}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
          { label: 'if', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'if ${1:condition} }}\n  $0\n{{ end }}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
          { label: 'if-else', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'if ${1:condition} }}\n  $2\n{{ else }}\n  $0\n{{ end }}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
          { label: 'with', kind: monaco.languages.CompletionItemKind.Keyword, insertText: 'with .JSON.Object "${1:path}" }}\n  $0\n{{ end }}', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range },
          
          // JSON accessors
          { label: '.JSON.String', kind: monaco.languages.CompletionItemKind.Method, insertText: '.JSON.String "${1:path}"', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Get string from JSON path' },
          { label: '.JSON.Int', kind: monaco.languages.CompletionItemKind.Method, insertText: '.JSON.Int "${1:path}"', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Get integer from JSON path' },
          { label: '.JSON.Float', kind: monaco.languages.CompletionItemKind.Method, insertText: '.JSON.Float "${1:path}"', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Get float from JSON path' },
          { label: '.JSON.Bool', kind: monaco.languages.CompletionItemKind.Method, insertText: '.JSON.Bool "${1:path}"', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Get boolean from JSON path' },
          { label: '.JSON.Array', kind: monaco.languages.CompletionItemKind.Method, insertText: '.JSON.Array "${1:path}"', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Get array from JSON path' },
          { label: '.JSON.Object', kind: monaco.languages.CompletionItemKind.Method, insertText: '.JSON.Object "${1:path}"', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Get object from JSON path' },
          
          // Element accessors (for range loops)
          { label: '.String', kind: monaco.languages.CompletionItemKind.Method, insertText: '.String "${1:key}"', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Get string from element' },
          { label: '.Int', kind: monaco.languages.CompletionItemKind.Method, insertText: '.Int "${1:key}"', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Get integer from element' },
          { label: '.Float', kind: monaco.languages.CompletionItemKind.Method, insertText: '.Float "${1:key}"', insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet, range, detail: 'Get float from element' },
          
          // Template functions
          ...GO_TEMPLATE_FUNCTIONS.map(fn => ({
            label: fn.name,
            kind: monaco.languages.CompletionItemKind.Function,
            insertText: fn.name,
            range,
            detail: fn.signature,
            documentation: fn.description,
          })),
        ];
        
        return { suggestions };
      },
    });
    
    editor.updateOptions({
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      fontSize: 13,
      tabSize: 2,
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        <button
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'request' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-text-muted hover:text-text-primary'}`}
          onClick={() => setActiveTab('request')}
        >
          Request
        </button>
        <button
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'template' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-text-muted hover:text-text-primary'}`}
          onClick={() => setActiveTab('template')}
        >
          Template
        </button>
        <button
          className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${activeTab === 'test' ? 'text-accent border-b-2 border-accent bg-accent/5' : 'text-text-muted hover:text-text-primary'}`}
          onClick={() => setActiveTab('test')}
        >
          Test
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Request Tab */}
        {activeTab === 'request' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4">
              {/* URL and Method */}
              <div className="flex gap-3">
                <div className="w-24 flex flex-col gap-1.5">
                  <label className="text-[0.75rem] font-medium text-text-secondary">Method</label>
                  <select 
                    value={method} 
                    onChange={(e) => setMethod(e.target.value)}
                    className="w-full p-2 bg-bg-primary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
                  >
                    {HTTP_METHODS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1 flex flex-col gap-1.5">
                  <label className="text-[0.75rem] font-medium text-text-secondary">URL</label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.example.com/data"
                    className="w-full p-2 bg-bg-primary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
              
              {/* Headers */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[0.75rem] font-medium text-text-secondary">Headers</label>
                  <button className="px-2 py-1 bg-bg-tertiary text-text-secondary hover:bg-bg-elevated rounded text-[0.7rem] font-medium transition-colors" onClick={addHeader}>
                    + Add Header
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  {headers.map((header, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={header.key}
                        onChange={(e) => updateHeader(index, 'key', e.target.value)}
                        placeholder="Header name"
                        className="flex-1 p-2 bg-bg-primary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
                      />
                      <input
                        type="text"
                        value={header.value}
                        onChange={(e) => updateHeader(index, 'value', e.target.value)}
                        placeholder="Value"
                        className="flex-[2] p-2 bg-bg-primary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
                      />
                      <button 
                        className="px-2 bg-error/10 text-error hover:bg-error/20 rounded-md transition-colors"
                        onClick={() => removeHeader(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Request Body (for POST/PUT/PATCH) */}
              {['POST', 'PUT', 'PATCH'].includes(method) && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[0.75rem] font-medium text-text-secondary">Request Body</label>
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder='{"key": "value"}'
                    className="w-full p-2 bg-bg-primary border border-border rounded-md text-sm focus:outline-none focus:border-accent font-mono min-h-[100px]"
                    rows={4}
                  />
                </div>
              )}
              
              {/* Parameters (for template interpolation) */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-[0.75rem] font-medium text-text-secondary">Parameters</label>
                  <button className="px-2 py-1 bg-bg-tertiary text-text-secondary hover:bg-bg-elevated rounded text-[0.7rem] font-medium transition-colors" onClick={addParameter}>
                    + Add Parameter
                  </button>
                </div>
                <p className="text-[0.7rem] text-text-muted">Parameters can be used in URL as {'{paramName}'}</p>
                <div className="flex flex-col gap-2">
                  {parameters.map((param, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={param.key}
                        onChange={(e) => updateParameter(index, 'key', e.target.value)}
                        placeholder="Parameter name"
                        className="flex-1 p-2 bg-bg-primary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
                      />
                      <input
                        type="text"
                        value={param.value}
                        onChange={(e) => updateParameter(index, 'value', e.target.value)}
                        placeholder="Default value"
                        className="flex-1 p-2 bg-bg-primary border border-border rounded-md text-sm focus:outline-none focus:border-accent"
                      />
                      <button 
                        className="px-2 bg-error/10 text-error hover:bg-error/20 rounded-md transition-colors"
                        onClick={() => removeParameter(index)}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Options */}
              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-accent"
                    checked={frameless}
                    onChange={(e) => setFrameless(e.target.checked)}
                  />
                  Frameless (no widget border)
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Template Tab */}
        {activeTab === 'template' && (
          <div className="flex flex-col gap-6">
            {/* Sample Templates */}
            <div className="flex flex-col gap-2">
              <span className="text-[0.7rem] font-bold uppercase tracking-wider text-text-muted">Start from:</span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_TEMPLATES.map((sample, index) => (
                  <button
                    key={index}
                    className="px-2.5 py-1 bg-bg-tertiary text-text-secondary hover:bg-bg-elevated rounded text-[0.75rem] font-medium transition-colors border border-border"
                    onClick={() => insertSampleTemplate(sample.template)}
                  >
                    {sample.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Function Reference Toggle */}
            <div className="flex justify-between items-center">
              <button
                className={`px-3 py-1.5 rounded text-[0.75rem] font-medium transition-colors ${showFunctionRef ? 'bg-accent text-bg-primary' : 'bg-bg-tertiary text-text-secondary border border-border hover:bg-bg-elevated'}`}
                onClick={() => setShowFunctionRef(!showFunctionRef)}
              >
                {showFunctionRef ? 'Hide' : 'Show'} Function Reference
              </button>
            </div>
            
            {/* Function Reference */}
            {showFunctionRef && (
              <div className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
                <h4 className="p-3 bg-bg-tertiary text-xs font-bold uppercase tracking-wider text-text-muted border-b border-border">Go Template Functions</h4>
                <div className="max-height-[200px] overflow-y-auto divide-y divide-border">
                  {GO_TEMPLATE_FUNCTIONS.map((fn, index) => (
                    <div key={index} className="p-2.5 flex flex-col gap-1">
                      <code className="text-accent text-[0.7rem] font-bold">{fn.signature}</code>
                      <span className="text-[0.7rem] text-text-muted">{fn.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Template Editor */}
            <div className="border border-border rounded-lg overflow-hidden bg-[#1e1e1e]">
              <Editor
                height="300px"
                defaultLanguage="gotemplate"
                value={template}
                onChange={(value) => setTemplate(value || '')}
                onMount={handleEditorMount}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  fontSize: 13,
                  tabSize: 2,
                  automaticLayout: true,
                }}
              />
            </div>
            
            <div className="p-3 bg-bg-secondary rounded-md border border-border border-l-4 border-l-accent">
              <p className="text-[0.75rem] text-text-secondary">Use Go template syntax to transform the API response. Access JSON data with <code className="text-accent font-bold">.JSON.String "path"</code>, <code className="text-accent font-bold">.JSON.Array "path"</code>, etc.</p>
            </div>
          </div>
        )}

        {/* Test Tab */}
        {activeTab === 'test' && (
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <button
                className="px-6 py-2 bg-accent text-bg-primary rounded-md text-sm font-bold hover:bg-accent-hover transition-colors shadow-lg shadow-accent/20 disabled:opacity-50 disabled:shadow-none"
                onClick={handleTest}
                disabled={testing || !url}
              >
                {testing ? 'Testing...' : 'Send Request'}
              </button>
              {!url && <span className="text-sm text-warning font-medium">Enter a URL in the Request tab first</span>}
            </div>
            
            {testResult && (
              <div className={`flex flex-col gap-4 p-5 rounded-lg border ${testResult.success ? 'bg-success/5 border-success/20' : 'bg-error/5 border-error/20'}`}>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded text-[0.7rem] font-bold uppercase tracking-wider ${testResult.success ? 'bg-success/20 text-success' : 'bg-error/20 text-error'}`}>
                    {testResult.success ? 'Success' : 'Error'}
                  </span>
                  {testResult.statusCode && (
                    <span className="text-sm font-mono text-text-muted">Status: <span className={testResult.statusCode < 400 ? 'text-success' : 'text-error'}>{testResult.statusCode}</span></span>
                  )}
                </div>
                
                {testResult.error && (
                  <div className="p-3 bg-error/10 text-error rounded-md text-sm font-medium border border-error/20">
                    {testResult.error}
                  </div>
                )}
                
                {testResult.headers && Object.keys(testResult.headers).length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h4 className="text-[0.7rem] font-bold uppercase tracking-wider text-text-muted">Response Headers</h4>
                    <pre className="p-3 bg-bg-primary rounded-md text-[0.75rem] font-mono text-text-secondary overflow-x-auto border border-border">{JSON.stringify(testResult.headers, null, 2)}</pre>
                  </div>
                )}
                
                {testResult.data !== undefined && testResult.data !== null && (
                  <div className="flex flex-col gap-2">
                    <h4 className="text-[0.7rem] font-bold uppercase tracking-wider text-text-muted">Response Body</h4>
                    <pre className="p-3 bg-bg-primary rounded-md text-[0.75rem] font-mono text-text-secondary overflow-x-auto border border-border">{typeof testResult.data === 'string' 
                      ? testResult.data 
                      : JSON.stringify(testResult.data, null, 2)
                    }</pre>
                  </div>
                )}
              </div>
            )}
            
            <div className="p-4 bg-bg-secondary rounded-lg border border-border text-center">
              <p className="text-sm text-text-muted">Test your API request to see the raw response. Use this to understand the data structure for your template.</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border flex justify-end shrink-0">
        <button className="px-6 py-2 bg-bg-tertiary text-text-primary rounded-md text-sm font-bold hover:bg-bg-elevated transition-colors border border-border" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
