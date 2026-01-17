import { spawn } from 'child_process';

export interface LaunchOptions {
  model: string;
  claudePath?: string;
  additionalArgs?: string[];
  env?: Record<string, string>;
  tierModels?: TierLaunchModels;
  maxTokenSize?: number;
  thinkingModel?: string;
  systemPrompt?: string;
}

export interface TierLaunchModels {
  default?: string;
  opus?: string;
  sonnet?: string;
  haiku?: string;
  subagent?: string;
  thinking?: string;
}

export interface LauncherOptions {
  claudePath?: string;
  /** Timeout for command execution in milliseconds (default: 5000) */
  timeoutMs?: number;
}

export interface LaunchResult {
  success: boolean;
  pid?: number;
  error?: string;
}

/**
 * ClaudeLauncher handles launching and managing Claude Code processes
 *
 * Provides methods to launch Claude Code with custom models,
 * check installation status, and retrieve version information.
 */
export class ClaudeLauncher {
  private claudePath: string;
  private timeoutMs: number;

  /**
   * Creates a new ClaudeLauncher instance
   *
   * @param options - Configuration options for the launcher
   * @param options.claudePath - Path to the claude executable (default: 'claude')
   * @param options.timeoutMs - Timeout for command execution in milliseconds (default: 5000)
   */
  constructor(options?: LauncherOptions) {
    this.claudePath = options?.claudePath || 'claude';
    this.timeoutMs = options?.timeoutMs || 5000;
  }

