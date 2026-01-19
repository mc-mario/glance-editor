import fs from 'fs/promises';
import YAML from 'yaml';
import path from 'path';

const CONFIG_PATH = process.env.CONFIG_PATH || '/app/config/glance.yml';
const DEACTIVATED_MARKER = '# DEACTIVATED_WIDGET_BASE64:';

/**
 * Process config before saving: convert _deactivated widgets to commented YAML
 * Deactivated widgets are stored as: # DEACTIVATED_WIDGET: <base64-encoded JSON>
 * @param {object} config - Config object with potential _deactivated widgets
 * @returns {object} - { processedConfig, deactivatedWidgetsByLocation }
 */
function processDeactivatedWidgets(config) {
  const processedConfig = JSON.parse(JSON.stringify(config));
  const deactivatedByLocation = new Map();
  
  processedConfig.pages?.forEach((page, pageIdx) => {
    page.columns?.forEach((column, colIdx) => {
      if (!column.widgets) return;
      
      const activeWidgets = [];
      column.widgets.forEach((widget) => {
        if (widget._deactivated) {
          const widgetCopy = { ...widget };
          delete widgetCopy._deactivated;
          
          const key = `${pageIdx}.${colIdx}`;
          if (!deactivatedByLocation.has(key)) {
            deactivatedByLocation.set(key, []);
          }
          deactivatedByLocation.get(key).push({
            insertAfterIndex: activeWidgets.length,
            widget: widgetCopy,
          });
        } else {
          activeWidgets.push(widget);
        }
      });
      column.widgets = activeWidgets;
    });
  });
  
  return { processedConfig, deactivatedByLocation };
}

/**
 * Find the line number where a widget should be inserted
 * @param {string[]} lines - YAML lines
 * @param {number} pageIdx - Target page index
 * @param {number} colIdx - Target column index
 * @param {number} insertAfterIndex - Insert after this widget index (0 = after first widget, -1 or before first = at start of widgets)
 * @returns {{ line: number, needsWidgetsExpansion: boolean }} - Line number to insert at and whether widgets: [] needs expansion
 */
function findWidgetInsertLine(lines, pageIdx, colIdx, insertAfterIndex) {
  let currentPageIdx = -1;
  let currentColIdx = -1;
  let inWidgets = false;
  let widgetCount = 0;
  let widgetsStartLine = -1;
  let lastWidgetEndLine = -1;
  let widgetsIsEmptyArray = false;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;
    
    // Detect page start (- name: at indent 2)
    if ((trimmed === '- name:' || trimmed.startsWith('- name: ')) && indent === 2) {
      currentPageIdx++;
      currentColIdx = -1;
      inWidgets = false;
    }
    
    // Detect column start (- size: at indent 6)
    if ((trimmed === '- size:' || trimmed.startsWith('- size: ')) && indent === 6) {
      currentColIdx++;
      inWidgets = false;
      widgetCount = 0;
    }
    
    // Detect widgets array (either "widgets:" or "widgets: []")
    if (currentPageIdx === pageIdx && currentColIdx === colIdx && indent === 8) {
      if (trimmed === 'widgets:') {
        inWidgets = true;
        widgetsStartLine = i;
        continue;
      } else if (trimmed === 'widgets: []') {
        widgetsStartLine = i;
        widgetsIsEmptyArray = true;
        return { line: i, needsWidgetsExpansion: true };
      }
    }
    
    // Count widgets
    if (inWidgets && currentPageIdx === pageIdx && currentColIdx === colIdx) {
      if ((trimmed.startsWith('- type:') || trimmed === '- type:') && indent === 10) {
        widgetCount++;
        if (widgetCount <= insertAfterIndex) {
          // Find end of this widget
          for (let j = i + 1; j < lines.length; j++) {
            const nextLine = lines[j];
            const nextTrimmed = nextLine.trim();
            const nextIndent = nextLine.length - nextLine.trimStart().length;
            
            // Widget ends when we see another widget, a comment, or leave the widgets section
            if (nextIndent <= 10 || nextTrimmed.startsWith('- type:') || nextTrimmed.startsWith('#')) {
              lastWidgetEndLine = j;
              break;
            }
            lastWidgetEndLine = j + 1;
          }
        }
      }
      
      // Exit widgets section
      if (indent <= 8 && trimmed !== '' && !trimmed.startsWith('-') && !trimmed.startsWith('#') && trimmed !== 'widgets:') {
        break;
      }
    }
  }
  
  if (insertAfterIndex <= 0 || widgetCount === 0) {
    return { line: widgetsStartLine + 1, needsWidgetsExpansion: false };
  }
  
  return { line: lastWidgetEndLine, needsWidgetsExpansion: false };
}

