import { useMemo, useState } from 'react';

interface EnvVarManagerProps {
  rawConfig: string;
  onClose?: () => void;
}

interface DetectedEnvVar {
  name: string;
  type: 'env' | 'secret' | 'readFileFromEnv';
  raw: string;
  locations: string[];
  count: number;
}

// Extract environment variables from YAML content
function extractEnvVars(yamlContent: string): DetectedEnvVar[] {
  const envVarPattern = /\$\{(?:([a-zA-Z]+):)?([a-zA-Z0-9_-]+)\}/g;
  const vars: Map<string, DetectedEnvVar> = new Map();
  
  const lines = yamlContent.split('\n');
  
  lines.forEach((line, lineIndex) => {
    let match;
    while ((match = envVarPattern.exec(line)) !== null) {
      const prefix = match[1] || 'env';
      const name = match[2];
      const raw = match[0];
      const type = prefix === 'secret' ? 'secret' : prefix === 'readFileFromEnv' ? 'readFileFromEnv' : 'env';
      const key = `${type}:${name}`;
      
      if (vars.has(key)) {
        const existing = vars.get(key)!;
        existing.count++;
        existing.locations.push(`Line ${lineIndex + 1}`);
      } else {
        vars.set(key, {
          name,
          type,
          raw,
          locations: [`Line ${lineIndex + 1}`],
          count: 1,
        });
      }
    }
  });
  
  return Array.from(vars.values()).sort((a, b) => a.name.localeCompare(b.name));
}

// Get the icon for an env var type
function getTypeIcon(type: DetectedEnvVar['type']): string {
  switch (type) {
    case 'secret': return '🔐';
    case 'readFileFromEnv': return '📁';
    default: return '🔑';
  }
}

// Get the description for an env var type
function getTypeDescription(type: DetectedEnvVar['type']): string {
  switch (type) {
    case 'secret': return 'Docker secret (from /run/secrets/)';
    case 'readFileFromEnv': return 'Read file path from environment variable';
    default: return 'Environment variable';
  }
}

export function EnvVarManager({ rawConfig }: EnvVarManagerProps) {
  const [filter, setFilter] = useState('');
  const [mockValues, setMockValues] = useState<Record<string, string>>({});
  const [showMockEditor, setShowMockEditor] = useState<string | null>(null);
  
  const envVars = useMemo(() => extractEnvVars(rawConfig), [rawConfig]);
  
  const filteredVars = useMemo(() => {
    if (!filter) return envVars;
    const lowerFilter = filter.toLowerCase();
    return envVars.filter(v => 
      v.name.toLowerCase().includes(lowerFilter) ||
      v.type.toLowerCase().includes(lowerFilter)
    );
  }, [envVars, filter]);
  
  const handleMockValueChange = (name: string, value: string) => {
    setMockValues(prev => ({ ...prev, [name]: value }));
  };
  
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };
  
  const generateDockerCompose = () => {
    const envLines = envVars
      .filter(v => v.type === 'env')
      .map(v => `      - ${v.name}=\${${v.name}}`)
      .join('\n');
    
    const secretLines = envVars
      .filter(v => v.type === 'secret')
      .map(v => `      - ${v.name}`)
      .join('\n');
    
    let output = '';
    if (envLines) {
      output += `    environment:\n${envLines}\n`;
    }
    if (secretLines) {
      output += `    secrets:\n${secretLines}\n`;
    }
    
    return output || '# No environment variables detected';
  };
  
  const generateEnvFile = () => {
    return envVars
      .filter(v => v.type === 'env')
      .map(v => `${v.name}=${mockValues[v.name] || ''}`)
      .join('\n') || '# No environment variables detected';
  };

  return (
    <div className="env-var-manager">
      {/* Header */}
      <div className="env-var-header">
        <div className="env-var-search">
          <input
            type="text"
            placeholder="Filter variables..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="env-var-stats">
          {envVars.length} variable{envVars.length !== 1 ? 's' : ''} detected
        </div>
      </div>
      
      {/* Variable List */}
      {filteredVars.length === 0 ? (
        <div className="env-var-empty">
          {envVars.length === 0 ? (
            <>
              <p>No environment variables detected in your configuration.</p>
              <p className="env-var-hint">
                Environment variables use the format: <code>{'${VAR_NAME}'}</code><br />
                Docker secrets: <code>{'${secret:name}'}</code><br />
                File from env: <code>{'${readFileFromEnv:VAR}'}</code>
              </p>
            </>
          ) : (
            <p>No variables match your filter.</p>
          )}
        </div>
      ) : (
        <div className="env-var-list">
          {filteredVars.map((v) => (
            <div key={`${v.type}:${v.name}`} className="env-var-item">
              <div className="env-var-main">
                <span className="env-var-icon">{getTypeIcon(v.type)}</span>
                <div className="env-var-info">
                  <div className="env-var-name">
                    <code>{v.raw}</code>
                    <button 
                      className="btn-copy"
                      onClick={() => copyToClipboard(v.raw)}
                      title="Copy to clipboard"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="env-var-meta">
                    <span className="env-var-type">{getTypeDescription(v.type)}</span>
                    <span className="env-var-count">Used {v.count} time{v.count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
              
              <div className="env-var-locations">
                <span className="locations-label">Locations:</span>
                <span className="locations-list">{v.locations.join(', ')}</span>
              </div>
              
              {/* Mock Value Editor */}
              {v.type === 'env' && (
                <div className="env-var-mock">
                  {showMockEditor === v.name ? (
                    <div className="mock-editor">
                      <input
                        type="text"
                        value={mockValues[v.name] || ''}
                        onChange={(e) => handleMockValueChange(v.name, e.target.value)}
                        placeholder="Enter mock value for preview..."
                        className="mock-input"
                      />
                      <button 
                        className="btn btn-sm btn-secondary"
                        onClick={() => setShowMockEditor(null)}
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="btn btn-sm btn-secondary"
                      onClick={() => setShowMockEditor(v.name)}
                    >
                      {mockValues[v.name] ? `Mock: ${mockValues[v.name]}` : 'Set Mock Value'}
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Export Options */}
      {envVars.length > 0 && (
        <div className="env-var-export">
          <h4>Export</h4>
          <div className="export-buttons">
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => copyToClipboard(generateDockerCompose())}
            >
              Copy docker-compose snippet
            </button>
            <button 
              className="btn btn-secondary btn-sm"
              onClick={() => copyToClipboard(generateEnvFile())}
            >
              Copy .env file
            </button>
          </div>
          
          <div className="export-preview">
            <h5>docker-compose.yml snippet:</h5>
            <pre className="export-code">{generateDockerCompose()}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
