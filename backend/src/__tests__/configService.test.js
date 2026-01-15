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
});
