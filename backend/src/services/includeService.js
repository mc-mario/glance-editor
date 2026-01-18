import fs from 'fs/promises';
import path from 'path';

const CONFIG_PATH = process.env.CONFIG_PATH || '/app/config/glance.yml';
const CONFIG_DIR = path.dirname(CONFIG_PATH);

/**
 * Scan YAML content for $include directives and return list of included files
 */
export function findIncludes(yamlContent) {
  const includes = [];
  const lines = yamlContent.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^\s*(?:-\s*)?(?:\$include|!include):\s*(.+)$/);
    if (match) {
      const filePath = match[1].trim();
      includes.push({
        path: filePath,
        line: i + 1,
        absolutePath: path.resolve(CONFIG_DIR, filePath),
      });
    }
  }
  
  return includes;
}

/**
 * List all YAML files in the config directory (potential include files)
 */
export async function listConfigFiles() {
  try {
    const files = await fs.readdir(CONFIG_DIR);
    const yamlFiles = files.filter(f => 
      f.endsWith('.yml') || f.endsWith('.yaml')
    );
    
    const fileInfos = await Promise.all(
      yamlFiles.map(async (filename) => {
        const filePath = path.join(CONFIG_DIR, filename);
        const stats = await fs.stat(filePath);
        const isMainConfig = filePath === CONFIG_PATH;
        
        return {
          name: filename,
          path: filePath,
          relativePath: path.relative(CONFIG_DIR, filePath),
          size: stats.size,
          modified: stats.mtime,
          isMainConfig,
        };
      })
    );
    
    return fileInfos;
  } catch (error) {
    console.error('Error listing config files:', error);
    throw error;
  }
}

/**
 * Read an include file's content
 */
export async function readIncludeFile(relativePath) {
  // Prevent directory traversal attacks
  const normalizedPath = path.normalize(relativePath);
  if (normalizedPath.includes('..') || path.isAbsolute(normalizedPath)) {
    throw new Error('Invalid file path: must be relative and within config directory');
  }
  
  const fullPath = path.join(CONFIG_DIR, normalizedPath);
  
  // Ensure the resolved path is still within CONFIG_DIR
  if (!fullPath.startsWith(CONFIG_DIR)) {
    throw new Error('Invalid file path: must be within config directory');
  }
  
  try {
    const content = await fs.readFile(fullPath, 'utf8');
    return { 
      content,
      path: relativePath,
      absolutePath: fullPath,
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${relativePath}`);
    }
    throw error;
  }
}

/**
 * Write/update an include file
 */
export async function writeIncludeFile(relativePath, content) {
  // Prevent directory traversal attacks
  const normalizedPath = path.normalize(relativePath);
  if (normalizedPath.includes('..') || path.isAbsolute(normalizedPath)) {
    throw new Error('Invalid file path: must be relative and within config directory');
  }
  
  const fullPath = path.join(CONFIG_DIR, normalizedPath);
  
  // Ensure the resolved path is still within CONFIG_DIR
  if (!fullPath.startsWith(CONFIG_DIR)) {
    throw new Error('Invalid file path: must be within config directory');
  }
  
  // Ensure the filename has a yml/yaml extension
  if (!fullPath.endsWith('.yml') && !fullPath.endsWith('.yaml')) {
    throw new Error('File must have .yml or .yaml extension');
  }
  
  // Prevent overwriting the main config file through this endpoint
  if (fullPath === CONFIG_PATH) {
    throw new Error('Cannot modify main config file through include API');
  }
  
  try {
    // Create directory if it doesn't exist
    const dir = path.dirname(fullPath);
    await fs.mkdir(dir, { recursive: true });
    
    // Atomic write
    const tempPath = `${fullPath}.tmp`;
    await fs.writeFile(tempPath, content, 'utf8');
    await fs.rename(tempPath, fullPath);
    
    return { 
      success: true,
      path: relativePath,
      absolutePath: fullPath,
    };
  } catch (error) {
    console.error('Error writing include file:', error);
    throw error;
  }
}

/**
 * Delete an include file
 */
export async function deleteIncludeFile(relativePath) {
  // Prevent directory traversal attacks
  const normalizedPath = path.normalize(relativePath);
  if (normalizedPath.includes('..') || path.isAbsolute(normalizedPath)) {
    throw new Error('Invalid file path: must be relative and within config directory');
  }
  
  const fullPath = path.join(CONFIG_DIR, normalizedPath);
  
  // Ensure the resolved path is still within CONFIG_DIR
  if (!fullPath.startsWith(CONFIG_DIR)) {
    throw new Error('Invalid file path: must be within config directory');
  }
  
  // Prevent deleting the main config file
  if (fullPath === CONFIG_PATH) {
    throw new Error('Cannot delete main config file');
  }
  
  try {
    await fs.unlink(fullPath);
    return { success: true, path: relativePath };
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error(`File not found: ${relativePath}`);
    }
    throw error;
  }
}

/**
 * Get the config directory path
 */
export function getConfigDir() {
  return CONFIG_DIR;
}
