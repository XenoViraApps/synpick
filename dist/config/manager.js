"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const promises_1 = require("fs/promises");
const path_1 = require("path");
const os_1 = require("os");
const types_1 = require("./types");
class ConfigManager {
    configDir;
    configPath;
    _config = null;
    constructor(configDir) {
        this.configDir = configDir || (0, path_1.join)((0, os_1.homedir)(), '.config', 'synclaude');
        this.configPath = (0, path_1.join)(this.configDir, 'config.json');
    }
    get config() {
        if (this._config === null) {
            this._config = this.loadConfig();
        }
        return this._config;
    }
    async ensureConfigDir() {
        try {
            await (0, promises_1.mkdir)(this.configDir, { recursive: true });
        }
        catch (error) {
            throw new types_1.ConfigSaveError(`Failed to create config directory: ${this.configDir}`, error);
        }
    }
    loadConfig() {
        try {
            // Use fs.readFileSync instead of require to avoid module loading errors
            const fs = require('fs');
            if (!fs.existsSync(this.configPath)) {
                // Config file doesn't exist, return defaults
                return types_1.AppConfigSchema.parse({});
            }
            const configData = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
            const result = types_1.AppConfigSchema.safeParse(configData);
            if (!result.success) {
                // Try to preserve firstRunCompleted flag even if other config is invalid
                const preservedConfig = {
                    firstRunCompleted: configData.firstRunCompleted || false,
                };
                const fallbackResult = types_1.AppConfigSchema.safeParse(preservedConfig);
                if (fallbackResult.success) {
                    return fallbackResult.data;
                }
                return types_1.AppConfigSchema.parse({});
            }
            return result.data;
        }
        catch (error) {
            // Try to recover firstRunCompleted from partial config data
            const fs = require('fs');
            if (fs.existsSync(this.configPath)) {
                try {
                    const partialConfig = JSON.parse(fs.readFileSync(this.configPath, 'utf-8'));
                    if (partialConfig.firstRunCompleted === true) {
                        return types_1.AppConfigSchema.parse({ firstRunCompleted: true });
                    }
                }
                catch {
                    // Recovery failed, use defaults
                }
            }
            return types_1.AppConfigSchema.parse({});
        }
    }
    async saveConfig(config) {
        const configToSave = config || this._config;
        if (!configToSave) {
            throw new types_1.ConfigSaveError('No configuration to save');
        }
        try {
            await this.ensureConfigDir();
            // Create backup of existing config
            try {
                const fs = require('fs/promises');
                const fsSync = require('fs');
                if (fsSync.existsSync(this.configPath)) {
                    const backupPath = `${this.configPath}.backup`;
                    const existingData = await (0, promises_1.readFile)(this.configPath, 'utf-8');
                    await (0, promises_1.writeFile)(backupPath, existingData, 'utf-8');
                }
            }
            catch (backupError) {
                // Backup failed, but continue with saving
                console.warn('Failed to create config backup:', backupError);
            }
            // Write new configuration
            const configJson = JSON.stringify(configToSave, null, 2);
            await (0, promises_1.writeFile)(this.configPath, configJson, 'utf-8');
            // Set secure permissions
            try {
                await (0, promises_1.chmod)(this.configPath, 0o600);
            }
            catch (chmodError) {
                console.warn('Failed to set secure permissions on config file:', chmodError);
            }
            this._config = configToSave;
            return true;
        }
        catch (error) {
            throw new types_1.ConfigSaveError(`Failed to save configuration to ${this.configPath}`, error);
        }
    }
    async updateConfig(updates) {
        try {
            const currentData = this.config;
            const updatedData = { ...currentData, ...updates };
            const result = types_1.AppConfigSchema.safeParse(updatedData);
            if (!result.success) {
                throw new types_1.ConfigValidationError(`Invalid configuration update: ${result.error.message}`);
            }
            return await this.saveConfig(result.data);
        }
        catch (error) {
            if (error instanceof types_1.ConfigValidationError || error instanceof types_1.ConfigSaveError) {
                throw error;
            }
            throw new types_1.ConfigSaveError('Failed to update configuration', error);
        }
    }
    hasApiKey() {
        return Boolean(this.config.apiKey);
    }
    getApiKey() {
        return this.config.apiKey;
    }
    async setApiKey(apiKey) {
        return this.updateConfig({ apiKey });
    }
    getSelectedModel() {
        return this.config.selectedModel;
    }
    async setSelectedModel(model) {
        return this.updateConfig({ selectedModel: model });
    }
    getCacheDuration() {
        return this.config.cacheDurationHours;
    }
    async setCacheDuration(hours) {
        try {
            return await this.updateConfig({ cacheDurationHours: hours });
        }
        catch (error) {
            if (error instanceof types_1.ConfigValidationError) {
                return false;
            }
            throw error;
        }
    }
    async isCacheValid(cacheFile) {
        try {
            const { stat } = require('fs/promises');
            const stats = await stat(cacheFile);
            const cacheAge = Date.now() - stats.mtime.getTime();
            const maxAge = this.config.cacheDurationHours * 60 * 60 * 1000;
            return cacheAge < maxAge;
        }
        catch (error) {
            return false;
        }
    }
    isFirstRun() {
        return !this.config.firstRunCompleted;
    }
    async markFirstRunCompleted() {
        return this.updateConfig({ firstRunCompleted: true });
    }
    hasSavedModel() {
        return Boolean(this.config.selectedModel && this.config.firstRunCompleted);
    }
    getSavedModel() {
        if (this.hasSavedModel()) {
            return this.config.selectedModel;
        }
        return '';
    }
    async setSavedModel(model) {
        return this.updateConfig({ selectedModel: model, firstRunCompleted: true });
    }
    hasSavedThinkingModel() {
        return Boolean(this.config.selectedThinkingModel && this.config.firstRunCompleted);
    }
    getSavedThinkingModel() {
        if (this.hasSavedThinkingModel()) {
            return this.config.selectedThinkingModel;
        }
        return '';
    }
    async setSavedThinkingModel(model) {
        return this.updateConfig({ selectedThinkingModel: model, firstRunCompleted: true });
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=manager.js.map