/**
 * Insert commented widgets into YAML content at appropriate locations
 * @param {string} yamlContent - Serialized YAML string
 * @param {Map} deactivatedByLocation - Map of "pageIdx.colIdx" -> deactivated widgets
 * @returns {string} - YAML with commented widgets inserted
 */
function insertCommentedWidgets(yamlContent, deactivatedByLocation) {
  if (deactivatedByLocation.size === 0) return yamlContent;
  
  let lines = yamlContent.split('\n');
  
  // Collect all insertions with their line numbers
  const insertions = [];
  const expansions = new Set(); // Lines that need widgets: [] -> widgets:
  
  for (const [key, widgets] of deactivatedByLocation) {
    const [pageIdx, colIdx] = key.split('.').map(Number);
    
    for (const { insertAfterIndex, widget } of widgets) {
      const encoded = Buffer.from(JSON.stringify(widget)).toString('base64');
      const comment = `          ${DEACTIVATED_MARKER} ${encoded}`;
      const { line, needsWidgetsExpansion } = findWidgetInsertLine(lines, pageIdx, colIdx, insertAfterIndex);
      
      if (needsWidgetsExpansion) {
        expansions.add(line);
      }
      
      insertions.push({ line: needsWidgetsExpansion ? line + 1 : line, content: comment, insertAfterIndex });
    }
  }
  
  // Expand widgets: [] to widgets: (need to do this first)
  for (const lineNum of expansions) {
    lines[lineNum] = lines[lineNum].replace('widgets: []', 'widgets:');
  }
  
  // Sort by line (descending) to insert from bottom to top
  insertions.sort((a, b) => {
    if (b.line !== a.line) return b.line - a.line;
    return b.insertAfterIndex - a.insertAfterIndex;
  });
  
  for (const { line, content } of insertions) {
    lines.splice(line, 0, content);
  }
  
  return lines.join('\n');
}

/**
 * Parse commented widgets from YAML content and restore them with _deactivated flag
 * @param {object} config - Parsed config object
 * @param {string} rawContent - Raw YAML content with potential comments
 * @returns {object} - Config with deactivated widgets restored
 */
function parseDeactivatedWidgets(config, rawContent) {
  if (!rawContent.includes(DEACTIVATED_MARKER)) return config;
  
  const lines = rawContent.split('\n');
  const processedConfig = JSON.parse(JSON.stringify(config));
  
  let currentPageIdx = -1;
  let currentColIdx = -1;
  let inWidgets = false;
  let widgetInsertIndex = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const indent = line.length - line.trimStart().length;
    
    // Detect page start
    if ((trimmed === '- name:' || trimmed.startsWith('- name: ')) && indent === 2) {
      currentPageIdx++;
      currentColIdx = -1;
      inWidgets = false;
    }
    
    // Detect column start
    if ((trimmed === '- size:' || trimmed.startsWith('- size: ')) && indent === 6) {
      currentColIdx++;
      inWidgets = false;
      widgetInsertIndex = 0;
    }
    
    // Detect widgets section (either "widgets:" or "widgets: []")
    if ((trimmed === 'widgets:' || trimmed === 'widgets: []') && indent === 8) {
      inWidgets = true;
      widgetInsertIndex = 0;
      continue;
    }
    
    // Count active widgets
    if (inWidgets && (trimmed.startsWith('- type:') || trimmed === '- type:') && indent === 10) {
      widgetInsertIndex++;
    }
    
    // Parse deactivated widget
    if (trimmed.startsWith(DEACTIVATED_MARKER)) {
      const encoded = trimmed.substring(DEACTIVATED_MARKER.length).trim();
      
      try {
        const widgetJson = Buffer.from(encoded, 'base64').toString('utf8');
        const widget = JSON.parse(widgetJson);
        widget._deactivated = true;
        
        if (currentPageIdx >= 0 && currentColIdx >= 0 &&
            processedConfig.pages?.[currentPageIdx]?.columns?.[currentColIdx]) {
          const column = processedConfig.pages[currentPageIdx].columns[currentColIdx];
          if (!column.widgets) column.widgets = [];
          column.widgets.splice(widgetInsertIndex, 0, widget);
          widgetInsertIndex++;
        }
      } catch (err) {
        console.warn('Failed to parse deactivated widget:', err.message);
      }
    }
    
    // Exit widgets section
    if (inWidgets && indent <= 8 && trimmed !== '' && !trimmed.startsWith('-') && 
        !trimmed.startsWith('#') && trimmed !== 'widgets:' && trimmed !== 'widgets: []') {
      inWidgets = false;
    }
  }
  
  return processedConfig;
}

