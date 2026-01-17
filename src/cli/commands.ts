import { Command } from 'commander';
import { SyntheticClaudeApp } from '../core/app';
import { readFileSync, writeFileSync, unlinkSync, mkdtempSync, rmSync } from 'fs';
import { tmpdir, homedir } from 'os';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { normalizeDangerousFlags } from '../utils/banner';
import { exec } from 'child_process';
import { mkdir, readFile } from 'fs/promises';
import {
  FullConfigInstaller,
  parseConfig,
  parseConfigFromGitHub,
  ConfigValidationError,
} from '../full-config/index.js';
import { ConfigCapturer } from '../full-config/capturer.js';
import {
  encrypt,
  stringifyEncryptedData,
  isEncrypted,
  parseEncryptedData,
  decrypt,
} from '../utils/encryption.js';
import { UserInterface } from '../ui/index.js';
import { type ZodIssue } from 'zod';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function getVersion(): string {
  // Read version from version.txt first, fallback to package.json
  const versionTxtPath = join(__dirname, '../../version.txt');
  try {
    const version = readFileSync(versionTxtPath, 'utf8').trim();
    if (version) return version;
  } catch {
    // version.txt not found, fall through to package.json
  }

  // Fallback to package.json
  const packageJsonPath = join(__dirname, '../../package.json');
  return JSON.parse(readFileSync(packageJsonPath, 'utf8')).version;
}

/**
 * Opens an editor to edit the system prompt
 */
