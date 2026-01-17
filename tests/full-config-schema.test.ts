/**
 * Full-Config Schema Tests
 *
 * Unit tests for the full-config schema validation
 */

import {
  SynpickConfigSchema,
  ClaudeCodeConfigSchema,
  McpConfigSchema,
  SkillConfigSchema,
  ClaudeSettingsSchema,
  ContinuousConfigSchema,
  ConfigValidationError,
} from '@/full-config/schema';
import { z } from 'zod';

describe('SynpickConfigSchema', () => {
  describe('ClaudeCodeConfigSchema', () => {
    it('should validate valid Claude Code config', () => {
      const result = ClaudeCodeConfigSchema.safeParse({
        channel: 'stable',
        version: '1.0.0',
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid channels', () => {
      ['stable', 'beta', 'canary'].forEach(channel => {
        const result = ClaudeCodeConfigSchema.safeParse({ channel: channel as any });
        expect(result.success).toBe(true);
      });
    });

    it('should default to stable channel', () => {
      const result = ClaudeCodeConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.channel).toBe('stable');
      }
    });

    it('should reject invalid channel', () => {
      const result = ClaudeCodeConfigSchema.safeParse({ channel: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('McpServerPackageSchema', () => {
    it('should validate npm MCP server', () => {
      const result = McpConfigSchema.safeParse({
        myServer: {
          type: 'npm',
          package: '@anthropic-ai/mcp-server-filesystem',
          enabled: true,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should validate command MCP server', () => {
      const result = McpConfigSchema.safeParse({
        myServer: {
          type: 'command',
          command: 'python3',
          args: ['-m', 'my_mcp_server'],
          enabled: true,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should validate builtin MCP server', () => {
      const result = McpConfigSchema.safeParse({
        filesystem: {
          type: 'builtin',
          enabled: true,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should validate go MCP server', () => {
      const result = McpConfigSchema.safeParse({
        myServer: {
          type: 'go',
          package: 'github.com/example/mcp-server',
          enabled: true,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should validate python MCP server', () => {
      const result = McpConfigSchema.safeParse({
        myServer: {
          type: 'python',
          package: 'my-mcp-server',
          enabled: true,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should default enabled to true', () => {
      const result = McpConfigSchema.safeParse({
        myServer: {
          type: 'builtin',
        },
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.myServer.enabled).toBe(true);
      }
    });
  });

  describe('SkillConfigSchema', () => {
    it('should validate skill with URL', () => {
      const result = SkillConfigSchema.safeParse({
        name: 'my-skill',
        url: 'https://github.com/example/skill',
        enabled: true,
      });
      expect(result.success).toBe(true);
    });

    it('should validate skill with file path', () => {
      const result = SkillConfigSchema.safeParse({
        name: 'my-skill',
        file: '/path/to/skill.ts',
        enabled: true,
      });
      expect(result.success).toBe(true);
    });

    it('should validate skill with just name', () => {
      const result = SkillConfigSchema.safeParse({
        name: 'my-skill',
      });
      expect(result.success).toBe(true);
    });

    it('should default enabled to true', () => {
      const result = SkillConfigSchema.safeParse({
        name: 'my-skill',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(true);
      }
    });

    it('should reject invalid URL', () => {
      const result = SkillConfigSchema.safeParse({
        name: 'my-skill',
        url: 'invalid-url',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('ClaudeSettingsSchema', () => {
    it('should validate Claude settings', () => {
      const result = ClaudeSettingsSchema.safeParse({
        theme: 'dark',
        disableTelemetry: true,
        autoUpdate: false,
        maxHistorySize: 100,
      });
      expect(result.success).toBe(true);
    });

    it('should accept valid themes', () => {
      ['light', 'dark', 'system'].forEach(theme => {
        const result = ClaudeSettingsSchema.safeParse({ theme: theme as any });
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid theme', () => {
      const result = ClaudeSettingsSchema.safeParse({ theme: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('ContinuousConfigSchema', () => {
    it('should validate continuous config', () => {
      const result = ContinuousConfigSchema.safeParse({
        enabled: true,
        version: '3.0.0',
      });
      expect(result.success).toBe(true);
    });

    it('should default enabled to false', () => {
      const result = ContinuousConfigSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.enabled).toBe(false);
      }
    });
  });

  describe('SynpickConfigSchema', () => {
    it('should validate minimal config', () => {
      const result = SynpickConfigSchema.safeParse({
        name: 'My Config',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('My Config');
      }
    });

    it('should validate complete config', () => {
      const result = SynpickConfigSchema.safeParse({
        version: '1',
        name: 'My Config',
        description: 'Test configuration',
        Claude: {
          channel: 'stable',
          version: '1.0.0',
        },
        mcp: {
          filesystem: {
            type: 'builtin',
            enabled: true,
          },
        },
        skills: [
          {
            name: 'test-skill',
            url: 'https://github.com/test/skill',
            enabled: true,
          },
        ],
        continuous: {
          enabled: false,
        },
        settings: {
          theme: 'dark',
          disableTelemetry: false,
        },
        synpick: {
          model: 'hf:test/model',
          apiKey: 'test-key',
          systemPrompt: 'You are helpful',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept version as number', () => {
      const result = SynpickConfigSchema.safeParse({
        name: 'Test',
        version: 1,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.version).toBe('string');
        expect(result.data.version).toBe('1');
      }
    });

    it('should accept null for skills and scripts', () => {
      const result = SynpickConfigSchema.safeParse({
        name: 'Test',
        skills: null,
        scripts: null,
      });
      expect(result.success).toBe(true);
    });

    it('should require name', () => {
      const result = SynpickConfigSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('should default version to string', () => {
      const result = SynpickConfigSchema.safeParse({
        name: 'Test',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.version).toBe('1');
      }
    });

    it('should validate synpick model field', () => {
      const result = SynpickConfigSchema.safeParse({
        name: 'Test',
        synpick: {
          model: 'hf:test/model',
        },
      });
      expect(result.success).toBe(true);
    });
  });
});
