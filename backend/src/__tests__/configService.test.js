import {
  describe,
  it,
  expect,
  afterAll,
  beforeEach,
  vi,
  beforeAll,
} from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_CONFIG_PATH = path.join(__dirname, 'service-test-config.yml');

const sampleConfig = `pages:
  - name: Home
    columns:
      - size: full
        widgets:
          - type: clock
            hour-format: "24h"
`;

// Variables to hold dynamically imported functions
let getConfig,
  getConfigRaw,
  updateConfig,
  configExists,
  createInitialBackupIfNeeded;

describe('configService', () => {
  beforeAll(async () => {
    // Set the config path before importing the service
    process.env.CONFIG_PATH = TEST_CONFIG_PATH;

    // Clear module cache
    vi.resetModules();

    // Dynamic import to ensure env var is set
    const service = await import('../services/configService.js');
    getConfig = service.getConfig;
    getConfigRaw = service.getConfigRaw;
    updateConfig = service.updateConfig;
    configExists = service.configExists;
    createInitialBackupIfNeeded = service.createInitialBackupIfNeeded;
  });

  beforeEach(async () => {
    await fs.writeFile(TEST_CONFIG_PATH, sampleConfig, 'utf8');
  });

  afterAll(async () => {
    try {
      await fs.unlink(TEST_CONFIG_PATH);
      await fs.unlink(`${TEST_CONFIG_PATH}.tmp`).catch(() => {});
      await fs.unlink(`${TEST_CONFIG_PATH}.backup`).catch(() => {});
      // Clean up initial backup too
      const configDir = path.dirname(TEST_CONFIG_PATH);
      const configName = path.basename(
        TEST_CONFIG_PATH,
        path.extname(TEST_CONFIG_PATH),
      );
      await fs
        .unlink(path.join(configDir, `${configName}.initial.backup`))
        .catch(() => {});
    } catch (err) {
      // Ignore cleanup errors
    }
  });

  describe('getConfig', () => {
    it('returns parsed config object with no parseError', async () => {
      const result = await getConfig();

      expect(result).toBeDefined();
      expect(result.config).toBeDefined();
      expect(result.parseError).toBeNull();
      expect(result.config.pages).toHaveLength(1);
      expect(result.config.pages[0].name).toBe('Home');
      expect(result.config.pages[0].columns[0].widgets[0].type).toBe('clock');
    });

    it('returns parseError with line info for invalid YAML', async () => {
      const invalidYaml = `pages:
  - name: Home
    columns:
      - size: full
        widgets:
          - type: clock
            invalid: [unclosed bracket
`;
      await fs.writeFile(TEST_CONFIG_PATH, invalidYaml, 'utf8');

      const result = await getConfig();

      expect(result.config).toBeNull();
      expect(result.parseError).toBeDefined();
      expect(result.parseError.message).toBeDefined();
      expect(result.parseError.name).toBe('YAMLParseError');
    });

    it('returns parseError for completely malformed YAML', async () => {
      const malformedYaml = '{{{invalid yaml:::';
      await fs.writeFile(TEST_CONFIG_PATH, malformedYaml, 'utf8');

      const result = await getConfig();

      expect(result.config).toBeNull();
      expect(result.parseError).toBeDefined();
      expect(typeof result.parseError.message).toBe('string');
    });
  });

  describe('getConfigRaw', () => {
    it('returns raw YAML string', async () => {
      const raw = await getConfigRaw();

      expect(typeof raw).toBe('string');
      expect(raw).toContain('pages:');
      expect(raw).toContain('Home');
      expect(raw).toContain('clock');
    });
  });

  describe('updateConfig', () => {
    it('updates config from object', async () => {
      const newConfig = {
        pages: [
          {
            name: 'Updated',
            columns: [{ size: 'full', widgets: [] }],
          },
        ],
      };

      await updateConfig(newConfig);

      const content = await fs.readFile(TEST_CONFIG_PATH, 'utf8');
      const parsed = YAML.parse(content);

      expect(parsed.pages[0].name).toBe('Updated');
    });

    it('updates config from raw YAML string', async () => {
      const newRaw = `pages:
  - name: Raw Update
    columns:
      - size: full
        widgets: []
`;

      await updateConfig(newRaw, true);

      const content = await fs.readFile(TEST_CONFIG_PATH, 'utf8');
      expect(content).toContain('Raw Update');
    });

    it('creates backup before updating', async () => {
      const newConfig = { pages: [{ name: 'Test', columns: [] }] };

      await updateConfig(newConfig);

      const backupExists = await fs
        .access(`${TEST_CONFIG_PATH}.backup`)
        .then(() => true)
        .catch(() => false);

      expect(backupExists).toBe(true);

      const backupContent = await fs.readFile(
        `${TEST_CONFIG_PATH}.backup`,
        'utf8',
      );
      expect(backupContent).toContain('Home'); // Original content
    });
  });

  describe('configExists', () => {
    it('returns true when config exists', async () => {
      const exists = await configExists();
      expect(exists).toBe(true);
    });
  });

  describe('createInitialBackupIfNeeded', () => {
    const configDir = path.dirname(TEST_CONFIG_PATH);
    const configName = path.basename(
      TEST_CONFIG_PATH,
      path.extname(TEST_CONFIG_PATH),
    );
    const initialBackupPath = path.join(
      configDir,
      `${configName}.initial.backup`,
    );

    beforeEach(async () => {
      // Remove initial backup if it exists
      await fs.unlink(initialBackupPath).catch(() => {});
    });

    it('creates initial backup when it does not exist', async () => {
      const result = await createInitialBackupIfNeeded();

      expect(result).toBe(true);

      const backupExists = await fs
        .access(initialBackupPath)
        .then(() => true)
        .catch(() => false);
      expect(backupExists).toBe(true);

      // Verify backup content matches original
      const backupContent = await fs.readFile(initialBackupPath, 'utf8');
      expect(backupContent).toContain('Home');
    });

    it('does not overwrite existing initial backup', async () => {
      // Create an initial backup with different content
      await fs.writeFile(initialBackupPath, 'existing backup content', 'utf8');

      const result = await createInitialBackupIfNeeded();

      expect(result).toBe(false);

      // Verify the existing backup was not overwritten
      const backupContent = await fs.readFile(initialBackupPath, 'utf8');
      expect(backupContent).toBe('existing backup content');
    });
  });

  describe('deactivated widgets', () => {
    it('comments out deactivated widgets when saving', async () => {
      const config = {
        pages: [
          {
            name: 'Home',
            columns: [
              {
                size: 'full',
                widgets: [
                  { type: 'clock', title: 'Active Clock' },
                  { type: 'weather', title: 'Deactivated Weather', _deactivated: true },
                ],
              },
            ],
          },
        ],
      };

      await updateConfig(config);

      const content = await fs.readFile(TEST_CONFIG_PATH, 'utf8');
      
      // Active widget should be in normal YAML
      expect(content).toContain('type: clock');
      expect(content).toContain('title: Active Clock');
      
      // Deactivated widget should be in a base64-encoded comment
      expect(content).toContain('# DEACTIVATED_WIDGET_BASE64:');
      
      // _deactivated flag should not appear in output
      expect(content).not.toContain('_deactivated');
      
      // The deactivated widget data should NOT appear as plain text
      expect(content).not.toContain('Deactivated Weather');
    });

    it('restores deactivated widgets when loading', async () => {
      // Create a config with a deactivated widget (base64 encoded)
      const deactivatedWidget = { type: 'weather', title: 'Deactivated Weather' };
      const encoded = Buffer.from(JSON.stringify(deactivatedWidget)).toString('base64');
      
      const yamlWithComments = `pages:
  - name: Home
    columns:
      - size: full
        widgets:
          - type: clock
            title: Active Clock
          # DEACTIVATED_WIDGET_BASE64: ${encoded}
`;
      await fs.writeFile(TEST_CONFIG_PATH, yamlWithComments, 'utf8');

      const { config } = await getConfig();

      expect(config.pages[0].columns[0].widgets).toHaveLength(2);
      expect(config.pages[0].columns[0].widgets[0].type).toBe('clock');
      expect(config.pages[0].columns[0].widgets[0]._deactivated).toBeUndefined();
      expect(config.pages[0].columns[0].widgets[1].type).toBe('weather');
      expect(config.pages[0].columns[0].widgets[1]._deactivated).toBe(true);
    });

    it('roundtrips deactivated widgets correctly', async () => {
      const config = {
        pages: [
          {
            name: 'Home',
            columns: [
              {
                size: 'full',
                widgets: [
                  { type: 'widget1', _deactivated: true },
                  { type: 'widget2' },
                  { type: 'widget3', _deactivated: true },
                  { type: 'widget4' },
                ],
              },
            ],
          },
        ],
      };

      await updateConfig(config);
      const { config: loadedConfig } = await getConfig();

      const widgets = loadedConfig.pages[0].columns[0].widgets;
      expect(widgets).toHaveLength(4);
      expect(widgets[0].type).toBe('widget1');
      expect(widgets[0]._deactivated).toBe(true);
      expect(widgets[1].type).toBe('widget2');
      expect(widgets[1]._deactivated).toBeUndefined();
      expect(widgets[2].type).toBe('widget3');
      expect(widgets[2]._deactivated).toBe(true);
      expect(widgets[3].type).toBe('widget4');
      expect(widgets[3]._deactivated).toBeUndefined();
    });

    it('handles all widgets being deactivated', async () => {
      const config = {
        pages: [
          {
            name: 'Home',
            columns: [
              {
                size: 'full',
                widgets: [
                  { type: 'clock', _deactivated: true },
                ],
              },
            ],
          },
        ],
      };

      await updateConfig(config);
      const { config: loadedConfig } = await getConfig();

      const widgets = loadedConfig.pages[0].columns[0].widgets;
      expect(widgets).toHaveLength(1);
      expect(widgets[0].type).toBe('clock');
      expect(widgets[0]._deactivated).toBe(true);
    });

    it('handles deactivated widgets with complex properties', async () => {
      const config = {
        pages: [
          {
            name: 'Home',
            columns: [
              {
                size: 'full',
                widgets: [
                  { 
                    type: 'rss', 
                    feeds: [
                      { url: 'https://example.com/feed', title: 'Example' }
                    ],
                    style: 'detailed-list',
                    _deactivated: true 
                  },
                ],
              },
            ],
          },
        ],
      };

      await updateConfig(config);
      const { config: loadedConfig } = await getConfig();

      const widgets = loadedConfig.pages[0].columns[0].widgets;
      expect(widgets).toHaveLength(1);
      expect(widgets[0].type).toBe('rss');
      expect(widgets[0].feeds).toEqual([{ url: 'https://example.com/feed', title: 'Example' }]);
      expect(widgets[0].style).toBe('detailed-list');
      expect(widgets[0]._deactivated).toBe(true);
    });
  });
});
