import { Router } from 'express';
import { getConfig, updateConfig, getConfigRaw } from '../services/configService.js';

const router = Router();

// Get current config (parsed)
router.get('/', async (req, res) => {
  try {
    const config = await getConfig();
    const raw = await getConfigRaw();
    res.json({ config, raw });
  } catch (error) {
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
