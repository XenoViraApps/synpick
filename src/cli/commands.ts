import { Command } from 'commander';
import { SyntheticClaudeApp } from '../core/app';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { normalizeDangerousFlags } from '../utils/banner';

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
      'Set configuration value (keys: apiKey, baseUrl, modelsApiUrl, cacheDurationHours, selectedModel, selectedThinkingModel, autoUpdateClaudeCode, claudeCodeUpdateCheckInterval, maxTokenSize)'
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