async function editSystemPrompt(): Promise<string | null> {
  const app = new SyntheticClaudeApp();
  const currentPrompt = app.getSystemPrompt() || '';

  // Create a temp directory
  const tempDir = mkdtempSync(join(tmpdir(), 'synprompt-'));
  const tempFile = join(tempDir, 'system-prompt.txt');

  try {
    // Write current prompt to temp file
    writeFileSync(tempFile, currentPrompt, 'utf-8');

    // Determine editor to use
    const editor = process.env.EDITOR || process.env.VISUAL || 'nano';

    // Open editor
    console.log(`Opening ${editor} to edit system prompt...`);
    console.log(`File: ${tempFile}`);

    await new Promise<void>((resolve, reject) => {
      const editorArgs = editor === 'vi' || editor === 'vim' ? [tempFile] : [tempFile];
      const editorCmd = editor === 'vi' || editor === 'vim' ? editor : editor;

      const child = spawn(editorCmd, editorArgs, {
        stdio: 'inherit',
      });

      child.on('exit', code => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Editor exited with code ${code}`));
        }
      });

      child.on('error', err => {
        reject(new Error(`Failed to open editor: ${err.message}`));
      });
    });

    // Read edited content
    const newPrompt = readFileSync(tempFile, 'utf-8');

    // Check if content changed
    if (newPrompt === currentPrompt) {
      console.log('No changes made to system prompt.');
      return null;
    }

    return newPrompt;
  } finally {
    // Cleanup temp file
    try {
      unlinkSync(tempFile);
      rmSync(tempDir, { recursive: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Find a local git repo matching the given owner/repo
 */
async function findLocalRepo(startPath: string, targetRepo: string): Promise<string | null> {
  const fsSync = await import('fs');

  let currentPath = startPath;

  // Check up to 10 directory levels up
  for (let i = 0; i < 10; i++) {
    try {
      const gitConfigPath = join(currentPath, '.git', 'config');
      if (fsSync.existsSync(gitConfigPath)) {
        const gitConfig = fsSync.readFileSync(gitConfigPath, 'utf-8');
        // Look for remote.origin.url
        const match = gitConfig.match(/url\s*=\s*.*[:/]([^/]+\/[^/\s\.]+?)(\.git)?\s/);
        if (match && match[1] === targetRepo) {
          return currentPath;
        }
      }
    } catch {
      // Not a git repo or error reading
    }

    const parent = dirname(currentPath);
    if (parent === currentPath) break; // Reached root
    currentPath = parent;
  }

  return null;
}

/**
 * Run a git command
 */
async function runGit(args: string[], cwd: string): Promise<void> {
  try {
    await (await import('util')).promisify(exec)(`git ${args.join(' ')}`, { cwd });
  } catch (error) {
    const err = error as { message?: string };
    if (!err.message?.includes('nothing to commit')) {
      throw error;
    }
  }
}

export function createProgram(): Command {
  const program = new Command();

  program
    .name('synpick')
    .description(
      'Interactive model selection tool for Claude Code with Synthetic AI models\n\nAdditional Claude Code flags (e.g., --dangerously-skip-permissions) are passed through to Claude Code.'
    )
    .version(getVersion());

  program
    .option('-m, --model <model>', 'Use specific model (skip selection)')
    .option(
      '-t, --thinking-model <model>',
      'Use specific thinking model (for Claude thinking mode)'
    )
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-q, --quiet', 'Suppress non-error output')
    .allowUnknownOption(true)
    .passThroughOptions(true);

  // Main command (launch Claude Code)
  program.action(async (_options, _command) => {
    const app = new SyntheticClaudeApp();
    // Get all raw args from process.argv and extract unknown options
    const rawArgs = process.argv.slice(2);
    const additionalArgs: string[] = [];
    const knownFlags = new Set([
      '--model',
      '--thinking-model',
      '--verbose',
      '--quiet',
      '--help',
      '--version',
      '-m',
      '-t',
      '-v',
      '-q',
      '-h',
      '-V',
    ]);

    for (let i = 0; i < rawArgs.length; i++) {
      const arg = rawArgs[i];
      if (arg && arg.startsWith('--')) {
        // Check if this is a known synpick option
        const flagName = arg.split('=')[0]!; // Handle --flag=value format
        if (!knownFlags.has(flagName) && !knownFlags.has(arg)) {
          additionalArgs.push(arg);
          // If this is a flag that takes a value and it's not in --flag=value format, skip the next arg
          if (
            !arg.includes('=') &&
            i + 1 < rawArgs.length &&
            rawArgs[i + 1] &&
            !rawArgs[i + 1]!.startsWith('-')
          ) {
            additionalArgs.push(rawArgs[i + 1]!);
            i++; // Skip the next argument as it's a value
          }
        }
      }
    }

    // Normalize dangerous flags
    const normalizedArgs = normalizeDangerousFlags(additionalArgs);
    await app.run({ ..._options, additionalArgs: normalizedArgs });
  });

  // Model selection command (launches after selection)
  program
    .command('model')
    .description('Interactive model selection and launch Claude Code')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-q, --quiet', 'Suppress non-error output')
    .action(async options => {
      const app = new SyntheticClaudeApp();
      await app.interactiveModelSelection();

      // After successful model selection, launch Claude Code
      const config = app.getConfig();
      if (config.selectedModel || config.selectedThinkingModel) {
        await app.run({
          verbose: options.verbose,
          quiet: options.quiet,
          model: '', // Will use saved models from config
        });
      }
    });

  // Thinking model selection command
  program
    .command('thinking-model')
    .description('Interactive thinking model selection and save to config')
    .option('-v, --verbose', 'Enable verbose logging')
    .action(async _options => {
      const app = new SyntheticClaudeApp();
      await app.interactiveThinkingModelSelection();
    });

  // Tier models selection command
  program
    .command('tiers')
    .description(
      'Interactive tier-based model selection (default, opus, sonnet, haiku, subagent, thinking)'
    )
    .alias('tier')
    .action(async () => {
      const app = new SyntheticClaudeApp();
      await app.interactiveTierSelection();
    });

  // List models command
  program
    .command('models')
    .description('List available models')
    .option('--refresh', 'Force refresh model cache')
    .action(async options => {
      const app = new SyntheticClaudeApp();
      await app.listModels(options);
    });

  // Search models command
  program
    .command('search <query>')
    .description('Search models by name or provider')
    .option('--refresh', 'Force refresh model cache')
    .action(async (query, options) => {
      const app = new SyntheticClaudeApp();
      await app.searchModels(query, options);
    });

  // Configuration commands
  const configCmd = program.command('config').description('Manage configuration');

  configCmd
    .command('show')
    .description('Show current configuration')
    .action(async () => {
      const app = new SyntheticClaudeApp();
      await app.showConfig();
    });

  configCmd
    .command('set <key> <value>')
    .description(
      'Set configuration value (keys: apiKey, baseUrl, modelsApiUrl, cacheDurationHours, selectedModel, selectedThinkingModel, autoUpdateClaudeCode, claudeCodeUpdateCheckInterval, maxTokenSize, systemPrompt)'
    )
    .action(async (key, value) => {
      const app = new SyntheticClaudeApp();
      await app.setConfig(key, value);
    });

  configCmd
    .command('reset')
    .description('Reset configuration to defaults')
    .action(async () => {
      const app = new SyntheticClaudeApp();
      await app.resetConfig();
    });

  // Setup command
  program
    .command('setup')
    .description('Run initial setup')
    .action(async () => {
      const app = new SyntheticClaudeApp();
      await app.setup();
    });

  // Doctor command - check system health
  program
    .command('doctor')
    .description('Check system health and configuration')
    .action(async () => {
      const app = new SyntheticClaudeApp();
      await app.doctor();
    });

  // Update command - update Claude Code
  program
    .command('update')
    .description('Update Claude Code to the latest version')
    .option('-f, --force', 'Force update even if already up to date')
    .action(async options => {
      const app = new SyntheticClaudeApp();
      await app.updateClaudeCode(options.force);
    });

  // Check update command - check for available updates
  program
    .command('check-update')
    .description('Check if there are Claude Code updates available')
    .action(async () => {
      const app = new SyntheticClaudeApp();
      await app.checkForUpdates();
    });

  // Dangerous command - launch Claude Code with --dangerously-skip-permissions
  program
    .command('dangerously')
    .alias('dangerous')
    .alias('dang')
    .alias('danger')
    .description('Launch with --dangerously-skip-permissions using last used provider(s)')
    .option('-v, --verbose', 'Enable verbose logging')
    .option('-q, --quiet', 'Suppress non-error output')
    .option('-f, --force', 'Force model selection even if last used provider is available')
    .action(async options => {
      const app = new SyntheticClaudeApp();
      const config = app.getConfig();

      // Check if we have saved models and user didn't force selection
      if (!options.force && (config.selectedModel || config.selectedThinkingModel)) {
        // Use existing saved models
        await app.run({
          verbose: options.verbose,
          quiet: options.quiet,
          model: '', // Will use saved models from config
          additionalArgs: ['--dangerously-skip-permissions'],
        });
      } else {
        // Need to select models first
        await app.interactiveModelSelection();

        // After successful model selection, launch Claude Code with --dangerously-skip-permissions
        const updatedConfig = app.getConfig();
        if (updatedConfig.selectedModel || updatedConfig.selectedThinkingModel) {
          await app.run({
            verbose: options.verbose,
            quiet: options.quiet,
            model: '', // Will use saved models from config
            additionalArgs: ['--dangerously-skip-permissions'],
          });
        }
      }
    });

  // Cache management
  const cacheCmd = program.command('cache').description('Manage model cache');

  cacheCmd
    .command('clear')
    .description('Clear model cache')
    .action(async () => {
      const app = new SyntheticClaudeApp();
      await app.clearCache();
    });

  cacheCmd
    .command('info')
    .description('Show cache information')
    .action(async () => {
      const app = new SyntheticClaudeApp();
      await app.cacheInfo();
    });

  // System prompt management
  const syspromptCmd = program
    .command('sysprompt')
    .description('Manage custom system prompt for Claude Code (opens editor if no subcommand)');

  syspromptCmd
    .command('set <prompt>')
    .description('Set a custom system prompt for Claude Code')
    .action(async prompt => {
      const app = new SyntheticClaudeApp();
      await app.setSystemPrompt(prompt);
    });

  syspromptCmd
    .command('show')
    .alias('get')
    .description('Show the current system prompt')
    .action(async () => {
      const app = new SyntheticClaudeApp();
      await app.showSystemPrompt();
    });

  syspromptCmd
    .command('clear')
    .description('Clear the current system prompt')
    .action(async () => {
      const app = new SyntheticClaudeApp();
      await app.clearSystemPrompt();
    });

  // If no subcommand is provided to sysprompt, open the editor
  syspromptCmd.action(async () => {
    try {
      const newPrompt = await editSystemPrompt();
      if (newPrompt !== null) {
        const app = new SyntheticClaudeApp();
        await app.setSystemPrompt(newPrompt);
      }
    } catch (error) {
      console.error(
        `Error editing system prompt: ${error instanceof Error ? error.message : String(error)}`
      );
      console.log('Tip: Try setting the EDITOR environment variable (e.g., EDITOR=vim)');
      process.exit(1);
    }
  });

  /**
   * Helper function to read and decrypt a config file if needed
   */
  async function readConfigFile(filePath: string): Promise<ReturnType<typeof parseConfig>> {
    const content = readFileSync(filePath, 'utf-8');

    // Check if the file is encrypted
    if (isEncrypted(content)) {
      const ui = new UserInterface({ quiet: false });
      console.log('🔒 This configuration file is encrypted.');

      let password: string | null = null;
      let decrypted: string | null = null;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts && !decrypted) {
        password = await ui.promptPasswordDecrypt(
          attempts > 0 ? 'Incorrect password. Try again:' : 'Enter password to decrypt the configuration'
        );

        if (!password) {
          console.log('❌ Cancelled.');
          process.exit(1);
        }

        try {
          const encryptedData = parseEncryptedData(content);
          decrypted = decrypt(encryptedData, password);
        } catch {
          attempts++;
          if (attempts < maxAttempts) {
            console.log(`Incorrect password. ${maxAttempts - attempts} attempts remaining.`);
          }
        }
      }

      if (!decrypted) {
        console.log('❌ Too many failed attempts.');
        process.exit(1);
      }

      return parseConfig(decrypted);
    }

    return parseConfig(content);
  }

  // Full-install command - install full configuration from config file or GitHub
  program
    .command('full-install [source]')
    .description('Full Claude Code configuration from a local file or GitHub repository')
    .option('--github <owner/repo>', 'GitHub repository in owner/repo format')
    .option('--branch <branch>', 'GitHub branch (default: main)')
    .option('--path <path>', 'Path to config file in repo (default: synpick-config.yaml)')
    .option('-y, --yes', 'Auto-accept all confirmations')
    .option('--dry-run', 'Show what would be done without making changes')
    .action(async (source, options) => {
      try {
        let config;
        let configRoot = '';

        // Determine config source
        if (options.github) {
          const [owner, repo] = options.github.split('/');
          if (!owner || !repo) {
            console.error('Invalid GitHub repository format. Use owner/repo');
            process.exit(1);
          }
          console.log(`Fetching configuration from GitHub: ${options.github}`);
          config = await parseConfigFromGitHub(owner, repo, options.branch, options.path);
          configRoot = `https://github.com/${options.github}/blob/${options.branch || 'main'}/`;
        } else if (source) {
          // Local file
          const filePath = source.startsWith('/') ? source : join(process.cwd(), source);
          console.log(`Reading configuration from: ${filePath}`);
          config = await readConfigFile(filePath);
          configRoot = dirname(filePath);
        } else {
          // Look for default config in current directory
          const defaultPaths = [
            join(process.cwd(), 'synpick-config.yaml'),
            join(process.cwd(), 'synpick-config.enc'),
            join(process.cwd(), '.synpick', 'config.yaml'),
            join(process.cwd(), '.github', 'synpick', 'config.yaml'),
          ];

          for (const path of defaultPaths) {
            try {
              await readFile(path, 'utf-8');
              config = await readConfigFile(path);
              configRoot = dirname(path);
              console.log(`Using configuration from: ${path}`);
              break;
            } catch {
              // Continue to next path
            }
          }

          if (!config) {
            console.error('No configuration found.');
            console.error('');
            console.error('Provide one of:');
            console.error('  - A local file path: synpick full-install ./my-config.yaml');
            console.error('  - A GitHub repo: synpick full-install --github owner/repo');
            console.error('  - Or have synpick-config.yaml in current directory');
            process.exit(1);
          }
        }

        // Create and run installer
        const installer = new FullConfigInstaller(config, configRoot);
        installer.setAutoConfirm(options.yes);
        installer.setDryRun(!!options.dryRun);
        await installer.install();
      } catch (error) {
        if (error instanceof ConfigValidationError) {
          console.error(`Configuration error: ${error.message}`);
          if (error.errors) {
            console.error('');
            console.error('Validation details:');
            error.errors.issues.forEach((err: ZodIssue) => {
              if (err.path) {
                const pathStr = err.path.map(p => String(p)).join('.');
                console.error(`  - ${pathStr} : ${err.message}`);
              } else {
                console.error(`  - ${err.message}`);
              }
            });
          }
        } else {
          console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
        process.exit(1);
      }
    });

  // Full-config commands group
  const fullConfigCmd = program
    .command('full-config')
    .description('Manage full Claude Code configurations');

  fullConfigCmd
    .command('init [name]')
    .description('Create a new synpick configuration file')
    .option('--output <file>', 'Output file path (default: synpick-config.yaml)')
    .action(async (name, options) => {
      const defaults: Record<string, unknown> = {
        version: '1',
        name: name || 'My Claude Config',
        description: 'Full configuration for Claude Code',
        Claude: {
          version: 'latest',
          channel: 'stable',
        },
        mcp: {
          filesystem: {
            type: 'builtin',
            enabled: true,
          },
        },
        scripts: [],
      };

      const yamlContent = `version: ${defaults.version}
name: "${defaults.name}"
description: "${defaults.description}"

# Claude Code installation
Claude:
  version: latest  # or specific version like "3.1.0"
  channel: stable  # stable, beta, or canary

# MCP servers
mcp:
  filesystem:
    type: builtin
    enabled: true

  # Example: You.com MCP server (npm package)
  # you:
  #   type: npm
  #   package: "@youniverse/server"
  #   enabled: true

  # Example: Custom command-based MCP server
  # my-server:
  #   type: command
  #   command: node
  #   args: ["path/to/server.js"]
  #   env:
  #     API_KEY: "your-key"

# Continuous Claude
continuous:
  enabled: false
  version: "3"

# Claude Code settings
settings:
  theme: "system"  # light, dark, or system
  disableTelemetry: false
  autoUpdate: true

# Skills to install
skills: []
  # Example:
  # - name: skill-name
  #   url: https://github.com/owner/skill-repo
  #   enabled: true

# Custom installation scripts
scripts: []
  # Example:
  # - name: "Install custom tools"
  #   path: "./scripts/custom-install.sh"
  #   shell: bash
  #   description: "Installs additional developer tools"
  #   required: false

# Synpick-specific settings
synpick: {}
  # Example:
  # model: hf:zai-org/GLM-99-Chat
  # apiKey: your-api-key
  # systemPrompt: "You are a helpful coding assistant..."
`;

      const outputFile = options.output || 'synpick-config.yaml';
      await mkdir(dirname(outputFile), { recursive: true });
      await import('fs').then(fs => fs.writeFileSync(outputFile, yamlContent, 'utf-8'));

      console.log(`Configuration file created: ${outputFile}`);
      console.log('');
      console.log('Edit this file to customize your Claude Code setup, then run:');
      console.log(`  synpick full-install ${outputFile}`);
    });

  fullConfigCmd
    .command('validate [file]')
    .description('Validate a synpick configuration file')
    .action(async file => {
      const filePath = file || 'synpick-config.yaml';
      try {
        const content = readFile(
          filePath.startsWith('/') ? filePath : join(process.cwd(), filePath),
          'utf-8'
        );
        const config = parseConfig(await content);
        console.log('✅ Configuration is valid!');
        console.log('');
        console.log(`Name: ${config.name}`);
        if (config.description) {
          console.log(`Description: ${config.description}`);
        }
      } catch (error) {
        if (error instanceof ConfigValidationError) {
          console.error('❌ Configuration is invalid!');
          console.error('');
          console.error(error.message);
          if (error.errors) {
            console.error('');
            console.error('Validation errors:');
            error.errors.issues.forEach((err: ZodIssue) => {
              if (err.path) {
                const pathStr = err.path.map(p => String(p)).join('.');
                console.error(`  - ${pathStr} : ${err.message}`);
              } else {
                console.error(`  - ${err.message}`);
              }
            });
          }
        } else {
          console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        }
        process.exit(1);
      }
    });

  fullConfigCmd
    .command('list-saved')
    .description('List saved configuration files')
    .action(async () => {
      const configDir = join(homedir(), '.synpick', 'configs');
      const { readdirSync } = await import('fs');
      try {
        const files = readdirSync(configDir);
        console.log('Saved configurations:');
        files.forEach((f: string) => console.log(`  - ${f}`));
      } catch {
        console.log('No saved configurations found.');
      }
    });

  fullConfigCmd
    .command('save <file> [name]')
    .description('Save a configuration file to ~/.synpick/configs/')
    .action(async (file, name) => {
      const configName = name || file.split('/').pop() || 'config';
      const configDir = join(homedir(), '.synpick', 'configs');
      await mkdir(configDir, { recursive: true });

      const content = await readFile(
        file.startsWith('/') ? file : join(process.cwd(), file),
        'utf-8'
      );
      await import('fs').then(fs =>
        fs.writeFileSync(join(configDir, configName), content, 'utf-8')
      );

      console.log(`Configuration saved as: ${configName}`);
      console.log(`Use: synpick full-install ${join(configDir, configName)}`);
    });

  // Save-config command - capture current config and save/push to GitHub
  program
    .command('save-config <target>')
    .description('Capture current Claude Code configuration and save to GitHub')
    .option('--local-only', 'Save locally only, do not push to GitHub')
    .option('--name <name>', 'Configuration name (default: Claude Setup)')
    .option('--description <desc>', 'Configuration description')
    .option('--output <file>', 'Local output file path')
    .option('--branch <branch>', 'Target branch (default: main)')
    .option('-e, --encrypt', 'Encrypt the configuration file with a password')
    .action(async (target, options) => {
      try {
        console.log('🔍 Capturing current configuration...\n');

        const ui = options.encrypt ? new UserInterface({ quiet: false }) : null;

        // Prompt for password if encryption is requested
        let password: string | null = null;
        if (options.encrypt) {
          // ui is non-null when options.encrypt is true
          const uiNotNull = ui!;
          password = await uiNotNull.promptPasswordCreate({
            prompt: 'Enter password to encrypt configuration',
            minLength: 8,
          });
          if (!password) {
            console.log('❌ Password input cancelled.');
            process.exit(1);
          }
        }

        // Parse target format: owner/repo/path OR just filename for local-only
        const isLocalOnly = options.localOnly || !target.includes('/');

        let owner: string | undefined;
        let repo: string | undefined;
        let pathInRepo: string;
        let localPath: string;

        if (isLocalOnly) {
          // Local-only mode
          pathInRepo = target.includes('/')
            ? target.split('/').pop() || 'synpick-config.yaml'
            : target;
          localPath = options.output || join(process.cwd(), pathInRepo);
        } else {
          // GitHub mode: owner/repo/path
          const parts = target.split('/');
          if (parts.length < 2) {
            console.error(
              'Invalid target format. Use: owner/repo/path.yaml or just filename for --local-only'
            );
            process.exit(1);
          }
          owner = parts[0];
          repo = parts[1];
          pathInRepo = parts.slice(2).join('/') || 'synpick-config.yaml';
          localPath = options.output || join(process.cwd(), basename(pathInRepo));
        }

        const configName = options.name || 'Claude Setup';
        const description = options.description;

        // Capture current configuration
        const capturer = new ConfigCapturer();
        const config = await capturer.capture(configName, {
          includeApiKey: false,
          description,
        });

        // Generate YAML
        const yamlContent = capturer.toYaml(config);

        // Encrypt if requested, otherwise save as YAML
        let contentToSave: string;
        let fileExtension: string;
        if (password) {
          const encrypted = encrypt(yamlContent, password);
          contentToSave = stringifyEncryptedData(encrypted);
          fileExtension = '.enc';
          // Update local path if encryption is on and no custom output specified
          if (!options.output) {
            localPath = localPath.replace(/\.ya?ml$/i, '') + '.enc';
          }
        } else {
          contentToSave = yamlContent;
          fileExtension = 'yaml';
        }

        // Save locally first
        const fs = await import('fs');
        fs.writeFileSync(localPath, contentToSave, 'utf-8');

        console.log(`✅ Configuration captured and saved to: ${localPath}`);
        if (password) {
          console.log('🔒 File is encrypted with AES-256-GCM');
          console.log('   Remember your password - it is required to decrypt this file!');
        }
        console.log('');
        console.log('Captured items:');
        if (config.Claude) {
          console.log(`  - Claude Code (channel: ${config.Claude.channel})`);
        }
        if (config.mcp && Object.keys(config.mcp).length > 0) {
          console.log(`  - MCP servers: ${Object.keys(config.mcp).join(', ')}`);
        }
        if (config.skills && config.skills.length > 0) {
          console.log(`  - Skills: ${config.skills.map(s => s.name).join(', ')}`);
        }
        if (config.settings) {
          console.log(`  - Claude Code settings`);
        }
        if (config.synpick) {
          console.log(`  - Synpick settings`);
        }
        console.log('');

        // Push to GitHub if not local-only
        if (!isLocalOnly) {
          console.log(`📤 Pushing to GitHub: ${owner}/${repo}/${pathInRepo}`);

          // Check if target repo exists locally
          const localRepoPath = await findLocalRepo(process.cwd(), `${owner}/${repo}`);

          if (localRepoPath) {
            console.log(`  Using existing local repo: ${localRepoPath}`);

            // Copy config to target path in repo
            const targetPath = join(localRepoPath, pathInRepo);
            await mkdir(dirname(targetPath), { recursive: true });
            fs.writeFileSync(targetPath, contentToSave, 'utf-8');

            // Add, commit, and push
            await runGit(['add', pathInRepo], localRepoPath);
            await runGit(
              ['commit', '-m', `Update Claude Code configuration: ${configName}`],
              localRepoPath
            );
            await runGit(['push'], localRepoPath);

            console.log(
              `✅ Pushed to: https://github.com/${owner}/${repo}/blob/${options.branch || 'main'}/${pathInRepo}`
            );
          } else {
            console.log(`  ⚠️  Could not find local repo for ${owner}/${repo}`);
            console.log('');
            console.log('Please clone the repository first and run save-config from within it,');
            console.log('or manually commit and push the file:');
            console.log('');
            console.log(`  git clone https://github.com/${owner}/${repo}.git`);
            console.log('  cd <repo>');
            console.log(`  cp ${localPath} ${pathInRepo}`);
            console.log('  git add .');
            console.log('  git commit -m "Add Claude Code configuration"');
            console.log('  git push');
          }
        }
      } catch (error) {
        console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
      }
    });

  // Install command - install synpick from local directory to system-wide
  program
    .command('install')
    .description('Install synpick from local directory to system-wide')
    .option('-v, --verbose', 'Show detailed installation output')
    .option('-f, --force', 'Force reinstallation even if already installed')
    .option('--skip-path', 'Skip PATH updates')
    .action(async options => {
      const app = new SyntheticClaudeApp();
      await app.localInstall(options);
    });

  return program;
}
