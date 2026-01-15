import { Router } from 'express';

const router = Router();

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Alias for health check
router.get('/healthz', (req, res) => {
  res.json({ status: 'ok' });
});

// Get runtime settings (for frontend to access env vars)
router.get('/settings', (req, res) => {
  res.json({
    glanceUrl: process.env.GLANCE_URL || 'http://localhost:8080',
    configPath: process.env.CONFIG_PATH || '/app/config/glance.yml',
  });
});

export default router;
