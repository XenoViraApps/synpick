import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, mkdir, access } from 'fs/promises';
import { join, dirname } from 'path';
import { tmpdir, homedir } from 'os';
import { rmSync } from 'fs';

const execAsync = promisify(exec);

import type { SynpickConfig } from './schema.js';

/**
 * Installer for full-configuration of Claude Code
 */
export class FullConfigInstaller {
  private config: SynpickConfig;
  private configRoot: string;
  private dryRun: boolean = false;
  private confirm: boolean = false;

  constructor(config: SynpickConfig, configRoot: string = '') {
    this.config = config;
    this.configRoot = configRoot;
  }

  /**
   * Set dry run mode - don't actually make changes
   */
  setDryRun(enabled: boolean): this {
    this.dryRun = enabled;
    return this;
  }

  /**
   * Set auto-confirm mode - don't ask for confirmation
   */
  setAutoConfirm(enabled: boolean): this {
    this.confirm = enabled;
    return this;
  }

  /**
   * Execute the full installation
   */
  async install(): Promise<void> {
    console.log(`\n📦 Installing configuration: ${this.config.name}`);
    if (this.config.description) {
      console.log(`   ${this.config.description}\n`);
    }

    // Create summary of what will be done
    await this.showSummary();

    if (!this.confirm) {
      const confirmed = await this.askConfirmation();
      if (!confirmed) {
        console.log('Installation cancelled.');
        return;
      }
    }

    // Execute installation steps
    await this.applySynpickSettings();
    await this.installClaudeCode();
    await this.installMcpServers();
    await this.installContinuous();
    await this.installSkills();
    await this.applyClaudeSettings();
    await this.runScripts();

    console.log('\n✅ Full installation complete!');
    console.log(`Configuration "${this.config.name}" has been applied.`);
  }

  /**
   * Show summary of what will be installed
   */
  private async showSummary(): Promise<void> {
    console.log('Installation Summary:');
    console.log('===================');

    if (this.config.Claude) {
      console.log(
        `  Claude Code: version ${this.config.Claude.version || 'latest'} (${this.config.Claude.channel})`
      );
    }

    if (this.config.mcp && Object.keys(this.config.mcp).length > 0) {
      console.log(`  MCP servers: ${Object.keys(this.config.mcp).join(', ')}`);
    }

    if (this.config.continuous?.enabled) {
      console.log(`  Continuous Claude v${this.config.continuous?.version || 'latest'}`);
    }

    if (this.config.synpick) {
      if (this.config.synpick.model) console.log(`  Synpick model: ${this.config.synpick.model}`);
      if (this.config.synpick.systemPrompt)
        console.log(`  System prompt: ${this.config.synpick.systemPrompt.substring(0, 50)}...`);
    }

    if (this.config.scripts && this.config.scripts.length > 0) {
      console.log(`  Custom scripts: ${this.config.scripts.length}`);
    }

    console.log('');
  }

