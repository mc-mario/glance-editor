import { WebSocketServer } from 'ws';
import chokidar from 'chokidar';
import { getConfigPath } from './configService.js';

let wss = null;
let watcher = null;

/**
 * Create WebSocket server for live config updates
 */
export function createWebSocketServer(server) {
  wss = new WebSocketServer({ server, path: '/ws' });
  
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
    
    ws.on('error', (err) => {
      console.error('WebSocket error:', err);
    });
  });
  
  // Set up file watcher for config changes
  setupFileWatcher();
  
  return wss;
}

/**
 * Set up file watcher for config changes
 */
function setupFileWatcher() {
  const configPath = getConfigPath();
  
  watcher = chokidar.watch(configPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
  });
  
  watcher.on('change', (path) => {
    console.log(`Config file changed: ${path}`);
    broadcast({ type: 'config-changed', path });
  });
  
  watcher.on('error', (err) => {
    console.error('File watcher error:', err);
  });
}

/**
 * Broadcast message to all connected clients
 */
export function broadcast(message) {
  if (!wss) return;
  
  const data = JSON.stringify(message);
  
  wss.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      client.send(data);
    }
  });
}

/**
 * Close WebSocket server and file watcher
 */
export function closeWebSocketServer() {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
  
  if (wss) {
    wss.close();
    wss = null;
  }
}
