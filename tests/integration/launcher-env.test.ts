/**
 * Launcher Environment Integration Tests
 *
 * Integration tests verifying complete environment setup flow for Claude Code.
 */

import { spawn } from 'child_process';
jest.mock('child_process');

import { ClaudeLauncher } from '../../src/launcher';
import { createMockChildProcess, mockSpawn, resetChildProcessMocks } from '../mocks/child_process.mock';

describe('Launcher Environment Integration', () => {
  let launcher: ClaudeLauncher;

  beforeEach(() => {
    launcher = new ClaudeLauncher();
    jest.clearAllMocks();
    resetChildProcessMocks();

    // Clean up any test environment variables
    delete (process.env as any).EXISTING_VAR;
    delete (process.env as any).CUSTOM_VAR;
    delete (process.env as any).ANTHROPIC_AUTH_TOKEN;
    delete (process.env as any).ANTHROPIC_THINKING_MODEL;

    // Mock console methods to reduce noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    // Clean up any test environment variables
    delete (process.env as any).EXISTING_VAR;
    delete (process.env as any).CUSTOM_VAR;
    delete (process.env as any).ANTHROPIC_AUTH_TOKEN;

    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('Complete Environment Setup Flow', () => {
    it('should create complete environment for a typical launch', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      // Simulate a typical launch flow
      const result = await launcher.launchClaudeCode({
        model: 'anthropic/claude-sonnet-4-20250514',
        thinkingModel: 'deepseek/deepseek-r1',
        maxTokenSize: 200000,
        additionalArgs: ['--workdir', '/home/user/project'],
        env: {
          ANTHROPIC_AUTH_TOKEN: 'sk-test-key',
        },
      });

      expect(result.success).toBe(true);
      expect(result.pid).toBe(1234);

      // Verify all expected environment variables
      const spawnCall = mockSpawn.mock.calls[0];
      const env = spawnCall[2].env;

      // Verify base URL
      expect(env.ANTHROPIC_BASE_URL).toBe('https://api.synthetic.new/anthropic');

      // Verify model variables - all should be set to the selected model
      const modelId = 'anthropic/claude-sonnet-4-20250514';
      expect(env.ANTHROPIC_DEFAULT_MODEL).toBe(modelId);
      expect(env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe(modelId);
      expect(env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe(modelId);
      expect(env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe(modelId);
      expect(env.ANTHROPIC_DEFAULT_HF_MODEL).toBe(modelId);
      expect(env.CLAUDE_CODE_SUBAGENT_MODEL).toBe(modelId);

      // Verify thinking model
      expect(env.ANTHROPIC_THINKING_MODEL).toBe('deepseek/deepseek-r1');

      // Verify max token size
      expect(env.CLAUDE_CODE_MAX_TOKEN_SIZE).toBe('200000');

      // Verify auth token from custom env
      expect(env.ANTHROPIC_AUTH_TOKEN).toBe('sk-test-key');

      // Verify other settings
      expect(env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).toBe('1');

      // Verify args
      expect(spawnCall[1]).toEqual(['--workdir', '/home/user/project']);
    });

    it('should handle launch without thinking model', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      await launcher.launchClaudeCode({
        model: 'anthropic/claude-sonnet-4-20250514',
        maxTokenSize: 128000,
        env: {
          ANTHROPIC_AUTH_TOKEN: 'sk-test-key',
        },
      });

      const spawnCall = mockSpawn.mock.calls[0];
      const env = spawnCall[2].env;

      expect(env.ANTHROPIC_DEFAULT_MODEL).toBe('anthropic/claude-sonnet-4-20250514');
      expect(env.ANTHROPIC_THINKING_MODEL).toBeUndefined();
    });

    it('should handle launch without additional args', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      await launcher.launchClaudeCode({
        model: 'anthropic/claude-sonnet-4-20250514',
        env: {
          ANTHROPIC_AUTH_TOKEN: 'sk-test-key',
        },
      });

      const spawnCall = mockSpawn.mock.calls[0];

      expect(spawnCall[1]).toEqual([]);
    });
  });

  describe('Environment Variable Merging', () => {
    it('should merge process.env, launcher env, and options.env', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      (process.env as any).EXISTING_VAR = 'existing-value';

      await launcher.launchClaudeCode({
        model: 'test-model',
        env: {
          CUSTOM_VAR: 'custom-value',
        },
      });

      const spawnCall = mockSpawn.mock.calls[0];
      const env = spawnCall[2].env;

      // From process.env
      expect(env.EXISTING_VAR).toBe('existing-value');
      // From launcher
      expect(env.ANTHROPIC_BASE_URL).toBe('https://api.synthetic.new/anthropic');
      // From options.env
      expect(env.CUSTOM_VAR).toBe('custom-value');
    });

    it('should allow options.env to override launcher defaults', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      await launcher.launchClaudeCode({
        model: 'test-model',
        env: {
          ANTHROPIC_BASE_URL: 'https://custom-endpoint.com',
        },
      });

      const spawnCall = mockSpawn.mock.calls[0];
      const env = spawnCall[2].env;

      expect(env.ANTHROPIC_BASE_URL).toBe('https://custom-endpoint.com');
    });

    it('should preserve all critical Claude environment variables', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      const modelId = 'anthropic/claude-sonnet-4-20250514';
      await launcher.launchClaudeCode({
        model: modelId,
        thinkingModel: 'deepseek/deepseek-r1',
        maxTokenSize: 200000,
      });

      const spawnCall = mockSpawn.mock.calls[0];
      const env = spawnCall[2].env;

      // All model variables
      expect(env.ANTHROPIC_DEFAULT_MODEL).toBe(modelId);
      expect(env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe(modelId);
      expect(env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe(modelId);
      expect(env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe(modelId);
      expect(env.ANTHROPIC_DEFAULT_HF_MODEL).toBe(modelId);
      expect(env.CLAUDE_CODE_SUBAGENT_MODEL).toBe(modelId);

      // Thinking model
      expect(env.ANTHROPIC_THINKING_MODEL).toBe('deepseek/deepseek-r1');

      // Token size
      expect(env.CLAUDE_CODE_MAX_TOKEN_SIZE).toBe('200000');

      // Base URL
      expect(env.ANTHROPIC_BASE_URL).toBe('https://api.synthetic.new/anthropic');

      // Traffic disabled
      expect(env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).toBe('1');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle typical Anthropic model launch', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      await launcher.launchClaudeCode({
        model: 'anthropic/claude-sonnet-4-20250514',
        env: {
          ANTHROPIC_AUTH_TOKEN: 'sk-ant-test-key',
        },
      });

      const spawnCall = mockSpawn.mock.calls[0];
      const env = spawnCall[2].env;

      expect(env.ANTHROPIC_AUTH_TOKEN).toBe('sk-ant-test-key');
      expect(env.ANTHROPIC_DEFAULT_MODEL).toBe('anthropic/claude-sonnet-4-20250514');
    });

    it('should handle DeepSeek R1 thinking model launch', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      await launcher.launchClaudeCode({
        model: 'deepseek/deepseek-r1',
        env: {
          ANTHROPIC_AUTH_TOKEN: 'sk-test-key',
        },
      });

      const spawnCall = mockSpawn.mock.calls[0];
      const env = spawnCall[2].env;

      expect(env.ANTHROPIC_DEFAULT_MODEL).toBe('deepseek/deepseek-r1');
      expect(env.ANTHROPIC_THINKING_MODEL).toBeUndefined();
    });

    it('should handle dual model setup (regular + thinking)', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      await launcher.launchClaudeCode({
        model: 'anthropic/claude-sonnet-4-20250514',
        thinkingModel: 'deepseek/deepseek-r1',
        env: {
          ANTHROPIC_AUTH_TOKEN: 'sk-test-key',
        },
      });

      const spawnCall = mockSpawn.mock.calls[0];
      const env = spawnCall[2].env;

      expect(env.ANTHROPIC_DEFAULT_MODEL).toBe('anthropic/claude-sonnet-4-20250514');
      expect(env.ANTHROPIC_THINKING_MODEL).toBe('deepseek/deepseek-r1');
    });

    it('should handle CLI flags passed through', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      await launcher.launchClaudeCode({
        model: 'anthropic/claude-sonnet-4-20250514',
        additionalArgs: [
          '--workdir',
          '/home/user/project',
          '--verbose',
          '--dangerously-skip-permissions',
        ],
      });

      const spawnCall = mockSpawn.mock.calls[0];

      expect(spawnCall[1]).toEqual([
        '--workdir',
        '/home/user/project',
        '--verbose',
        '--dangerously-skip-permissions',
      ]);
    });

    it('should handle custom token size', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      await launcher.launchClaudeCode({
        model: 'anthropic/claude-sonnet-4-20250514',
        maxTokenSize: 200000,
      });

      const spawnCall = mockSpawn.mock.calls[0];
      const env = spawnCall[2].env;

      expect(env.CLAUDE_CODE_MAX_TOKEN_SIZE).toBe('200000');
    });

    it('should handle minimum token size', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      await launcher.launchClaudeCode({
        model: 'anthropic/claude-sonnet-4-20250514',
        maxTokenSize: 1000,
      });

      const spawnCall = mockSpawn.mock.calls[0];
      const env = spawnCall[2].env;

      expect(env.CLAUDE_CODE_MAX_TOKEN_SIZE).toBe('1000');
    });

    it('should handle maximum token size', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      await launcher.launchClaudeCode({
        model: 'anthropic/claude-sonnet-4-20250514',
        maxTokenSize: 200000,
      });

      const spawnCall = mockSpawn.mock.calls[0];
      const env = spawnCall[2].env;

      expect(env.CLAUDE_CODE_MAX_TOKEN_SIZE).toBe('200000');
    });

    it('should default to 128000 token size when not specified', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      await launcher.launchClaudeCode({
        model: 'anthropic/claude-sonnet-4-20250514',
      });

      const spawnCall = mockSpawn.mock.calls[0];
      const env = spawnCall[2].env;

      expect(env.CLAUDE_CODE_MAX_TOKEN_SIZE).toBe('128000');
    });
  });

  describe('Spawn Configuration', () => {
    it('should use stdio inherit for interactive terminal', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      await launcher.launchClaudeCode({ model: 'test-model' });

      const spawnCall = mockSpawn.mock.calls[0][2];

      expect(spawnCall.stdio).toBe('inherit');
    });

    it('should use correct spawn arguments format', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      await launcher.launchClaudeCode({ model: 'test-model' });

      const spawnCall = mockSpawn.mock.calls[0];

      expect(spawnCall[0]).toBe('claude'); // command
      expect(Array.isArray(spawnCall[1])).toBe(true); // args array
      expect(typeof spawnCall[2]).toBe('object'); // options object
    });

    it('should pass additional args in correct order', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      const args = ['--arg1', 'value1', '--arg2', 'value2'];
      await launcher.launchClaudeCode({
        model: 'test-model',
        additionalArgs: args,
      });

      const spawnCall = mockSpawn.mock.calls[0];

      expect(spawnCall[1]).toEqual(args);
    });
  });

  describe('Model ID Format Handling', () => {
    it('should handle simple model IDs', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      await launcher.launchClaudeCode({ model: 'claude-sonnet-4' });

      const spawnCall = mockSpawn.mock.calls[0][2];
      expect(spawnCall.env.ANTHROPIC_DEFAULT_MODEL).toBe('claude-sonnet-4');
    });

    it('should handle provider/model format', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      await launcher.launchClaudeCode({ model: 'anthropic/claude-sonnet-4-20250514' });

      const spawnCall = mockSpawn.mock.calls[0][2];
      expect(spawnCall.env.ANTHROPIC_DEFAULT_MODEL).toBe('anthropic/claude-sonnet-4-20250514');
    });

    it('should handle deep thinking model IDs', async () => {
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      await launcher.launchClaudeCode({ model: 'deepseek/deepseek-r1' });

      const spawnCall = mockSpawn.mock.calls[0][2];
      expect(spawnCall.env.ANTHROPIC_DEFAULT_MODEL).toBe('deepseek/deepseek-r1');
    });
  });
});
