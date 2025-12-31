import { readFile, writeFile, mkdir, chmod, unlink, readdir, stat } from 'fs/promises';
import { join } from 'path';
import { homedir } from 'os';
import { AppConfigSchema, AppConfig, ConfigValidationError, ConfigSaveError } from './types';

export class ConfigManager {
  private configDir: string;
  private configPath: string;
  private _config: AppConfig | null = null;
  private static readonly MAX_BACKUP_FILES = 1;

  /**
   * Creates a new ConfigManager instance
   *
   * @param configDir - Optional custom config directory path.
   *                    Defaults to ~/.config/synclaude
   */
  constructor(configDir?: string) {
    this.configDir = configDir || join(homedir(), '.config', 'synclaude');
    this.configPath = join(this.configDir, 'config.json');
  }

  get config(): AppConfig {
    if (this._config === null) {
      this._config = this.loadConfig();
    }
    return this._config;
  }

  private async ensureConfigDir(): Promise<void> {
    try {
      await mkdir(this.configDir, { recursive: true });
    } catch (error) {
      throw new ConfigSaveError(`Failed to create config directory: ${this.configDir}`, error);
    }
  }

  private loadConfig(): AppConfig {
    try {
      // Use fs.readFileSync instead of require to avoid module loading errors
      const fs = require('fs');

      if (!fs.existsSync(this.configPath)) {
        // Config file doesn't exist, return defaults
        return AppConfigSchema.parse({});
      }

      const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
      const result = AppConfigSchema.safeParse(configData);

      if (!result.success) {
        // Try to preserve firstRunCompleted flag even if other config is invalid
        const preservedConfig = {
          firstRunCompleted: configData.firstRunCompleted || false,
        };

        const fallbackResult = AppConfigSchema.safeParse(preservedConfig);

        if (fallbackResult.success) {
          return fallbackResult.data;
        }

        return AppConfigSchema.parse({});
      }

      return result.data;
    } catch {
      // Try to recover firstRunCompleted from partial config data
      const fs = require('fs');
      if (fs.existsSync(this.configPath)) {
        try {
          const partialConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
          if (partialConfig.firstRunCompleted === true) {
            return AppConfigSchema.parse({ firstRunCompleted: true });
          }
        } catch {
          // Recovery failed, use defaults
        }
      }

      return AppConfigSchema.parse({});
    }
  }

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
  async saveConfig(config?: AppConfig): Promise<boolean> {
    const configToSave = config || this._config;
    if (!configToSave) {
      throw new ConfigSaveError('No configuration to save');
    }

    try {
      await this.ensureConfigDir();

      // Clean up old backups before creating new one
      await this.cleanupOldBackups();

      // Create backup of existing config
      try {
        const fsSync = require('fs');
        if (fsSync.existsSync(this.configPath)) {
          const backupPath = `${this.configPath}.backup`;
          const existingData = await readFile(this.configPath, 'utf-8');
          await writeFile(backupPath, existingData, 'utf-8');
        }
      } catch (backupError) {
        // Backup failed, but continue with saving
        console.warn('Failed to create config backup:', backupError);
      }

      // Write new configuration
      const configJson = JSON.stringify(configToSave, null, 2);
      await writeFile(this.configPath, configJson, 'utf-8');

      // Set secure permissions (also apply to backup)
      try {
        await chmod(this.configPath, 0o600);
        const backupPath = `${this.configPath}.backup`;
        const fsSync = require('fs');
        if (fsSync.existsSync(backupPath)) {
          await chmod(backupPath, 0o600);
        }
      } catch (chmodError) {
        console.warn('Failed to set secure permissions on config file:', chmodError);
      }

      this._config = configToSave;
      return true;
    } catch (error) {
      throw new ConfigSaveError(`Failed to save configuration to ${this.configPath}`, error);
    }
  }

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
  async updateConfig(updates: Partial<AppConfig>): Promise<boolean> {
    try {
      const currentData = this.config;
      const updatedData = { ...currentData, ...updates };

      const result = AppConfigSchema.safeParse(updatedData);
      if (!result.success) {
        throw new ConfigValidationError(`Invalid configuration update: ${result.error.message}`);
      }

      return await this.saveConfig(result.data);
    } catch (error) {
      if (error instanceof ConfigValidationError || error instanceof ConfigSaveError) {
        throw error;
      }
      throw new ConfigSaveError('Failed to update configuration', error);
    }
  }

  /**
   * Checks if an API key is configured
   *
   * @returns true if an API key exists, false otherwise
   */
  hasApiKey(): boolean {
    return Boolean(this.config.apiKey);
  }

  /**
   * Gets the configured API key
   *
   * @returns The API key string
   */
  getApiKey(): string {
    return this.config.apiKey;
  }

  /**
   * Sets the API key
   *
   * @param apiKey - The API key to store
   * @returns Promise resolving to true if set succeeded
   */
  async setApiKey(apiKey: string): Promise<boolean> {
    return this.updateConfig({ apiKey });
  }

