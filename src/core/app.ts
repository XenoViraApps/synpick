import { join } from 'path';
import { homedir } from 'os';
import { ConfigManager } from '../config';
import { ModelManager } from '../models';
import { UserInterface } from '../ui';
import { ClaudeLauncher, LaunchOptions } from '../launcher';
import { ModelInfoImpl } from '../models';
import { setupLogging, log } from '../utils/logger';
import { createBanner, normalizeDangerousFlags } from '../utils/banner';
import { ClaudeCodeManager, ClaudeCodeManager as ClaudeCodeManagerClass } from '../claude';

export interface AppOptions {
  verbose?: boolean;
  quiet?: boolean;
  additionalArgs?: string[];
  thinkingModel?: string;
}

export class SyntheticClaudeApp {
  private configManager: ConfigManager;
  private ui: UserInterface;
  private launcher: ClaudeLauncher;
  private modelManager: ModelManager | null = null;
  private claudeCodeManager: ClaudeCodeManagerClass;

  constructor() {
    this.configManager = new ConfigManager();
    this.ui = new UserInterface({
      verbose: this.configManager.config.apiKey
        ? this.configManager.config.cacheDurationHours > 0
        : false,
    });
    this.launcher = new ClaudeLauncher();
    this.claudeCodeManager = new ClaudeCodeManager();
  }

  async setupLogging(options: AppOptions): Promise<void> {
    setupLogging(options.verbose, options.quiet);
    // Removed verbose startup log
  }

  getConfig() {
    return this.configManager.config;
  }

  private getModelManager(): ModelManager {
    if (!this.modelManager) {
      const config = this.configManager.config;
      const cacheFile = join(homedir(), '.config', 'synclaude', 'models_cache.json');

      this.modelManager = new ModelManager({
        apiKey: config.apiKey,
        modelsApiUrl: config.modelsApiUrl,
        cacheFile,
        cacheDurationHours: config.cacheDurationHours,
      });
    }

    return this.modelManager;
  }

  async run(options: AppOptions & LaunchOptions): Promise<void> {
    // Normalize dangerous flags first
    if (options.additionalArgs) {
      options.additionalArgs = normalizeDangerousFlags(options.additionalArgs);
    }

    await this.setupLogging(options);

    // Display banner unless quiet mode
    if (!options.quiet) {
      console.log(createBanner(options));
    }

    // Check for Claude Code updates if enabled
    await this.ensureClaudeCodeUpdated();

    // Handle first-time setup
    if (this.configManager.isFirstRun()) {
      await this.setup();
      return;
    }

    // Get model to use
    const model = await this.selectModel(options.model);
    if (!model) {
      this.ui.error('No model selected');
      return;
    }

    // Get thinking model to use (if specified)
    const thinkingModel = await this.selectThinkingModel(options.thinkingModel);

    // Launch Claude Code
    await this.launchClaudeCode(model, options, thinkingModel);
  }

  /**
   * Check and update Claude Code if needed
   * Skips if autoupdate is disabled or if it hasn't been long enough since last check
   */
  async ensureClaudeCodeUpdated(): Promise<void> {
    const config = this.configManager.config;

    // Check if auto-update is enabled
    if (!config.autoUpdateClaudeCode) {
      return;
    }

    // Check if we should run an update check based on interval
    const shouldCheck = this.claudeCodeManager.shouldCheckUpdate(
      config.lastClaudeCodeUpdateCheck,
      config.claudeCodeUpdateCheckInterval
    );

    if (!shouldCheck) {
      return;
    }

    // Perform the update check
    const updateInfo = await this.claudeCodeManager.checkForUpdates();

    // Update the last check timestamp
    await this.configManager.updateConfig({
      lastClaudeCodeUpdateCheck: ClaudeCodeManager.getCurrentTimestamp(),
    });

    // Show update message if available
    if (updateInfo.hasUpdate && updateInfo.isNpmInstalled) {
      this.ui.info(`\nNew version of Claude Code available: ${updateInfo.latestVersion}`);
      this.ui.info(`Current version: ${updateInfo.currentVersion || 'Not installed'}`);
      this.ui.info('Run "synclaude update" to update Claude Code\n');
    }
  }

