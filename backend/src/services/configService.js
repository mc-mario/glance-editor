import fs from 'fs/promises';
import YAML from 'yaml';
import path from 'path';

const CONFIG_PATH = process.env.CONFIG_PATH || '/app/config/glance.yml';

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
    const config = YAML.parse(content);
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
    
    const content = isRaw ? config : YAML.stringify(config, {
      indent: 2,
      lineWidth: 0,
      minContentWidth: 0,
    });
    
    // Validate YAML before writing
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
