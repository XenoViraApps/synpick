import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';
import axios from 'axios';
import { ConfigManager, AppConfigSchema } from '../config/index.js';
import { ModelManager } from '../models/index.js';
import { UserInterface } from '../ui/index.js';
import { ClaudeLauncher } from '../launcher/index.js';
import { setupLogging, log } from '../utils/logger.js';
import { createBanner, normalizeDangerousFlags } from '../utils/banner.js';
import { ClaudeCodeManager } from '../claude/index.js';
/**
 * SyntheticClaudeApp is the main application class for synpick
 *
 * Orchestrates model management, configuration, and Claude Code launching.
 */
export class SyntheticClaudeApp {
    configManager;
    ui;
    launcher;
    modelManager = null;
    claudeCodeManager;
    /**
     * Creates a new SyntheticClaudeApp instance
     *
     * Initializes config manager, UI, launcher, and Claude Code manager.
     */
    constructor() {
        this.configManager = new ConfigManager();
        const config = this.configManager.config;
        this.ui = new UserInterface({
            verbose: this.configManager.config.apiKey
                ? this.configManager.config.cacheDurationHours > 0
                : false,
        });
        this.launcher = new ClaudeLauncher({
            timeoutMs: config.commandTimeoutMs,
        });
        this.claudeCodeManager = new ClaudeCodeManager({
            verbose: false,
            timeoutMs: config.commandTimeoutMs,
        });
    }
    /**
     * Sets up logging based on the provided options
     *
     * @param options - App options containing verbose and quiet flags
     */
    async setupLogging(options) {
        setupLogging(options.verbose, options.quiet);
        // Removed verbose startup log
    }
    /**
     * Gets the current configuration
     *
     * @returns The current app configuration object
     */
    getConfig() {
        return this.configManager.config;
    }
    getModelManager() {
        if (!this.modelManager) {
            const config = this.configManager.config;
            const cacheFile = join(homedir(), '.config', 'synpick', 'models_cache.json');
            this.modelManager = new ModelManager({
                apiKey: config.apiKey,
                modelsApiUrl: config.modelsApiUrl,
                cacheFile,
                cacheDurationHours: config.cacheDurationHours,
                apiTimeoutMs: config.apiTimeoutMs,
            });
        }
        return this.modelManager;
    }
    /**
     * Runs the main synpick application
     *
     * Handles first-time setup, model selection, and Claude Code launching.
     *
     * @param options - App and launch options
     * @returns Promise that resolves when the application is done
     */
    async run(options) {
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
    async ensureClaudeCodeUpdated() {
        const config = this.configManager.config;
        // Check if auto-update is enabled
        if (!config.autoUpdateClaudeCode) {
            return;
        }
        // Check if we should run an update check based on interval
        const shouldCheck = this.claudeCodeManager.shouldCheckUpdate(config.lastClaudeCodeUpdateCheck, config.claudeCodeUpdateCheckInterval);
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
            this.ui.info('Run "synpick update" to update Claude Code\n');
        }
    }
    /**
     * Update synpick and Claude Code to the latest version
     */
    async updateClaudeCode(force = false) {
        // Update synpick itself first
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
        }
        else {
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
        }
        else {
            this.ui.error(`Failed to update Claude Code: ${result.error}`);
        }
    }
    /**
     * Compare two semver versions
     * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
     */
    compareVersions(v1, v2) {
        const cleanV1 = v1.replace(/^v/, '');
        const cleanV2 = v2.replace(/^v/, '');
        const parts1 = cleanV1.split('.').map(Number);
        const parts2 = cleanV2.split('.').map(Number);
        for (let i = 0; i < 3; i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 > p2)
                return 1;
            if (p1 < p2)
                return -1;
        }
        return 0;
    }
    /**
     * Get latest synpick version from GitHub repository
     */
    async getLatestGitHubVersion() {
        const GITHUB_REPO = 'jeffersonwarrior/synpick';
        try {
            // Try GitHub releases API first
            const response = await axios.get(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`);
            return response.data.tag_name?.replace(/^v/, '') || null;
        }
        catch {
            try {
                // Fallback: fetch package.json from main branch
                const response = await axios.get(`https://raw.githubusercontent.com/${GITHUB_REPO}/main/package.json`);
                return response.data.version || null;
            }
            catch {
                return null;
            }
        }
    }
    /**
     * Update synpick itself via npm
     */
    async updateSynclaudeSelf(force = false) {
        try {
            // Get current synpick version
            const currentVersion = execSync('synpick --version', { encoding: 'utf-8' }).trim();
            this.ui.info(`Current synpick version: ${currentVersion}`);
            this.ui.info('Checking for synpick updates...');
            // Check for latest version from GitHub repository
            const latestVersion = await this.getLatestGitHubVersion();
            if (!latestVersion) {
                this.ui.info('Could not check for updates from GitHub. Using npm registry as fallback...');
                // Fallback to npm registry
                try {
                    const npmVersion = execSync('npm view synpick version', { encoding: 'utf-8' }).trim();
                    this.ui.info(`Latest synpick version on npm: ${npmVersion}`);
                }
                catch {
                    this.ui.info('Could not check npm registry either');
                }
                this.ui.info('Run the installer manually to update:');
                this.ui.info('  curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synpick/main/scripts/install.sh | bash');
                return;
            }
            this.ui.info(`Latest synpick version: ${latestVersion}`);
            // Compare versions - only update if latest is newer
            const comparison = this.compareVersions(latestVersion, currentVersion);
            if (comparison <= 0 && !force) {
                if (comparison === 0) {
                    this.ui.info('Synclaude is already up to date');
                }
                else {
                    this.ui.info(`Current version (${currentVersion}) is newer than available (${latestVersion})`);
                }
                return;
            }
            // Update synpick via the install script
            this.ui.info('Updating synpick from GitHub...');
            try {
                // Download and run the installer from GitHub
                execSync(`curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synpick/main/scripts/install.sh | bash`, { stdio: 'pipe' });
            }
            catch {
                this.ui.info('Remote installer failed, trying npm install...');
                // Fallback: try npm install from GitHub
                // Note: we can't direct install from GitHub due to npm limitations,
                // but we can try to update if the user has npm access
                try {
                    execSync('npm install -g synpick@latest', { stdio: 'pipe' });
                }
                catch {
                    // Final fallback - show manual instructions
                    this.ui.info('Automatic update failed');
                    this.ui.info('Please update manually:');
                    this.ui.info('  curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synpick/main/scripts/install.sh | bash');
                    throw new Error('Automatic update unavailable');
                }
            }
            // Verify the update
            const newVersion = execSync('synpick --version', { encoding: 'utf-8' }).trim();
            if (newVersion === latestVersion || force) {
                const prevMsg = currentVersion !== newVersion ? ` (was ${currentVersion})` : '';
                this.ui.coloredSuccess(`Synclaude updated to ${newVersion}${prevMsg}`);
            }
            else {
                this.ui.info(`Synclaude is now ${newVersion}, latest available is ${latestVersion}`);
            }
        }
        catch (error) {
            this.ui.error(`Failed to update synpick: ${error instanceof Error ? error.message : String(error)}`);
            this.ui.info('Try manual installation:');
            this.ui.info('  curl -sSL https://raw.githubusercontent.com/jeffersonwarrior/synpick/main/scripts/install.sh | bash');
            // Don't exit - continue to try updating Claude Code
        }
    }
    /**
     * Check if there are available updates without installing
     */
    async checkForUpdates() {
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
                this.ui.info('Run "synpick update" to update Claude Code\n');
            }
            else {
                this.ui.info('\nClaude Code is up to date\n');
            }
        }
        else {
            this.ui.info('\nNote: Claude Code was not installed via npm.');
            this.ui.info('To update, run: curl -fsSL https://claude.ai/install.sh | bash');
            this.ui.info('Or reinstall using the method you originally used.\n');
        }
    }
    /**
     * Initiates interactive model selection for saving a default model
     *
     * Allows selecting both regular and thinking models.
     *
     * @returns Promise resolving to true if models were selected and saved, false otherwise
     */
    async interactiveModelSelection() {
        if (!this.configManager.hasApiKey()) {
            this.ui.error('No API key configured. Please run "synpick setup" first.');
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
            const { regular: selectedRegularModel, thinking: selectedThinkingModel } = await this.ui.selectDualModels(sortedModels);
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
            this.ui.highlightInfo('Now run "synpick" to start Claude Code with your selected model(s).', ['synpick']);
            return true;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.ui.error(`Failed to select model: ${message}`);
            return false;
        }
    }
    /**
     * Initiates interactive thinking model selection
     *
     * Allows selecting a thinking model for reasoning tasks.
     *
     * @returns Promise resolving to true if a thinking model was selected and saved, false otherwise
     */
    async interactiveThinkingModelSelection() {
        if (!this.configManager.hasApiKey()) {
            this.ui.error('No API key configured. Please run "synpick setup" first.');
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
            this.ui.highlightInfo('Now run "synpick --thinking-model" to start Claude Code with this thinking model.', ['synpick', '--thinking-model']);
            return true;
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.ui.error(`Failed to select thinking model: ${message}`);
            return false;
        }
    }
    /**
     * Lists all available models
     *
     * @param options - Options for model listing
     * @param options.refresh - If true, forces a refresh from the API
     * @returns Promise that resolves when models are listed
     */
    async listModels(options) {
        log.info('Listing models', { options });
        if (!this.configManager.hasApiKey()) {
            this.ui.error('No API key configured. Run "synpick setup" to configure.');
            return;
        }
        try {
            const modelManager = this.getModelManager();
            this.ui.coloredInfo('Fetching available models...');
            const models = await modelManager.fetchModels(options.refresh);
            // Sort and display all models
            const sortedModels = modelManager.getModels(models);
            this.ui.showModelList(sortedModels);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.ui.error(`Failed to fetch models: ${message}`);
        }
    }
    /**
     * Searches for models matching the given query
     *
     * @param query - Search query to filter models
     * @param options - Options for model search
     * @param options.refresh - If true, forces a refresh from the API
     * @returns Promise that resolves when models are searched
     */
    async searchModels(query, options) {
        log.info('Searching models', { query, options });
        if (!this.configManager.hasApiKey()) {
            this.ui.error('No API key configured. Run "synpick setup" to configure.');
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
            this.ui.coloredInfo(`Found ${models.length} model${models.length === 1 ? '' : 's'} matching "${query}":`);
            this.ui.showModelList(models);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            this.ui.error(`Failed to search models: ${message}`);
        }
    }
    /**
     * Displays the current configuration
     *
     * @returns Promise that resolves when configuration is displayed
     */
    async showConfig() {
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
    /**
     * Sets a configuration value
     *
     * @param key - Configuration key to set
     * @param value - Value to set (will be parsed appropriately based on key)
     * @returns Promise that resolves when configuration is set
     */
    async setConfig(key, value) {
        // Simple key-value config setting
        const updates = {};
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
        }
        else {
            this.ui.error(`Failed to update configuration: ${key}`);
        }
    }
    /**
     * Resets all configuration to defaults
     *
     * @returns Promise that resolves when configuration is reset
     */
    async resetConfig() {
        const confirmed = await this.ui.confirm('Are you sure you want to reset all configuration to defaults?');
        if (!confirmed) {
            this.ui.info('Configuration reset cancelled');
            return;
        }
        // Clear config
        await this.configManager.saveConfig(AppConfigSchema.parse({}));
        this.ui.success('Configuration reset to defaults');
    }
    /**
     * Runs the first-time setup wizard
     *
     * Prompts user for API key and optionally tests connection and selects a model.
     *
     * @returns Promise that resolves when setup is complete
     */
    async setup() {
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
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.ui.error(`Connection test failed: ${message}`);
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
        this.ui.highlightInfo('You can now run "synpick" to launch Claude Code', ['synpick']);
    }
    /**
     * Runs a system health check
     *
     * Checks Claude Code installation, version, configuration, and API connectivity.
     *
     * @returns Promise that resolves when health check is complete
     */
    async doctor() {
        this.ui.info('System Health Check');
        this.ui.info('===================');
        // Check Claude Code installation
        const claudeInstalled = await this.launcher.checkClaudeInstallation();
        this.ui.showStatus(claudeInstalled ? 'success' : 'error', `Claude Code: ${claudeInstalled ? 'Installed' : 'Not found'}`);
        if (claudeInstalled) {
            const version = await this.launcher.getClaudeVersion();
            if (version) {
                this.ui.info(`Claude Code version: ${version}`);
            }
            // Check for updates
            const updateInfo = await this.claudeCodeManager.checkForUpdates({ useActualVersion: true });
            if (updateInfo.isNpmInstalled) {
                if (updateInfo.hasUpdate) {
                    this.ui.showStatus('warning', `Update available: ${updateInfo.currentVersion} -> ${updateInfo.latestVersion}`);
                    this.ui.info('Run "synpick update" to update Claude Code');
                }
                else if (updateInfo.currentVersion) {
                    this.ui.showStatus('success', `Claude Code is up to date (${updateInfo.currentVersion})`);
                }
            }
            else {
                this.ui.info('Claude Code is not installed via npm - use your original install method to update');
            }
        }
        // Check configuration
        this.ui.showStatus(this.configManager.hasApiKey() ? 'success' : 'error', 'Configuration: API key ' + (this.configManager.hasApiKey() ? 'configured' : 'missing'));
        // Check API connection
        if (this.configManager.hasApiKey()) {
            try {
                const modelManager = this.getModelManager();
                const models = await modelManager.fetchModels(true);
                this.ui.showStatus('success', `API connection: OK (${models.length} models)`);
            }
            catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                this.ui.showStatus('error', `API connection: Failed (${message})`);
            }
        }
        // Configuration summary
        const config = this.configManager.config;
        this.ui.info(`Auto-update Claude Code: ${config.autoUpdateClaudeCode ? 'Enabled' : 'Disabled'}`);
        this.ui.info(`Max Token Size: ${config.maxTokenSize}`);
    }
    /**
     * Clears the model cache
     *
     * @returns Promise that resolves when cache is cleared
     */
    async clearCache() {
        const modelManager = this.getModelManager();
        const success = await modelManager.clearCache();
        if (success) {
            this.ui.success('Model cache cleared');
        }
        else {
            this.ui.error('Failed to clear cache');
        }
    }
    /**
     * Displays cache information
     *
     * Shows status, size, model count, and modification time of the cache.
     *
     * @returns Promise that resolves when cache info is displayed
     */
    async cacheInfo() {
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
        }
        else {
            this.ui.info('Status: No cache file');
        }
    }
    async selectModel(preselectedModel) {
        if (preselectedModel) {
            return preselectedModel;
        }
        // Use saved model if available, otherwise show error
        if (this.configManager.hasSavedModel()) {
            return this.configManager.getSavedModel();
        }
        this.ui.error('No model selected. Run "synpick model" to select a model.');
        return null;
    }
    async selectThinkingModel(preselectedThinkingModel) {
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
     * Install synpick from local directory to system-wide
     * Builds the project and uses npm link -g for system-wide installation
     */
    async localInstall(options) {
        const { verbose = false, force = false, skipPath = false } = options;
        this.ui.coloredInfo('Installing synpick from local directory to system-wide...');
        this.ui.info('==================================================');
        try {
            // Step 1: Build the project
            this.ui.info('Step 1/3: Building project...');
            if (verbose) {
                execSync('npm run build', { stdio: 'inherit', cwd: process.cwd() });
            }
            else {
                execSync('npm run build', { stdio: 'pipe', cwd: process.cwd() });
            }
            this.ui.coloredSuccess('Build completed');
            // Step 2: Unlink existing global installation if force is set
            if (force) {
                this.ui.info('Step 2/3: Removing existing global installation...');
                try {
                    execSync('npm unlink -g synpick 2>/dev/null || true', {
                        stdio: verbose ? 'inherit' : 'pipe',
                    });
                }
                catch {
                    // Ignore errors if not installed
                }
                this.ui.coloredSuccess('Existing installation removed');
            }
            // Step 3: Link globally (npm link is now global by default in npm 11+)
            this.ui.info(`Step ${force ? '3' : '2'}/3: Linking globally...`);
            if (verbose) {
                execSync('npm link', { stdio: 'inherit', cwd: process.cwd() });
            }
            else {
                execSync('npm link', { stdio: 'pipe', cwd: process.cwd() });
            }
            // Verify installation
            this.ui.info('Verifying installation...');
            const version = execSync('synpick --version', { encoding: 'utf-8' }).trim();
            this.ui.coloredSuccess(`synpick v${version} installed successfully!`);
            // Show installation details
            // Use npm prefix to get global directory (npm bin -g is deprecated)
            const npmPrefix = execSync('npm config get prefix', { encoding: 'utf-8' }).trim();
            const npmBin = `${npmPrefix}/bin`;
            const commandPath = execSync('which synpick', { encoding: 'utf-8' }).trim();
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
                'synpick setup',
                'synpick model',
                'synpick',
            ]);
            this.ui.info('  synpick setup    # First-time configuration');
            this.ui.info('  synpick          # Launch Claude Code');
            this.ui.info('  synpick --help   # Show all commands');
        }
        catch (error) {
            this.ui.error(`Installation failed: ${error instanceof Error ? error.message : String(error)}`);
            this.ui.info('');
            this.ui.info('Troubleshooting tips:');
            this.ui.info('1. Ensure you have write permissions for npm global install');
            this.ui.info('2. Try running with --verbose flag to see detailed output');
            this.ui.info('3. Make sure Node.js >= 18 and npm 11+ are installed');
            throw error;
        }
    }
    async launchClaudeCode(model, options, thinkingModel) {
        const launchInfo = thinkingModel
            ? `Launching with ${model} (thinking: ${thinkingModel}). Use "synpick model" to change model.`
            : `Launching with ${model}. Use "synpick model" to change model.`;
        this.ui.highlightInfo(launchInfo, [model, 'synpick model']);
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
//# sourceMappingURL=app.js.map