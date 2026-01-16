import { useMemo, useState } from 'react';
import { FileText, Key, Lock, Package } from 'lucide-react';

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
function getTypeIcon(type: DetectedEnvVar['type']) {
  switch (type) {
    case 'secret': return <Lock size={16} />;
    case 'readFileFromEnv': return <FileText size={16} />;
    default: return <Key size={16} />;
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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 p-4 bg-bg-secondary rounded-lg border border-border">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Filter variables..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full p-2 bg-bg-primary border border-border rounded-md text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </div>
        <div className="text-[0.75rem] font-medium text-text-muted whitespace-nowrap">
          {envVars.length} variable{envVars.length !== 1 ? 's' : ''} detected
        </div>
      </div>
      
      {/* Variable List */}
      {filteredVars.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center bg-bg-secondary rounded-lg border border-border border-dashed">
          {envVars.length === 0 ? (
            <>
              <p className="text-text-secondary text-sm">No environment variables detected in your configuration.</p>
              <div className="mt-4 p-3 bg-bg-primary rounded-md text-[0.7rem] text-text-muted text-left border border-border">
                <p className="font-bold mb-1">Formats supported:</p>
                <code className="block text-accent">{'${VAR_NAME}'}</code>
                <code className="block text-accent">{'${secret:name}'}</code>
                <code className="block text-accent">{'${readFileFromEnv:VAR}'}</code>
              </div>
            </>
          ) : (
            <p className="text-text-secondary text-sm">No variables match your filter.</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredVars.map((v) => (
            <div key={`${v.type}:${v.name}`} className="p-4 bg-bg-secondary rounded-lg border border-border flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <span className="text-xl shrink-0">{getTypeIcon(v.type)}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-accent font-mono text-sm font-bold truncate">{v.raw}</code>
                    <button 
                      className="px-2 py-1 bg-bg-tertiary hover:bg-bg-elevated text-text-secondary hover:text-text-primary rounded text-[0.7rem] font-medium transition-colors"
                      onClick={() => copyToClipboard(v.raw)}
                      title="Copy to clipboard"
                    >
                      Copy
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-[0.7rem] text-text-muted">{getTypeDescription(v.type)}</span>
                    <span className="w-1 h-1 bg-border rounded-full" />
                    <span className="text-[0.7rem] text-text-muted">Used {v.count} time{v.count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 px-2 py-1.5 bg-bg-primary/50 rounded text-[0.7rem]">
                <span className="text-text-muted font-bold shrink-0">Locations:</span>
                <span className="text-text-secondary truncate">{v.locations.join(', ')}</span>
              </div>
              
              {/* Mock Value Editor */}
              {v.type === 'env' && (
                <div className="mt-1 pt-3 border-t border-border">
                  {showMockEditor === v.name ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={mockValues[v.name] || ''}
                        onChange={(e) => handleMockValueChange(v.name, e.target.value)}
                        placeholder="Enter mock value for preview..."
                        className="flex-1 p-2 bg-bg-primary border border-border rounded-md text-[0.8rem] focus:outline-none focus:border-accent"
                        autoFocus
                      />
                      <button 
                        className="px-3 py-2 bg-accent text-bg-primary rounded-md text-[0.8rem] font-medium hover:bg-accent-hover transition-colors"
                        onClick={() => setShowMockEditor(null)}
                      >
                        Done
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="w-full p-2 bg-bg-tertiary text-text-secondary hover:bg-bg-elevated rounded-md text-[0.8rem] font-medium text-left transition-colors border border-border border-dashed"
                      onClick={() => setShowMockEditor(v.name)}
                    >
                      {mockValues[v.name] ? (
                        <span className="flex items-center justify-between">
                          <span>Mock value set</span>
                          <span className="font-mono text-accent">{mockValues[v.name]}</span>
                        </span>
                      ) : 'Set Mock Value'}
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
        <div className="mt-4 p-5 bg-bg-secondary rounded-lg border border-border border-l-4 border-l-accent">
          <h4 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
            <Package size={16} className="text-accent" /> Export Configuration
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
            <button 
              className="px-3 py-2 bg-bg-tertiary text-text-secondary hover:bg-bg-elevated rounded-md text-[0.8rem] font-medium transition-colors border border-border"
              onClick={() => copyToClipboard(generateDockerCompose())}
            >
              Copy docker-compose snippet
            </button>
            <button 
              className="px-3 py-2 bg-bg-tertiary text-text-secondary hover:bg-bg-elevated rounded-md text-[0.8rem] font-medium transition-colors border border-border"
              onClick={() => copyToClipboard(generateEnvFile())}
            >
              Copy .env file
            </button>
          </div>
          
          <div className="space-y-2">
            <h5 className="text-[0.7rem] font-bold uppercase tracking-wider text-text-muted">docker-compose.yml snippet:</h5>
            <pre className="p-3 bg-bg-primary rounded-md text-[0.75rem] font-mono text-text-secondary overflow-x-auto border border-border">{generateDockerCompose()}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