  /**
   * Gets the selected model ID
   *
   * @returns The selected model identifier
   */
  getSelectedModel(): string {
    return this.config.selectedModel;
  }

  /**
   * Sets the selected model
   *
   * @param model - The model ID to save
   * @returns Promise resolving to true if set succeeded
   */
  async setSelectedModel(model: string): Promise<boolean> {
    return this.updateConfig({ selectedModel: model });
  }

  /**
   * Gets the cache duration in hours
   *
   * @returns The cache duration setting in hours
   */
  getCacheDuration(): number {
    return this.config.cacheDurationHours;
  }

  /**
   * Sets the cache duration
   *
   * @param hours - Cache duration in hours
   * @returns Promise resolving to true if set succeeded, false if validation failed
   */
  async setCacheDuration(hours: number): Promise<boolean> {
    try {
      return await this.updateConfig({ cacheDurationHours: hours });
    } catch (error) {
      if (error instanceof ConfigValidationError) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Checks if the cache file is still valid based on age
   *
   * @param cacheFile - Path to the cache file to check
   * @returns Promise resolving to true if cache is valid, false otherwise
   */
  async isCacheValid(cacheFile: string): Promise<boolean> {
    try {
      const { stat } = require('fs/promises');
      const stats = await stat(cacheFile);
      const cacheAge = Date.now() - stats.mtime.getTime();
      const maxAge = this.config.cacheDurationHours * 60 * 60 * 1000;
      return cacheAge < maxAge;
    } catch {
      return false;
    }
  }

  /**
   * Checks if this is the first run of the application
   *
   * @returns true if first run (setup not completed), false otherwise
   */
  isFirstRun(): boolean {
    return !this.config.firstRunCompleted;
  }

  /**
   * Marks the first run as completed
   *
   * @returns Promise resolving to true if marked successfully
   */
  async markFirstRunCompleted(): Promise<boolean> {
    return this.updateConfig({ firstRunCompleted: true });
  }

  /**
   * Checks if a model has been saved
   *
   * @returns true if a regular model is saved, false otherwise
   */
  hasSavedModel(): boolean {
    return Boolean(this.config.selectedModel && this.config.firstRunCompleted);
  }

  /**
   * Gets the saved model ID
   *
   * @returns The saved model ID, or empty string if none saved
   */
  getSavedModel(): string {
    if (this.hasSavedModel()) {
      return this.config.selectedModel;
    }
    return '';
  }

  /**
   * Saves a model and marks first run as completed
   *
   * @param model - The model ID to save
   * @returns Promise resolving to true if saved successfully
   */
  async setSavedModel(model: string): Promise<boolean> {
    return this.updateConfig({ selectedModel: model, firstRunCompleted: true });
  }

  /**
   * Checks if a thinking model has been saved
   *
   * @returns true if a thinking model is saved, false otherwise
   */
  hasSavedThinkingModel(): boolean {
    return Boolean(this.config.selectedThinkingModel && this.config.firstRunCompleted);
  }

  /**
   * Gets the saved thinking model ID
   *
   * @returns The saved thinking model ID, or empty string if none saved
   */
  getSavedThinkingModel(): string {
    if (this.hasSavedThinkingModel()) {
      return this.config.selectedThinkingModel;
    }
    return '';
  }

  /**
   * Saves a thinking model and marks first run as completed
   *
   * @param model - The thinking model ID to save
   * @returns Promise resolving to true if saved successfully
   */
  async setSavedThinkingModel(model: string): Promise<boolean> {
    return this.updateConfig({ selectedThinkingModel: model, firstRunCompleted: true });
  }

  /**
   * Clean up old backup files, keeping only the most recent backup
   *
   * @returns Promise that resolves when cleanup is complete
   */
  async cleanupOldBackups(): Promise<void> {
    try {
      const files = await readdir(this.configDir);
      const backupFiles = files.filter(f => f.endsWith('.backup'));

      // Remove excess backup files (keep only MAX_BACKUP_FILES)
      if (backupFiles.length > ConfigManager.MAX_BACKUP_FILES) {
        // Sort by modification time, keeping the most recent backups
        const backupPromises = backupFiles.map(async file => {
          const filePath = join(this.configDir, file);
          const stats = await stat(filePath);
          return { file, path: filePath, mtime: stats.mtimeMs };
        });

        const backupsWithTime = await Promise.all(backupPromises);
        backupsWithTime.sort((a, b) => b.mtime - a.mtime);

        // Remove older backups beyond the limit
        const toRemove = backupsWithTime.slice(ConfigManager.MAX_BACKUP_FILES);
        for (const backup of toRemove) {
          try {
            await unlink(backup.path);
          } catch {
            // Ignore errors when removing backup
          }
        }
      }
    } catch {
      // Ignore errors during cleanup
    }
  }
}
