/**
 * ClaudeLauncher Tests
 *
 * Tests the launcher's environment variable setup and spawn behavior.
 */

import { spawn } from 'child_process';
jest.mock('child_process');

import { ClaudeLauncher, LaunchOptions, LaunchResult } from '../../src/launcher';
import {
  createMockChildProcess,
  mockSpawn,
  resetChildProcessMocks,
  setupMockSpawnSuccess,
} from '../mocks/child_process.mock';

describe('ClaudeLauncher', () => {
  let launcher: ClaudeLauncher;

  beforeEach(() => {
    launcher = new ClaudeLauncher();
    jest.clearAllMocks();
    resetChildProcessMocks();

    // Clean up any environment variables that might interfere with tests
    delete (process.env as any).EXISTING_VAR;
    delete (process.env as any).CUSTOM_VAR;
    delete (process.env as any).ANTHROPIC_THINKING_MODEL;
  });

  afterEach(() => {
    // Clean up any environment variables we might have set
    delete (process.env as any).EXISTING_VAR;
    delete (process.env as any).CUSTOM_VAR;

    // Restore console methods
    jest.restoreAllMocks();
  });

  describe('Constructor', () => {
    it('should create launcher with default claude path', () => {
      expect(launcher.getClaudePath()).toBe('claude');
    });

    it('should create launcher with custom claude path', () => {
      const customLauncher = new ClaudeLauncher({
        claudePath: '/custom/path/claude',
      });
      expect(customLauncher.getClaudePath()).toBe('/custom/path/claude');
    });
  });

  describe('setClaudePath / getClaudePath', () => {
    it('should set and get claude path', () => {
      launcher.setClaudePath('/new/path/to/claude');
      expect(launcher.getClaudePath()).toBe('/new/path/to/claude');
    });
  });

  describe('launchClaudeCode - Environment Variables', () => {
    it('should set ANTHROPIC_BASE_URL correctly', async () => {
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({ model: 'test-model' });

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_BASE_URL: 'https://api.synthetic.new/anthropic',
          }),
        })
      );
    });

    it('should set all ANTHROPIC_DEFAULT_*_MODEL variables', async () => {
      setupMockSpawnSuccess(1234);

      // Clean up user environment variable that might interfere
      delete process.env.ANTHROPIC_DEFAULT_HF_MODEL;

      const modelId = 'provider/test-model';
      await launcher.launchClaudeCode({ model: modelId });

      // Model ID gets hf: prefix added
      const prefixedModelId = 'hf:provider/test-model';

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_DEFAULT_OPUS_MODEL: prefixedModelId,
            ANTHROPIC_DEFAULT_SONNET_MODEL: prefixedModelId,
            ANTHROPIC_DEFAULT_HAIKU_MODEL: prefixedModelId,
            ANTHROPIC_DEFAULT_MODEL: prefixedModelId,
          }),
        })
      );
    });

    it('should set CLAUDE_CODE_SUBAGENT_MODEL', async () => {
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({ model: 'deepseek/deepseek-r1' });

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          env: expect.objectContaining({
            CLAUDE_CODE_SUBAGENT_MODEL: 'hf:deepseek/deepseek-r1',
          }),
        })
      );
    });

    it('should set CLAUDE_CODE_MAX_TOKEN_SIZE from config', async () => {
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({ model: 'test', maxTokenSize: 64000 });

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          env: expect.objectContaining({
            CLAUDE_CODE_MAX_TOKEN_SIZE: '64000',
          }),
        })
      );
    });

    it('should default maxTokenSize to 128000', async () => {
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({ model: 'test' });

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          env: expect.objectContaining({
            CLAUDE_CODE_MAX_TOKEN_SIZE: '128000',
          }),
        })
      );
    });

    it('should set CLAUDE_CODE_MAX_TOKEN_SIZE as string', async () => {
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({ model: 'test', maxTokenSize: 200000 });

      const spawnCall = mockSpawn.mock.calls[0]![2] as any;
      expect(typeof spawnCall.env.CLAUDE_CODE_MAX_TOKEN_SIZE).toBe('string');
      expect(spawnCall.env.CLAUDE_CODE_MAX_TOKEN_SIZE).toBe('200000');
    });

    it('should set ANTHROPIC_THINKING_MODEL when provided', async () => {
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({
        model: 'regular-model',
        thinkingModel: 'deepseek/deepseek-r1',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          env: expect.objectContaining({
            ANTHROPIC_THINKING_MODEL: 'hf:deepseek/deepseek-r1',
          }),
        })
      );
    });

    it('should NOT set ANTHROPIC_THINKING_MODEL when not provided', async () => {
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({ model: 'regular-model' });

const spawnCall = mockSpawn.mock.calls[0]![2] as any;
      expect(spawnCall.env.ANTHROPIC_THINKING_MODEL).toBeUndefined();
    });

    it('should set CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC', async () => {
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({ model: 'test' });

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          env: expect.objectContaining({
            CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: '1',
          }),
        })
      );
    });

    it('should inherit process.env', async () => {
      (process.env as any).EXISTING_VAR = 'existing-value';
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({ model: 'test' });

const spawnCall = mockSpawn.mock.calls[0]![2] as any;
      expect(spawnCall.env.EXISTING_VAR).toBe('existing-value');
    });

    it('should merge launcher env with options.env', async () => {
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({
        model: 'test',
        env: {
          CUSTOM_VAR: 'custom-value',
        },
      });

const spawnCall = mockSpawn.mock.calls[0]![2] as any;
      expect(spawnCall.env.CUSTOM_VAR).toBe('custom-value');
      expect(spawnCall.env.ANTHROPIC_BASE_URL).toBe('https://api.synthetic.new/anthropic');
    });

    it('should handle all three env sources: process.env, launcher, options.env', async () => {
      (process.env as any).EXISTING_VAR = 'existing-value';
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({
        model: 'test',
        env: {
          CUSTOM_VAR: 'custom-value',
        },
      });

const spawnCall = mockSpawn.mock.calls[0]![2] as any;
      expect(spawnCall.env.EXISTING_VAR).toBe('existing-value'); // From process.env
      expect(spawnCall.env.ANTHROPIC_BASE_URL).toBe('https://api.synthetic.new/anthropic'); // From launcher
      expect(spawnCall.env.CUSTOM_VAR).toBe('custom-value'); // From options.env
    });

    it('should allow options.env to override launcher env', async () => {
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({
        model: 'test',
        env: {
          ANTHROPIC_BASE_URL: 'https://custom-endpoint.com',
        },
      });

const spawnCall = mockSpawn.mock.calls[0]![2] as any;
      expect(spawnCall.env.ANTHROPIC_BASE_URL).toBe('https://custom-endpoint.com');
    });
  });

  describe('launchClaudeCode - Additional Args', () => {
    it('should pass no args when additionalArgs is undefined', async () => {
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({ model: 'test' });

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.any(Object)
      );
    });

    it('should pass additionalArgs to spawn', async () => {
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({
        model: 'test',
        additionalArgs: ['--verbose', '--workdir', '/tmp/project'],
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        ['--verbose', '--workdir', '/tmp/project'],
        expect.any(Object)
      );
    });

    it('should pass single additionalArg', async () => {
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({
        model: 'test',
        additionalArgs: ['--verbose'],
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        ['--verbose'],
        expect.any(Object)
      );
    });

    it('should use custom claudePath when provided globally', async () => {
      setupMockSpawnSuccess(1234);

      launcher.setClaudePath('/custom/claude/path');
      await launcher.launchClaudeCode({ model: 'test' });

      expect(mockSpawn).toHaveBeenCalledWith(
        '/custom/claude/path',
        [],
        expect.any(Object)
      );
    });

    it('should override global claudePath with options.claudePath', async () => {
      setupMockSpawnSuccess(1234);

      launcher.setClaudePath('/global/claude/path');
      await launcher.launchClaudeCode({
        model: 'test',
        claudePath: '/option/claude/path',
      });

      expect(mockSpawn).toHaveBeenCalledWith(
        '/option/claude/path',
        [],
        expect.any(Object)
      );
    });
  });

  describe('launchClaudeCode - stdio Configuration', () => {
    it('should pass stdio inherit for terminal interactivity', async () => {
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({ model: 'test' });

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        [],
        expect.objectContaining({
          stdio: 'inherit',
        })
      );
    });
  });

  describe('launchClaudeCode - Return Values', () => {
    it('should return success=true with pid on successful spawn', async () => {
      setupMockSpawnSuccess(5678);

      const result = await launcher.launchClaudeCode({ model: 'test' });

      expect(result.success).toBe(true);
      expect(result.pid).toBe(5678);
      expect(result.error).toBeUndefined();
    });

    it('should return success=false with error on spawn failure', async () => {
      const mockChild = createMockChildProcess(0, false);
      mockSpawn.mockReturnValue(mockChild as any);

      const result = await launcher.launchClaudeCode({ model: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Spawn failed');
      expect(result.pid).toBeUndefined();
    });
  });

  describe('launchClaudeCode - Error Handling', () => {
    it('should handle spawn exception', async () => {
      // Mock spawn to return a child that errors
      const mockChild = createMockChildProcess(0, false);
      mockSpawn.mockReturnValue(mockChild as any);

      const result = await launcher.launchClaudeCode({ model: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Spawn failed');
    });

    it('should handle any unexpected error', async () => {
      // Mock spawn to return a child that errors
      const mockChild = createMockChildProcess(0, false);
      mockSpawn.mockReturnValue(mockChild as any);

      const result = await launcher.launchClaudeCode({ model: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Spawn failed');
    });

    it('should catch re-thrown errors', async () => {
      // Mock spawn to return a child that errors
      const mockChild = createMockChildProcess(0, false);
      mockSpawn.mockReturnValue(mockChild as any);

      const result = await launcher.launchClaudeCode({ model: 'test' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Spawn failed');
    });
  });

  describe('launchClaudeCode - Complete Environment Output', () => {
    it('should output all expected Claude Code environment variables', async () => {
      setupMockSpawnSuccess(1234);

      await launcher.launchClaudeCode({
        model: 'hf:anthropic/claude-sonnet-4-20250514',
        thinkingModel: 'hf:deepseek/deepseek-r1',
        maxTokenSize: 200000,
      });

const spawnCall = mockSpawn.mock.calls[0]![2] as any;
      const env = spawnCall.env;

      // Verify all ANTHROPIC model variables
      const modelId = 'hf:anthropic/claude-sonnet-4-20250514';
      expect(env.ANTHROPIC_DEFAULT_MODEL).toBe(modelId);
      expect(env.ANTHROPIC_DEFAULT_OPUS_MODEL).toBe(modelId);
      expect(env.ANTHROPIC_DEFAULT_SONNET_MODEL).toBe(modelId);
      expect(env.ANTHROPIC_DEFAULT_HAIKU_MODEL).toBe(modelId);

      // Verify thinking model
      expect(env.ANTHROPIC_THINKING_MODEL).toBe('hf:deepseek/deepseek-r1');

      // Verify subagent model
      expect(env.CLAUDE_CODE_SUBAGENT_MODEL).toBe(modelId);

      // Verify token size
      expect(env.CLAUDE_CODE_MAX_TOKEN_SIZE).toBe('200000');

      // Verify base URL
      expect(env.ANTHROPIC_BASE_URL).toBe('https://api.synthetic.new/anthropic');

      // Verify traffic disabled
      expect(env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC).toBe('1');
    });
  });

  describe('checkClaudeInstallation', () => {
    it('should return true when claude command exists (spawn succeeds)', async () => {
      // Mock spawn to return a successful child process
      const mockChild = createMockChildProcess(1234);
      mockSpawn.mockReturnValue(mockChild as any);

      const result = await launcher.checkClaudeInstallation();

      expect(result).toBe(true);
    });

    it('should return false when claude command fails (spawn errors)', async () => {
      // Mock spawn to return a child that errors immediately
      const mockChild = {
        pid: 1234,
        stdout: {
          on: jest.fn(),
        },
        stderr: {
          on: jest.fn(),
        },
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            setImmediate(() => callback(new Error('Command not found')));
          }
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockChild as any);

      const result = await launcher.checkClaudeInstallation();

      expect(result).toBe(false);
    });
  });

  describe('getClaudeVersion', () => {
    it('should return version string from output', async () => {
      // Create a mock child process that emits version output
      const mockChild = {
        pid: 1234,
        stdout: {
          on: jest.fn((event, callback) => {
            if (event === 'data') {
              callback('claude 2.0.76\n');
            }
          }),
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setImmediate(() => callback(0));
          }
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockChild as any);

      const version = await launcher.getClaudeVersion();
      expect(version).toBe('2.0.76');
    });

    it('should return null when version cannot be parsed', async () => {
      const mockChild = {
        pid: 1234,
        stdout: {
          on: jest.fn(),
        },
        on: jest.fn((event, callback) => {
          if (event === 'close') {
            setImmediate(() => callback(0));
          }
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockChild as any);

      const version = await launcher.getClaudeVersion();
      expect(version).toBe(null);
    });

    it('should return null on spawn error', async () => {
      // Mock spawn to return a child that errors immediately
      let errorCallback: ((err: Error) => void) | null = null;

      const mockChild = {
        pid: 1234,
        stdout: {
          on: jest.fn(),
        },
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            errorCallback = callback;
            setImmediate(() => {
              if (errorCallback) {
                errorCallback(new Error('Command not found'));
              }
            });
          }
        }),
        kill: jest.fn(),
      };
      mockSpawn.mockReturnValue(mockChild as any);

      const version = await launcher.getClaudeVersion();
      expect(version).toBe(null);
    });
  });
});
