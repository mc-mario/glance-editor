import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_CONFIG_PATH = path.join(__dirname, 'test-config.yml');

const sampleConfig = `pages:
  - name: Home
    columns:
      - size: full
        widgets:
          - type: clock
            hour-format: "24h"
`;

describe('Health API', () => {
  let app;

  beforeAll(async () => {
    // Set env before importing
    process.env.CONFIG_PATH = TEST_CONFIG_PATH;
    const { createApp } = await import('../server.js');
    app = createApp();
  });

  it('GET /api/health returns ok status', async () => {
    const res = await request(app).get('/api/health');
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });

  it('GET /api/healthz returns ok status', async () => {
    const res = await request(app).get('/api/healthz');
    
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Config API', () => {
  let app;

  beforeAll(async () => {
    // Set env before importing
    process.env.CONFIG_PATH = TEST_CONFIG_PATH;
    
    // Clear module cache to ensure fresh import with new env
    vi.resetModules();
    
    const { createApp } = await import('../server.js');
    app = createApp();
  });

  beforeEach(async () => {
    // Create test config file
    await fs.writeFile(TEST_CONFIG_PATH, sampleConfig, 'utf8');
  });

  afterAll(async () => {
    // Clean up test files
    try {
      await fs.unlink(TEST_CONFIG_PATH);
      await fs.unlink(`${TEST_CONFIG_PATH}.tmp`).catch(() => {});
      await fs.unlink(`${TEST_CONFIG_PATH}.backup`).catch(() => {});
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  it('GET /api/config returns parsed config and raw', async () => {
    const res = await request(app).get('/api/config');
    
    expect(res.status).toBe(200);
    expect(res.body.config).toBeDefined();
    expect(res.body.raw).toBeDefined();
    expect(res.body.config.pages).toHaveLength(1);
    expect(res.body.config.pages[0].name).toBe('Home');
  });

  it('GET /api/config/raw returns raw YAML', async () => {
    const res = await request(app).get('/api/config/raw');
    
    expect(res.status).toBe(200);
    expect(res.body.raw).toBeDefined();
    expect(res.body.raw).toContain('pages:');
    expect(res.body.raw).toContain('Home');
  });

  it('PUT /api/config updates config', async () => {
    const newConfig = {
      pages: [
        {
          name: 'Dashboard',
          columns: [
            {
              size: 'full',
              widgets: [
                { type: 'weather', location: 'New York' }
              ]
            }
          ]
        }
      ]
    };

    const res = await request(app)
      .put('/api/config')
      .send({ config: newConfig });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify the file was updated
    const content = await fs.readFile(TEST_CONFIG_PATH, 'utf8');
    expect(content).toContain('Dashboard');
    expect(content).toContain('weather');
  });

  it('PUT /api/config returns 400 without config', async () => {
    const res = await request(app)
      .put('/api/config')
      .send({});
    
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Config is required');
  });

  it('PUT /api/config/raw updates raw config', async () => {
    const newRaw = `pages:
  - name: Test Page
    columns:
      - size: small
        widgets:
          - type: bookmarks
`;

    const res = await request(app)
      .put('/api/config/raw')
      .send({ raw: newRaw });
    
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify the file was updated
    const content = await fs.readFile(TEST_CONFIG_PATH, 'utf8');
    expect(content).toContain('Test Page');
    expect(content).toContain('bookmarks');
  });
});
