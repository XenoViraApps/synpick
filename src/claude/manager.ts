import { spawn, execSync } from 'child_process';
import { promises as fs, Stats } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

/**
 * Result of a Claude Code update operation
 */
export interface UpdateResult {
  success: boolean;
  action: 'none' | 'installed' | 'updated' | 'failed';
  previousVersion?: string;
  newVersion?: string;
  error?: string;
}

/**
 * Options for installing or updating Claude Code
 */
export interface InstallOptions {
  /** Force update even if already up to date */
  force?: boolean;
  /** Whether to show verbose output */
  verbose?: boolean;
  /** Use specific npm command (defaults to 'npm') */
  npmCommand?: string;
}

/**
 * Manages Claude Code installation, updates, and version checking
 */
export class ClaudeCodeManager {
  private static readonly CLAUDE_PACKAGE = '@anthropic-ai/claude-code';
  private static readonly NPM_REGISTRY_URL = 'https://registry.npmjs.org/@anthropic-ai/claude-code';
  private static readonly UPDATE_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly OFFICIAL_INSTALL_URL = 'https://claude.ai/install.sh';
  private timeoutMs: number;

  constructor(private options: { verbose?: boolean; timeoutMs?: number } = {}) {
    this.timeoutMs = options.timeoutMs || 5000;
  }

