import { readFile, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as yaml from 'yaml';
import type { SkillConfig as SchemaSkillConfig } from './schema.js';

const execAsync = promisify(exec);

/**
 * Represents captured Claude Code configuration
 */
export interface CapturedConfig {
  version: string;
  name: string;
  description?: string;
  Claude?: {
    channel?: 'stable' | 'beta' | 'canary';
  };
  mcp?: Record<string, MCPConfig>;
  continuous?: {
    enabled: boolean;
    version?: string;
  };
  settings?: ClaudeSettings;
  skills?: SchemaSkillConfig[];
  synpick?: {
    selectedModel?: string;
    apiKey?: string;
    systemPrompt?: string;
    models?: Record<string, string>;
  };
}

export interface MCPConfig {
  type: 'npm' | 'go' | 'python' | 'builtin' | 'command';
  package?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  enabled: boolean;
}

export interface ClaudeSettings {
  theme?: 'light' | 'dark' | 'system';
  disableTelemetry?: boolean;
  autoUpdate?: boolean;
  maxHistorySize?: number;
}

/**
 * Captures the current Claude Code and synpick configuration
 */
export class ConfigCapturer {
  private anthropicHome: string;
  private synpickHome: string;

  constructor() {
    this.anthropicHome = join(homedir(), '.anthropic');
    this.synpickHome = join(homedir(), '.synpick');
  }

  /**
   * Capture the full configuration
   */
  async capture(
    name: string,
    options: {
      includeApiKey?: boolean;
      description?: string;
    } = {}
  ): Promise<CapturedConfig> {
    const config: CapturedConfig = {
      version: '1',
      name,
      description: options.description,
    };

    // Capture synpick settings
    config.synpick = await this.captureSynpickSettings(options.includeApiKey);

    // Capture Claude Code settings
    config.settings = await this.captureClaudeSettings();

    // Capture MCP servers
    config.mcp = await this.captureMcpServers();

    // Capture skills
    config.skills = await this.captureSkills();

    // Detect Claude Code channel
    config.Claude = { channel: await this.detectClaudeChannel() };

    // Check for continuous Claude
    config.continuous = await this.checkContinuousClaude();

    return config;
  }

  /**
   * Capture synpick configuration
   */
  private async captureSynpickSettings(includeApiKey = false): Promise<CapturedConfig['synpick']> {
    try {
      const configFile = join(this.synpickHome, 'config.json');
      const content = await readFile(configFile, 'utf-8');
      const config = JSON.parse(content);

      const result: CapturedConfig['synpick'] = {};

      if (config.selectedModel) {
        result.selectedModel = config.selectedModel;
      }

      if (includeApiKey && config.apiKey) {
        // Only include first few chars for security, with a note
        result.apiKey = `••••${config.apiKey.slice(-4)}`;
      }

      if (config.systemPrompt) {
        result.systemPrompt = config.systemPrompt;
      }

      if (config.models && Object.keys(config.models).length > 0) {
        result.models = {};
        for (const [key, value] of Object.entries(config.models)) {
          if (value && typeof value === 'string') {
            result.models[key] = value;
          }
        }
      }

      return Object.keys(result).length > 0 ? result : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Capture Claude Code settings
   */
  private async captureClaudeSettings(): Promise<ClaudeSettings | undefined> {
    try {
      const settingsFile = join(this.anthropicHome, 'settings.json');
      const content = await readFile(settingsFile, 'utf-8');
      const settings = JSON.parse(content);

      const result: ClaudeSettings = {};

      if (settings.theme) {
        result.theme = settings.theme;
      }

      if (settings.disableTelemetry !== undefined) {
        result.disableTelemetry = settings.disableTelemetry;
      }

      if (settings.autoUpdate !== undefined) {
        result.autoUpdate = settings.autoUpdate;
      }

      if (settings.maxHistorySize) {
        result.maxHistorySize = settings.maxHistorySize;
      }

      return Object.keys(result).length > 0 ? result : undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Capture MCP servers
   */
  private async captureMcpServers(): Promise<Record<string, MCPConfig>> {
    const result: Record<string, MCPConfig> = {};

    try {
      // Check for mcp config in various locations
      const mcpConfigPaths = [
        join(this.anthropicHome, 'mcp.json'),
        join(this.synpickHome, 'mcp.json'),
        join(this.anthropicHome, 'claude_desktop_config.json'),
      ];

      let mcpConfig: { mcpServers?: Record<string, unknown> } | unknown = undefined;

      for (const path of mcpConfigPaths) {
        try {
          const content = await readFile(path, 'utf-8');
          mcpConfig = JSON.parse(content);
          if (mcpConfig && typeof mcpConfig === 'object' && 'mcpServers' in mcpConfig) {
            break;
          }
        } catch {
          // Try next path
        }
      }

      const servers =
        mcpConfig && typeof mcpConfig === 'object' && 'mcpServers' in mcpConfig
          ? (mcpConfig as { mcpServers: Record<string, unknown> }).mcpServers
          : {};

      for (const [name, server] of Object.entries(servers)) {
        if (!server || typeof server !== 'object') continue;

        const serverConf = server as {
          command?: string;
          args?: string[];
          env?: Record<string, string>;
        };

        // Detect server type
        let type: MCPConfig['type'] = 'command';
        let pkg: string | undefined;

        if (serverConf.command) {
          const cmd = serverConf.command;
          if (cmd.includes('npx') || cmd.includes('node')) {
            type = 'npm';
            // Try to extract package name from the command
            const match = cmd.match(/npx\s+(-y\s+)?(@?[\w-]+\/[\w-]+)/);
            if (match) {
              pkg = match[2];
            }
          } else if (cmd.includes('python3') || cmd.includes('python')) {
            type = 'python';
          } else if (cmd.includes('go')) {
            type = 'go';
          }
        }

        result[name] = {
          type,
          package: pkg,
          command: type === 'command' ? serverConf.command : undefined,
          args: serverConf.args,
          env: serverConf.env,
          enabled: true,
        };
      }

      // Always include built-in filesystem
      if (!result.filesystem) {
        result.filesystem = {
          type: 'builtin',
          enabled: true,
        };
      }
    } catch {
      // Return just built-in on error
      result.filesystem = {
        type: 'builtin',
        enabled: true,
      };
    }

    return result;
  }

  /**
   * Capture installed skills
   */
  private async captureSkills(): Promise<SchemaSkillConfig[] | undefined> {
    const result: SchemaSkillConfig[] = [];

    try {
      const skillsDir = join(this.anthropicHome, 'skills');
      const entries = await readdir(skillsDir);

      for (const entry of entries) {
        const skillPath = join(skillsDir, entry);
        await stat(skillPath);

        // Check if it's a git repo
        try {
          const { stdout: remoteUrl } = await execAsync('git config --get remote.origin.url', {
            cwd: skillPath,
          });
          result.push({
            name: entry,
            url: remoteUrl.trim(),
            enabled: true,
          });
        } catch {
          // Not a git repo, might be local file
          result.push({
            name: entry,
            enabled: true,
          });
        }
      }
    } catch {
      // No skills directory or error reading it
    }

    return result.length > 0 ? result : undefined;
  }

  /**
   * Detect the Claude Code channel
   */
  private async detectClaudeChannel(): Promise<'stable' | 'beta' | 'canary'> {
    try {
      const { stdout } = await execAsync('which claude');
      const claudePath = stdout.trim();

      if (claudePath.includes('canary')) return 'canary';
      if (claudePath.includes('beta')) return 'beta';

      // Check via version
      const { stdout: versionOutput } = await execAsync('claude --version');
      if (versionOutput.includes('canary')) return 'canary';
      if (versionOutput.includes('beta')) return 'beta';
    } catch {
      // Default to stable
    }
    return 'stable';
  }

  /**
   * Check if continuous Claude is installed
   */
  private async checkContinuousClaude(): Promise<{ enabled: boolean; version?: string }> {
    try {
      // Check if continuous-claude command exists
      await execAsync('which continuous-claude');
      return { enabled: true };
    } catch {
      return { enabled: false };
    }
  }

  /**
   * Convert captured config to YAML
   */
  toYaml(config: CapturedConfig): string {
    return yaml.stringify(config, {
      lineWidth: -1,
      indent: 2,
      defaultStringType: 'QUOTE_DOUBLE',
    });
  }
}
