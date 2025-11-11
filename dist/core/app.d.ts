import { LaunchOptions } from '../launcher';
export interface AppOptions {
    verbose?: boolean;
    quiet?: boolean;
    additionalArgs?: string[];
    thinkingModel?: string;
}
export declare class SyntheticClaudeApp {
    private configManager;
    private ui;
    private launcher;
    private modelManager;
    constructor();
    setupLogging(options: AppOptions): Promise<void>;
    getConfig(): {
        apiKey: string;
        baseUrl: string;
        anthropicBaseUrl: string;
        modelsApiUrl: string;
        cacheDurationHours: number;
        selectedModel: string;
        selectedThinkingModel: string;
        firstRunCompleted: boolean;
    };
    private getModelManager;
    run(options: AppOptions & LaunchOptions): Promise<void>;
    interactiveModelSelection(): Promise<boolean>;
    interactiveThinkingModelSelection(): Promise<boolean>;
    listModels(options: {
        refresh?: boolean;
    }): Promise<void>;
    searchModels(query: string, options: {
        refresh?: boolean;
    }): Promise<void>;
    showConfig(): Promise<void>;
    setConfig(key: string, value: string): Promise<void>;
    resetConfig(): Promise<void>;
    setup(): Promise<void>;
    doctor(): Promise<void>;
    clearCache(): Promise<void>;
    cacheInfo(): Promise<void>;
    private selectModel;
    private selectThinkingModel;
    private launchClaudeCode;
}
//# sourceMappingURL=app.d.ts.map