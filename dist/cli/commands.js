"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProgram = createProgram;
const commander_1 = require("commander");
const app_1 = require("../core/app");
const fs_1 = require("fs");
const path_1 = require("path");
const banner_1 = require("../utils/banner");
function createProgram() {
    const program = new commander_1.Command();
    // Read version from package.json
    const packageJsonPath = (0, path_1.join)(__dirname, '../../package.json');
    const packageVersion = JSON.parse((0, fs_1.readFileSync)(packageJsonPath, 'utf8')).version;
    program
        .name('synclaude')
        .description('Interactive model selection tool for Claude Code with Synthetic AI models\n\nAdditional Claude Code flags (e.g., --dangerously-skip-permissions) are passed through to Claude Code.')
        .version(packageVersion);
    program
        .option('-m, --model <model>', 'Use specific model (skip selection)')
        .option('-t, --thinking-model <model>', 'Use specific thinking model (for Claude thinking mode)')
        .option('-v, --verbose', 'Enable verbose logging')
        .option('-q, --quiet', 'Suppress non-error output')
        .allowUnknownOption(true)
        .passThroughOptions(true);
    // Main command (launch Claude Code)
    program
        .action(async (options, command) => {
        const app = new app_1.SyntheticClaudeApp();
        // Get all raw args from process.argv and extract unknown options
        const rawArgs = process.argv.slice(2);
        const additionalArgs = [];
        const knownFlags = new Set(['--model', '--thinking-model', '--verbose', '--quiet', '--help', '--version', '-m', '-t', '-v', '-q', '-h', '-V']);
        for (let i = 0; i < rawArgs.length; i++) {
            const arg = rawArgs[i];
            if (arg && arg.startsWith('--')) {
                // Check if this is a known synclaude option
                const flagName = arg.split('=')[0]; // Handle --flag=value format
                if (!knownFlags.has(flagName) && !knownFlags.has(arg)) {
                    additionalArgs.push(arg);
                    // If this is a flag that takes a value and it's not in --flag=value format, skip the next arg
                    if (!arg.includes('=') && i + 1 < rawArgs.length && rawArgs[i + 1] && !rawArgs[i + 1].startsWith('-')) {
                        additionalArgs.push(rawArgs[i + 1]);
                        i++; // Skip the next argument as it's a value
                    }
                }
            }
        }
        // Normalize dangerous flags
        const normalizedArgs = (0, banner_1.normalizeDangerousFlags)(additionalArgs);
        await app.run({ ...options, additionalArgs: normalizedArgs });
    });
    // Model selection command (launches after selection)
    program
        .command('model')
        .description('Interactive model selection and launch Claude Code')
        .option('-v, --verbose', 'Enable verbose logging')
        .option('-q, --quiet', 'Suppress non-error output')
        .action(async (options) => {
        const app = new app_1.SyntheticClaudeApp();
        await app.interactiveModelSelection();
        // After successful model selection, launch Claude Code
        const config = app.getConfig();
        if (config.selectedModel || config.selectedThinkingModel) {
            await app.run({
                verbose: options.verbose,
                quiet: options.quiet,
                model: '' // Will use saved models from config
            });
        }
    });
    // Thinking model selection command
    program
        .command('thinking-model')
        .description('Interactive thinking model selection and save to config')
        .option('-v, --verbose', 'Enable verbose logging')
        .action(async (options) => {
        const app = new app_1.SyntheticClaudeApp();
        await app.interactiveThinkingModelSelection();
    });
    // List models command
    program
        .command('models')
        .description('List available models')
        .option('--refresh', 'Force refresh model cache')
        .action(async (options) => {
        const app = new app_1.SyntheticClaudeApp();
        await app.listModels(options);
    });
    // Search models command
    program
        .command('search <query>')
        .description('Search models by name or provider')
        .option('--refresh', 'Force refresh model cache')
        .action(async (query, options) => {
        const app = new app_1.SyntheticClaudeApp();
        await app.searchModels(query, options);
    });
    // Configuration commands
    const configCmd = program
        .command('config')
        .description('Manage configuration');
    configCmd
        .command('show')
        .description('Show current configuration')
        .action(async () => {
        const app = new app_1.SyntheticClaudeApp();
        await app.showConfig();
    });
    configCmd
        .command('set <key> <value>')
        .description('Set configuration value (keys: apiKey, baseUrl, modelsApiUrl, cacheDurationHours, selectedModel, selectedThinkingModel)')
        .action(async (key, value) => {
        const app = new app_1.SyntheticClaudeApp();
        await app.setConfig(key, value);
    });
    configCmd
        .command('reset')
        .description('Reset configuration to defaults')
        .action(async () => {
        const app = new app_1.SyntheticClaudeApp();
        await app.resetConfig();
    });
    // Setup command
    program
        .command('setup')
        .description('Run initial setup')
        .action(async () => {
        const app = new app_1.SyntheticClaudeApp();
        await app.setup();
    });
    // Doctor command - check system health
    program
        .command('doctor')
        .description('Check system health and configuration')
        .action(async () => {
        const app = new app_1.SyntheticClaudeApp();
        await app.doctor();
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
        .action(async (options) => {
        const app = new app_1.SyntheticClaudeApp();
        const config = app.getConfig();
        // Check if we have saved models and user didn't force selection
        if (!options.force && (config.selectedModel || config.selectedThinkingModel)) {
            // Use existing saved models
            await app.run({
                verbose: options.verbose,
                quiet: options.quiet,
                model: '', // Will use saved models from config
                additionalArgs: ['--dangerously-skip-permissions']
            });
        }
        else {
            // Need to select models first
            await app.interactiveModelSelection();
            // After successful model selection, launch Claude Code with --dangerously-skip-permissions
            const updatedConfig = app.getConfig();
            if (updatedConfig.selectedModel || updatedConfig.selectedThinkingModel) {
                await app.run({
                    verbose: options.verbose,
                    quiet: options.quiet,
                    model: '', // Will use saved models from config
                    additionalArgs: ['--dangerously-skip-permissions']
                });
            }
        }
    });
    // Cache management
    const cacheCmd = program
        .command('cache')
        .description('Manage model cache');
    cacheCmd
        .command('clear')
        .description('Clear model cache')
        .action(async () => {
        const app = new app_1.SyntheticClaudeApp();
        await app.clearCache();
    });
    cacheCmd
        .command('info')
        .description('Show cache information')
        .action(async () => {
        const app = new app_1.SyntheticClaudeApp();
        await app.cacheInfo();
    });
    return program;
}
//# sourceMappingURL=commands.js.map