  /**
   * Update synclaude and Claude Code to the latest version
   */
  async updateClaudeCode(force: boolean = false): Promise<void> {
    // Update synclaude itself first
    await this.updateSynclaudeSelf(force);

    // Then update Claude Code
    this.ui.info('Checking for Claude Code updates...');

    // Check if Claude Code is installed via npm
    const isNpmInstalled = (await this.claudeCodeManager.getNpmInstalledVersion()) !== null;
    const updateInfo = await this.claudeCodeManager.checkForUpdates({ useActualVersion: true });

    // Check if update is needed
    if (!force && !updateInfo.hasUpdate) {
      this.ui.info('Claude Code is already up to date');
      return;
    }

    let result;
    if (isNpmInstalled) {
      // Use npm update
      result = await this.claudeCodeManager.installOrUpdate({ force });
    } else {
      // Use official installer
      result = await this.claudeCodeManager.runOfficialInstaller();
    }

    if (result.success) {
      switch (result.action) {
        case 'installed':
          this.ui.coloredSuccess(`Claude Code installed: ${result.newVersion}`);
          break;
        case 'updated':
          const prevMsg = result.previousVersion ? ` (was ${result.previousVersion})` : '';
          this.ui.coloredSuccess(`Claude Code updated to ${result.newVersion}${prevMsg}`);
          break;
        case 'none':
          this.ui.info('Claude Code is already up to date');
          break;
      }
    } else {
      this.ui.error(`Failed to update Claude Code: ${result.error}`);
    }
  }

  /**
   * Compare two semver versions
   * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
   */
  private compareVersions(v1: string, v2: string): number {
    const cleanV1 = v1.replace(/^v/, '');
    const cleanV2 = v2.replace(/^v/, '');
    const parts1 = cleanV1.split('.').map(Number);
    const parts2 = cleanV2.split('.').map(Number);

    for (let i = 0; i < 3; i++) {
      const p1 = parts1[i] || 0;
      const p2 = parts2[i] || 0;
      if (p1 > p2) return 1;
      if (p1 < p2) return -1;
    }
    return 0;
  }

