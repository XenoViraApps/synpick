import { LaunchOptions } from '../launcher';
export interface AppOptions {
    verbose?: boolean;
    quiet?: boolean;
    additionalArgs?: string[];
    thinkingModel?: string;
}
/**
 * SyntheticClaudeApp is the main application class for synpick
 *
 * Orchestrates model management, configuration, and Claude Code launching.
 */
export declare class SyntheticClaudeApp {
    private configManager;
    private ui;
    private launcher;
    private modelManager;
    private claudeCodeManager;
    /**
     * Creates a new SyntheticClaudeApp instance
     *
     * Initializes config manager, UI, launcher, and Claude Code manager.
     */
    constructor();
    /**
     * Sets up logging based on the provided options
     *
     * @param options - App options containing verbose and quiet flags
     */
    setupLogging(options: AppOptions): Promise<void>;
    /**
     * Gets the current configuration
     *
     * @returns The current app configuration object
     */
    getConfig(): {
        apiKey: string;
        baseUrl: string;
        anthropicBaseUrl: string;
        modelsApiUrl: string;
        cacheDurationHours: number;
        selectedModel: string;
        selectedThinkingModel: string;
        firstRunCompleted: boolean;
        autoUpdateClaudeCode: boolean;
        claudeCodeUpdateCheckInterval: number;
        maxTokenSize: number;
        apiTimeoutMs: number;
        commandTimeoutMs: number;
        lastClaudeCodeUpdateCheck?: string | undefined;
    };
    private getModelManager;
    /**
     * Runs the main synpick application
     *
     * Handles first-time setup, model selection, and Claude Code launching.
     *
     * @param options - App and launch options
     * @returns Promise that resolves when the application is done
     */
    run(options: AppOptions & LaunchOptions): Promise<void>;
    /**
     * Check and update Claude Code if needed
     * Skips if autoupdate is disabled or if it hasn't been long enough since last check
     */
    ensureClaudeCodeUpdated(): Promise<void>;
    /**
     * Update synpick and Claude Code to the latest version
     */
    updateClaudeCode(force?: boolean): Promise<void>;
    /**
     * Compare two semver versions
     * Returns: 1 if v1 > v2, -1 if v1 < v2, 0 if equal
     */
    private compareVersions;
    /**
     * Get latest synpick version from GitHub repository
     */
    private getLatestGitHubVersion;
    /**
     * Update synpick itself via npm
     */
    private updateSynpickSelf;
    /**
     * Check if there are available updates without installing
     */
    checkForUpdates(): Promise<void>;
    /**
     * Initiates interactive model selection for saving a default model
     *
     * Allows selecting both regular and thinking models.
     *
     * @returns Promise resolving to true if models were selected and saved, false otherwise
     */
    interactiveModelSelection(): Promise<boolean>;
    /**
     * Initiates interactive thinking model selection
     *
     * Allows selecting a thinking model for reasoning tasks.
     *
     * @returns Promise resolving to true if a thinking model was selected and saved, false otherwise
     */
    interactiveThinkingModelSelection(): Promise<boolean>;
    /**
     * Lists all available models
     *
     * @param options - Options for model listing
     * @param options.refresh - If true, forces a refresh from the API
     * @returns Promise that resolves when models are listed
     */
    listModels(options: {
        refresh?: boolean;
    }): Promise<void>;
    /**
     * Searches for models matching the given query
     *
     * @param query - Search query to filter models
     * @param options - Options for model search
     * @param options.refresh - If true, forces a refresh from the API
     * @returns Promise that resolves when models are searched
     */
    searchModels(query: string, options: {
        refresh?: boolean;
    }): Promise<void>;
    /**
     * Displays the current configuration
     *
     * @returns Promise that resolves when configuration is displayed
     */
    showConfig(): Promise<void>;
    /**
     * Sets a configuration value
     *
     * @param key - Configuration key to set
     * @param value - Value to set (will be parsed appropriately based on key)
     * @returns Promise that resolves when configuration is set
     */
    setConfig(key: string, value: string): Promise<void>;
    /**
     * Resets all configuration to defaults
     *
     * @returns Promise that resolves when configuration is reset
     */
    resetConfig(): Promise<void>;
    /**
     * Runs the first-time setup wizard
     *
     * Prompts user for API key and optionally tests connection and selects a model.
     *
     * @returns Promise that resolves when setup is complete
     */
    setup(): Promise<void>;
    /**
     * Runs a system health check
     *
     * Checks Claude Code installation, version, configuration, and API connectivity.
     *
     * @returns Promise that resolves when health check is complete
     */
    doctor(): Promise<void>;
    /**
     * Clears the model cache
     *
     * @returns Promise that resolves when cache is cleared
     */
    clearCache(): Promise<void>;
    /**
     * Displays cache information
     *
     * Shows status, size, model count, and modification time of the cache.
     *
     * @returns Promise that resolves when cache info is displayed
     */
    cacheInfo(): Promise<void>;
    private selectModel;
    private selectThinkingModel;
    /**
     * Install synpick from local directory to system-wide
     * Builds the project and uses npm link -g for system-wide installation
     */
    localInstall(options: {
        verbose?: boolean;
        force?: boolean;
        skipPath?: boolean;
    }): Promise<void>;
    private launchClaudeCode;
}
//# sourceMappingURL=app.d.ts.map