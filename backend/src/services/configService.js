import fs from 'fs/promises';
import YAML from 'yaml';

const CONFIG_PATH = process.env.CONFIG_PATH || '/app/config/glance.yml';

/**
 * Get the parsed config object
 */
export async function getConfig() {
  const content = await fs.readFile(CONFIG_PATH, 'utf8');
  return YAML.parse(content);
}

/**
 * Get the raw YAML content
 */
export async function getConfigRaw() {
  return await fs.readFile(CONFIG_PATH, 'utf8');
}

/**
 * Update the config file atomically
 * @param {object|string} config - Config object or raw YAML string
 * @param {boolean} isRaw - If true, config is raw YAML string
 */
export async function updateConfig(config, isRaw = false) {
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
