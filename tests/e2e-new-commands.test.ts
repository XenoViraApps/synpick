/**
 * E2E Tests for v1.7.0 New Commands
 *
 * End-to-end tests for sysprompt, full-config, and save-config commands
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// Path to the built synpick CLI
const SYNTAX_PATH = process.cwd() + '/dist/cli/index.js';

// Temporary config paths for testing
const TEMP_CONFIG_DIR = tmpdir() + `/.synpick-e2e-${Date.now()}`;
const TEMP_CONFIG_FILE = TEMP_CONFIG_DIR + '/config.json';
const TEMP_OUTPUT_DIR = tmpdir() + `/synpick-output-${Date.now()}`;

// Helper function to run synpick command
function runSynpick(args: string[], env: Record<string, string> = {}): {
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
        HOME: TEMP_CONFIG_DIR, // Override home directory for isolated tests
        EDITOR: 'cat', // Use cat as a fake editor that just outputs input
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

describe('E2E: New Commands v1.7.0', () => {
  beforeEach(() => {
    // Create temp directories
    if (!existsSync(TEMP_CONFIG_DIR)) {
      mkdirSync(TEMP_CONFIG_DIR, { recursive: true });
    }
    if (!existsSync(TEMP_OUTPUT_DIR)) {
      mkdirSync(TEMP_OUTPUT_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up temp files
    try {
      if (existsSync(TEMP_CONFIG_FILE)) {
        unlinkSync(TEMP_CONFIG_FILE);
      }
    } catch {}
  });

  describe('sysprompt command', () => {
    describe('help', () => {
      it('should show help for sysprompt command', () => {
        const result = runSynpick(['sysprompt', '--help']);
        expect(result.success).toBe(true);
        expect(result.stdout).toContain('sysprompt');
      });

      it('should show available subcommands', () => {
        const result = runSynpick(['sysprompt', '--help']);
        expect(result.stdout).toContain('set');
        expect(result.stdout).toContain('show');
        expect(result.stdout).toContain('clear');
      });
    });
  });

  describe('full-config command group', () => {
    describe('help', () => {
      it('should show help for full-config command', () => {
        const result = runSynpick(['full-config', '--help']);
        expect(result.success).toBe(true);
        expect(result.stdout).toContain('full-config');
      });
    });

    describe('init', () => {
      it('should show help for init subcommand', () => {
        const result = runSynpick(['full-config', 'init', '--help']);
        expect(result.success).toBe(true);
        expect(result.stdout).toContain('init');
      });
    });

    describe('validate', () => {
      it('should show help for validate subcommand', () => {
        const result = runSynpick(['full-config', 'validate', '--help']);
        expect(result.success).toBe(true);
        expect(result.stdout).toContain('validate');
      });

      it('should validate a valid config file', () => {
        const configPath = join(TEMP_OUTPUT_DIR, 'valid-config.yaml');
        const validYaml = `
name: Test Config
version: 1
description: A test configuration

synpick:
  model: hf:test/model
`;
        writeFileSync(configPath, validYaml);

        const result = runSynpick(['full-config', 'validate', configPath]);
        expect(result.success).toBe(true);
        expect(result.stdout).toContain('valid');
      });

      it('should reject invalid config file', () => {
        const configPath = join(TEMP_OUTPUT_DIR, 'invalid-config.yaml');
        const invalidYaml = `
version: 1
# Missing required 'name' field
description: Invalid config
`;
        writeFileSync(configPath, invalidYaml);

        const result = runSynpick(['full-config', 'validate', configPath]);
        expect(result.success).toBe(false);
      });
    });

    describe('list-saved', () => {
      it('should show help for list-saved subcommand', () => {
        const result = runSynpick(['full-config', 'list-saved', '--help']);
        expect(result.success).toBe(true);
        expect(result.stdout).toContain('list-saved');
      });
    });
  });

  describe('save-config command', () => {
    describe('help', () => {
      it('should show help for save-config command', () => {
        const result = runSynpick(['save-config', '--help']);
        expect(result.success).toBe(true);
        expect(result.stdout).toContain('save-config');
        expect(result.stdout).toContain('--local-only');
        expect(result.stdout).toContain('--name');
      });

      it('should describe the command purpose', () => {
        const result = runSynpick(['save-config', '--help']);
        expect(result.stdout).toMatch(/[Cc]apture/);
      });
    });
  });

  describe('full-install command', () => {
    it('should show help', () => {
      const result = runSynpick(['full-install', '--help']);
      expect(result.success).toBe(true);
      expect(result.stdout).toContain('full-install');
    });

    it('should support GitHub URL format', () => {
      const result = runSynpick(['full-install', '--help']);
      expect(result.stdout).toContain('github');
    });

    it('should support dry-run option', () => {
      const result = runSynpick(['full-install', '--help']);
      expect(result.stdout).toContain('--dry-run');
    });

    it('should support yes/--yes option for auto-confirmation', () => {
      const result = runSynpick(['full-install', '--help']);
      expect(result.stdout).toContain('--yes');
    });
  });
});
