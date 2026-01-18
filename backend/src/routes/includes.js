import { Router } from 'express';
import {
  findIncludes,
  listConfigFiles,
  readIncludeFile,
  writeIncludeFile,
  deleteIncludeFile,
} from '../services/includeService.js';
import { getConfigRaw } from '../services/configService.js';

const router = Router();

// List all YAML files in config directory
router.get('/files', async (req, res) => {
  try {
    const files = await listConfigFiles();
    
    // Get current config to find which files are included
    const configRaw = await getConfigRaw();
    const includes = findIncludes(configRaw);
    const includedPaths = new Set(includes.map(i => i.path));
    
    // Mark which files are referenced as includes
    const filesWithStatus = files.map(file => ({
      ...file,
      isIncluded: includedPaths.has(file.relativePath),
    }));
    
    res.json({ files: filesWithStatus });
  } catch (error) {
    console.error('Error listing config files:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get includes from the main config
router.get('/references', async (req, res) => {
  try {
    const configRaw = await getConfigRaw();
    const includes = findIncludes(configRaw);
    res.json({ includes });
  } catch (error) {
    console.error('Error finding includes:', error);
    res.status(500).json({ error: error.message });
  }
});

// Read a specific include file
router.get('/file/:path(*)', async (req, res) => {
  try {
    const filePath = req.params.path;
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const result = await readIncludeFile(filePath);
    res.json(result);
  } catch (error) {
    console.error('Error reading include file:', error);
    const status = error.message.includes('not found') ? 404 : 
                   error.message.includes('Invalid') ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

// Create or update an include file
router.put('/file/:path(*)', async (req, res) => {
  try {
    const filePath = req.params.path;
    const { content } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    if (content === undefined) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const result = await writeIncludeFile(filePath, content);
    res.json(result);
  } catch (error) {
    console.error('Error writing include file:', error);
    const status = error.message.includes('Invalid') || 
                   error.message.includes('Cannot modify') ||
                   error.message.includes('must have') ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

// Delete an include file
router.delete('/file/:path(*)', async (req, res) => {
  try {
    const filePath = req.params.path;
    if (!filePath) {
      return res.status(400).json({ error: 'File path is required' });
    }
    
    const result = await deleteIncludeFile(filePath);
    res.json(result);
  } catch (error) {
    console.error('Error deleting include file:', error);
    const status = error.message.includes('not found') ? 404 :
                   error.message.includes('Invalid') ||
                   error.message.includes('Cannot delete') ? 400 : 500;
    res.status(status).json({ error: error.message });
  }
});

export default router;
