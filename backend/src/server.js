import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import path from 'path';
import configRouter from './routes/config.js';
import healthRouter from './routes/health.js';
import { createWebSocketServer } from './services/websocket.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Serve static frontend files in production
  const publicPath = path.join(__dirname, '../public');
  app.use(express.static(publicPath));

  // API routes
  app.use('/api/config', configRouter);
  app.use('/api', healthRouter);

  // Fallback to index.html for SPA routing
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.sendFile(path.join(publicPath, 'index.html'));
  });

  return app;
}

export function startServer(port = process.env.EDITOR_PORT || 8081) {
  const app = createApp();
  
  const server = app.listen(port, () => {
    console.log(`Glance Editor running on port ${port}`);
    console.log(`Config path: ${process.env.CONFIG_PATH || '/app/config/glance.yml'}`);
    console.log(`Glance URL: ${process.env.GLANCE_URL || 'http://localhost:8080'}`);
  });

  // Set up WebSocket server for live updates
  createWebSocketServer(server);

  return server;
}

// Start server if this is the main module
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer();
}