  /**
   * Get latest synclaude version from GitHub repository
   */
  private async getLatestGitHubVersion(): Promise<string | null> {
    const axios = require('axios');
    const GITHUB_REPO = 'jeffersonwarrior/synclaude';

    try {
      // Try GitHub releases API first
      const response = await axios.get(
        `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
      );
      return response.data.tag_name?.replace(/^v/, '') || null;
    } catch {
      try {
        // Fallback: fetch package.json from main branch
        const response = await axios.get(
          `https://raw.githubusercontent.com/${GITHUB_REPO}/main/package.json`
        );
        return response.data.version || null;
      } catch {
        return null;
      }
    }
  }

  /**
   * Update synclaude itself via npm
   */
  private async updateSynclaudeSelf(force: boolean = false): Promise<void> {
    const { execSync } = require('child_process');
    const axios = require('axios');

    try {
      // Get current synclaude version
      const currentVersion = execSync('synclaude --version', { encoding: 'utf-8' }).trim();
      this.ui.info(`Current synclaude version: ${currentVersion}`);

      this.ui.info('Checking for synclaude updates...');

      // Check for latest version from GitHub repository
      const latestVersion = await this.getLatestGitHubVersion();

      if (!latestVersion) {
        this.ui.info('Could not check for updates from GitHub. Using npm registry as fallback...');
        // Fallback to npm registry
        try {
          const npmVersion = execSync('npm view synclaude version', { encoding: 'utf-8' }).trim();
          this.ui.info(`Latest synclaude version on npm: ${npmVersion}`);
        } catch {
          this.ui.info('Could not check npm registry either');
        }
        this.ui.info('Run the installer manually to update:');
        this.ui.info(
          '  curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synclaude/main/scripts/install.sh | bash'
        );
        return;
      }

      this.ui.info(`Latest synclaude version: ${latestVersion}`);

      // Compare versions - only update if latest is newer
      const comparison = this.compareVersions(latestVersion, currentVersion);

      if (comparison <= 0 && !force) {
        if (comparison === 0) {
          this.ui.info('Synclaude is already up to date');
        } else {
          this.ui.info(
            `Current version (${currentVersion}) is newer than available (${latestVersion})`
          );
        }
        return;
      }

      // Update synclaude via the install script
      this.ui.info('Updating synclaude from GitHub...');

      try {
        // Download and run the installer from GitHub
        execSync(
          `curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synclaude/main/scripts/install.sh | bash`,
          { stdio: 'pipe' }
        );
      } catch {
        this.ui.info('Remote installer failed, trying npm install...');

        // Fallback: try npm install from GitHub
        // Note: we can't direct install from GitHub due to npm limitations,
        // but we can try to update if the user has npm access
        try {
          execSync('npm install -g synclaude@latest', { stdio: 'pipe' });
        } catch {
          // Final fallback - show manual instructions
          this.ui.info('Automatic update failed');
          this.ui.info('Please update manually:');
          this.ui.info(
            '  curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synclaude/main/scripts/install.sh | bash'
          );
          throw new Error('Automatic update unavailable');
        }
      }

      // Verify the update
      const newVersion = execSync('synclaude --version', { encoding: 'utf-8' }).trim();

      if (newVersion === latestVersion || force) {
        const prevMsg = currentVersion !== newVersion ? ` (was ${currentVersion})` : '';
        this.ui.coloredSuccess(`Synclaude updated to ${newVersion}${prevMsg}`);
      } else {
        this.ui.info(`Synclaude is now ${newVersion}, latest available is ${latestVersion}`);
      }
    } catch (error) {
      this.ui.error(
        `Failed to update synclaude: ${error instanceof Error ? error.message : String(error)}`
      );
      this.ui.info('Try manual installation:');
      this.ui.info(
        '  curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synclaude/main/scripts/install.sh | bash'
      );
      // Don't exit - continue to try updating Claude Code
    }
  }

  /**
   * Check if there are available updates without installing
   */
  async checkForUpdates(): Promise<void> {
    this.ui.info('Checking for Claude Code updates...');

    const updateInfo = await this.claudeCodeManager.checkForUpdates({ useActualVersion: true });

    if (!updateInfo.currentVersion && !updateInfo.latestVersion) {
      this.ui.error('Could not check for updates. Make sure npm is configured correctly.');
      return;
    }

    this.ui.info(`Current version: ${updateInfo.currentVersion || 'Not installed'}`);
    this.ui.info(`Latest version: ${updateInfo.latestVersion || 'Unknown'}`);

    if (updateInfo.isNpmInstalled) {
      if (updateInfo.hasUpdate) {
        this.ui.coloredSuccess('\nUpdate available!');
        this.ui.info('Run "synclaude update" to update Claude Code\n');
      } else {
        this.ui.info('\nClaude Code is up to date\n');
      }
    } else {
      this.ui.info('\nNote: Claude Code was not installed via npm.');
      this.ui.info('To update, run: curl -fsSL https://claude.ai/install.sh | bash');
      this.ui.info('Or reinstall using the method you originally used.\n');
    }
  }

  async interactiveModelSelection(): Promise<boolean> {
    if (!this.configManager.hasApiKey()) {
      this.ui.error('No API key configured. Please run "synclaude setup" first.');
      return false;
    }

    try {
      const modelManager = this.getModelManager();
      this.ui.coloredInfo('Fetching available models...');
      const models = await modelManager.fetchModels();

      if (models.length === 0) {
        this.ui.error('No models available. Please check your API key and connection.');
        return false;
      }

      // Sort models for consistent display
      const sortedModels = modelManager.getModels(models);
      const { regular: selectedRegularModel, thinking: selectedThinkingModel } =
        await this.ui.selectDualModels(sortedModels);

      if (!selectedRegularModel && !selectedThinkingModel) {
        this.ui.info('Model selection cancelled');
        return false;
      }

      // Save models to config
      if (selectedRegularModel) {
        await this.configManager.setSavedModel(selectedRegularModel.id);
        this.ui.coloredSuccess(`Regular model saved: ${selectedRegularModel.getDisplayName()}`);
      }

      if (selectedThinkingModel) {
        await this.configManager.setSavedThinkingModel(selectedThinkingModel.id);
        this.ui.coloredSuccess(`Thinking model saved: ${selectedThinkingModel.getDisplayName()}`);
      }

      this.ui.highlightInfo(
        'Now run "synclaude" to start Claude Code with your selected model(s).',
        ['synclaude']
      );
      return true;
    } catch (error) {
      this.ui.error(`Error during model selection: ${error}`);
      return false;
    }
  }

  async interactiveThinkingModelSelection(): Promise<boolean> {
    if (!this.configManager.hasApiKey()) {
      this.ui.error('No API key configured. Please run "synclaude setup" first.');
      return false;
    }

    try {
      const modelManager = this.getModelManager();
      this.ui.coloredInfo('Fetching available models...');
      const models = await modelManager.fetchModels();

      if (models.length === 0) {
        this.ui.error('No models available. Please check your API key and connection.');
        return false;
      }

      // Sort models for consistent display
      const sortedModels = modelManager.getModels(models);
      const selectedThinkingModel = await this.ui.selectModel(sortedModels);
      if (!selectedThinkingModel) {
        this.ui.info('Thinking model selection cancelled');
        return false;
      }

      await this.configManager.updateConfig({ selectedThinkingModel: selectedThinkingModel.id });
      this.ui.coloredSuccess(`Thinking model saved: ${selectedThinkingModel.getDisplayName()}`);
      this.ui.highlightInfo(
        'Now run "synclaude --thinking-model" to start Claude Code with this thinking model.',
        ['synclaude', '--thinking-model']
      );
      return true;
    } catch (error) {
      this.ui.error(`Error during thinking model selection: ${error}`);
      return false;
    }
  }

  async listModels(options: { refresh?: boolean }): Promise<void> {
    log.info('Listing models', { options });

    if (!this.configManager.hasApiKey()) {
      this.ui.error('No API key configured. Please run "synclaude setup" first.');
      return;
    }

    try {
      const modelManager = this.getModelManager();
      this.ui.coloredInfo('Fetching available models...');
      const models = await modelManager.fetchModels(options.refresh);

      // Sort and display all models
      const sortedModels = modelManager.getModels(models);
      this.ui.showModelList(sortedModels);
    } catch (error) {
      this.ui.error(`Error fetching models: ${error}`);
    }
  }

  async searchModels(query: string, options: { refresh?: boolean }): Promise<void> {
    log.info('Searching models', { query, options });

    if (!this.configManager.hasApiKey()) {
      this.ui.error('No API key configured. Please run "synclaude setup" first.');
      return;
    }

    try {
      const modelManager = this.getModelManager();
      this.ui.coloredInfo(`Searching for models matching "${query}"...`);
      const models = await modelManager.searchModels(query, undefined);

      if (models.length === 0) {
        this.ui.info(`No models found matching "${query}"`);
        return;
      }

      this.ui.coloredInfo(
        `Found ${models.length} model${models.length === 1 ? '' : 's'} matching "${query}":`
      );
      this.ui.showModelList(models);
    } catch (error) {
      this.ui.error(`Error searching models: ${error}`);
    }
  }

  async showConfig(): Promise<void> {
    const config = this.configManager.config;

    this.ui.info('Current Configuration:');
    this.ui.info('=====================');
    this.ui.info(`API Key: ${config.apiKey ? '••••••••' + config.apiKey.slice(-4) : 'Not set'}`);
    this.ui.info(`Base URL: ${config.baseUrl}`);
    this.ui.info(`Models API: ${config.modelsApiUrl}`);
    this.ui.info(`Cache Duration: ${config.cacheDurationHours} hours`);
    this.ui.info(`Selected Model: ${config.selectedModel || 'None'}`);
    this.ui.info(`Selected Thinking Model: ${config.selectedThinkingModel || 'None'}`);
    this.ui.info(`First Run Completed: ${config.firstRunCompleted}`);
    this.ui.info(`Auto-update Claude Code: ${config.autoUpdateClaudeCode ? 'Yes' : 'No'}`);
    this.ui.info(`Update Check Interval: ${config.claudeCodeUpdateCheckInterval} hours`);
    this.ui.info(`Max Token Size: ${config.maxTokenSize}`);
  }

  async setConfig(key: string, value: string): Promise<void> {
    // Simple key-value config setting
    const updates: Record<string, any> = {};

    switch (key) {
      case 'apiKey':
        updates.apiKey = value;
        break;
      case 'baseUrl':
        updates.baseUrl = value;
        break;
      case 'modelsApiUrl':
        updates.modelsApiUrl = value;
        break;
      case 'cacheDurationHours':
        updates.cacheDurationHours = parseInt(value, 10);
        break;
      case 'selectedModel':
        updates.selectedModel = value;
        break;
      case 'selectedThinkingModel':
        updates.selectedThinkingModel = value;
        break;
      case 'autoUpdateClaudeCode':
        updates.autoUpdateClaudeCode = value.toLowerCase() === 'true' || value === '1';
        break;
      case 'claudeCodeUpdateCheckInterval':
        updates.claudeCodeUpdateCheckInterval = parseInt(value, 10);
        break;
      case 'maxTokenSize':
        updates.maxTokenSize = parseInt(value, 10);
        break;
      default:
        this.ui.error(`Unknown configuration key: ${key}`);
        return;
    }

    const success = await this.configManager.updateConfig(updates);
    if (success) {
      this.ui.success(`Configuration updated: ${key} = ${value}`);
    } else {
      this.ui.error(`Failed to update configuration: ${key}`);
    }
  }

  async resetConfig(): Promise<void> {
    const confirmed = await this.ui.confirm(
      'Are you sure you want to reset all configuration to defaults?'
    );
    if (!confirmed) {
      this.ui.info('Configuration reset cancelled');
      return;
    }

    // Clear config
    await this.configManager.saveConfig(require('../config').AppConfigSchema.parse({}));
    this.ui.success('Configuration reset to defaults');
  }

  async setup(): Promise<void> {
    this.ui.coloredInfo("Welcome to Synclaude! Let's set up your configuration.");
    this.ui.info('==============================================');

    const config = this.configManager.config;

    // Get API key if not set
    let apiKey = config.apiKey;
    if (!apiKey) {
      apiKey = await this.ui.askPassword('Enter your Synthetic API key');
      if (!apiKey) {
        this.ui.error('API key is required');
        return;
      }
    }

    // Update config with API key
    const success = await this.configManager.setApiKey(apiKey);
    if (!success) {
      this.ui.error('Failed to save API key');
      return;
    }

    this.ui.coloredSuccess('API key saved');

    // Optional: Test API connection
    const testConnection = await this.ui.confirm('Test API connection?', true);
    if (testConnection) {
      try {
        const modelManager = this.getModelManager();
        this.ui.coloredInfo('Testing connection...');
        const models = await modelManager.fetchModels(true);
        this.ui.coloredSuccess(`Connection successful! Found ${models.length} models`);
      } catch (error) {
        this.ui.error(`Connection failed: ${error}`);
        return;
      }
    }

    // Interactive model selection
    const selectModel = await this.ui.confirm('Select a model now?', true);
    if (selectModel) {
      await this.interactiveModelSelection();
    }

    // Mark first run as completed
    await this.configManager.markFirstRunCompleted();

    this.ui.coloredSuccess('Setup completed successfully!');
    this.ui.highlightInfo('You can now run "synclaude" to launch Claude Code', ['synclaude']);
  }

  async doctor(): Promise<void> {
    this.ui.info('System Health Check');
    this.ui.info('===================');

    // Check Claude Code installation
    const claudeInstalled = await this.launcher.checkClaudeInstallation();
    this.ui.showStatus(
      claudeInstalled ? 'success' : 'error',
      `Claude Code: ${claudeInstalled ? 'Installed' : 'Not found'}`
    );

    if (claudeInstalled) {
      const version = await this.launcher.getClaudeVersion();
      if (version) {
        this.ui.info(`Claude Code version: ${version}`);
      }

      // Check for updates
      const updateInfo = await this.claudeCodeManager.checkForUpdates({ useActualVersion: true });
      if (updateInfo.isNpmInstalled) {
        if (updateInfo.hasUpdate) {
          this.ui.showStatus(
            'warning',
            `Update available: ${updateInfo.currentVersion} -> ${updateInfo.latestVersion}`
          );
          this.ui.info('Run "synclaude update" to update Claude Code');
        } else if (updateInfo.currentVersion) {
          this.ui.showStatus('success', `Claude Code is up to date (${updateInfo.currentVersion})`);
        }
      } else {
        this.ui.info(
          'Claude Code is not installed via npm - use your original install method to update'
        );
      }
    }

    // Check configuration
    this.ui.showStatus(
      this.configManager.hasApiKey() ? 'success' : 'error',
      'Configuration: API key ' + (this.configManager.hasApiKey() ? 'configured' : 'missing')
    );

    // Check API connection
    if (this.configManager.hasApiKey()) {
      try {
        const modelManager = this.getModelManager();
        const models = await modelManager.fetchModels(true);
        this.ui.showStatus('success', `API connection: OK (${models.length} models)`);
      } catch (error) {
        this.ui.showStatus('error', `API connection: Failed (${error})`);
      }
    }

    // Configuration summary
    const config = this.configManager.config;
    this.ui.info(
      `Auto-update Claude Code: ${config.autoUpdateClaudeCode ? 'Enabled' : 'Disabled'}`
    );
    this.ui.info(`Max Token Size: ${config.maxTokenSize}`);
  }

  async clearCache(): Promise<void> {
    const modelManager = this.getModelManager();
    const success = await modelManager.clearCache();

    if (success) {
      this.ui.success('Model cache cleared');
    } else {
      this.ui.error('Failed to clear cache');
    }
  }

  async cacheInfo(): Promise<void> {
    const modelManager = this.getModelManager();
    const cacheInfo = await modelManager.getCacheInfo();

    this.ui.info('Cache Information:');
    this.ui.info('==================');

    if (cacheInfo.exists) {
      this.ui.info(`Status: ${cacheInfo.isValid ? 'Valid' : 'Expired'}`);
      this.ui.info(`File: ${cacheInfo.filePath}`);
      this.ui.info(`Size: ${cacheInfo.sizeBytes} bytes`);
      this.ui.info(`Models: ${cacheInfo.modelCount}`);
      this.ui.info(`Modified: ${cacheInfo.modifiedTime}`);
    } else {
      this.ui.info('Status: No cache file');
    }
  }

  private async selectModel(preselectedModel?: string): Promise<string | null> {
    if (preselectedModel) {
      return preselectedModel;
    }

    // Use saved model if available, otherwise show error
    if (this.configManager.hasSavedModel()) {
      return this.configManager.getSavedModel();
    }

    this.ui.error('No model selected. Run "synclaude model" to select a model.');
    return null;
  }

  private async selectThinkingModel(preselectedThinkingModel?: string): Promise<string | null> {
    if (preselectedThinkingModel) {
      return preselectedThinkingModel;
    }

    // Use saved thinking model if available
    if (this.configManager.hasSavedThinkingModel()) {
      return this.configManager.getSavedThinkingModel();
    }

    return null; // Thinking model is optional
  }

  /**
   * Install synclaude from local directory to system-wide
   * Builds the project and uses npm link -g for system-wide installation
   */
  async localInstall(options: {
    verbose?: boolean;
    force?: boolean;
    skipPath?: boolean;
  }): Promise<void> {
    const { verbose = false, force = false, skipPath = false } = options;
    const { execSync, spawn } = require('child_process');

    this.ui.coloredInfo('Installing synclaude from local directory to system-wide...');
    this.ui.info('==================================================');

    try {
      // Step 1: Build the project
      this.ui.info('Step 1/3: Building project...');
      if (verbose) {
        execSync('npm run build', { stdio: 'inherit', cwd: process.cwd() });
      } else {
        execSync('npm run build', { stdio: 'pipe', cwd: process.cwd() });
      }
      this.ui.coloredSuccess('Build completed');

      // Step 2: Unlink existing global installation if force is set
      if (force) {
        this.ui.info('Step 2/3: Removing existing global installation...');
        try {
          execSync('npm unlink -g synclaude 2>/dev/null || true', {
            stdio: verbose ? 'inherit' : 'pipe',
          });
        } catch {
          // Ignore errors if not installed
        }
        this.ui.coloredSuccess('Existing installation removed');
      }

      // Step 3: Link globally (npm link is now global by default in npm 11+)
      this.ui.info(`Step ${force ? '3' : '2'}/3: Linking globally...`);
      if (verbose) {
        execSync('npm link', { stdio: 'inherit', cwd: process.cwd() });
      } else {
        execSync('npm link', { stdio: 'pipe', cwd: process.cwd() });
      }

      // Verify installation
      this.ui.info('Verifying installation...');
      const version = execSync('synclaude --version', { encoding: 'utf-8' }).trim();
      this.ui.coloredSuccess(`synclaude v${version} installed successfully!`);

      // Show installation details
      // Use npm prefix to get global directory (npm bin -g is deprecated)
      const npmPrefix = execSync('npm config get prefix', { encoding: 'utf-8' }).trim();
      const npmBin = `${npmPrefix}/bin`;
      const commandPath = execSync('which synclaude', { encoding: 'utf-8' }).trim();

      this.ui.info('');
      this.ui.info('Installation details:');
      this.ui.info(`  Version: ${version}`);
      this.ui.info(`  Location: ${commandPath}`);
      this.ui.info(`  npm bin dir: ${npmBin}`);

      // Check PATH
      const pathDirs = (process.env.PATH || '').split(':');
      if (!pathDirs.some(dir => dir === npmBin) && !skipPath) {
        this.ui.info('');
        this.ui.showStatus('warning', `Note: ${npmBin} is not in your PATH`);
        this.ui.info('You may need to add it to your shell config or restart your terminal.');
      }

      this.ui.info('');
      this.ui.highlightInfo('Getting started:', [
        'synclaude setup',
        'synclaude model',
        'synclaude',
      ]);
      this.ui.info('  synclaude setup    # First-time configuration');
      this.ui.info('  synclaude          # Launch Claude Code');
      this.ui.info('  synclaude --help   # Show all commands');
    } catch (error) {
      this.ui.error(
        `Installation failed: ${error instanceof Error ? error.message : String(error)}`
      );
      this.ui.info('');
      this.ui.info('Troubleshooting tips:');
      this.ui.info('1. Ensure you have write permissions for npm global install');
      this.ui.info('2. Try running with --verbose flag to see detailed output');
      this.ui.info('3. Make sure Node.js >= 18 and npm 11+ are installed');
      throw error;
    }
  }

  private async launchClaudeCode(
    model: string,
    options: LaunchOptions,
    thinkingModel?: string | null
  ): Promise<void> {
    const launchInfo = thinkingModel
      ? `Launching with ${model} (thinking: ${thinkingModel}). Use "synclaude model" to change model.`
      : `Launching with ${model}. Use "synclaude model" to change model.`;

    this.ui.highlightInfo(launchInfo, [model, 'synclaude model']);

    const result = await this.launcher.launchClaudeCode({
      model,
      thinkingModel,
      additionalArgs: options.additionalArgs,
      maxTokenSize: this.configManager.config.maxTokenSize,
      env: {
        ANTHROPIC_AUTH_TOKEN: this.configManager.getApiKey(),
      },
    });

    if (!result.success) {
      this.ui.error(`Failed to launch Claude Code: ${result.error}`);
    }
  }
}