  /**
   * Ask user for confirmation
   */
  private async askConfirmation(): Promise<boolean> {
    const readline = (await import('readline')).createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    return new Promise(resolve => {
      readline.question('Continue with installation? [y/N] ', answer => {
        readline.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  /**
   * Apply synpick-specific settings via config command
   */
  private async applySynpickSettings(): Promise<void> {
    if (!this.config.synpick) return;

    console.log('\nApplying synpick settings...');

    if (this.config.synpick.model) {
      await this.runCommand('synpick', [
        'config',
        'set',
        'selectedModel',
        this.config.synpick.model,
      ]);
    }

    if (this.config.synpick.systemPrompt) {
      await this.runCommand('synpick', ['sysprompt', 'set', this.config.synpick.systemPrompt]);
    }

    if (this.config.synpick.apiKey) {
      await this.runCommand('synpick', ['config', 'set', 'apiKey', this.config.synpick.apiKey]);
    }
  }

  /**
   * Install or update Claude Code
   */
  private async installClaudeCode(): Promise<void> {
    if (!this.config.Claude) return;

    console.log('\nEnsuring Claude Code is installed...');

    const { version = 'latest', channel } = this.config.Claude;

    if (!this.dryRun) {
      // Use npm to install/update claude-code
      const npmCmd = channel === 'stable' ? 'claude-code' : `@anthropic-ai/${channel}`;

      try {
        console.log(
          `Running: npm install -g ${npmCmd}${version !== 'latest' ? `@${version}` : ''}`
        );
        await execAsync(`npm install -g ${npmCmd}${version !== 'latest' ? `@${version}` : ''}`);
        console.log('  ✅ Claude Code installed/updated');
      } catch (error) {
        console.log(`  ⚠️  Could not install Claude Code: ${(error as Error).message}`);
      }
    } else {
      console.log(`  [DRY RUN] Would install Claude Code ${version} (${channel})`);
    }
  }

  /**
   * Install MCP servers
   */
  private async installMcpServers(): Promise<void> {
    if (!this.config.mcp || Object.keys(this.config.mcp).length === 0) return;

    console.log('\nInstalling MCP servers...');

    for (const [name, serverConfig] of Object.entries(this.config.mcp)) {
      if (!serverConfig.enabled) continue;

      console.log(`  Installing ${name}...`);

      switch (serverConfig.type) {
        case 'npm':
          await this.installMcpNpm(name, serverConfig);
          break;
        case 'go':
          await this.installMcpGo(name, serverConfig);
          break;
        case 'python':
          await this.installMcpPython(name, serverConfig);
          break;
        case 'builtin':
          await this.configMcpBuiltin(name, serverConfig);
          break;
        case 'command':
          await this.configMcpCommand(name, serverConfig);
          break;
      }
    }
  }

  /**
   * Install an npm-based MCP server
   */
  private async installMcpNpm(name: string, config: { package?: string }): Promise<void> {
    const pkg = config.package || name;

    if (!this.dryRun) {
      try {
        await execAsync(`npm install -g ${pkg}`);
        console.log(`    ✅ Installed ${pkg}`);
      } catch (error) {
        console.log(`    ⚠️  Failed to install ${pkg}: ${(error as Error).message}`);
      }
    } else {
      console.log(`    [DRY RUN] Would install npm package: ${pkg}`);
    }
  }

  /**
   * Install a Go-based MCP server
   */
  private async installMcpGo(
    name: string,
    config: { package?: string; url?: string }
  ): Promise<void> {
    if (!this.dryRun) {
      if (config.url) {
        console.log(`    [DRY RUN] Would install Go package from: ${config.url}`);
        // go install github.com/user/repo@latest
      } else if (config.package) {
        console.log(`    [DRY RUN] Would install Go package: ${config.package}`);
      }
    }
  }

  /**
   * Install a Python-based MCP server
   */
  private async installMcpPython(name: string, config: { package?: string }): Promise<void> {
    const pkg = config.package || name;

    if (!this.dryRun) {
      try {
        await execAsync(`pip install -U ${pkg}`);
        console.log(`    ✅ Installed ${pkg}`);
      } catch (error) {
        console.log(`    ⚠️  Failed to install ${pkg}: ${(error as Error).message}`);
      }
    } else {
      console.log(`    [DRY RUN] Would install Python package: ${pkg}`);
    }
  }

  /**
   * Configure a builtin MCP server
   */
  private async configMcpBuiltin(name: string, _config: { enabled?: boolean }): Promise<void> {
    console.log(`    ℹ️  ${name} is builtin, no installation needed`);
  }

  /**
   * Configure a command-based MCP server
   */
  private async configMcpCommand(name: string, config: { args?: string[] }): Promise<void> {
    if (!this.dryRun) {
      console.log(`    ℹ️  ${name} command configured`);
    } else {
      console.log(
        `    [DRY RUN] Would configure ${name} with args: ${config.args?.join(' ') || '-'}`
      );
    }
  }

  /**
   * Install Continuous Claude
   */
  private async installContinuous(): Promise<void> {
    if (!this.config.continuous?.enabled) return;

    console.log('\nInstalling Continuous Claude...');

    if (this.dryRun) {
      console.log(`  [DRY RUN] Would install Continuous Claude`);
      return;
    }

    try {
      // Clone continuous-claude repo
      const tempDir = join(tmpdir(), 'continuous-claude-install');
      await this.ensureEmptyDir(tempDir);

      await execAsync(`git clone https://github.com/anthropics/continuous-claude.git ${tempDir}`);
      await execAsync(`npm install`, { cwd: tempDir });

      // Install as global command
      await execAsync(`npm link`, { cwd: tempDir });

      console.log('  ✅ Continuous Claude installed');

      // Cleanup
      rmSync(tempDir, { recursive: true });
    } catch (error) {
      console.log(`  ⚠️  Failed to install Continuous Claude: ${(error as Error).message}`);
    }
  }

  /**
   * Install skills
   */
  private async installSkills(): Promise<void> {
    if (!this.config.skills || this.config.skills.length === 0) return;

    console.log('\nInstalling skills...');

    const skillsDir = join(homedir(), '.anthropic', 'skills');
    await this.ensureDir(skillsDir);

    for (const skill of this.config.skills) {
      if (!skill.enabled) continue;

      console.log(`  Installing ${skill.name}...`);

      const targetDir = join(skillsDir, skill.name);

      if (skill.url) {
        await this.installSkillFromUrl(skill.name, skill.url, targetDir);
      } else if (skill.file && this.configRoot) {
        await this.installSkillFromFile(skill.name, join(this.configRoot, skill.file), targetDir);
      }
    }
  }

  private async installSkillFromUrl(name: string, url: string, targetDir: string): Promise<void> {
    if (this.dryRun) {
      console.log(`    [DRY RUN] Would clone skill from ${url}`);
      return;
    }

    try {
      await this.ensureEmptyDir(targetDir);
      await execAsync(`git clone ${url} ${targetDir}`);
      console.log(`    ✅ Installed ${name}`);
    } catch (error) {
      console.log(`    ⚠️  Failed to install ${name}: ${(error as Error).message}`);
    }
  }

  private async installSkillFromFile(
    name: string,
    sourcePath: string,
    targetDir: string
  ): Promise<void> {
    if (this.dryRun) {
      console.log(`    [DRY RUN] Would copy skill from ${sourcePath}`);
      return;
    }

    try {
      await this.ensureEmptyDir(targetDir);
      // Copy file/directory
      const isDir = (await import('fs')).statSync(sourcePath).isDirectory();
      if (isDir) {
        await execAsync(`cp -r ${sourcePath}/* ${targetDir}`);
      } else {
        await this.ensureDir(targetDir);
        await execAsync(`cp ${sourcePath} ${targetDir}/${name}.ts`);
      }
      console.log(`    ✅ Installed ${name}`);
    } catch (error) {
      console.log(`    ⚠️  Failed to install ${name}: ${(error as Error).message}`);
    }
  }

  /**
   * Apply Claude Code settings
   */
  private async applyClaudeSettings(): Promise<void> {
    if (!this.config.settings) return;

    console.log('\nApplying Claude Code settings...');

    const settingsPath = join(homedir(), '.anthropic', 'settings.json');
    const settingsDir = dirname(settingsPath);
    await this.ensureDir(settingsDir);

    let existingSettings: Record<string, unknown> = {};

    try {
      const content = await readFile(settingsPath, 'utf-8');
      existingSettings = JSON.parse(content);
    } catch {
      // File doesn't exist or is invalid
    }

    // Apply settings
    if (this.config.settings.theme) {
      existingSettings.theme = this.config.settings.theme;
    }

    if (this.config.settings.disableTelemetry !== undefined) {
      existingSettings.disableTelemetry = this.config.settings.disableTelemetry;
    }

    if (this.config.settings.autoUpdate !== undefined) {
      existingSettings.autoUpdate = this.config.settings.autoUpdate;
    }

    if (this.config.settings.maxHistorySize) {
      existingSettings.maxHistorySize = this.config.settings.maxHistorySize;
    }

    if (!this.dryRun) {
      try {
        await writeFile(settingsPath, JSON.stringify(existingSettings, null, 2), 'utf-8');
        console.log('  ✅ Settings applied');
      } catch (error) {
        console.log(`  ⚠️  Failed to apply settings: ${(error as Error).message}`);
      }
    } else {
      console.log(`  [DRY RUN] Would write settings to ${settingsPath}`);
    }
  }

  /**
   * Run custom installation scripts
   */
  private async runScripts(): Promise<void> {
    if (!this.config.scripts || this.config.scripts.length === 0) return;

    console.log('\nRunning custom scripts...');

    for (const script of this.config.scripts) {
      if (!this.confirm) {
        const confirmed = await this.askScriptConfirmation(script);
        if (!confirmed) {
          console.log(`  Skipping: ${script.name}`);
          continue;
        }
      }

      console.log(`  Running: ${script.name}...`);

      const scriptPath = this.configRoot ? join(this.configRoot, script.path) : script.path;

      if (!this.dryRun) {
        try {
          await this.runScript(script, scriptPath);
          console.log(`    ✅ ${script.name} completed`);
        } catch (error) {
          console.log(`    ⚠️  ${script.name} failed: ${(error as Error).message}`);
          if (script.required) {
            console.log('    ❌ Script is required, aborting installation');
            throw error;
          }
        }
      } else {
        console.log(`    [DRY RUN] Would run: ${script.name}`);
      }
    }
  }

  /**
   * Ask user for script confirmation
   */
  private async askScriptConfirmation(script: {
    name: string;
    description?: string;
  }): Promise<boolean> {
    const readline = (await import('readline')).createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\n' + '-'.repeat(50));
    console.log(`Script: ${script.name}`);
    if (script.description) {
      console.log(`Description: ${script.description}`);
    }
    console.log('-'.repeat(50));

    return new Promise(resolve => {
      readline.question('Run this script? [y/N] ', answer => {
        readline.close();
        resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
      });
    });
  }

  /**
   * Run a script
   */
  private async runScript(
    script: { shell: string; name: string },
    scriptPath: string
  ): Promise<void> {
    const shell = script.shell;
    const shellExec: Record<string, string> = {
      bash: 'bash',
      sh: 'sh',
      zsh: 'zsh',
      fish: 'fish',
      node: 'node',
      python: 'python3',
    };

    await execAsync(`${shellExec[shell]} ${scriptPath}`);
  }

  /**
   * Run a command with output
   */
  private async runCommand(cmd: string, args: string[]): Promise<void> {
    const { stdout, stderr } = await execAsync(`${cmd} ${args.join(' ')}`);
    if (stdout) console.log(stdout.trim());
    if (stderr) console.error(stderr.trim());
  }

  /**
   * Ensure a directory exists
   */
  private async ensureDir(path: string): Promise<void> {
    await mkdir(path, { recursive: true });
  }

  /**
   * Ensure a directory exists and is empty
   */
  private async ensureEmptyDir(path: string): Promise<void> {
    try {
      await access(path);
      // Directory exists, remove its contents
      rmSync(path, { recursive: true });
    } catch {
      // Directory doesn't exist
    }
    await this.ensureDir(path);
  }
}
