/**
 * Full-Config Capturer Tests
 *
 * Unit tests for the config capturer functionality
 */

import { ConfigCapturer } from '@/full-config/capturer';
import { mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

describe('ConfigCapturer', () => {
  let tempDir: string;
  let anthropicHome: string;
  let synpickHome: string;

  beforeEach(() => {
    tempDir = tmpdir() + `/synpick-capturer-test-${Date.now()}`;
    anthropicHome = tmpdir() + `/anthropic-${Date.now()}`;
    synpickHome = tmpdir() + `/synpick-${Date.now()}`;
  });

  afterEach(async () => {
    try {
      await rm(tempDir, { recursive: true, force: true });
      await rm(anthropicHome, { recursive: true, force: true });
      await rm(synpickHome, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  async function createTempDirs() {
    await mkdir(anthropicHome, { recursive: true });
    await mkdir(synpickHome, { recursive: true });
  }

  describe('capture', () => {
    it('should capture minimal config with name', async () => {
      const capturer = new ConfigCapturer();
      const config = await capturer.capture('Test Config');
      expect(config.version).toBe('1');
      expect(config.name).toBe('Test Config');
    });

    it('should capture config with description', async () => {
      const capturer = new ConfigCapturer();
      const config = await capturer.capture('Test Config', {
        description: 'A test configuration',
      });
      expect(config.description).toBe('A test configuration');
    });

    it('should capture synpick settings from custom home directory', async () => {
      await createTempDirs();

      await writeFile(
        join(synpickHome, 'config.json'),
        JSON.stringify({
          selectedModel: 'hf:test/model',
          systemPrompt: 'You are helpful',
          models: {
            thinking: 'hf:thinking/model',
            fast: 'hf:fast/model',
          },
        })
      );

      // Create custom capturer with mocked home
      const customCapturer = new (ConfigCapturer as any)();
      Object.assign(customCapturer, {
        anthropicHome,
        synpickHome,
      });

      const config: any = await customCapturer.capture('Test Config');
      expect(config.synpick).toBeDefined();
      expect(config.synpick?.selectedModel).toBe('hf:test/model');
      expect(config.synpick?.systemPrompt).toBe('You are helpful');
      expect(config.synpick?.models).toBeDefined();
      expect(config.synpick?.models?.thinking).toBe('hf:thinking/model');
    });

    it('should NOT include API key when includeApiKey is false', async () => {
      await createTempDirs();

      await writeFile(
        join(synpickHome, 'config.json'),
        JSON.stringify({
          apiKey: 'sk-test1234567890abcdef',
          selectedModel: 'hf:test/model',
        })
      );

      const customCapturer = new (ConfigCapturer as any)();
      Object.assign(customCapturer, {
        anthropicHome,
        synpickHome,
      });

      const config: any = await customCapturer.capture('Test Config', {
        includeApiKey: false,
      });
      // API key should NOT be included when includeApiKey is false
      expect(config.synpick?.apiKey).toBeUndefined();
    });

    it('should mask API key when includeApiKey is true', async () => {
      await createTempDirs();

      await writeFile(
        join(synpickHome, 'config.json'),
        JSON.stringify({
          apiKey: 'sk-test1234567890abcdef',
          selectedModel: 'hf:test/model',
        })
      );

      const customCapturer = new (ConfigCapturer as any)();
      Object.assign(customCapturer, {
        anthropicHome,
        synpickHome,
      });

      const config: any = await customCapturer.capture('Test Config', {
        includeApiKey: true,
      });
      expect(config.synpick?.apiKey).toMatch(/^••••[a-f0-9]{4}$/);
      expect(config.synpick?.apiKey).not.toBe('sk-test1234567890abcdef');
    });

    it('should return undefined synpick when config file does not exist', async () => {
      const capturer = new ConfigCapturer();
      const config: any = await capturer.capture('Test Config');
      expect(config.synpick).toBeUndefined();
    });
  });

  describe('toYaml', () => {
    it('should convert config to YAML string', () => {
      const capturer = new ConfigCapturer();
      const config = {
        version: '1' as const,
        name: 'Test Config',
        description: 'Test description',
        synpick: {
          selectedModel: 'hf:test/model',
          systemPrompt: 'You are helpful',
        },
        Claude: {
          channel: 'stable' as const,
        },
      };

      const yaml = capturer.toYaml(config);
      // YAML uses double-quoted strings by default
      expect(yaml).toContain('"version"');
      expect(yaml).toContain('"1"');
      expect(yaml).toContain('"name"');
      expect(yaml).toContain('"synpick"');
      expect(yaml).toContain('"selectedModel"');
      expect(yaml).toContain('"hf:test/model"');
      expect(yaml).toContain('"channel"');
    });

    it('should handle config with MCP servers', () => {
      const capturer = new ConfigCapturer();
      const config = {
        version: '1' as const,
        name: 'Test',
        mcp: {
          filesystem: {
            type: 'builtin' as const,
            enabled: true,
          },
        },
      };

      const yaml = capturer.toYaml(config);
      expect(yaml).toContain('"mcp"');
      expect(yaml).toContain('"filesystem"');
      expect(yaml).toContain('"type"');
      expect(yaml).toContain('"builtin"');
    });

    it('should handle config with skills', () => {
      const capturer = new ConfigCapturer();
      const config = {
        version: '1' as const,
        name: 'Test',
        skills: [
          {
            name: 'test-skill',
            url: 'https://github.com/test/skill',
            enabled: true,
          },
        ],
      };

      const yaml = capturer.toYaml(config);
      expect(yaml).toContain('"skills"');
      expect(yaml).toContain('"name"');
      expect(yaml).toContain('"test-skill"');
      expect(yaml).toContain('"url"');
    });

    it('should handle config with Claude settings', () => {
      const capturer = new ConfigCapturer();
      const config = {
        version: '1' as const,
        name: 'Test',
        settings: {
          theme: 'dark' as const,
          disableTelemetry: true,
          autoUpdate: false,
        },
      };

      const yaml = capturer.toYaml(config);
      expect(yaml).toContain('"settings"');
      expect(yaml).toContain('"theme"');
      expect(yaml).toContain('"dark"');
      expect(yaml).toContain('"disableTelemetry"');
      expect(yaml).toContain('true');
    });
  });
});
