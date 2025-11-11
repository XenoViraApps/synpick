import { AppConfig } from './types';
export declare class ConfigManager {
    private configDir;
    private configPath;
    private _config;
    constructor(configDir?: string);
    get config(): AppConfig;
    private ensureConfigDir;
    private loadConfig;
    saveConfig(config?: AppConfig): Promise<boolean>;
    updateConfig(updates: Partial<AppConfig>): Promise<boolean>;
    hasApiKey(): boolean;
    getApiKey(): string;
    setApiKey(apiKey: string): Promise<boolean>;
    getSelectedModel(): string;
    setSelectedModel(model: string): Promise<boolean>;
    getCacheDuration(): number;
    setCacheDuration(hours: number): Promise<boolean>;
    isCacheValid(cacheFile: string): Promise<boolean>;
    isFirstRun(): boolean;
    markFirstRunCompleted(): Promise<boolean>;
    hasSavedModel(): boolean;
    getSavedModel(): string;
    setSavedModel(model: string): Promise<boolean>;
    hasSavedThinkingModel(): boolean;
    getSavedThinkingModel(): string;
    setSavedThinkingModel(model: string): Promise<boolean>;
}
//# sourceMappingURL=manager.d.ts.map