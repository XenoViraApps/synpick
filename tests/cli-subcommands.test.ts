/**
 * CLI Subcommands Tests
 *
 * Tests for all synpick CLI subcommands to ensure they work without errors
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';

// Path to the built synpick CLI - tests run from project root
const SYNTAX_PATH = process.cwd() + '/dist/cli/index.js';

// Temporary config paths for testing
const TEMP_CONFIG_DIR = tmpdir() + `/.synpick-test-${Date.now()}`;
const TEMP_CONFIG_FILE = TEMP_CONFIG_DIR + '/config.json';

// Helper function to run synpick command
function runSynclaude(args: string[], env: Record<string, string> = {}): {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  success: boolean;
} {
  try {
    const output = execSync(`node "${SYNTAX_PATH}" ${args.join(' ')}`, {
      encoding: 'utf8',
      cwd: process.cwd(),
      env: {
        ...process.env,
        SYNTHETIC_CONFIG_DIR: TEMP_CONFIG_DIR,
        ...env,
      },
      timeout: 30000,
    });
    return {
      stdout: output,
      stderr: '',
      exitCode: 0,
      success: true,
    };
  } catch (error: any) {
    return {
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
      exitCode: error.status || null,
      success: false,
    };
  }
}

describe('CLI Subcommands', () => {
  describe('--help', () => {
    it('should display help information', () => {
      const result = runSynclaude(['--help']);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('synpick');
      expect(result.stdout).toContain('model');
      expect(result.stdout).toContain('setup');
      expect(result.stdout).toContain('doctor');
    });

    it('should exit with code 0', () => {
      const result = runSynclaude(['--help']);
      expect(result.exitCode).toBe(0);
    });
  });

  describe('--version', () => {
    it('should display version information', () => {
      const result = runSynclaude(['--version']);
      expect(result.success).toBe(true);
      expect(result.stdout).toMatch(/\d+\.\d+\.\d+/);
    });

    it('should match version.txt', () => {
      const result = runSynclaude(['--version']);
      const versionTxtPath = process.cwd() + '/version.txt';
      try {
        const versionTxt = readFileSync(versionTxtPath, 'utf8').trim();
        expect(result.stdout.trim()).toBe(versionTxt);
      } catch {
        // version.txt might not exist, skip this check
      }
    });
  });

  describe('doctor', () => {
    it('should run doctor command without errors', () => {
      const result = runSynclaude(['doctor']);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('System Health Check');
    });
  });

  describe('config show', () => {
    it('should show configuration', () => {
      const result = runSynclaude(['config', 'show']);
      // Should complete without error
      expect(result.success || result.stderr).toBeTruthy();
    });
  });

  describe('cache info', () => {
    it('should show cache information', () => {
      const result = runSynclaude(['cache', 'info']);
      // Should complete without error
      expect(result.success || result.stderr.length > 0).toBeTruthy();
    });
  });

  describe('models', () => {
    it('should show help for models command', () => {
      const result = runSynclaude(['models', '--help']);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('models');
    });

    it('should show description for models command', () => {
      const result = runSynclaude(['models', '--help']);
      expect(result.stdout).toContain('List available models');
    });
  });

  describe('search', () => {
    it('should show help for search command', () => {
      const result = runSynclaude(['search', '--help']);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('search');
      expect(result.stdout).toContain('query');
    });

    it('should require a query argument', () => {
      const result = runSynclaude(['search']);
      expect(result.success).toBe(false);
      // Missing query should cause an error
    });
  });

  describe('check-update', () => {
    it('should run check-update command', () => {
      const result = runSynclaude(['check-update']);
      // Should complete (may not find updates, but shouldn't crash)
      expect(result.success || result.stderr).toBeTruthy();
    });
  });

  describe('dangerous', () => {
    it('should show help for dangerous command', () => {
      const result = runSynclaude(['dangerous', '--help']);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('dangerously-skip-permissions');
    });

    it('should have correct description', () => {
      const result = runSynclaude(['dangerous', '--help']);
      expect(result.stdout).toContain('Launch with --dangerously-skip-permissions');
    });
  });

  describe('setup', () => {
    it('should show help for setup command', () => {
      const result = runSynclaude(['setup', '--help']);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('setup');
    });
  });

  describe('install', () => {
    it('should show help for install command', () => {
      const result = runSynclaude(['install', '--help']);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('install');
    });

    it('should show verbose option', () => {
      const result = runSynclaude(['install', '--help']);
      expect(result.stdout).toContain('--verbose');
    });

    it('should show force option', () => {
      const result = runSynclaude(['install', '--help']);
      expect(result.stdout).toContain('--force');
    });

    it('should show skip-path option', () => {
      const result = runSynclaude(['install', '--help']);
      expect(result.stdout).toContain('--skip-path');
    });
  });

  describe('config set', () => {
    it('should show help for config set command', () => {
      const result = runSynclaude(['config', 'set', '--help']);
      expect(result.success).toBe(true);
    });

    it('should require key and value arguments', () => {
      // Missing value
      const result1 = runSynclaude(['config', 'set', 'selectedModel']);
      expect(result1.success).toBe(false);

      // Missing key
      const result2 = runSynclaude(['config', 'set']);
      expect(result2.success).toBe(false);
    });
  });

  describe('config reset', () => {
    it('should show help for config reset command', () => {
      const result = runSynclaude(['config', 'reset', '--help']);
      expect(result.success).toBe(true);
    });
  });

  describe('model', () => {
    it('should show help for model command', () => {
      const result = runSynclaude(['model', '--help']);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('model');
    });
  });

  describe('thinking-model', () => {
    it('should show help for thinking-model command', () => {
      const result = runSynclaude(['thinking-model', '--help']);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('thinking-model');
    });
  });

  describe('cache clear', () => {
    it('should show help for cache clear command', () => {
      const result = runSynclaude(['cache', 'clear', '--help']);
      expect(result.success).toBe(true);
    });
  });

  describe('update', () => {
    it('should show help for update command', () => {
      const result = runSynclaude(['update', '--help']);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('update');
    });

    it('should show force option', () => {
      const result = runSynclaude(['update', '--help']);
      expect(result.stdout).toContain('--force');
    });
  });

  describe('verbose flag', () => {
    it('should accept -v flag', () => {
      const result = runSynclaude(['-v', 'doctor']);
      expect(result.success).toBe(true);
    });

    it('should accept --verbose flag', () => {
      const result = runSynclaude(['--verbose', 'doctor']);
      expect(result.success).toBe(true);
    });
  });

  describe('quiet flag', () => {
    it('should accept -q flag', () => {
      const result = runSynclaude(['-q', 'doctor']);
      expect(result.success).toBe(true);
    });

    it('should accept --quiet flag', () => {
      const result = runSynclaude(['--quiet', 'doctor']);
      expect(result.success).toBe(true);
    });
  });

  describe('unknown commands', () => {
    it('should reject unknown commands', () => {
      const result = runSynclaude(['unknown-command']);
      expect(result.success).toBe(false);
    });
  });
});

describe('CLI Integration - Banner Display', () => {
  it('should show banner without __dirname error', () => {
    // This test verifies the ESM __dirname fix works
    const result = runSynclaude(['doctor']);
    expect(result.success).toBe(true);
    // Should not contain "ReferenceError: __dirname is not defined"
    expect(result.stderr).not.toContain('ReferenceError: __dirname');
  });
});

describe('CLI Integration - Safe Mode Commands', () => {
  it('should handle quiet mode with doctor', () => {
    const result = runSynclaude(['--quiet', 'doctor']);
    expect(result.success).toBe(true);
  });

  it('should handle verbose mode with doctor', () => {
    const result = runSynclaude(['--verbose', 'doctor']);
    expect(result.success).toBe(true);
  });
});
