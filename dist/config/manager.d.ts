import { AppConfig } from './types';
export declare class ConfigManager {
    private configDir;
    private configPath;
    private _config;
    private static readonly MAX_BACKUP_FILES;
    /**
     * Creates a new ConfigManager instance
     *
     * @param configDir - Optional custom config directory path.
     *                    Defaults to ~/.config/synclaude
     */
    constructor(configDir?: string);
    get config(): AppConfig;
    private ensureConfigDir;
    private loadConfig;
    /**
     * Saves the configuration to disk
     *
     * Creates a backup of the existing config before writing the new one.
     * Sets secure file permissions (0600) on both config and backup files.
     *
     * @param config - Optional config object to save. If not provided, uses the current loaded config
     * @returns Promise resolving to true if save succeeded
     * @throws ConfigSaveError if the save operation fails
     */
    saveConfig(config?: AppConfig): Promise<boolean>;
    /**
     * Updates configuration with the provided partial updates
     *
     * Merges the updates with existing config and validates against schema.
     *
     * @param updates - Partial configuration object with fields to update
     * @returns Promise resolving to true if update succeeded
     * @throws ConfigValidationError if the validation fails
     * @throws ConfigSaveError if saving fails
     */
    updateConfig(updates: Partial<AppConfig>): Promise<boolean>;
    /**
     * Checks if an API key is configured
     *
     * @returns true if an API key exists, false otherwise
     */
    hasApiKey(): boolean;
    /**
     * Gets the configured API key
     *
     * @returns The API key string
     */
    getApiKey(): string;
    /**
     * Sets the API key
     *
     * @param apiKey - The API key to store
     * @returns Promise resolving to true if set succeeded
     */
    setApiKey(apiKey: string): Promise<boolean>;
    /**
     * Gets the selected model ID
     *
     * @returns The selected model identifier
     */
    getSelectedModel(): string;
    /**
     * Sets the selected model
     *
     * @param model - The model ID to save
     * @returns Promise resolving to true if set succeeded
     */
    setSelectedModel(model: string): Promise<boolean>;
    /**
     * Gets the cache duration in hours
     *
     * @returns The cache duration setting in hours
     */
    getCacheDuration(): number;
    /**
     * Sets the cache duration
     *
     * @param hours - Cache duration in hours
     * @returns Promise resolving to true if set succeeded, false if validation failed
     */
    setCacheDuration(hours: number): Promise<boolean>;
    /**
     * Checks if the cache file is still valid based on age
     *
     * @param cacheFile - Path to the cache file to check
     * @returns Promise resolving to true if cache is valid, false otherwise
     */
    isCacheValid(cacheFile: string): Promise<boolean>;
    /**
     * Checks if this is the first run of the application
     *
     * @returns true if first run (setup not completed), false otherwise
     */
    isFirstRun(): boolean;
    /**
     * Marks the first run as completed
     *
     * @returns Promise resolving to true if marked successfully
     */
    markFirstRunCompleted(): Promise<boolean>;
    /**
     * Checks if a model has been saved
     *
     * @returns true if a regular model is saved, false otherwise
     */
    hasSavedModel(): boolean;
    /**
     * Gets the saved model ID
     *
     * @returns The saved model ID, or empty string if none saved
     */
    getSavedModel(): string;
    /**
     * Saves a model and marks first run as completed
     *
     * @param model - The model ID to save
     * @returns Promise resolving to true if saved successfully
     */
    setSavedModel(model: string): Promise<boolean>;
    /**
     * Checks if a thinking model has been saved
     *
     * @returns true if a thinking model is saved, false otherwise
     */
    hasSavedThinkingModel(): boolean;
    /**
     * Gets the saved thinking model ID
     *
     * @returns The saved thinking model ID, or empty string if none saved
     */
    getSavedThinkingModel(): string;
    /**
     * Saves a thinking model and marks first run as completed
     *
     * @param model - The thinking model ID to save
     * @returns Promise resolving to true if saved successfully
     */
    setSavedThinkingModel(model: string): Promise<boolean>;
    /**
     * Clean up old backup files, keeping only the most recent backup
     *
     * @returns Promise that resolves when cleanup is complete
     */
    cleanupOldBackups(): Promise<void>;
}
//# sourceMappingURL=manager.d.ts.map