import { Router } from 'express';
import { getConfig, updateConfig, getConfigRaw } from '../services/configService.js';

const router = Router();

// Get current config (parsed)
router.get('/', async (req, res) => {
  try {
    const raw = await getConfigRaw();
    const { config, parseError } = await getConfig();
    
    // Return 200 even with parse errors - let frontend handle display
    // This allows Monaco Editor to still show the broken YAML for fixing
    res.json({ 
      config, 
      raw, 
      parseError // null if no error, object with {message, line, column} if error
    });
  } catch (error) {
    // Only 500 for file read errors (e.g., file not found)
    console.error('Error reading config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get raw config
router.get('/raw', async (req, res) => {
  try {
    const raw = await getConfigRaw();
    res.json({ raw });
  } catch (error) {
    console.error('Error reading config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update config
router.put('/', async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) {
      return res.status(400).json({ error: 'Config is required' });
    }
    
    await updateConfig(config);
    
    // Give Glance time to reload (500ms debounce + buffer)
    await new Promise(resolve => setTimeout(resolve, 600));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update raw YAML config
router.put('/raw', async (req, res) => {
  try {
    const { raw } = req.body;
    if (!raw) {
      return res.status(400).json({ error: 'Raw config is required' });
    }
    
    await updateConfig(raw, true);
    
    // Give Glance time to reload
    await new Promise(resolve => setTimeout(resolve, 600));
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