  /**
   * Check if Claude Code is installed
   */
  async checkInstallation(): Promise<boolean> {
    try {
      const claudePath = await this.getClaudePath();
      await fs.access(claudePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get the Claude Code executable path
   */
  async getClaudePath(): Promise<string> {
    try {
      // Try to get from npm bin directory
      const npmPrefix = execSync('npm prefix -g', {
        encoding: 'utf-8',
        stdio: 'pipe',
      }).trim();
      const npmBinDir = join(npmPrefix, 'bin');
      return join(npmBinDir, 'claude');
    } catch {
      // Try common npm prefix path
      const npmPrefix = execSync('npm config get prefix', {
        encoding: 'utf-8',
        stdio: 'pipe',
      }).trim();
      return join(npmPrefix, 'bin', 'claude');
    }
  }

  /**
   * Get current Claude Code version
   */
  async getCurrentVersion(): Promise<string | null> {
    try {
      const result = await this.spawnCommand('claude', ['--version']);
      const output = result.stdout.trim();
      // Parse version from output like "claude 2.0.76" or "2.0.76"
      const match = output.match(/(\d+\.\d+\.\d+)/);
      return match?.[1] ?? null;
    } catch (error) {
      if (this.options.verbose) {
        console.error(`Failed to get Claude Code version: ${error}`);
      }
      return null;
    }
  }

  /**
   * Get the locally installed version from npm
   */
  async getNpmInstalledVersion(): Promise<string | null> {
    try {
      const result = execSync(
        `npm list -g --depth=0 ${ClaudeCodeManager.CLAUDE_PACKAGE} 2>&1 || true`,
        {
          encoding: 'utf-8',
        }
      );

      // Parse version from npm output
      const match = result.match(/@anthropic-ai\/claude-code@(\d+\.\d+\.\d+)/);
      return match?.[1] ?? null;
    } catch {
      return null;
    }
  }

  /**
   * Get latest Claude Code version from npm registry
   */
  async getLatestVersion(): Promise<string | null> {
    try {
      // Try to get version from npm view
      const result = execSync(
        `npm view ${ClaudeCodeManager.CLAUDE_PACKAGE} version 2>/dev/null || true`,
        { encoding: 'utf-8' }
      );

      const version = result.trim();
      if (version && version.match(/^\d+\.\d+\.\d+$/)) {
        return version;
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Check if an update is needed
   */
  async needsUpdate(): Promise<boolean> {
    const currentVersion = await this.getNpmInstalledVersion();
    const latestVersion = await this.getLatestVersion();

    if (!currentVersion || !latestVersion) {
      return false;
    }

    return currentVersion !== latestVersion;
  }

  /**
   * Compare two semantic version strings
   * Returns: -1 if v1 < v2, 0 if equal, 1 if v1 > v2
   */
  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;

      if (p1 < p2) return -1;
      if (p1 > p2) return 1;
    }

    return 0;
  }

  /**
   * Check if update check should run based on interval
   */
  shouldCheckUpdate(lastCheckTime?: string, intervalHours: number = 24): boolean {
    if (!lastCheckTime) {
      return true;
    }

    const lastCheck = new Date(lastCheckTime).getTime();
    const now = Date.now();
    const intervalMs = intervalHours * 60 * 60 * 1000;

    return now - lastCheck > intervalMs;
  }

  /**
   * Record that an update check was performed
   */
  static getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  /**
   * Run npm install to install or update Claude Code
   */
  async installOrUpdate(options: InstallOptions = {}): Promise<UpdateResult> {
    const { force = false, verbose = this.options.verbose } = options;

    try {
      const currentVersion = await this.getNpmInstalledVersion();

      if (verbose) {
        console.log(`Current Claude Code version: ${currentVersion || 'Not installed'}`);
      }

      const latestVersion = await this.getLatestVersion();

      if (!latestVersion) {
        return {
          success: false,
          action: 'failed',
          error: 'Could not determine latest version from npm registry',
        };
      }

      if (verbose) {
        console.log(`Latest Claude Code version: ${latestVersion}`);
      }

      // Check if update is needed
      if (!force && currentVersion) {
        const comparison = this.compareVersions(currentVersion, latestVersion);
        if (comparison >= 0) {
          if (verbose) {
            console.log('Claude Code is already up to date');
          }
          return {
            success: true,
            action: 'none',
            previousVersion: currentVersion,
            newVersion: currentVersion,
          };
        }
      }

      // Perform install/update
      const action = !currentVersion ? 'install' : 'update';
      const actionVerb = action === 'install' ? 'Installing' : 'Updating';

      if (verbose || !this.options.verbose) {
        console.log(`${actionVerb} Claude Code to ${latestVersion}...`);
      }

      const npmCommand = options.npmCommand || 'npm';
      const npmArgs = ['install', '-g', ClaudeCodeManager.CLAUDE_PACKAGE];

      if (verbose) {
        console.log(`Running: ${npmCommand} ${npmArgs.join(' ')}`);
      }

      execSync(`${npmCommand} ${npmArgs.join(' ')}`, {
        stdio: verbose ? 'inherit' : 'pipe',
        encoding: 'utf-8',
      });

      // Verify installation
      const newVersion = await this.getNpmInstalledVersion();

      if (!newVersion) {
        return {
          success: false,
          action: 'failed',
          error: 'Installation completed but version could not be verified',
        };
      }

      const result: UpdateResult = {
        success: true,
        action: action === 'install' ? 'installed' : 'updated',
        previousVersion: currentVersion || undefined,
        newVersion,
      };

      if (verbose) {
        console.log(
          `Claude Code ${action === 'install' ? 'installed' : 'updated'} successfully: ${newVersion}`
        );
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        action: 'failed',
        error: errorMessage,
      };
    }
  }

  /**
   * Run the official Claude Code installer via curl
   */
  async runOfficialInstaller(): Promise<UpdateResult> {
    try {
      const currentVersion = await this.getCurrentVersion();

      if (this.options.verbose) {
        console.log(`Current Claude Code version: ${currentVersion || 'Not installed'}`);
        console.log('Running official Claude Code installer...');
      } else {
        console.log('Installing/updating Claude Code via official installer...');
      }

      // Download and run the official installer
      const cmd = `curl -fsSL ${ClaudeCodeManager.OFFICIAL_INSTALL_URL} | bash`;

      execSync(cmd, {
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        encoding: 'utf-8',
      });

      // Get new version
      const newVersion = await this.getCurrentVersion();

      // Determine action
      let action: 'installed' | 'updated' | 'none' = 'none';
      if (currentVersion && newVersion) {
        const comparison = this.compareVersions(currentVersion, newVersion);
        if (comparison < 0) {
          action = 'updated';
        } else if (comparison === 0) {
          action = 'none';
        } else {
          action = 'updated'; // Downgrade considered an update
        }
      } else if (newVersion) {
        action = 'installed';
      }

      return {
        success: true,
        action,
        previousVersion: currentVersion || undefined,
        newVersion: newVersion || undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        action: 'failed',
        error: errorMessage,
      };
    }
  }

  /**
   * Check for updates without installing
   */
  async checkForUpdates(options: { useActualVersion?: boolean } = {}): Promise<{
    hasUpdate: boolean;
    currentVersion: string | null;
    latestVersion: string | null;
    isNpmInstalled: boolean;
  }> {
    const currentVersion = options.useActualVersion
      ? await this.getCurrentVersion()
      : await this.getNpmInstalledVersion();
    const latestVersion = await this.getLatestVersion();

    let hasUpdate = false;
    if (currentVersion && latestVersion) {
      hasUpdate = this.compareVersions(currentVersion, latestVersion) < 0;
    } else if (!currentVersion && latestVersion) {
      hasUpdate = true; // Not installed but available
    }

    return {
      hasUpdate,
      currentVersion,
      latestVersion,
      isNpmInstalled: (await this.getNpmInstalledVersion()) !== null,
    };
  }

  /**
   * Get detailed information about Claude Code installation
   */
  async getInstallationInfo(): Promise<{
    installed: boolean;
    path?: string;
    version?: string;
    isSymlink?: boolean;
    symlinkTarget?: string;
    isGlobal: boolean;
  }> {
    try {
      const claudePath = await this.getClaudePath();
      const stats: Stats = await fs.lstat(claudePath);
      const isSymlink = stats.isSymbolicLink();

      let symlinkTarget: string | undefined;
      if (isSymlink) {
        symlinkTarget = await fs.readlink(claudePath);
      }

      // Check if this is a global npm installation
      const isGlobal = claudePath.includes(homedir())
        ? claudePath.includes('.npm') || claudePath.includes('.nvm')
        : claudePath.startsWith('/usr/local') || claudePath.startsWith('/usr');

      const version = await this.getCurrentVersion();

      return {
        installed: true,
        path: claudePath,
        version: version || undefined,
        isSymlink,
        symlinkTarget,
        isGlobal,
      };
    } catch {
      return {
        installed: false,
        isGlobal: false,
      };
    }
  }

  /**
   * Spawn a command and capture output
   *
   * @param command - Command to execute
   * @param args - Command arguments
   * @returns Promise with command result
   */
  private spawnCommand(
    command: string,
    args: string[]
  ): Promise<{ success: boolean; stdout: string; stderr: string; code: number | null }> {
    return new Promise(resolve => {
      let stdout = '';
      let stderr = '';
      let resolved = false;
      // Declare timeoutId before setting up event listeners
      // so doResolve can properly clear it when process completes
      let timeoutId: NodeJS.Timeout | undefined;

      const child = spawn(command, args, {
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        shell: true,
      });

      if (!this.options.verbose) {
        child.stdout?.on('data', data => {
          stdout += data.toString();
        });

        child.stderr?.on('data', data => {
          stderr += data.toString();
        });
      }

      const doResolve = (result: {
        success: boolean;
        stdout: string;
        stderr: string;
        code: number | null;
      }) => {
        if (!resolved) {
          resolved = true;
          // Clean up timeout if it exists
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          resolve(result);
        }
      };

      child.on('close', code => {
        doResolve({ success: code === 0, stdout, stderr, code });
      });

      child.on('error', () => {
        doResolve({ success: false, stdout, stderr, code: -1 });
      });

      // Set timeout after event listeners so it can be properly cleared
      timeoutId = setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch {
          // Ignore errors when killing (process may already be dead)
        }
        doResolve({ success: false, stdout, stderr, code: null });
      }, this.timeoutMs);
    });
  }
}

/**
 * Default singleton instance
 */
export const claudeCodeManager = new ClaudeCodeManager();