  /**
   * Launches Claude Code with the specified options
   *
   * Sets up environment variables for custom model integration
   * and spawns a new Claude Code process.
   *
   * @param options - Launch options for Claude Code
   * @param options.model - The default model to use
   * @param options.claudePath - Optional custom path to claude executable
   * @param options.additionalArgs - Additional command-line arguments to pass
   * @param options.env - Additional environment variables
   * @param.options.tierModels - Optional tier-specific model overrides
   * @param options.maxTokenSize - Optional max token size (default: 128000)
   * @returns Promise resolving to the launch result
   */
  async launchClaudeCode(options: LaunchOptions): Promise<LaunchResult> {
    try {
      // Set up environment variables for Claude Code
      const env = {
        ...process.env,
        ...this.createClaudeEnvironment(options),
        ...options.env,
      };

      // Prepare command arguments
      const args = [...(options.additionalArgs || [])];

      // Use claudePath from options if provided, otherwise use instance path
      const claudePath = options.claudePath || this.claudePath;

      return new Promise(resolve => {
        const child = spawn(claudePath, args, {
          stdio: 'inherit',
          env,
          // Remove detached mode to maintain proper terminal interactivity
        });

        child.on('spawn', () => {
          resolve({
            success: true,
            pid: child.pid || undefined,
          });
        });

        child.on('error', error => {
          console.error(`Failed to launch Claude Code: ${error.message}`);
          resolve({
            success: false,
            error: error.message,
          });
        });

        // Don't unref the process - let it maintain control of the terminal
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error launching Claude Code: ${errorMessage}`);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Normalizes a model ID to ensure it has the hf: prefix
   * Model IDs from the API already have the prefix, but user config might not
   *
   * @param modelId - The model ID to normalize (may be undefined)
   * @returns The normalized model ID with hf: prefix, or undefined if input was undefined/empty
   */
  private normalizeModelId(modelId?: string): string | undefined {
    if (!modelId) return undefined;
    // If already starts with hf: or other valid prefixes, return as-is
    // Common prefixes: hf:, openai:, anthropic:, etc.
    const knownPrefixes = ['hf:', 'openai:', 'anthropic:', 'claude:', 'google:', 'meta:'];
    for (const prefix of knownPrefixes) {
      if (modelId.startsWith(prefix)) {
        return modelId;
      }
    }
    // Add hf: prefix for normalized IDs
    return `hf:${modelId}`;
  }

  private createClaudeEnvironment(options: LaunchOptions): Record<string, string> {
    const env: Record<string, string> = {};
    const tiers = options.tierModels || {};
    const defaultModel = this.normalizeModelId(tiers.default || options.model) || '';

    // Set Anthropic-compatible endpoint
    env.ANTHROPIC_BASE_URL = 'https://api.synthetic.new/anthropic';

    // Set tier-specific models, falling back to default tier
    // Normalize all model IDs to ensure they have the hf: prefix
    const opusModel = this.normalizeModelId(tiers.opus) || defaultModel;
    const sonnetModel = this.normalizeModelId(tiers.sonnet) || defaultModel;
    const haikuModel = this.normalizeModelId(tiers.haiku) || defaultModel;
    const subagentModel = this.normalizeModelId(tiers.subagent) || defaultModel;

    env.ANTHROPIC_DEFAULT_OPUS_MODEL = opusModel;
    env.ANTHROPIC_DEFAULT_SONNET_MODEL = sonnetModel;
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL = haikuModel;
    env.ANTHROPIC_DEFAULT_MODEL = defaultModel;

    // Set Claude Code subagent model
    env.CLAUDE_CODE_SUBAGENT_MODEL = subagentModel;

    // Set thinking model - first check tier models, then options.thinkingModel
    const thinkingModel = this.normalizeModelId(tiers.thinking || options.thinkingModel || '');
    if (thinkingModel) {
      env.ANTHROPIC_THINKING_MODEL = thinkingModel;
    }

    // Set max token size (default 128000 if not specified)
    env.CLAUDE_CODE_MAX_TOKEN_SIZE = (options.maxTokenSize ?? 128000).toString();

    // Set system prompt if provided
    if (options.systemPrompt) {
      env.CLAUDE_SYSTEM_PROMPT = options.systemPrompt;
    }

    // Disable non-essential traffic
    env.CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC = '1';

    return env;
  }

  /**
   * Checks if Claude Code is installed and accessible
   *
   * Attempts to spawn Claude Code with --version flag.
   *
   * @returns Promise resolving to true if Claude is installed, false otherwise
   */
  async checkClaudeInstallation(): Promise<boolean> {
    return new Promise(resolve => {
      const child = spawn(this.claudePath, ['--version'], {
        stdio: 'pipe',
      });

      child.on('spawn', () => {
        resolve(true);
      });

      child.on('error', () => {
        resolve(false);
      });

      // Force resolution after timeout
      setTimeout(() => resolve(false), this.timeoutMs);
    });
  }

  /**
   * Gets the installed Claude Code version
   *
   * Attempts to retrieve the version string by running Claude Code
   * with the --version flag and parsing the output.
   *
   * @returns Promise resolving to version string (e.g., "2.0.76"), or null if unavailable
   */
  async getClaudeVersion(): Promise<string | null> {
    try {
      return new Promise(resolve => {
        const child = spawn(this.claudePath, ['--version'], {
          stdio: 'pipe',
        });

        let output = '';
        let resolved = false;

        child.stdout?.on('data', data => {
          output += data.toString();
        });

        child.on('close', code => {
          if (!resolved && code === 0) {
            resolved = true;
            // Parse version from output like "claude 2.0.76" or "2.0.76"
            const match = output.trim().match(/(\d+\.\d+\.\d+)/);
            resolve(match?.[1] ?? null);
          } else if (!resolved) {
            resolved = true;
            resolve(null);
          }
        });

        child.on('error', () => {
          if (!resolved) {
            resolved = true;
            resolve(null);
          }
        });

        // Force resolution after timeout
        setTimeout(() => {
          if (!resolved) {
            resolved = true;
            try {
              child.kill();
            } catch {
              // Ignore
            }
            resolve(null);
          }
        }, this.timeoutMs);
      });
    } catch {
      return null;
    }
  }

  /**
   * Sets the path to the Claude executable
   *
   * @param path - The path to the claude executable
   */
  setClaudePath(path: string): void {
    this.claudePath = path;
  }

  /**
   * Gets the current path to the Claude executable
   *
   * @returns The current claude path
   */
  getClaudePath(): string {
    return this.claudePath;
  }
}