// Write lock to prevent concurrent file operations
let writeLock = Promise.resolve();

/**
 * Create an initial backup on first run if glance.backup doesn't exist
 * This backup persists independently of intermediate saves
 */
export async function createInitialBackupIfNeeded() {
  const configDir = path.dirname(CONFIG_PATH);
  const configName = path.basename(CONFIG_PATH, path.extname(CONFIG_PATH));
  const initialBackupPath = path.join(configDir, `${configName}.initial.backup`);
  
  try {
    // Check if initial backup already exists
    await fs.access(initialBackupPath);
    console.log(`Initial backup already exists at ${initialBackupPath}`);
    return false;
  } catch {
    // Initial backup doesn't exist, try to create it
    try {
      await fs.access(CONFIG_PATH);
      await fs.copyFile(CONFIG_PATH, initialBackupPath);
      console.log(`Created initial backup at ${initialBackupPath}`);
      return true;
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.log('Config file does not exist yet, skipping initial backup');
        return false;
      }
      console.error('Failed to create initial backup:', err);
      throw err;
    }
  }
}

/**
 * Get the parsed config object
 * Returns { config, parseError } - parseError contains details if YAML is invalid
 */
export async function getConfig() {
  const content = await fs.readFile(CONFIG_PATH, 'utf8');
  try {
    let config = YAML.parse(content);
    config = parseDeactivatedWidgets(config, content);
    return { config, parseError: null };
  } catch (err) {
    // Extract line/column info from YAML parse error
    const parseError = {
      message: err.message,
      line: err.linePos?.[0]?.line || null,
      column: err.linePos?.[0]?.col || null,
      name: err.name || 'YAMLParseError',
    };
    console.error('YAML parse error:', parseError);
    return { config: null, parseError };
  }
}

/**
 * Get the raw YAML content
 */
export async function getConfigRaw() {
  return await fs.readFile(CONFIG_PATH, 'utf8');
}

/**
 * Update the config file atomically with write lock to prevent race conditions
 * @param {object|string} config - Config object or raw YAML string
 * @param {boolean} isRaw - If true, config is raw YAML string
 */
export async function updateConfig(config, isRaw = false) {
  // Chain this write operation after any pending writes
  const previousLock = writeLock;
  let releaseLock;
  writeLock = new Promise(resolve => { releaseLock = resolve; });
  
  try {
    // Wait for any previous write to complete
    await previousLock;
    
    let content;
    if (isRaw) {
      content = config;
    } else {
      const { processedConfig, deactivatedByLocation } = processDeactivatedWidgets(config);
      content = YAML.stringify(processedConfig, {
        indent: 2,
        lineWidth: 0,
        minContentWidth: 0,
      });
      content = insertCommentedWidgets(content, deactivatedByLocation);
    }
    
    // Validate YAML before writing (only validates uncommented parts)
    if (!isRaw) {
      try {
        YAML.parse(content);
      } catch (err) {
        throw new Error(`Invalid YAML generated: ${err.message}`);
      }
    }
    
    // Atomic write: write to temp file then rename
    const tempPath = `${CONFIG_PATH}.tmp`;
    const backupPath = `${CONFIG_PATH}.backup`;
    
    // Backup existing config
    try {
      await fs.copyFile(CONFIG_PATH, backupPath);
    } catch (err) {
      // Ignore if config doesn't exist yet
      if (err.code !== 'ENOENT') throw err;
    }
    
    // Write to temp file
    await fs.writeFile(tempPath, content, 'utf8');
    
    // Atomic rename
    await fs.rename(tempPath, CONFIG_PATH);
    
    return true;
  } finally {
    releaseLock();
  }
}

/**
 * Check if config file exists
 */
export async function configExists() {
  try {
    await fs.access(CONFIG_PATH);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the config file path
 */
export function getConfigPath() {
  return CONFIG_PATH;
}
