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
  function parseParameters(paramsObj?: Record<string, string>): Array<{key: string; value: string}> {
    if (!paramsObj) return [];
    return Object.entries(paramsObj).map(([key, value]) => ({ key, value }));
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
    <div className="custom-api-builder">
      {/* Tabs */}
      <div className="api-builder-tabs">
        <button
          className={`api-builder-tab ${activeTab === 'request' ? 'active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          Request
        </button>
        <button
          className={`api-builder-tab ${activeTab === 'template' ? 'active' : ''}`}
          onClick={() => setActiveTab('template')}
        >
          Template
        </button>
        <button
          className={`api-builder-tab ${activeTab === 'test' ? 'active' : ''}`}
          onClick={() => setActiveTab('test')}
        >
          Test
        </button>
      </div>

      {/* Request Tab */}
      {activeTab === 'request' && (
        <div className="api-builder-section">
          <div className="api-builder-form">
            {/* URL and Method */}
            <div className="form-row">
              <div className="form-group form-group-sm">
                <label>Method</label>
                <select 
                  value={method} 
                  onChange={(e) => setMethod(e.target.value)}
                  className="input"
                >
                  {HTTP_METHODS.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
              <div className="form-group form-group-grow">
                <label>URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://api.example.com/data"
                  className="input"
                />
              </div>
            </div>
            
            {/* Headers */}
            <div className="form-group">
              <div className="form-group-header">
                <label>Headers</label>
                <button className="btn btn-sm btn-secondary" onClick={addHeader}>
                  + Add Header
                </button>
              </div>
              <div className="key-value-list">
                {headers.map((header, index) => (
                  <div key={index} className="key-value-row">
                    <input
                      type="text"
                      value={header.key}
                      onChange={(e) => updateHeader(index, 'key', e.target.value)}
                      placeholder="Header name"
                      className="input"
                    />
                    <input
                      type="text"
                      value={header.value}
                      onChange={(e) => updateHeader(index, 'value', e.target.value)}
                      placeholder="Value"
                      className="input"
                    />
                    <button 
                      className="btn btn-sm btn-danger"
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
              <div className="form-group">
                <label>Request Body</label>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder='{"key": "value"}'
                  className="input textarea"
                  rows={4}
                />
              </div>
            )}
            
            {/* Parameters (for template interpolation) */}
            <div className="form-group">
              <div className="form-group-header">
                <label>Parameters</label>
                <button className="btn btn-sm btn-secondary" onClick={addParameter}>
                  + Add Parameter
                </button>
              </div>
              <p className="form-help">Parameters can be used in URL as {'{paramName}'}</p>
              <div className="key-value-list">
                {parameters.map((param, index) => (
                  <div key={index} className="key-value-row">
                    <input
                      type="text"
                      value={param.key}
                      onChange={(e) => updateParameter(index, 'key', e.target.value)}
                      placeholder="Parameter name"
                      className="input"
                    />
                    <input
                      type="text"
                      value={param.value}
                      onChange={(e) => updateParameter(index, 'value', e.target.value)}
                      placeholder="Default value"
                      className="input"
                    />
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => removeParameter(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Options */}
            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
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
        <div className="api-builder-section">
          {/* Sample Templates */}
          <div className="template-samples">
            <span className="template-samples-label">Start from:</span>
            {SAMPLE_TEMPLATES.map((sample, index) => (
              <button
                key={index}
                className="btn btn-sm btn-secondary"
                onClick={() => insertSampleTemplate(sample.template)}
              >
                {sample.name}
              </button>
            ))}
          </div>
          
          {/* Function Reference Toggle */}
          <div className="template-toolbar">
            <button
              className={`btn btn-sm ${showFunctionRef ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setShowFunctionRef(!showFunctionRef)}
            >
              {showFunctionRef ? 'Hide' : 'Show'} Function Reference
            </button>
          </div>
          
          {/* Function Reference */}
          {showFunctionRef && (
            <div className="function-reference">
              <h4>Go Template Functions</h4>
              <div className="function-list">
                {GO_TEMPLATE_FUNCTIONS.map((fn, index) => (
                  <div key={index} className="function-item">
                    <code className="function-sig">{fn.signature}</code>
                    <span className="function-desc">{fn.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Template Editor */}
          <div className="template-editor">
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
          
          <div className="template-help">
            <p>Use Go template syntax to transform the API response. Access JSON data with <code>.JSON.String "path"</code>, <code>.JSON.Array "path"</code>, etc.</p>
          </div>
        </div>
      )}

      {/* Test Tab */}
      {activeTab === 'test' && (
        <div className="api-builder-section">
          <div className="test-controls">
            <button
              className="btn btn-primary"
              onClick={handleTest}
              disabled={testing || !url}
            >
              {testing ? 'Testing...' : 'Send Request'}
            </button>
            {!url && <span className="test-warning">Enter a URL in the Request tab first</span>}
          </div>
          
          {testResult && (
            <div className={`test-result ${testResult.success ? 'success' : 'error'}`}>
              <div className="test-result-header">
                <span className={`status-badge ${testResult.success ? 'success' : 'error'}`}>
                  {testResult.success ? 'Success' : 'Error'}
                </span>
                {testResult.statusCode && (
                  <span className="status-code">Status: {testResult.statusCode}</span>
                )}
              </div>
              
              {testResult.error && (
                <div className="test-error">
                  {testResult.error}
                </div>
              )}
              
              {testResult.headers && Object.keys(testResult.headers).length > 0 && (
                <div className="test-headers">
                  <h4>Response Headers</h4>
                  <pre>{JSON.stringify(testResult.headers, null, 2)}</pre>
                </div>
              )}
              
              {testResult.data !== undefined && testResult.data !== null && (
                <div className="test-data">
                  <h4>Response Body</h4>
                  <pre>{typeof testResult.data === 'string' 
                    ? testResult.data 
                    : JSON.stringify(testResult.data, null, 2)
                  }</pre>
                </div>
              )}
            </div>
          )}
          
          <div className="test-help">
            <p>Test your API request to see the raw response. Use this to understand the data structure for your template.</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="api-builder-footer">
        <button className="btn btn-secondary" onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  );
}
