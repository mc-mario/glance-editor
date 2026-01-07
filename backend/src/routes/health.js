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

export default router;
